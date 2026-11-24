// Loopback-only design preview for every Helper feature. Saves stay in memory; no production API proxy.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.env.SITE_ROOT ??= fileURLToPath(new URL('../site', import.meta.url));
const { createSiteServer, closeSiteServer } = await import('./serve-site.mjs');

const spamFixture = JSON.parse(await readFile(new URL('./fixtures/antispam-settings.json', import.meta.url)));
const catalogue = JSON.parse(await readFile(new URL('./fixtures/helper-features.json', import.meta.url)));
const scam = catalogue.features.find(feature => feature.key === 'protection.antiscam');
const raid = catalogue.features.find(feature => feature.key === 'protection.anti_raid');
const join = catalogue.features.find(feature => feature.key === 'protection.join_gate');
const moderation = catalogue.features.find(feature => feature.key === 'management.moderation');
const audit = catalogue.features.find(feature => feature.key === 'management.audit');
const welcome = catalogue.features.find(feature => feature.key === 'support.welcome');
const tickets = catalogue.features.find(feature => feature.key === 'support.tickets');
const rolePanels = catalogue.features.find(feature => feature.key === 'community.role_panels');
const fixtures = {
  ...Object.fromEntries(catalogue.features.filter(item => item.schema?.sections?.length)
    .map(item => [item.key, { label: item.title, category: item.category, defaults: item.defaults ?? {}, schema: item.schema }])),
  'community.role_panels': { label: rolePanels.title,
    defaults: { ...rolePanels.defaults, channel: '22', roleIds: ['32', '33'] }, schema: rolePanels.schema },
  'support.tickets': { label: tickets.title, defaults: { ...tickets.defaults, panelChannel: '20' }, schema: {
    ...tickets.schema, sections: tickets.schema.sections.map(section => ({ ...section, fields: [
      { key: 'panelChannel', label: 'Ticket panel channel', kind: 'channel' }, ...section.fields,
    ] })),
  } },
  'protection.antispam': { label: 'Spam protection', defaults: spamFixture.config, schema: {
    sections: [{ title: 'Resposta automática', description: '', fields: spamFixture.fields }],
  } },
  'protection.antiscam': {
    label: scam.title,
    defaults: { ...scam.defaults, deleteMessage: true },
    schema: { ...scam.schema, sections: scam.schema.sections.map(section => ({
      ...section,
      fields: section.fields.some(field => field.key === 'deleteMessage') ? section.fields
        : [...section.fields, { key: 'deleteMessage', label: 'Delete matched messages', kind: 'toggle', advanced: true }],
    })) },
  },
  'protection.anti_raid': { label: raid.title, defaults: raid.defaults, schema: raid.schema },
  'protection.join_gate': { label: join.title, defaults: join.defaults, schema: join.schema },
  'management.moderation': { label: moderation.title, defaults: moderation.defaults, schema: moderation.schema },
  'management.audit': { label: audit.title, defaults: audit.defaults, schema: audit.schema },
  'support.welcome': {
    label: welcome.title,
    defaults: { ...welcome.defaults, guideEnabled: false, steps: ['rules', 'introductions', 'channels'],
      rulesChannel: '', introductionsChannel: '', channelsChannel: '' },
    schema: { ...welcome.schema, sections: [{ ...welcome.schema.sections[0], fields: [
      ...welcome.schema.sections[0].fields,
      { key: 'guideEnabled', kind: 'toggle', label: 'Add orientation buttons' },
      { key: 'steps', kind: 'tags', label: 'Guided steps' },
      ...['rulesChannel', 'introductionsChannel', 'channelsChannel'].map(key => ({ key, kind: 'channel', label: key })),
    ] }] },
  },
};
const site = await createSiteServer(0);
const port = Number(process.env.VOZEN_PREVIEW_PORT ?? 4183);
const origin = 'http://127.0.0.1:' + port;
const settings = Object.fromEntries(Object.entries(fixtures).map(([key, fixture]) =>
  [key, { config: structuredClone(fixture.defaults), enabled: true, revision: 1 }]));
let panels = [{ message_id: '100', channel_id: '22', title: 'Choose your roles', role_ids: ['32', '33'], selection_mode: 'multiple' }];
let nextPanelId = 100;
let botProfile = { guildId: '10', nick: '', avatarUrl: null, bannerUrl: null, customAvatar: false, customBanner: false, canEditImages: true };
const feature = key => ({ key, label: fixtures[key].label, category: fixtures[key].category ?? catalogue.features.find(item => item.key === key)?.category ?? 'protection', enabled: settings[key].enabled, available: true, configurable: true });
const server = http.createServer(async (request, response) => {
  try {
    const path = new URL(request.url, origin).pathname;
    if (path.startsWith('/api/')) {
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.setHeader('cache-control', 'no-store');
      let result;
      if (path === '/api/guilds/10/bot-profile') {
        if (request.method === 'PUT') {
          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 6 * 1024 * 1024) { response.writeHead(413); response.end('{}'); return; }
          }
          const fields = JSON.parse(body);
          if ('nick' in fields) botProfile.nick = fields.nick ?? '';
          for (const [key, flag] of [['avatar', 'customAvatar'], ['banner', 'customBanner']]) {
            if (key in fields) {
              botProfile[key + 'Url'] = fields[key];
              botProfile[flag] = Boolean(fields[key]);
            }
          }
        }
        result = botProfile;
      } else if (path === '/api/role-panels' || path.startsWith('/api/role-panels/')) {
        const messageId = path.split('/')[3];
        if (request.method === 'DELETE') {
          panels = panels.filter(panel => panel.message_id !== messageId);
          result = { ok: true, messageId };
        } else if (path.endsWith('/repair') && request.method === 'POST') {
          const newId = String(++nextPanelId);
          panels = panels.map(panel => panel.message_id === messageId ? { ...panel, message_id: newId } : panel);
          result = { ok: true, messageId: newId };
        } else if (request.method === 'POST' || request.method === 'PUT') {
          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 65536) { response.writeHead(413); response.end('{}'); return; }
          }
          const input = JSON.parse(body);
          const id = messageId || String(++nextPanelId);
          const panel = { message_id: id, channel_id: input.channel, title: input.title,
            role_ids: input.roleIds, selection_mode: input.selectionMode, remove_on_unselect: input.removeOnUnselect };
          panels = messageId ? panels.map(item => item.message_id === id ? panel : item) : [...panels, panel];
          result = { ok: true, messageId: id };
        } else result = { guildId: '10', panels };
      }
      else if (path === '/api/me') result = { id: 'preview-user', guildId: '10', dbOk: true };
      else if (path === '/api/guilds') result = { guilds: [{ id: '10', name: 'Prévia local · dados de exemplo', canManage: true }] };
      else if (path === '/api/guild-context') result = {
        guildId: '10', name: 'Prévia local · dados de exemplo', permissions: '8',
        channels: [...['geral', 'moderação', 'conversa', 'anúncios'].map((name, index) => ({ id: String(20 + index), name, type: 'text' })),
          { id: '40', name: 'Suporte', type: 'category' }],
        bot: { available: true, permissions: '8' }, hierarchy: { known: true },
        roles: [{ id: '10', name: 'everyone', position: 0 }, { id: '30', name: 'Equipa', position: 1, manageable: true },
          { id: '31', name: 'Moderadores', position: 2, manageable: true }, { id: '32', name: 'Jogos', position: 1, manageable: true },
          { id: '33', name: 'Eventos', position: 1, manageable: true }, { id: '34', name: 'Admin', position: 9, manageable: false }],
        capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true }, stale: false,
      };
      else if (path === '/api/config/features') result = { guildId: '10', features: Object.keys(fixtures).map(feature) };
      else if (path.startsWith('/api/config/features/') && Object.hasOwn(fixtures, path.split('/').at(-1))) {
        const key = path.split('/').at(-1);
        const state = settings[key];
        const { defaults, schema } = fixtures[key];
        if (request.method === 'PUT') {
          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 65536) { response.writeHead(413); response.end('{}'); return; }
          }
          const input = JSON.parse(body);
          if (input.expected_revision !== state.revision) { response.writeHead(409); response.end('{"code":"revision_conflict"}'); return; }
          state.config = input.config; state.enabled = input.enabled; state.revision++;
        }
        result = { ...feature(key), guildId: '10', ...state, defaults, schema };
      } else if (path.endsWith('/preflight')) result = { guildId: '10', ok: true, issues: [] };
      else if (path === '/api/stats') result = { guildId: '10', totalCases: 0 };
      else if (path === '/api/activity/feed') {
        const { searchParams } = new URL(request.url, origin);
        const category = searchParams.get('category') ?? 'all';
        const events = ['helper_message', 'member_join', 'helper_command', 'member_leave'].map((kind, index) => ({
          id: `activity:${4 - index}`, source: 'activity', kind, user_id: '10', memberName: 'Equipa de teste',
          detail: '{}', outcome: 'recorded', created_at: Date.now() - index * 3600000,
          category: index === 1 ? 'joins' : index === 3 ? 'leaves' : 'other', helper: kind.startsWith('helper_'),
        }));
        result = { guildId: '10', nextCursor: null, events: events
          .filter(event => category === 'all' || (category === 'helper' ? event.helper : category === event.category))
          .slice(0, Number(searchParams.get('limit') ?? 50)) };
      }
      else if (path === '/api/quotas') result = { plan: 'Free', limits: {}, usage: {} };
      else if (path === '/api/reminders' && request.method === 'GET') result = { guildId: '10', enabled: true, reminders: [
        { id: 1, targetId: '10', channelId: '22', text: 'Reunião da equipa', repeat: 'weekly', remaining: 3, executeAt: Math.floor(Date.now() / 1000) + 86400, status: 'pending', attempts: 0 },
        { id: 2, targetId: '10', channelId: '20', text: 'Abrir inscrições do torneio', executeAt: Math.floor(Date.now() / 1000) + 7200, status: 'pending', attempts: 0 },
      ] };
      else if (path === '/api/custom-commands' && request.method === 'GET') result = { guildId: '10', enabled: true, limit: 25, maxResponseLength: 2000,
        commands: [{ name: 'regras', content: 'Lê as regras em #regras antes de publicar.' }, { name: 'horario', content: 'Eventos às sextas, 21h.' }] };
      else if (path === '/api/workflows' && request.method === 'GET') result = { guildId: '10', enabled: true, planLimit: 5, maxWorkflows: 5, maxReplyLength: 500,
        workflows: [{ id: 1, name: 'Boas-vindas na conversa', trigger: 'message', condition: 'olá', action: 'reply', payload: 'Olá! Vê o canal #regras.', enabled: true }] };
      else if (path === '/api/leaderboard') result = { guildId: '10', enabled: true, public: true, maxEntries: 10,
        entries: ['Mia', 'Rexy', 'Alex'].map((displayName, index) => ({ rank: index + 1, userId: String(50 + index), displayName, xp: 4200 - index * 900 })) };
      else if (path === '/api/economy/shop') result = { guildId: '10', products: [], orders: [], nextCursor: null, staffChannel: '', failedNotices: 0 };
      else { response.writeHead(503); response.end('{"code":"local_design_preview_only"}'); return; }
      response.end(JSON.stringify(result)); return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
    const upstream = await fetch(new URL(request.url, site.origin), { redirect: 'error' });
    const type = upstream.headers.get('content-type') ?? 'application/octet-stream';
    response.setHeader('content-type', type);
    response.setHeader('cache-control', 'no-store');
    response.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.discordapp.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
    response.writeHead(upstream.status);
    if (type.includes('javascript')) {
      response.end((await upstream.text()).replaceAll('https://api.vozen.org/rust', origin).replaceAll('https://api.vozen.org', origin));
    } else response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error(error.message);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`${origin}/panel/antispam/?lang=pt — local preview; in-memory example data only`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  await closeSiteServer(server); await closeSiteServer(site.server);
});

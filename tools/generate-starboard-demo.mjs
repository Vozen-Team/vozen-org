// Generates owned, illustrative video assets; no Discord data or remote media.
// Run deliberately after changing the storyboard, not on every build.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'apps/helper-panel/public/feature-demos');
// Retain the original command; pass a feature name to generate only that storyboard
// without replacing any existing Starboard assets.
const feature = process.argv[2] ?? 'starboard';
if (!['starboard', 'suggestions', 'giveaways', 'tickets', 'welcome', 'polls', 'events', 'birthdays', 'levels', 'leaderboard', 'achievements', 'economy', 'temp-channels'].includes(feature)) throw new Error('Unknown feature demo');
await fs.mkdir(destination, { recursive: true });
const browser = await chromium.launch();
try {
  for (const locale of ['en', 'pt']) {
    const page = await browser.newPage();
    const output = await page.evaluate(async ({ locale, feature }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 960; canvas.height = 540;
      const ctx = canvas.getContext('2d');
      const pt = locale === 'pt';
      const member = pt ? 'Membro' : 'Member';
      const text = pt ? {
        demo: 'EXEMPLO ILUSTRATIVO · SEM AÇÕES NO DISCORD',
        title: 'Uma mensagem que merece destaque',
        message: 'Partilhei um guia para ajudar a comunidade!',
        one: '1. Um membro publica uma mensagem',
        two: '2. Outros membros adicionam estrelas',
        three: '3. Ao chegar a 3, aparece no #starboard',
        mirrored: 'Mensagem destacada pelo Vozen Helper',
        sample: 'Exemplo: 3 estrelas · canal #starboard',
      } : {
        demo: 'ILLUSTRATIVE EXAMPLE · NO DISCORD ACTIONS',
        title: 'A message worth highlighting',
        message: 'I shared a guide to help the community!',
        one: '1. A member posts a message',
        two: '2. Other members add stars',
        three: '3. At 3 stars, it appears in #starboard',
        mirrored: 'Message highlighted by Vozen Helper',
        sample: 'Example: 3 stars · channel #starboard',
      };
      function card(x, y, w, h, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#152439'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
        ctx.strokeStyle = '#33536d'; ctx.stroke(); ctx.globalAlpha = 1;
      }
      function label(content, x, y, size = 22, color = '#f4f7fb') {
        ctx.fillStyle = color; ctx.font = `${size >= 28 ? 'bold ' : ''}${size}px system-ui, sans-serif`;
        ctx.fillText(content, x, y);
      }
      function draw(time) {
        if (feature === 'temp-channels') { drawTempChannels(time); return; }
        if (feature === 'economy') { drawEconomy(time); return; }
        if (feature === 'achievements') { drawAchievements(time); return; }
        if (feature === 'leaderboard') { drawLeaderboard(time); return; }
        if (feature === 'levels') { drawLevels(time); return; }
        if (feature === 'birthdays') { drawBirthdays(time); return; }
        if (feature === 'events') { drawEvents(time); return; }
        if (feature === 'polls') { drawPolls(time); return; }
        if (feature === 'welcome') { drawWelcome(time); return; }
        if (feature === 'tickets') { drawTickets(time); return; }
        if (feature === 'giveaways') { drawGiveaways(time); return; }
        if (feature === 'suggestions') { drawSuggestions(time); return; }
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label('VOZEN HELPER / STARBOARD', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(text.title, 42, 115, 30);
        const stars = time < 2 ? 0 : time < 3.5 ? 1 : time < 5 ? 2 : 3;
        const reveal = Math.min(1, Math.max(0, (time - 5.3) / 0.35));
        const eased = 1 - (1 - reveal) ** 3;
        card(42, 140, 876, 150);
        label('# general', 65, 172, 16, '#a3b6d1');
        ctx.fillStyle = '#8ee5d2'; ctx.beginPath(); ctx.arc(83, 211, 18, 0, Math.PI * 2); ctx.fill();
        label(pt ? 'Membro de exemplo' : 'Sample member', 115, 208, 17, '#8ee5d2');
        label(text.message, 115, 238, 24);
        label(`★ ${stars} / 3`, 65, 272, 21, '#ffd170');
        if (reveal > 0) {
          const y = 311 + 12 * (1 - eased);
          card(42, y, 876, 128, eased);
          ctx.globalAlpha = eased;
          label('# starboard', 65, y + 32, 18, '#8ee5d2');
          label(text.mirrored, 65, y + 64, 17, '#a3b6d1');
          label(`★ 3   ${member}: ${text.message}`, 65, y + 101, 22);
          ctx.globalAlpha = 1;
        }
        label(time < 2 ? text.one : time < 5.3 ? text.two : text.three, 42, 485, 22);
        label(text.sample, 42, 518, 14, '#a3b6d1');
        ctx.fillStyle = '#24354c'; ctx.fillRect(42, 531, 876, 3);
        ctx.fillStyle = '#8ee5d2'; ctx.fillRect(42, 531, 876 * Math.min(time / 10, 1), 3);
      }
      function drawTempChannels(time) {
        const created = time >= 2;
        const joined = time >= 4 && time < 7.5;
        const removed = time >= 7.5;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / CANAIS TEMPORÁRIOS' : 'VOZEN HELPER / TEMPORARY CHANNELS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Uma sala para a tua conversa' : 'A room for your conversation', 42, 111, 30);
        card(42, 137, 876, 93);
        label('/temp-channel', 66, 175, 25, '#8ee5d2');
        label(pt ? 'Criador: Rexy · com permissão Gerir canais' : 'Creator: Rexy · with Manage Channels permission', 66, 208, 18, '#a3b6d1');
        card(42, 247, 340, 192);
        label(pt ? 'VOZ DA COMUNIDADE' : 'COMMUNITY VOICE', 64, 281, 16, '#a3b6d1');
        label('♪  General', 64, 324, 22, '#a3b6d1');
        if (created && !removed) {
          label("♪  Rexy's room", 64, 365, 23, '#8ee5d2');
          if (joined) {
            ctx.fillStyle='#8ee5d2';ctx.beginPath();ctx.arc(84,403,12,0,Math.PI*2);ctx.fill();
            label('Rexy', 110, 410, 20);
          }
        }
        card(402, 247, 516, 192);
        label(removed ? (pt ? 'Sala removida' : 'Room removed') : joined ? (pt ? 'Ligado à voz' : 'Connected to voice') : created ? (pt ? 'Sala criada' : 'Room created') : (pt ? 'Pronto para criar' : 'Ready to create'), 426, 287, 26, '#8ee5d2');
        label(removed ? (pt ? 'O criador desligou-se.' : 'The creator disconnected.') : joined ? (pt ? 'Conversa com a comunidade.' : 'Talk with the community.') : created ? (pt ? 'Clica na sala para entrar.' : 'Click the room to join.') : (pt ? 'Usa o comando no servidor.' : 'Use the command in the server.'), 426, 333, 21);
        if (joined) {
          for (let i=0;i<12;i++) {
            const height=12+Math.sin(time*5+i*.7)**2*32;
            ctx.fillStyle='#8ee5d2';ctx.fillRect(426+i*23,405-height,11,height);
          }
        } else label(removed ? (pt ? 'Neste exemplo, a sala fica vazia.' : 'In this example, the room is empty.') : (pt ? 'A entrada é manual.' : 'Joining is manual.'),426,397,18,'#a3b6d1');
        label(time < 2 ? (pt ? '1. Cria a sala com /temp-channel' : '1. Create the room with /temp-channel') : time < 7.5 ? (pt ? '2. Entra na sala de voz' : '2. Join the voice room') : (pt ? '3. Ao desligar o criador, a sala é removida' : '3. The room is removed when its creator disconnects'),42,484,22);
        label(pt ? 'Exemplo com um participante · categoria e limite configuráveis' : 'Single-participant example · configurable category and room limit',42,518,14,'#a3b6d1');
      }
      function drawEconomy(time) {
        const daily = time >= 2;
        const work = time >= 4.5;
        const top = time >= 7;
        const balance = work ? 150 : daily ? 100 : 0;
        const currency = pt ? 'créditos' : 'credits';
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / ECONOMIA' : 'VOZEN HELPER / ECONOMY', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Ganha moedas. Acompanha o teu saldo.' : 'Earn credits. Track your balance.', 42, 111, 30);
        card(42, 136, 340, 304);
        label('/balance', 66, 174, 21, '#8ee5d2');
        label(pt ? '@Membro · saldo de exemplo' : '@Member · sample balance', 66, 213, 18, '#a3b6d1');
        label(String(balance), 66, 287, 56);
        label(currency, 66, 322, 22, '#a3b6d1');
        if (daily) label(work ? '/work  +50' : '/daily  +100', 66, 393, 25, '#8ee5d2');
        card(402, 136, 516, 304);
        if (top) {
          label('/economy-top', 426, 174, 21, '#8ee5d2');
          label(pt ? '1. @Membro' : '1. @Member', 426, 237, 24);
          label(`150 ${currency}`, 696, 237, 21, '#ffd170');
          label(pt ? '2. @Amigo' : '2. @Friend', 426, 294, 24);
          label(`100 ${currency}`, 696, 294, 21, '#a3b6d1');
          label(pt ? 'Até 10 membros por saldo' : 'Up to 10 members by balance', 426, 395, 18, '#a3b6d1');
        } else {
          label('/daily', 426, 181, 24, daily ? '#8ee5d2' : '#f4f7fb');
          label(`+100 ${currency}`, 426, 219, 26);
          label(pt ? 'Uma vez a cada 24 horas' : 'Once every 24 hours', 426, 250, 18, '#a3b6d1');
          label('/work', 426, 315, 24, work ? '#8ee5d2' : '#f4f7fb');
          label(`+50 ${currency}`, 426, 353, 26);
          label(pt ? 'Exemplo: espera de 60 minutos' : 'Example: 60-minute cooldown', 426, 391, 18, '#a3b6d1');
        }
        label(time < 2 ? (pt ? '1. Começa pelo teu saldo' : '1. Start with your balance')
          : time < 7 ? (pt ? '2. Recolhe as recompensas' : '2. Claim your rewards')
          : (pt ? '3. Consulta a classificação' : '3. Check the ranking'), 42, 484, 22);
        label(pt ? 'Valores de exemplo · moeda e recompensas configuráveis' : 'Sample values · configurable currency and rewards', 42, 518, 14, '#a3b6d1');
      }
      function drawAchievements(time) {
        const xp = Math.round(80 + 20 * Math.min(time / 3, 1));
        const unlocked = time >= 3;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / CONQUISTAS' : 'VOZEN HELPER / ACHIEVEMENTS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'A participação transforma-se em conquistas' : 'Participation becomes a milestone', 42, 111, 28);
        card(42, 135, 876, 90);
        label(time < 6 ? (pt ? 'Membro de exemplo · XP por participação' : 'Sample member · participation XP') : '/achievements', 64, 170, 21, '#8ee5d2');
        label(`${xp} / 100 XP`, 64, 205, 23);
        ctx.fillStyle = '#24354c'; ctx.fillRect(340, 188, 540, 12);
        ctx.fillStyle = '#8ee5d2'; ctx.fillRect(340, 188, 540 * xp / 100, 12);
        card(42, 242, 876, 197);
        label(time < 6 ? (pt ? 'Primeiro marco · 100 XP' : 'First milestone · 100 XP') : (pt ? 'As tuas conquistas · 100 XP' : 'Your achievements · 100 XP'), 64, 279, 22, '#8ee5d2');
        const rows = [[pt ? 'Primeiros passos' : 'First steps', '100', unlocked], [pt ? 'Participante habitual' : 'Regular', '1 000', false], [pt ? 'Pilar da comunidade' : 'Community pillar', '10 000', false]];
        rows.forEach(([name, threshold, done], index) => {
          const y = 321 + index * 36;
          label(`${done ? (pt ? 'Desbloqueada' : 'Unlocked') : (pt ? 'Bloqueada' : 'Locked')} · ${name}`, 64, y, 20, done ? '#ffd170' : '#a3b6d1');
          label(`${threshold} XP`, 744, y, 20);
        });
        label(time < 3 ? (pt ? '1. Ganhas XP com Níveis e XP ativos' : '1. Earn XP with Levels & XP enabled') : time < 6 ? (pt ? '2. Ao atingir o marco, a conquista é registada' : '2. Reaching the milestone records the achievement') : (pt ? '3. Consulta o progresso com /achievements' : '3. Check your progress with /achievements'), 42, 482, 22);
        label(pt ? 'Valores de exemplo · marcos e cargos opcionais definidos no dashboard' : 'Sample values · milestones and optional roles are set in the dashboard', 42, 516, 14, '#a3b6d1');
      }
      function drawLeaderboard(time) {
        const hidden = time >= 6.5;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / CLASSIFICAÇÃO' : 'VOZEN HELPER / LEADERBOARD', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Consulta o top e controla a tua privacidade' : 'Check the top and control your privacy', 42, 111, 28);
        card(42, 135, 876, 65);
        label(time < 4 || hidden ? '/leaderboard' : '/leaderboard-privacy opt_out: true', 64, 176, 23, '#8ee5d2');
        if (time >= 2) {
          card(42, 217, 876, 211);
          label(pt ? 'Vozen Helper · Top XP · resposta pública' : 'Vozen Helper · Top XP · public response', 64, 250, 19, '#8ee5d2');
          const rows = hidden ? [[`${member} 1`, '1 250'], [`${member} 3`, '730']] : [[`${member} 1`, '1 250'], [`${member} 2`, '980'], [`${member} 3`, '730']];
          rows.forEach(([name, xp], index) => {
            const y = 291 + index * 44;
            label(`#${index + 1}`, 64, y, 22, index === 0 ? '#ffd170' : '#a3b6d1');
            label(name, 138, y, 22);
            label(`${xp} XP`, 720, y, 22, '#8ee5d2');
          });
          if (hidden) label(pt ? 'Nova consulta · Membro 2 oculto · XP guardado' : 'New response · Member 2 hidden · XP saved', 64, 401, 18, '#a3b6d1');
        }
        label(time < 2 ? (pt ? '1. Consulta /leaderboard com a feature ativa' : '1. Run /leaderboard with the feature enabled')
          : time < 4 ? (pt ? '2. Os membros aparecem por ordem de XP' : '2. Members appear in XP order')
          : (pt ? '3. Podes ocultar a tua entrada sem perder XP' : '3. Hide your entry without losing XP'), 42, 482, 22);
        label(pt ? 'Dados de exemplo · visibilidade e limite definidos no dashboard' : 'Sample data · visibility and limit are set in the dashboard', 42, 516, 14, '#a3b6d1');
      }
      function drawSuggestions(time) {
        const idea = pt ? 'Criar um canal para eventos' : 'Create a channel for events';
        const voted = time >= 4.5;
        const approved = time >= 7;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / SUGESTÕES' : 'VOZEN HELPER / SUGGESTIONS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Uma ideia, votos e uma decisão' : 'An idea, votes and a decision', 42, 111, 30);
        card(42, 135, 876, 75);
        label(pt ? 'Membro de exemplo' : 'Sample member', 62, 160, 15, '#a3b6d1');
        label(`/suggest text: ${idea}`, 62, 193, 23, '#8ee5d2');
        if (time >= 2) {
          const reveal = Math.min(1, (time - 2) / .3);
          card(42, 229, 876, 207, reveal);
          ctx.globalAlpha = reveal;
          label('# suggestions', 64, 258, 16, '#a3b6d1');
          label(pt ? 'Vozen Helper · Sugestão #1' : 'Vozen Helper · Suggestion #1', 64, 289, 21, '#8ee5d2');
          label(idea, 64, 323, 26);
          label(pt ? `Estado: ${approved ? 'APROVADA' : 'PENDENTE'}` : `Status: ${approved ? 'APPROVED' : 'PENDING'}`, 64, 355, 18, approved ? '#8ee5d2' : '#ffd170');
          ctx.fillStyle = '#245044'; ctx.beginPath(); ctx.roundRect(64, 376, 205, 41, 9); ctx.fill();
          label(`${pt ? 'A favor' : 'Support'} · ${voted ? 3 : 0}`, 82, 403, 19, '#8ee5d2');
          ctx.fillStyle = '#483141'; ctx.beginPath(); ctx.roundRect(284, 376, 205, 41, 9); ctx.fill();
          label(`${pt ? 'Contra' : 'Against'} · ${voted ? 1 : 0}`, 302, 403, 19, '#f9b4c6');
          if (approved) label('/suggestion id: 1 status: approved', 518, 402, 15, '#a3b6d1');
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Um membro envia a ideia com /suggest' : '1. A member submits an idea with /suggest')
          : time < 7 ? (pt ? '2. O Helper publica a ideia e os membros votam' : '2. Helper posts the idea and members vote')
          : (pt ? '3. Um moderador aprova e o estado é atualizado' : '3. A moderator approves and the status updates');
        label(step, 42, 482, 23);
        label(pt ? 'Exemplo: canal #suggestions · votos a favor e contra' : 'Example: #suggestions channel · Support / Against voting', 42, 516, 14, '#a3b6d1');
        ctx.fillStyle = '#24354c'; ctx.fillRect(42, 531, 876, 3);
        ctx.fillStyle = '#8ee5d2'; ctx.fillRect(42, 531, 876 * Math.min(time / 10, 1), 3);
      }
      function drawGiveaways(time) {
        const joined = time >= 4.5;
        const ended = time >= 7;
        const prize = pt ? 'Passe para a noite de jogos' : 'Game night pass';
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / SORTEIOS' : 'VOZEN HELPER / GIVEAWAYS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Criar, participar e conhecer o vencedor' : 'Create, join and see the winner', 42, 111, 30);
        card(42, 135, 876, 80);
        label(`/giveaway-start prize: ${prize}`, 62, 169, 22, '#8ee5d2');
        label('duration: 1h  ·  winners: 1', 62, 199, 19, '#a3b6d1');
        if (time >= 2) {
          const reveal = Math.min(1, (time - 2) / .3);
          card(42, 232, 876, 212, reveal);
          ctx.globalAlpha = reveal;
          label(pt ? '# sorteios · Vozen Helper' : '# giveaways · Vozen Helper', 64, 262, 16, '#a3b6d1');
          label(`${pt ? 'Prémio' : 'Prize'}: ${prize}`, 64, 300, 28);
          label(pt ? `1 vencedor · ${ended ? 'Terminado' : 'Aberto'}` : `1 winner · ${ended ? 'Ended' : 'Open'}`, 64, 333, 20, ended ? '#8ee5d2' : '#ffd170');
          if (ended) {
            label(pt ? 'Vencedor de exemplo: Membro 1' : 'Sample winner: Member 1', 64, 386, 27, '#8ee5d2');
            label(pt ? 'Prazo terminado · tempo acelerado' : 'Duration ended · accelerated time', 64, 420, 17, '#a3b6d1');
          } else {
            ctx.fillStyle = '#4e5bd4'; ctx.beginPath(); ctx.roundRect(64, 357, 154, 48, 9); ctx.fill();
            label('Join', 119, 389, 23);
            label(pt ? `${joined ? '3 membros' : 'Membros elegíveis'} · ${joined ? 'participação aceite' : 'clicam em Join'}`
              : `${joined ? '3 members' : 'Eligible members'} · ${joined ? 'entry accepted' : 'click Join'}`, 242, 389, 20, '#a3b6d1');
            label(pt ? 'Exemplo: sem cargo obrigatório' : 'Example: no required role', 64, 430, 16, '#a3b6d1');
          }
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Um moderador define o prémio e a duração' : '1. A moderator sets the prize and duration')
          : time < 7 ? (pt ? '2. Os membros participam com o botão Join' : '2. Members enter using the Join button')
          : (pt ? '3. No fim, o Helper publica o resultado' : '3. At the end, Helper publishes the result');
        label(step, 42, 484, 23);
        label(pt ? 'Exemplo ilustrativo · nenhum sorteio é criado · tempo acelerado' : 'Illustrative example · no giveaway is created · accelerated time', 42, 518, 14, '#a3b6d1');
      }
      function drawTickets(time) {
        const opened = time >= 2;
        const claimed = time >= 4.5;
        const closed = time >= 7;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label('VOZEN HELPER / TICKETS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Um pedido, um canal privado, uma resposta' : 'A request, a private channel, a response', 42, 111, 30);
        card(42, 135, 876, 91);
        label(pt ? '# suporte · Painel de tickets' : '# support · Ticket panel', 62, 165, 18, '#a3b6d1');
        label(pt ? 'Precisas de ajuda?' : 'Need a hand?', 62, 201, 25);
        ctx.fillStyle = '#4e5bd4'; ctx.beginPath(); ctx.roundRect(697, 159, 196, 48, 9); ctx.fill();
        label('Open ticket', 722, 191, 23);
        if (opened) {
          const reveal = Math.min(1, (time - 2) / .3);
          card(42, 244, 876, 200, reveal);
          ctx.globalAlpha = reveal;
          label(pt ? '# ticket-exemplo' : '# ticket-example', 64, 275, 21, '#8ee5d2');
          label(pt ? 'Privado · Membro, Helper e equipa de suporte*' : 'Private · Member, Helper and support team*', 64, 305, 17, '#a3b6d1');
          label(pt ? 'Membro: Preciso de ajuda com o meu cargo.' : 'Member: I need help with my role.', 64, 343, 24);
          if (claimed) label(pt ? 'Sam · suporte: Já estou a tratar do pedido.' : 'Sam · support: I am on it.', 64, 377, 23, '#8ee5d2');
          if (closed) {
            label(pt ? 'Pedido resolvido · Ticket fechado' : 'Request resolved · Ticket closed', 64, 420, 23, '#8ee5d2');
          } else {
            ctx.fillStyle = '#253c51'; ctx.beginPath(); ctx.roundRect(64, 393, 165, 35, 8); ctx.fill();
            label(claimed ? (pt ? 'Assumido: Sam' : 'Claimed: Sam') : 'Claim', 79, 417, 18, '#8ee5d2');
            ctx.fillStyle = '#483141'; ctx.beginPath(); ctx.roundRect(244, 393, 108, 35, 8); ctx.fill();
            label('Close', 270, 417, 18, '#f9b4c6');
          }
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Um membro clica em Open ticket' : '1. A member clicks Open ticket')
          : time < 7 ? (pt ? '2. O Helper cria o canal e a equipa assume o pedido' : '2. Helper creates the channel and staff claim the request')
          : (pt ? '3. Com o pedido resolvido, o ticket é fechado' : '3. Once resolved, the ticket is closed');
        label(step, 42, 484, 22);
        label(pt ? '* Administradores mantêm o acesso · exemplo sem criar canais' : '* Administrators retain access · example creates no channels', 42, 518, 14, '#a3b6d1');
      }
      function drawPolls(time) {
        const voted = time >= 4.5;
        const closed = time >= 7;
        const question = pt ? 'O que jogamos no sábado?' : 'What should we play on Saturday?';
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / SONDAGENS' : 'VOZEN HELPER / POLLS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Uma pergunta, uma escolha, um resultado' : 'A question, a choice, a result', 42, 111, 30);
        card(42, 135, 876, 80);
        label(`/poll question: ${question}`, 62, 169, 22, '#8ee5d2');
        label('option1: Minecraft  ·  option2: Rocket League  ·  duration: 1h', 62, 199, 18, '#a3b6d1');
        if (time >= 2) {
          const reveal = Math.min(1, (time - 2) / .3);
          const eased = 1 - (1 - reveal) ** 3;
          const y = 232 + 10 * (1 - eased);
          card(42, y, 876, 212, eased);
          ctx.globalAlpha = eased;
          label('# polls · Vozen Helper', 64, y + 30, 16, '#a3b6d1');
          label(question, 64, y + 69, 27);
          label(closed ? (pt ? 'Encerrada · resultados' : 'Closed · results') : (pt ? 'Aberta · termina em 1 hora' : 'Open · ends in 1 hour'), 64, y + 100, 18, closed ? '#8ee5d2' : '#ffd170');
          if (closed) {
            label(pt ? '1. Minecraft — 3 votos' : '1. Minecraft — 3 votes', 64, y + 143, 24, '#8ee5d2');
            label(pt ? '2. Rocket League — 1 voto' : '2. Rocket League — 1 vote', 64, y + 182, 24, '#a3b6d1');
          } else {
            for (const [index, option] of ['Minecraft', 'Rocket League'].entries()) {
              const x = 64 + index * 278;
              ctx.fillStyle = voted && index === 0 ? '#245044' : '#253c51';
              ctx.beginPath(); ctx.roundRect(x, y + 120, 260, 44, 9); ctx.fill();
              label(`${index + 1}: ${option}`, x + 16, y + 149, 21, voted && index === 0 ? '#8ee5d2' : '#f4f7fb');
            }
            if (voted) label(pt ? 'Voto registado · podes alterar a escolha' : 'Vote recorded · you can change your choice', 64, y + 195, 18, '#8ee5d2');
          }
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Cria a pergunta e as opções com /poll' : '1. Create the question and options with /poll')
          : time < 7 ? (pt ? '2. Cada membro escolhe uma opção nos botões' : '2. Each member chooses an option using the buttons')
          : (pt ? '3. No fim do prazo, aparecem os totais' : '3. When time is up, the vote totals appear');
        label(step, 42, 484, 22);
        label(pt ? 'Exemplo ilustrativo · nenhuma sondagem é criada · tempo acelerado' : 'Illustrative example · no poll is created · accelerated time', 42, 518, 14, '#a3b6d1');
      }
      function drawLevels(time) {
        const earned = time >= 2;
        const cooldown = time >= 4;
        const rank = time >= 6.5;
        const total = earned ? 100 : 80;
        const level = earned ? 2 : 1;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / NÍVEIS E XP' : 'VOZEN HELPER / LEVELS & XP', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Participar, progredir e subir de nível' : 'Take part, progress and level up', 42, 111, 30);
        card(42, 135, 876, 101);
        label(pt ? '# geral · Membro de exemplo' : '# general · Sample member', 64, 164, 16, '#a3b6d1');
        label(rank ? '/rank' : cooldown ? (pt ? 'Outra mensagem logo a seguir…' : 'Another message right away…')
          : (pt ? 'Partilhei uma dica para ajudar a comunidade!' : 'I shared a tip to help the community!'), 64, 197, 24, '#8ee5d2');
        label(rank ? (pt ? 'Consulta o progresso, sem alterar o XP' : 'Check progress without changing XP')
          : cooldown ? (pt ? 'Sem XP adicional · o tempo de espera ainda está ativo' : 'No extra XP · the cooldown is still active')
          : earned ? (pt ? '+20 XP por uma mensagem elegível' : '+20 XP for an eligible message')
          : (pt ? 'O membro já tem 80 XP neste exemplo' : 'The member already has 80 XP in this example'), 64, 222, 17, '#a3b6d1');
        const progress = rank ? Math.min(1, (time - 6.5) / .35) : 1;
        const eased = 1 - (1 - progress) ** 3;
        const y = 254 + 10 * (1 - eased);
        card(42, y, 876, 184, eased);
        ctx.globalAlpha = eased;
        label(rank ? (pt ? 'Cartão de XP · exemplo ilustrativo' : 'XP card · illustrative example') : (pt ? 'Progresso do membro' : 'Member progress'), 64, y + 30, 17, '#a3b6d1');
        const contentX = rank ? 153 : 64;
        if (rank) {
          ctx.fillStyle = '#243c51'; ctx.beginPath(); ctx.arc(99, y + 84, 31, 0, Math.PI * 2); ctx.fill();
          label('M', 87, y + 94, 29, '#8ee5d2');
        }
        label(rank ? (pt ? 'Membro de exemplo' : 'Sample member')
          : (pt ? `Nível ${level} · ${total} XP no total` : `Level ${level} · ${total} total XP`), contentX, y + 72, 28, '#8ee5d2');
        if (rank) label(pt ? 'Nível 2 · 100 XP no total' : 'Level 2 · 100 total XP', contentX, y + 104, 21);
        const barY = y + (rank ? 122 : 96);
        ctx.fillStyle = '#243c51'; ctx.beginPath(); ctx.roundRect(contentX, barY, 700, 10, 5); ctx.fill();
        if (!earned) { ctx.fillStyle = '#8ee5d2'; ctx.beginPath(); ctx.roundRect(contentX, barY, 560, 10, 5); ctx.fill(); }
        label(pt ? `${total % 100} / 100 XP até ao nível ${level + 1}` : `${total % 100} / 100 XP to level ${level + 1}`, contentX, y + (rank ? 162 : 133), 18, '#a3b6d1');
        if (earned && !rank) label(pt ? 'O Helper anuncia: @Membro atingiu o nível 2!' : 'Helper announces: @Member reached level 2!', 64, y + 163, 20, '#8ee5d2');
        ctx.globalAlpha = 1;
        const step = time < 2 ? (pt ? '1. Uma mensagem elegível dá XP' : '1. An eligible message earns XP')
          : time < 6.5 ? (pt ? '2. O membro sobe de nível; o cooldown evita XP repetido' : '2. The member levels up; the cooldown skips extra XP')
          : (pt ? '3. Usa /rank para consultar o teu cartão de XP' : '3. Use /rank to check your XP card');
        label(step, 42, 484, 22);
        label(pt ? 'Exemplo: 20 XP por mensagem · espera de 60 s · voz e cargos não demonstrados' : 'Example: 20 XP per message · 60 s cooldown · voice and role rewards not shown', 42, 518, 14, '#a3b6d1');
      }
      function drawBirthdays(time) {
        const saved = time >= 2;
        const celebrating = time >= 5;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / ANIVERSÁRIOS' : 'VOZEN HELPER / BIRTHDAYS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Uma data para celebrar em comunidade' : 'A day to celebrate together', 42, 111, 30);
        card(42, 135, 876, 101);
        label(pt ? 'Membro de exemplo · só dia e mês' : 'Sample member · day and month only', 64, 164, 16, '#a3b6d1');
        label('/birthday-set month: 10  day: 18', 64, 197, 24, '#8ee5d2');
        if (saved) label(pt ? '✓ Aniversário guardado · confirmação privada' : '✓ Birthday saved · private confirmation', 64, 222, 17, '#8ee5d2');
        if (saved) {
          const progress = Math.min(1, (time - 2) / .35);
          const eased = 1 - (1 - progress) ** 3;
          const y = 254 + 10 * (1 - eased);
          card(42, y, 876, 184, eased);
          ctx.globalAlpha = eased;
          label(pt ? '# aniversários · Vozen Helper' : '# birthdays · Vozen Helper', 64, y + 30, 17, '#a3b6d1');
          // A simple owned calendar illustration avoids platform-dependent emoji.
          ctx.fillStyle = '#243c51'; ctx.beginPath(); ctx.roundRect(64, y + 48, 82, 91, 12); ctx.fill();
          ctx.fillStyle = '#8ee5d2'; ctx.fillRect(64, y + 66, 82, 3);
          label(pt ? 'OUT' : 'OCT', 83, y + 64, 14, '#8ee5d2');
          label(celebrating ? '18' : '17', 82, y + 112, 32);
          label(celebrating ? (pt ? 'Parabéns, @Membro! 🎉' : 'Happy birthday, @Member! 🎉')
            : (pt ? 'À espera da data guardada…' : 'Waiting for the saved date…'), 171, y + 87, 28, celebrating ? '#8ee5d2' : '#f4f7fb');
          label(pt ? 'Data verificada no fuso configurado · exemplo UTC' : 'Date checked in the configured time zone · sample UTC', 171, y + 119, 17, '#a3b6d1');
          label(time >= 7 ? (pt ? 'Podes apagar a data com /birthday-remove' : 'Remove your saved date with /birthday-remove')
            : (pt ? 'O ano de nascimento não é pedido' : 'No birth year is requested'), 64, y + 162, 18, '#a3b6d1');
          if (celebrating) {
            const burst = Math.min(1, (time - 5) / .5);
            const easedBurst = 1 - (1 - burst) ** 3;
            for (let i = 0; i < 8; i++) {
              const angle = i * Math.PI / 4;
              ctx.fillStyle = i % 2 ? '#ffd170' : '#8ee5d2';
              ctx.globalAlpha = eased * (1 - burst);
              ctx.fillRect(865 + Math.cos(angle) * 28 * easedBurst, y + 73 + Math.sin(angle) * 28 * easedBurst, 5, 5);
            }
          }
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Guarda o dia e o mês com /birthday-set' : '1. Save your day and month with /birthday-set')
          : time < 5 ? (pt ? '2. O Helper acompanha a data no fuso escolhido' : '2. Helper checks the date in your chosen time zone')
          : (pt ? '3. Quando chega o dia, a comunidade celebra' : '3. When the date arrives, the community celebrates');
        label(step, 42, 484, 22);
        label(pt ? 'Exemplo: funcionalidade ativa · canal configurado · tempo acelerado' : 'Example: feature enabled · channel configured · accelerated time', 42, 518, 14, '#a3b6d1');
      }
      function drawEvents(time) {
        const joined = time >= 4.5;
        const reminder = time >= 5.5 && time < 7;
        const checkedIn = time >= 7;
        const name = pt ? 'Noite de jogos' : 'Game night';
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / EVENTOS' : 'VOZEN HELPER / EVENTS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Planear, inscrever e participar' : 'Plan, register and take part', 42, 111, 30);
        card(42, 135, 876, 80);
        label(`/event-create name: ${name}`, 62, 169, 22, '#8ee5d2');
        label(`start: 2030-01-12T20:00:00Z  ·  location: ${pt ? 'Sala da comunidade' : 'Community hub'}`, 62, 199, 17, '#a3b6d1');
        if (time >= 2) {
          const reveal = Math.min(1, (time - 2) / .3);
          const eased = 1 - (1 - reveal) ** 3;
          const y = 232 + 10 * (1 - eased);
          card(42, y, 876, 212, eased);
          ctx.globalAlpha = eased;
          label(pt ? 'Evento agendado do Discord · exemplo' : 'Discord scheduled event · sample', 64, y + 30, 16, '#a3b6d1');
          label(name, 64, y + 68, 28);
          label('12 Jan 2030 · 20:00 UTC', 64, y + 99, 19, '#a3b6d1');
          label(pt ? `Inscrições: ${joined ? 1 : 0} / 20` : `Registrations: ${joined ? 1 : 0} / 20`, 64, y + 130, 21, joined ? '#8ee5d2' : '#f4f7fb');
          label(`/${checkedIn ? 'event-checkin' : 'event-register'} event_id: 123456789012345678`, 64, y + 165, 19, '#8ee5d2');
          if (checkedIn) label(pt ? 'Membro de exemplo · presença registada' : 'Sample member · check-in recorded', 64, y + 195, 18, '#8ee5d2');
          else if (reminder) label(pt ? '# eventos · Lembrete: Noite de jogos começa daqui a 1 hora' : '# events · Reminder: Game night starts in 1 hour', 64, y + 195, 18, '#ffd170');
          else if (joined) label(pt ? 'Membro de exemplo · inscrição confirmada' : 'Sample member · registration confirmed', 64, y + 195, 18, '#8ee5d2');
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Um moderador agenda o evento com /event-create' : '1. A moderator schedules the event with /event-create')
          : time < 7 ? (pt ? '2. Os membros inscrevem-se; o lembrete é opcional' : '2. Members register; the reminder is optional')
          : (pt ? '3. Um membro inscrito regista a presença com /event-checkin' : '3. A registered member checks in with /event-checkin');
        label(step, 42, 484, 22);
        label(pt ? 'Exemplo: lotação de 20 · lembretes ativos no #eventos · tempo acelerado' : 'Example: capacity 20 · reminders enabled in #events · accelerated time', 42, 518, 14, '#a3b6d1');
      }
      function drawWelcome(time) {
        const greeted = time >= 2;
        const assigned = time >= 5;
        const guided = time >= 7;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / BOAS-VINDAS' : 'VOZEN HELPER / WELCOME', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Uma receção e um ponto de partida' : 'A warm welcome and a place to start', 42, 111, 30);
        card(42, 135, 876, 65);
        ctx.fillStyle = '#8ee5d2'; ctx.beginPath(); ctx.arc(77, 167, 17, 0, Math.PI * 2); ctx.fill();
        label(pt ? 'Um membro entrou no servidor' : 'A member joined the server', 110, 175, 24);
        label(pt ? 'membro de exemplo' : 'sample member', 714, 175, 16, '#a3b6d1');
        if (greeted) {
          const reveal = Math.min(1, (time - 2) / .3);
          card(42, 220, 876, 222, reveal);
          ctx.globalAlpha = reveal;
          label(pt ? '# boas-vindas · Vozen Helper' : '# welcome · Vozen Helper', 64, 251, 18, '#a3b6d1');
          label(pt ? 'Bem-vindo, @Membro! Sente-te em casa.' : 'Welcome, @Member! Make yourself at home.', 64, 291, 27);
          ctx.fillStyle = guided ? '#245044' : '#253c51'; ctx.beginPath(); ctx.roundRect(64, 312, 205, 39, 8); ctx.fill();
          label('Read the rules', 80, 338, 20, '#8ee5d2');
          ctx.fillStyle = '#253c51'; ctx.beginPath(); ctx.roundRect(284, 312, 235, 39, 8); ctx.fill();
          label('Introduce yourself', 300, 338, 20, '#a3b6d1');
          if (assigned) label(pt ? 'Cargo automático de exemplo: Membro' : 'Sample automatic role: Member', 64, 387, 21, '#8ee5d2');
          if (guided) label(pt ? 'Read the rules abre diretamente #regras' : 'Read the rules opens #rules directly', 64, 420, 19, '#a3b6d1');
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Um novo membro entra na comunidade' : '1. A new member joins the community')
          : time < 5 ? (pt ? '2. O Helper publica a mensagem de boas-vindas' : '2. Helper posts the welcome message')
          : (pt ? '3. Com extras ativos, recebe um cargo e orientação' : '3. Enabled extras add a role and orientation');
        label(step, 42, 484, 22);
        label(pt ? 'Sem canal escolhido, o botão não aparece · exemplo ilustrativo' : 'Without a chosen channel, the button stays hidden · illustrative example', 42, 518, 14, '#a3b6d1');
      }
      draw(feature === 'temp-channels' ? 6 : ['events', 'birthdays', 'levels', 'leaderboard', 'achievements', 'economy'].includes(feature) ? 8 : 0);
      const poster = canvas.toDataURL('image/png').split(',')[1];
      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: feature === 'temp-channels' ? 2_000_000 : 700_000 });
      const chunks = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      const done = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start();
      const start = performance.now();
      await new Promise(resolve => {
        function frame() {
          const time = (performance.now() - start) / 1000;
          draw(time);
          if (time >= 10) resolve(); else requestAnimationFrame(frame);
        }
        frame();
      });
      recorder.stop();
      await done;
      stream.getTracks().forEach(track => track.stop());
      const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { poster, video: btoa(binary) };
    }, { locale, feature });
    await fs.writeFile(path.join(destination, `${feature}-${locale}.png`), Buffer.from(output.poster, 'base64'));
    await fs.writeFile(path.join(destination, `${feature}-${locale}.webm`), Buffer.from(output.video, 'base64'));
    console.log(`Generated 10-second ${locale} ${feature} demo`);
    await page.close();
  }
} finally { await browser.close(); }

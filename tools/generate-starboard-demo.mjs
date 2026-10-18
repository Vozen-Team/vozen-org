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
if (!['starboard', 'suggestions', 'giveaways', 'tickets', 'welcome', 'polls', 'events'].includes(feature)) throw new Error('Unknown feature demo');
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
      draw(feature === 'events' ? 8 : 0);
      const poster = canvas.toDataURL('image/png').split(',')[1];
      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 700_000 });
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

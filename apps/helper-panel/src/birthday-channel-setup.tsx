import { useEffect, useRef, useState } from 'react';
import { api, type GuildContext } from './api';
import { helperLocale, helperText } from './i18n';
import { canCreateStarboard, validStarboardName } from './starboard-channel';
import './starboard-channel.css';

export function BirthdayChannel({ context, onCreated }: {
  context: GuildContext | null;
  onCreated: (channel: GuildContext['channels'][number]) => void;
}) {
  const text = (en: string, pt: string) => helperLocale() === 'pt' ? pt : helperText(en);
  const [name, setName] = useState(() => helperLocale() === 'pt' ? 'aniversarios' : 'birthdays');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState('');
  const [error, setError] = useState('');
  const alive = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const allowed = canCreateStarboard(context);
  async function create() {
    if (!context || !allowed || !validStarboardName(name) || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await api.createBirthdayChannel(name.trim().toLowerCase());
      if (!alive.current) return;
      if (result.guildId !== context.guildId || result.channel.type !== 0 || !result.channel.id || !result.channel.name) {
        throw new Error('birthday_response_invalid');
      }
      onCreated({ id: result.channel.id, name: result.channel.name, type: 'text' });
      setCreated(result.channel.name);
    } catch (cause) {
      if (!alive.current) return;
      const code = cause instanceof Error ? cause.message : '';
      const messages: Record<string, string> = {
        birthday_channel_name_exists: text('A channel with this name already exists. Select it above or choose another name; its permissions were not changed.', 'Já existe um canal com este nome. Seleciona-o acima ou escolhe outro nome; as permissões não foram alteradas.'),
        birthday_existing_channel_changed: text('The previously created channel changed in Discord. Check it and select it above; it was not modified.', 'O canal criado anteriormente foi alterado no Discord. Verifica-o e seleciona-o acima; não foi modificado.'),
        birthday_bot_permissions_required: text('Helper needs channel, role, messaging and thread permissions to create the read-only channel. Refresh Discord resources after updating permissions.', 'O Helper precisa de permissões de canais, cargos, mensagens e threads para criar o canal de leitura. Atualiza os recursos Discord depois de alterar as permissões.'),
        birthday_user_manage_channels_required: text('Your account needs Manage Server and Manage Channels, or Administrator.', 'A tua conta precisa de gerir servidor e canais, ou de Administrador.'),
        birthday_creation_busy: text('Another channel is being created. Wait before retrying.', 'Está a ser criado outro canal. Aguarda antes de repetir.'),
        birthday_creation_rate_limited: text('Discord is limiting channel creation. Wait before retrying.', 'O Discord está a limitar a criação de canais. Aguarda antes de repetir.'),
        birthday_channel_limit_reached: text('The server reached its channel limit. Select an existing channel.', 'O servidor atingiu o limite de canais. Seleciona um canal existente.'),
        birthday_everyone_administrator: text('Remove Administrator from @everyone before creating a read-only channel.', 'Remove Administrador de @everyone antes de criar um canal de leitura.'),
        discord_context_unavailable: text('Refresh Discord resources before retrying.', 'Atualiza os recursos Discord antes de repetir.'),
        unauthenticated: text('Your session expired. Sign in again.', 'A sessão expirou. Inicia sessão novamente.'),
        csrf_origin_invalid: text('Reload the panel before creating a channel.', 'Recarrega o painel antes de criar um canal.'),
      };
      setError(messages[code] ?? text('Creation could not be confirmed. Check Discord before retrying to avoid duplicates. The selected channel was not changed.', 'Não foi possível confirmar a criação. Verifica o Discord antes de repetir para evitar duplicados. O canal selecionado não foi alterado.'));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return <section className="birthday-channel" aria-label={text('Create a birthday channel', 'Criar canal de aniversários')}>
    {!created && <>
      <label className="field"><span>{text('Or create a new channel', 'Ou cria um canal novo')}</span>
        <input value={name} maxLength={80} disabled={busy} onChange={event => setName(event.target.value)} aria-invalid={!validStarboardName(name)} />
        {!validStarboardName(name) && <small>{text('Use 2–80 letters, numbers, hyphens or underscores.', 'Usa 2–80 letras, números, hífenes ou underscores.')}</small>}
      </label>
      <button type="button" className="secondary" disabled={busy || !allowed || !validStarboardName(name)} onClick={() => void create()}>
        {busy ? text('Creating channel…', 'A criar canal…') : text('Create birthday channel', 'Criar canal de aniversários')}
      </button>
      <p>{text('Members can read and react. Only Helper and administrators can post.', 'Os membros podem ler e reagir. Só o Helper e os administradores podem publicar.')}</p>
    </>}
    {!allowed && <p role="status">{text('Refresh Discord resources and check Helper channel, role, messaging and thread permissions. Administrator is not required.', 'Atualiza os recursos Discord e verifica as permissões de canais, cargos, mensagens e threads do Helper. Não precisa de Administrador.')}</p>}
    {error && <p className="starboard-channel__error" role="alert">{error}</p>}
    {created && <p className="starboard-channel__success" role="status">{(helperLocale() === 'pt' ? `#${created} está pronto e selecionado. Verifica a gravação automática acima. Ativa Aniversários para enviar as mensagens.` : helperText("#{channel} is ready and selected. Check automatic saving above. Enable Birthdays to send announcements.", { channel: created }))}</p>}
  </section>;
}

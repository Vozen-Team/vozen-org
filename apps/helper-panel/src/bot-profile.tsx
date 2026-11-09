import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type BotProfileChanges, type BotProfileState } from './api';
import { helperLocale, helperText } from './i18n';
import copy from './bot-profile-copy.json';
import './bot-profile.css';

const defaultAvatar = '/assets/settings-helper.png';
const maxBytes = 2 * 1024 * 1024;
const acceptedImages = 'image/png,image/jpeg,image/webp';
type ImageField = 'avatar' | 'banner';
type Message = 'failed' | 'saved' | 'invalidImage' | 'invalidName' | 'permission' | 'premium' | 'rate' | 'syncFailed';

export const botProfileTitle = () => copy[helperLocale()].title;

async function prepareImage(file: File): Promise<string> {
  if (!acceptedImages.split(',').includes(file.type) || file.size > maxBytes) throw new Error('invalid_image');
  const image = await createImageBitmap(file);
  try {
    if (image.width > 4096 || image.height > 4096) throw new Error('invalid_dimensions');
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('image_context');
    context.drawImage(image, 0, 0);
    // Encode a static frame in a format Discord documents for profile uploads.
    const fits = (data: string) => {
      const encoded = data.slice(data.indexOf(',') + 1);
      const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
      return encoded.length > 0 && encoded.length * 3 / 4 - padding <= maxBytes;
    };
    const png = file.type === 'image/jpeg' ? '' : canvas.toDataURL('image/png');
    if (png && fits(png)) return png;
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL('image/jpeg', 0.92);
    if (!fits(jpeg)) throw new Error('invalid_size');
    return jpeg;
  } finally {
    image.close();
  }
}

function saveError(error: unknown): Message {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'rate';
    if (error.message === 'premium_required') return 'premium';
    if (error.message === 'invalid_nickname') return 'invalidName';
    if (error.message === 'invalid_bot_profile_image') return 'invalidImage';
    if (error.message === 'bot_profile_sync_failed') return 'syncFailed';
    if (error.status === 403) return 'permission';
  }
  return 'failed';
}

export function BotProfile({ guildId, preview }: { guildId: string; preview: boolean }) {
  const labels = copy[helperLocale()];
  const [saved, setSaved] = useState<BotProfileState | null>(() => preview ? {
    guildId, nick: '', avatarUrl: null, bannerUrl: null, customAvatar: false, customBanner: false, canEditImages: true,
  } : null);
  const [nick, setNick] = useState('');
  const [images, setImages] = useState<Partial<Record<ImageField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [retry, setRetry] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const changed = saved && (nick.trim() !== saved.nick || Boolean(images.avatar || images.banner));
  const custom = saved && Boolean(saved.nick || saved.customAvatar || saved.customBanner);

  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    api.botProfile(guildId, { signal: controller.signal }).then(profile => {
      if (controller.signal.aborted) return;
      if (profile.guildId !== guildId) throw new Error('guild_changed');
      setSaved(profile);
      setNick(profile.nick);
    }).catch(() => {
      if (!controller.signal.aborted) setMessage('failed');
    });
    return () => controller.abort();
  }, [guildId, preview, retry]);

  async function selectImage(key: ImageField, file?: File) {
    if (!file || busy || !saved?.canEditImages) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await prepareImage(file);
      setImages(current => ({ ...current, [key]: data }));
    } catch {
      setMessage('invalidImage');
    } finally {
      setBusy(false);
    }
  }

  async function apply(fields: BotProfileChanges) {
    if (!saved || busy) return;
    if (fields.nick && (Array.from(fields.nick).length > 32 || /[\u0000-\u001f\u007f-\u009f]/.test(fields.nick))) {
      setMessage('invalidName');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const profile = preview ? {
        ...saved,
        nick: fields.nick === undefined ? saved.nick : fields.nick ?? '',
        avatarUrl: fields.avatar === undefined ? saved.avatarUrl : fields.avatar,
        bannerUrl: fields.banner === undefined ? saved.bannerUrl : fields.banner,
        customAvatar: fields.avatar === undefined ? saved.customAvatar : Boolean(fields.avatar),
        customBanner: fields.banner === undefined ? saved.customBanner : Boolean(fields.banner),
      } : await api.updateBotProfile(guildId, fields);
      if (profile.guildId !== guildId) throw new Error('guild_changed');
      setSaved(profile);
      setNick(profile.nick);
      setImages({});
      setMessage('saved');
    } catch (error) {
      setMessage(saveError(error));
    } finally {
      setBusy(false);
    }
  }

  function restore() {
    if (!saved || busy) return;
    if (!custom) {
      setNick(saved.nick);
      setImages({});
      setMessage(null);
      return;
    }
    if (!window.confirm(labels.confirm)) return;
    void apply({
      ...(saved.nick ? { nick: null } : {}),
      ...(saved.customAvatar ? { avatar: null } : {}),
      ...(saved.customBanner ? { banner: null } : {}),
    });
  }

  function imageEditor(key: ImageField, url: string | null, input: typeof avatarInput) {
    return <div className={`tts-profile-${key}`}>
      {url && <img src={url} alt="" />}
      {saved?.canEditImages && <>
        <button type="button" data-image={key} disabled={busy} aria-label={labels[key]}
          onClick={() => input.current?.click()}><span aria-hidden="true">✎</span></button>
        {images[key] && <button type="button" data-undo={key} disabled={busy} aria-label={labels.undo.replace('{image}', labels[key])}
          onClick={() => setImages(current => ({ ...current, [key]: undefined }))}>↶</button>}
      </>}
      <input ref={input} name={key} type="file" accept={acceptedImages} hidden onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        void selectImage(key, file);
      }} />
    </div>;
  }

  return <section className="workspace-card tts-bot-profile helper-bot-profile" aria-labelledby="helperBotProfileTitle">
    <h2 id="helperBotProfileTitle">{labels.server}</h2>
    <p>{labels.intro}</p>
    {saved && <form onSubmit={event => {
      event.preventDefault();
      if (changed) void apply({ ...images, ...(nick.trim() !== saved.nick ? { nick: nick.trim() || null } : {}) });
    }}>
      <div className="tts-profile-preview">
        {imageEditor('banner', images.banner ?? saved.bannerUrl, bannerInput)}
        {imageEditor('avatar', images.avatar ?? saved.avatarUrl ?? defaultAvatar, avatarInput)}
        <div className="tts-profile-body">
          <label htmlFor="helperProfileNick">{labels.name}</label>
          <div className="tts-profile-name">
            <input id="helperProfileNick" autoComplete="off" value={nick} placeholder="Vozen Helper"
              aria-describedby="helperProfileCount" disabled={busy}
              onChange={event => setNick(Array.from(event.currentTarget.value).slice(0, 32).join(''))} />
            <span>APP</span>
          </div>
          <small id="helperProfileCount">{labels.count.replace('{n}', String(Array.from(nick).length))}</small>
          <p className="tts-profile-caption">{labels.preview}</p>
        </div>
      </div>
      <p>{saved.canEditImages ? labels.images : labels.premium}</p>
      <div className="tts-profile-actions">
        <button type="submit" className="workspace-button" disabled={!changed || busy}>{labels.apply}</button>
        <button type="button" className="workspace-button workspace-button--secondary"
          disabled={busy || (!custom && !changed)} onClick={restore}>{labels.restore}</button>
      </div>
    </form>}
    <p className="tts-profile-status" role={message && message !== 'saved' ? 'alert' : 'status'}>
      {message ? labels[message] : !saved ? labels.loading : busy ? helperText('Saving…') : ''}
    </p>
    {!saved && message && <button type="button" className="workspace-button workspace-button--secondary"
      onClick={() => { setMessage(null); setRetry(value => value + 1); }}>{helperText('Try again')}</button>}
  </section>;
}

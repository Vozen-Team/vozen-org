import {useEffect,useState} from 'react';
import {api,type GuildContext,type ShopProduct,type ShopProductInput,type ShopOrder,type ShopPage} from './api';
import {shopText as t} from './economy-shop-i18n';
import {helperLocale} from './i18n';
import {roleResourceLabel} from './role-resource';
import './economy-shop.css';

const blank:ShopProductInput={name:'',price:100,delivery:'manual',roleId:null};
export function EconomyShop({context,localPreviewMode}:{context:GuildContext|null;localPreviewMode:boolean}) {
  const guild=context?.guildId??'';
  const [data,setData]=useState<ShopPage|null>(null);
  const [draft,setDraft]=useState<ShopProductInput>(blank);
  const [editing,setEditing]=useState<ShopProduct>();
  const [tab,setTab]=useState<'products'|'orders'>('products');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [channelName,setChannelName]=useState('shop-orders');
  const [createdChannel,setCreatedChannel]=useState<{guildId:string;id:string;name:string}|null>(null);
  const usable=!localPreviewMode && !!guild;
  async function load(before?:number,signal?:AbortSignal) {
    const result=await api.shop(guild,before,signal);
    if(result.guildId!==guild) throw new Error('guild_changed');
    setData(current=>before&&current?{...result,orders:[...current.orders,...result.orders]}:result);
  }
  useEffect(()=>{
    if(!usable){setLoading(false);return;}
    const controller=new AbortController();
    void load(undefined,controller.signal).catch(()=>{if(!controller.signal.aborted)setError(t('loadError'));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[guild,usable]);
  async function mutate(action:()=>Promise<unknown>,reset=false) {
    if(busy||!usable)return;
    setBusy(true);setError('');
    try {await action();if(reset){setDraft(blank);setEditing(undefined);}await load();}
    catch(cause){const message=cause instanceof Error?cause.message:'';setError(t(message==='shop_invalid_channel'?'channelError':message==='shop_role_unavailable'?'roleError':message==='shop_changed'?'changed':'error'));}
    finally {setBusy(false);}
  }
  const products=data?.products??[];
  const roles=(context?.roles??[]).filter(role=>!role.managed&&role.manageable!==false);
  const channels=[...(context?.channels??[])];
  if(createdChannel?.guildId===guild&&!channels.some(channel=>channel.id===createdChannel.id))channels.push({...createdChannel,type:'text'});
  async function createChannel() {
    if(busy||!usable)return;
    setBusy(true);setError('');
    try {
      const result=await api.createShopChannel(guild,channelName.trim().toLowerCase());
      if(result.guildId!==guild)throw new Error('guild_changed');
      setCreatedChannel({guildId:guild,...result.channel});
      await load();
    } catch {setError(t('createError'));}
    finally {setBusy(false);}
  }
  async function resolve(order:ShopOrder,status:'delivered'|'refunded') {
    if(status==='refunded'&&!window.confirm(t('refundConfirm')))return;
    await mutate(()=>api.resolveShopOrder(guild,order.id,status));
  }
  return <section className="card config-section economy-shop" aria-label={t('shop')}>
    <div className="economy-shop__heading"><h3>{t('shop')}</h3><code>/shop</code></div>
    <label className="field economy-shop__notifications">{t('noticeChannel')}
      <select value={data?.staffChannel??''} disabled={busy||loading||!usable} onChange={event=>void mutate(()=>api.shopNotifications(guild,event.target.value))}>
        <option value="">{t('off')}</option>{channels.filter(channel=>['text','announcement'].includes(channel.type)).map(channel=><option key={channel.id} value={channel.id}>#{channel.name}</option>)}
      </select><small>{t('noticeHelp')}</small>
    </label>
    <div className="economy-shop__create-channel">
      <label className="field">{t('channelName')}<input value={channelName} maxLength={80} disabled={busy||loading||!usable} onChange={event=>setChannelName(event.target.value)}/></label>
      <button type="button" className="secondary" disabled={busy||loading||!usable||! /^[a-z0-9_-]{2,80}$/.test(channelName.trim().toLowerCase())} onClick={()=>void createChannel()}>{t('createChannel')}</button>
      <small>{t('createHelp')}</small>
    </div>
    {!!data?.failedNotices&&<p role="alert">{t('noticeFailed')}</p>}
    <div className="economy-shop__tabs" role="group" aria-label={t('shop')}>
      <button type="button" className="secondary" aria-pressed={tab==='products'} onClick={()=>setTab('products')}>{t('products')} · {products.length}/20</button>
      <button type="button" className="secondary" aria-pressed={tab==='orders'} onClick={()=>setTab('orders')}>{t('orders')}</button>
      <button type="button" className="link-button" disabled={busy||loading||!usable} onClick={()=>void mutate(()=>Promise.resolve())}>{t('refresh')}</button>
    </div>
    {error&&<p role="alert">{error}</p>}
    <div aria-busy={busy||loading}>
    {tab==='products'?<>
      <div className="economy-shop__list">{products.map(product=><div className="economy-shop__row" key={product.id}>
        <div><strong>{product.name}</strong><small>{product.price.toLocaleString(helperLocale())} · {t(product.delivery==='role'?'role':'manual')}</small></div>
        <div className="economy-shop__actions">
          <button type="button" className="secondary" disabled={busy} aria-label={`${t('edit')}: ${product.name}`} onClick={()=>{setEditing(product);setDraft({name:product.name,price:product.price,delivery:product.delivery,roleId:product.roleId});}}>{t('edit')}</button>
          <button type="button" className="secondary" disabled={busy||!usable} aria-label={`${t('remove')}: ${product.name}`} onClick={()=>{if(window.confirm(t('removeConfirm')))void mutate(()=>api.removeShopProduct(guild,product),editing?.id===product.id);}}>{t('remove')}</button>
        </div>
      </div>)}</div>
      {!loading&&products.length===0&&<p>{t('empty')}</p>}
      <form onSubmit={event=>{event.preventDefault();void mutate(()=>api.saveShopProduct(guild,{...draft,name:draft.name.trim()},editing),true);}}>
        <fieldset disabled={busy||loading||!usable||(!editing&&products.length>=20)}>
          <div className="economy-shop__fields">
            <label className="field">{t('name')}<input required maxLength={60} value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></label>
            <label className="field">{t('price')}<input type="number" required min={1} max={1000000} step={1} value={draft.price} onChange={event=>setDraft({...draft,price:Number(event.target.value)})}/></label>
            <label className="field">{t('delivery')}<select value={draft.delivery} onChange={event=>setDraft({...draft,delivery:event.target.value as 'manual'|'role',roleId:null})}><option value="manual">{t('manual')}</option><option value="role">{t('role')}</option></select></label>
            {draft.delivery==='role'&&<label className="field">{t('role')}<select required value={draft.roleId??''} onChange={event=>setDraft({...draft,roleId:event.target.value||null})}><option value="">—</option>{roles.map(role=><option key={role.id} value={role.id}>{roleResourceLabel(role)}</option>)}</select></label>}
          </div>
          {draft.delivery==='manual'&&<small>{t('manualHelp')}</small>}
          <div className="economy-shop__actions"><button type="submit" className="primary" disabled={!draft.name.trim()}>{t(editing?'save':'add')}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(undefined);setDraft(blank);}}>{t('cancel')}</button>}</div>
        </fieldset>
      </form>
    </>:<>
      <div className="economy-shop__list">{data?.orders.map(order=><div className="economy-shop__row" key={order.id}>
        <div><strong>#{order.id} · {order.displayName}</strong><span>{order.productName} · {order.price.toLocaleString(helperLocale())}</span><small>{new Date(order.createdAt).toLocaleString(helperLocale())} · {t(order.delivery==='role'?'role':'manual')}</small></div>
        <div className="economy-shop__actions"><span className="economy-shop__status">{t(order.status==='pending'?'pending':order.status==='delivered'?'delivered':'refunded')}</span>
          {order.status==='pending'&&<><button type="button" className="secondary" disabled={busy||!usable} onClick={()=>void resolve(order,'delivered')}>{t('complete')}</button><button type="button" className="secondary" disabled={busy||!usable} onClick={()=>void resolve(order,'refunded')}>{t('refund')}</button></>}
        </div>
      </div>)}</div>
      {!loading&&!data?.orders.length&&<p>{t('empty')}</p>}
      {data?.nextCursor&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setBusy(true);void load(data.nextCursor!).catch(()=>setError(t('loadError'))).finally(()=>setBusy(false));}}>{t('more')}</button>}
    </>}
    </div>
  </section>;
}

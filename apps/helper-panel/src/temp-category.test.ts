import {afterEach,expect,it,vi} from 'vitest';
vi.hoisted(()=>vi.stubGlobal('window',{location:{hash:''}}));
vi.mock('./i18n',()=>({helperLocale:()=> 'en'}));
import {canCreateTempCategory} from './temp-category-create';
import type {GuildContext} from './api';
afterEach(()=>vi.unstubAllGlobals());
const context=(permissions:string,extra:Partial<GuildContext>={})=>({guildId:'10',bot:{available:true,permissions},...extra} as GuildContext);
it('needs only Manage Channels on a fresh bot snapshot',()=>{
  expect(canCreateTempCategory(context('16'))).toBe(true);
  expect(canCreateTempCategory(context('8'))).toBe(true);
  for(const permissions of ['0','2048','268435456','bad','-1'])expect(canCreateTempCategory(context(permissions))).toBe(false);
  expect(canCreateTempCategory(context('16',{stale:true}))).toBe(false);
  expect(canCreateTempCategory(null)).toBe(false);
});
it('binds category creation to the expected guild without permission overrides',async()=>{
  vi.stubGlobal('window',{location:{hash:''}});
  const {api}=await import('./api');
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({guildId:'10',channel:{id:'50',name:'temporary-rooms',type:4},reused:false}),{status:200,headers:{'Content-Type':'application/json'}}));
  vi.stubGlobal('fetch',fetch);
  expect((await api.createTempCategory('10','temporary-rooms')).channel.type).toBe(4);
  const [url,options]=fetch.mock.calls[0];
  expect(url).toContain('/api/temp-channels/category');
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({name:'temporary-rooms',guildId:'10'});
});

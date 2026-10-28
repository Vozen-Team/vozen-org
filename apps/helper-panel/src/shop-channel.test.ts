import {afterEach,expect,it,vi} from 'vitest';
import {shopText} from './economy-shop-i18n';
vi.mock('./i18n',()=>({helperLocale:()=> 'en'}));
afterEach(()=>vi.unstubAllGlobals());
it('creates a shop channel bound to the expected guild without arbitrary permissions',async()=>{
  vi.stubGlobal('window',{location:{hash:''}});
  const {api}=await import('./api');
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({guildId:'10',channel:{id:'30',name:'shop-orders',type:0},reused:false}),{status:200,headers:{'Content-Type':'application/json'}}));
  vi.stubGlobal('fetch',fetch);
  expect((await api.createShopChannel('10','shop-orders')).channel.id).toBe('30');
  const [url,options]=fetch.mock.calls[0];
  expect(url).toContain('/api/economy/channel?guildId=10');
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({name:'shop-orders'});
});
it('translates every shop channel control into all site languages',()=>{
  for(const locale of ['en','pt','fr','es','de','tr','ar','zh','ru','ko'] as const){
    for(const key of ['channelName','createChannel','createHelp','createError'] as const){
      expect(shopText(key,locale)).toBeTruthy();
      if(locale!=='en')expect(shopText(key,locale)).not.toBe(shopText(key,'en'));
    }
  }
});

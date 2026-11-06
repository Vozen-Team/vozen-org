import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSiteServer,closeSiteServer} from './serve-site.mjs';

// Local-only fixture. Every API response and write stays in the browser tab.
function previewFixture(){
  const user={id:'123456789012345678',username:'Rexy',avatar:null};
  const guild={id:'999',name:'Vozen community',permissions:'32'};
  const config={autoread:true,readBots:false,textInVoice:false,antispam:true,translationEnabled:false,ttsChannelId:'123',defaultVoice:'amy',xsaid:false,autojoin:true,greetOnJoin:false,stayInCall:false,streakAnnounce:true,soundboard:true,votePromos:false,maxChars:600,ratePerMin:20,locale:'en',priorityRoleId:null,blockedRoleId:null};
  const names=['Rexy','Mia','Sora','Leo','Luna','Kai','Nico','Alex'];
  const counts=[2846,2319,1987,1654,1422,1186,943,718];
  const streaks=[28,19,24,12,16,8,11,6];
  const meta={config,channelProfiles:[{channelId:'123',autoRead:true}],capabilities:{channelProfiles:true,ttsChannelId:true,defaultVoice:true},options:{channels:[{id:'123',label:'#tts-chat'},{id:'124',label:'#general'}],voices:[{id:'amy',label:'Amy'}],locales:[{id:'en',label:'English'},{id:'pt',label:'Português'}],roles:[],voiceChannels:[]},leaderboard:{demo:true,entries:names.map((name,index)=>({name,count:counts[index],streak:streaks[index]}))}};
  const profile={botId:'123456789012345679',canEditImages:false,defaultName:'Vozen TTS',defaultAvatar:null,nick:null,avatar:null,banner:null,bio:''};
  sessionStorage.setItem('vozen.ecosystem.dtoken','local-preview-only');
  sessionStorage.setItem('vozen.ecosystem.authexp',String(Date.now()+3600000));
  sessionStorage.setItem('vozen.tts.lastGuild',guild.id);
  sessionStorage.setItem('vozen.navuser',JSON.stringify({user}));
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,options={}){
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(url.origin===location.origin)return originalFetch(input,options);
    if(url.origin!=='https://api.vozen.org')throw new Error('External requests disabled in this local preview');
    const method=options.method||'GET';
    const path=url.pathname;
    let data={user,plus:{active:false},pass:{active:false,servers:[]}};
    if(path==='/api/dashboard/guilds')data={guilds:[guild]};
    else if(path==='/api/dashboard/guild/999'){
      if(method==='POST')Object.assign(config,JSON.parse(options.body));
      data=meta;
    }else if(path==='/api/dashboard/guild/999/bot-profile'){
      if(method==='POST')Object.assign(profile,JSON.parse(options.body));
      data=profile;
    }else if(path.startsWith('/api/dashboard/guild/999/profile/')){
      const channelId=path.split('/').at(-1);
      if(method==='DELETE'){meta.channelProfiles=meta.channelProfiles.filter(x=>x.channelId!==channelId);return new Response(null,{status:204});}
      if(method==='POST'){meta.channelProfiles=meta.channelProfiles.filter(x=>x.channelId!==channelId);meta.channelProfiles.push({channelId,...JSON.parse(options.body)});}
      data=meta;
    }
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  };
}

export async function createTtsOverviewPreview(port=0){
const {server,origin}=await createSiteServer(port);
const handler=server.listeners('request')[0];
server.removeListener('request',handler);
server.on('request',async(req,res)=>{
  const path=new URL(req.url,origin).pathname;
  if(path==='/__tts-preview.js'){
    res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
    res.end('('+previewFixture.toString()+')();');return;
  }
  if(path==='/dashboard.html'||path==='/dashboard'){
    const html=await readFile(resolve(process.env.SITE_ROOT||'site','dashboard.html'),'utf8');
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store','X-Vozen-Preview':'demo'});
    res.end(html.replace('<head>','<head><script src="/__tts-preview.js"></script>'));return;
  }
  handler(req,res);
});
return {server,origin};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {server,origin}=await createTtsOverviewPreview(Number(process.argv[2]||4186));
  console.log('Local preview: '+origin+'/dashboard.html (demo data only)');
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void closeSiteServer(server);});
}

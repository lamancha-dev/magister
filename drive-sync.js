/* MAGISTER 4.4 — Sincronização automática com o Google Drive (appDataFolder).
   - Envia as alterações sozinha, 2 segundos depois de cada mudança e ao sair da aplicação.
   - Recebe as alterações sozinha ao abrir/voltar à aplicação e a cada 30 segundos.
   - Quando os dois aparelhos mudaram, JUNTA as alterações (não apaga nada de nenhum lado).
   - Lembra-se de que a conta estava ligada; se a autorização Google expirar, mostra
     um botão «Toque para sincronizar» (a Google exige um toque para renovar).
   Sem chaves privadas no código. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const base='https://www.googleapis.com/drive/v3/files', upload='https://www.googleapis.com/upload/drive/v3/files';
const key='magister-drive-client-id', syncKey='magister-drive-baseline-v1', linkedKey='magister-drive-ligado', tokenKey='magister-drive-sessao';
const DEFAULT_ID='331754035238-gls1ttgk5a7u1n3c31a5o31ek9gtgkv1.apps.googleusercontent.com';
let token='',tokenExpires=0,tokenClient=null,fileId='',baseline=localStorage.getItem(syncKey)||'';
let busy=false,again=false,pushTimer=null,pollTimer=null;

const status=msg=>{$('driveStatus').textContent=msg};
const clientId=()=>($('driveClientId').value.trim()||DEFAULT_ID);
$('driveClientId').value=localStorage.getItem(key)||DEFAULT_ID;
const wasLinked=()=>localStorage.getItem(linkedKey)==='1';
const hasToken=()=>!!token&&Date.now()<tokenExpires;

/* ---------- botão flutuante «Toque para sincronizar» ---------- */
const css=document.createElement('style');
css.textContent='#drivePill{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:70;display:none;align-items:center;gap:8px;border:0;border-radius:999px;padding:11px 18px;background:#073943;color:#fff;font:600 14px Inter,"Segoe UI",Arial,sans-serif;box-shadow:0 8px 24px rgba(7,57,67,.3);cursor:pointer;white-space:nowrap}#drivePill.on{display:flex}#drivePill i{width:9px;height:9px;border-radius:50%;background:#FFBF08}@media(max-width:680px){#drivePill{bottom:calc(84px + env(safe-area-inset-bottom))}}';
document.head.appendChild(css);
const pill=document.createElement('button');
pill.id='drivePill';pill.type='button';pill.innerHTML='<i></i>Toque para sincronizar';
document.body.appendChild(pill);
const showPill=on=>pill.classList.toggle('on',!!on);
pill.onclick=()=>requestToken(false);

/* ---------- dados ---------- */
function snapshot(){return JSON.stringify({version:3,items:data.items,breaks:data.breaks,logo:data.logo,schoolLogo:data.schoolLogo,teacherName:data.teacherName,teacherTitle:data.teacherTitle,schoolYear});}
function install(s){const d=JSON.parse(s);
  if(!Array.isArray(d.items)||!Array.isArray(d.breaks))throw Error('Dados inválidos no Drive');
  data={...data,...d};schoolYear=Number(d.schoolYear)||schoolYear;
  localStorage.setItem(storage,JSON.stringify(data));
  $('teacherName').value=data.teacherName||'';$('teacherTitle').value=data.teacherTitle||'Professora';
  renderSchoolLogo();renderLogo();render();}
function setBaseline(s){baseline=s;localStorage.setItem(syncKey,s)}
const parse=s=>{try{return JSON.parse(s)}catch{return null}};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/* Junta as alterações dos dois lados, usando a última versão comum (baseline) como referência:
   - registo novo num dos lados → fica;
   - registo apagado num dos lados → é apagado;
   - registo alterado num lado → fica a alteração (se mudou nos dois, ganha este aparelho). */
function mergeList(b,l,r){
  const B=new Map((b||[]).map(x=>[x.id,x])),L=new Map((l||[]).map(x=>[x.id,x])),R=new Map((r||[]).map(x=>[x.id,x]));
  const ids=[...new Set([...L.keys(),...R.keys()])],out=[];
  for(const id of ids){const inB=B.has(id),inL=L.has(id),inR=R.has(id);
    if(inB){if(!inL||!inR)continue;out.push(same(L.get(id),B.get(id))?R.get(id):L.get(id))}
    else out.push(inL?L.get(id):R.get(id));}
  return out;}
function merge(baseS,localS,remoteS){
  const b=parse(baseS),l=parse(localS),r=parse(remoteS),m={version:3};
  m.items=mergeList(b?.items,l.items,r.items);
  m.breaks=mergeList(b?.breaks,l.breaks,r.breaks);
  for(const k of ['logo','schoolLogo','teacherName','teacherTitle','schoolYear']){
    if(b)m[k]=same(l[k],b[k])?r[k]:l[k];
    else m[k]=(l[k]!==undefined&&l[k]!==''&&l[k]!==null)?l[k]:r[k];}
  return JSON.stringify(m);}

/* ---------- Google Drive ---------- */
async function api(url,options={}){
  if(!hasToken())throw Error('sem-autorizacao');
  const res=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,...options.headers}});
  if(res.status===401){token='';throw Error('sem-autorizacao')}
  if(!res.ok)throw Error('Google Drive: '+res.status+' '+(await res.text()).slice(0,160));
  return res.status===204?null:res.json();}
async function locate(){const q=new URLSearchParams({spaces:'appDataFolder',fields:'files(id,name,modifiedTime)',pageSize:'100'});
  const r=await api(base+'?'+q);const f=(r.files||[]).find(x=>x.name==='magister-dados.json');fileId=f?.id||'';return !!fileId;}
const readRemote=()=>api(base+'/'+encodeURIComponent(fileId)+'?alt=media');
async function writeRemote(content){const payload=JSON.stringify(JSON.parse(content));
  if(!fileId){const boundary='magister_'+Date.now();
    const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:'magister-dados.json',parents:['appDataFolder'],mimeType:'application/json'})+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+payload+'\r\n--'+boundary+'--';
    const r=await api(upload+'?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});fileId=r.id;}
  else await api(upload+'/'+encodeURIComponent(fileId)+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:payload,keepalive:payload.length<60000});}

const hora=()=>new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
async function sync(){
  if(!navigator.onLine)return;
  if(!hasToken()){if(wasLinked()){showPill(true);status('A autorização Google expirou. Toque em «Toque para sincronizar».')}return}
  if(busy){again=true;return}
  busy=true;$('driveSync').disabled=true;
  try{
    await locate();const local=snapshot();
    if(!fileId){await writeRemote(local);setBaseline(local);status('Sincronizado às '+hora()+' (primeira cópia no Drive).');return}
    const remote=JSON.stringify(await readRemote());
    if(remote===local){setBaseline(local);status('Tudo sincronizado às '+hora()+'.');return}
    const localChanged=local!==baseline,remoteChanged=remote!==baseline;
    if(!localChanged&&remoteChanged){install(remote);setBaseline(remote);status('Alterações recebidas às '+hora()+'.');return}
    if(localChanged&&!remoteChanged){await writeRemote(local);setBaseline(local);status('Alterações enviadas às '+hora()+'.');return}
    const merged=merge(baseline,local,remote);
    if(merged!==local)install(merged);
    if(merged!==remote)await writeRemote(merged);
    setBaseline(merged);status('Alterações dos dois aparelhos juntas às '+hora()+'.');
  }catch(e){
    if(e.message==='sem-autorizacao'){showPill(true);status('A autorização Google expirou. Toque em «Toque para sincronizar».')}
    else status('Sincronização não concluída: '+e.message);
  }finally{busy=false;$('driveSync').disabled=!hasToken();if(again){again=false;setTimeout(sync,500)}}}

/* ---------- autorização ---------- */
function makeClient(){
  if(!window.google?.accounts?.oauth2)return null;
  if(!tokenClient)tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId(),scope:'https://www.googleapis.com/auth/drive.appdata',
    callback:r=>{if(r.error){status('Autorização recusada: '+r.error);return}
      token=r.access_token;tokenExpires=Date.now()+((Number(r.expires_in)||3600)-60)*1000;
      try{localStorage.setItem(tokenKey,JSON.stringify({t:token,e:tokenExpires}))}catch{}connected();},
    error_callback:()=>{if(wasLinked())showPill(true)}});
  return tokenClient;}
function requestToken(firstTime){
  const id=clientId();
  if(!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)){status('Introduz um Client ID OAuth válido da Google Cloud.');return}
  localStorage.setItem(key,id);
  const c=makeClient();if(!c){status('Não foi possível carregar a autorização Google. Verifica a ligação à Internet.');return}
  c.requestAccessToken({prompt:firstTime?'consent':''});}
function connected(){
  localStorage.setItem(linkedKey,'1');showPill(false);
  $('driveConnect').textContent='Renovar autorização Google';$('driveSync').disabled=false;$('driveDisconnect').disabled=false;
  status('Conta Google ligada. A sincronizar…');sync();
  if(pollTimer)clearInterval(pollTimer);
  pollTimer=setInterval(()=>{if(!document.hidden)sync()},30000);}

$('driveConnect').onclick=()=>requestToken(!wasLinked());
$('driveSync').onclick=()=>hasToken()?sync():requestToken(false);
$('driveDisconnect').onclick=()=>{if(token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});
  token='';tokenExpires=0;fileId='';localStorage.removeItem(linkedKey);localStorage.removeItem(tokenKey);showPill(false);
  if(pollTimer)clearInterval(pollTimer);$('driveSync').disabled=true;$('driveDisconnect').disabled=true;
  $('driveConnect').textContent='Ligar conta Google';status('Conta desligada. Os dados locais foram preservados.');};

/* Cada alteração feita na aplicação é enviada 2 segundos depois. */
window.magisterLocalChanged=()=>{
  if(!wasLinked())return;
  status('A guardar alterações no Google Drive…');
  clearTimeout(pushTimer);pushTimer=setTimeout(sync,2000);};
window.addEventListener('online',()=>sync());
document.addEventListener('visibilitychange',()=>{clearTimeout(pushTimer);sync();});
window.addEventListener('pagehide',()=>{clearTimeout(pushTimer);sync();});

try{const sv=JSON.parse(localStorage.getItem(tokenKey)||'null');if(sv&&sv.t&&Date.now()<sv.e){token=sv.t;tokenExpires=sv.e}}catch{}
if(wasLinked()){$('driveConnect').textContent='Renovar autorização Google';if(hasToken())connected();else status('A ligar ao Google Drive…');}
const script=document.createElement('script');
script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
script.onload=()=>{if(wasLinked()&&!hasToken()){makeClient();showPill(true);status('Toque em «Toque para sincronizar» para continuar a sincronização.')}};
document.head.appendChild(script);
})();

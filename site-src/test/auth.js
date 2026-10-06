import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/+esm';

const SUPABASE_URL='https://nlymabguyrnxhfrvzzwr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_0LTrQJVEVnntfDovu2YgJw_22PfiXZu';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storageKey:'trip-quest-test-auth-v1'
  }
});

const $=(s)=>document.querySelector(s);
const gate=$('#authGate');
const form=$('#authForm');
const loginTab=$('#authLoginTab');
const signupTab=$('#authSignupTab');
const nicknameWrap=$('#authNicknameWrap');
const nickname=$('#authNickname');
const email=$('#authEmail');
const password=$('#authPassword');
const passwordConfirmWrap=$('#authPasswordConfirmWrap');
const passwordConfirm=$('#authPasswordConfirm');
const submit=$('#authSubmit');
const message=$('#authMessage');
const accountBar=$('#testAccountBar');
const accountName=$('#testAccountName');
const accountEmail=$('#testAccountEmail');
const logout=$('#testLogout');

let mode='login';
let appStarted=false;

function setMessage(text='',kind=''){
  message.textContent=text;
  message.className='tq-auth-message'+(kind?' '+kind:'');
}
function setBusy(busy){
  submit.disabled=busy;
  submit.textContent=busy?(mode==='login'?'로그인 중…':'가입 처리 중…'):(mode==='login'?'로그인':'회원가입');
}
function setMode(next){
  mode=next;
  const signup=mode==='signup';
  loginTab.classList.toggle('active',!signup);
  signupTab.classList.toggle('active',signup);
  loginTab.setAttribute('aria-selected',String(!signup));
  signupTab.setAttribute('aria-selected',String(signup));
  nicknameWrap.hidden=!signup;
  passwordConfirmWrap.hidden=!signup;
  password.autocomplete=signup?'new-password':'current-password';
  submit.textContent=signup?'회원가입':'로그인';
  setMessage('');
}
function lockApp(){
  document.body.classList.add('tq-auth-locked');
  gate.hidden=false;
  accountBar.hidden=true;
}
async function startApp(user){
  const display=user?.user_metadata?.nickname||user?.email?.split('@')[0]||'사용자';
  accountName.textContent=display;
  accountEmail.textContent=user?.email||'';
  gate.hidden=true;
  document.body.classList.remove('tq-auth-locked');
  accountBar.hidden=false;
  if(appStarted)return;
  appStarted=true;
  await import('./app.js?v=20261002-v112');
  await import('./app-chrome.js?v=112');
}
function friendlyError(err){
  const raw=String(err?.message||'').toLowerCase();
  if(raw.includes('invalid login credentials'))return '이메일 또는 비밀번호를 확인해주세요.';
  if(raw.includes('email not confirmed'))return '이메일 인증 후 로그인해주세요.';
  if(raw.includes('already registered'))return '이미 가입된 이메일입니다.';
  if(raw.includes('password')&&raw.includes('least'))return '비밀번호는 8자 이상으로 설정해주세요.';
  if(raw.includes('rate limit'))return '요청이 많습니다. 잠시 후 다시 시도해주세요.';
  return err?.message||'처리 중 오류가 발생했습니다.';
}

loginTab.addEventListener('click',()=>setMode('login'));
signupTab.addEventListener('click',()=>setMode('signup'));

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  setMessage('');
  const mail=email.value.trim();
  const pw=password.value;
  if(!mail||!pw){setMessage('이메일과 비밀번호를 입력해주세요.','error');return;}
  if(pw.length<8){setMessage('비밀번호는 8자 이상으로 설정해주세요.','error');return;}
  if(mode==='signup'&&pw!==passwordConfirm.value){setMessage('비밀번호 확인이 일치하지 않습니다.','error');return;}
  setBusy(true);
  try{
    if(mode==='login'){
      const {data,error}=await supabase.auth.signInWithPassword({email:mail,password:pw});
      if(error)throw error;
      if(data.user)await startApp(data.user);
    }else{
      const nick=nickname.value.trim();
      const {data,error}=await supabase.auth.signUp({
        email:mail,
        password:pw,
        options:{data:{nickname:nick||mail.split('@')[0]}}
      });
      if(error)throw error;
      if(data.session&&data.user){
        setMessage('회원가입이 완료되었습니다.','success');
        await startApp(data.user);
      }else{
        setMessage('회원가입 요청이 완료되었습니다. 인증 메일이 왔다면 인증 후 로그인해주세요.','success');
        setMode('login');
        email.value=mail;
        password.value='';
      }
    }
  }catch(err){
    setMessage(friendlyError(err),'error');
  }finally{
    setBusy(false);
  }
});

logout.addEventListener('click',async()=>{
  logout.disabled=true;
  try{await supabase.auth.signOut({scope:'local'});}
  finally{
    logout.disabled=false;
    location.reload();
  }
});

supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){lockApp();return;}
  if(session?.user&&!appStarted)queueMicrotask(()=>startApp(session.user));
});

lockApp();
try{
  const {data,error}=await supabase.auth.getUser();
  if(!error&&data?.user)await startApp(data.user);
}catch(_){
  lockApp();
}

window.__TRIP_QUEST_TEST_AUTH__={supabase};

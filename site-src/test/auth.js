let createClient;
try{
  const mod=await Promise.race([
    import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/+esm'),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('인증 서버 연결 시간이 초과되었습니다.')),8000))
  ]);
  createClient=mod.createClient;
}catch(err){
  document.body.classList.add('tq-auth-locked');
  const gate=document.querySelector('#authGate');if(gate)gate.hidden=false;
  const msg=document.querySelector('#loginMessage');
  if(msg){msg.textContent='인증 서버에 연결하지 못했습니다. 새로고침 후 다시 시도해주세요.';msg.className='tq-auth-message error'}
  throw err;
}

const SUPABASE_URL='https://nlymabguyrnxhfrvzzwr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_0LTrQJVEVnntfDovu2YgJw_22PfiXZu';
const REMEMBER_FLAG='trip-quest-test-auto-login-v2';
const AUTH_STORAGE_KEY='trip-quest-test-auth-v2';

const authStorage={
  getItem(key){
    return localStorage.getItem(REMEMBER_FLAG)==='1'
      ? localStorage.getItem(key)
      : sessionStorage.getItem(key);
  },
  setItem(key,value){
    if(localStorage.getItem(REMEMBER_FLAG)==='1'){
      localStorage.setItem(key,value);
      sessionStorage.removeItem(key);
    }else{
      sessionStorage.setItem(key,value);
      localStorage.removeItem(key);
    }
  },
  removeItem(key){
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storageKey:AUTH_STORAGE_KEY,
    storage:authStorage
  }
});

const $=(s)=>document.querySelector(s);
const gate=$('#authGate');
const loginView=$('#loginView');
const signupView=$('#signupView');
const openSignup=$('#openSignup');
const backToLogin=$('#backToLogin');
const loginForm=$('#loginForm');
const loginId=$('#loginId');
const loginPassword=$('#loginPassword');
const autoLogin=$('#autoLogin');
const loginMessage=$('#loginMessage');
const loginSubmit=$('#loginSubmit');
const signupForm=$('#signupForm');
const signupNickname=$('#signupNickname');
const signupEmail=$('#signupEmail');
const signupPassword=$('#signupPassword');
const signupPasswordConfirm=$('#signupPasswordConfirm');
const signupMessage=$('#signupMessage');
const signupSubmit=$('#signupSubmit');
const accountBar=$('#testAccountBar');
const accountName=$('#testAccountName');
const accountEmail=$('#testAccountEmail');
const logout=$('#testLogout');

let appStarted=false;

function setMessage(el,text='',kind=''){
  el.textContent=text;
  el.className='tq-auth-message'+(kind?' '+kind:'');
}
function showLogin(){
  signupView.hidden=true;
  loginView.hidden=false;
  setMessage(signupMessage);
  queueMicrotask(()=>loginId.focus());
}
function showSignup(){
  loginView.hidden=true;
  signupView.hidden=false;
  setMessage(loginMessage);
  queueMicrotask(()=>signupNickname.focus());
}
function lockApp(){
  document.body.classList.add('tq-auth-locked');
  gate.hidden=false;
  accountBar.hidden=true;
  showLogin();
}
async function startApp(user){
  const display=user?.user_metadata?.nickname||user?.email?.split('@')[0]||'사용자';
  accountName.textContent=display;
  accountEmail.textContent=user?.email||'';
  gate.hidden=true;
  document.body.classList.remove('tq-auth-locked');
  accountBar.hidden=true;
  if(appStarted)return;
  appStarted=true;
  try{
    await import('./app.js?v=20261008-courseone1');
    await import('./app-chrome.js?v=20261008-courseone1');
  }catch(err){
    appStarted=false;
    document.body.classList.add('tq-auth-locked');
    gate.hidden=false;
    loginView.hidden=false;
    signupView.hidden=true;
    setMessage(loginMessage,'앱을 시작하지 못했습니다. 새로고침 후 다시 시도해주세요.','error');
    console.error('TRIP QUEST startup failed',err);
    throw err;
  }
}
function friendlyLoginError(err){
  const raw=String(err?.message||'').toLowerCase();
  if(raw.includes('invalid login credentials'))return '아이디 또는 비밀번호를 확인해주세요.';
  if(raw.includes('email not confirmed'))return '이메일 인증 후 로그인해주세요.';
  if(raw.includes('rate limit'))return '요청이 많습니다. 잠시 후 다시 시도해주세요.';
  return err?.message||'로그인 중 오류가 발생했습니다.';
}
function friendlySignupError(err){
  const raw=String(err?.message||'').toLowerCase();
  if(raw.includes('already registered'))return '이미 가입된 이메일입니다.';
  if(raw.includes('password')&&raw.includes('least'))return '비밀번호는 8자 이상으로 설정해주세요.';
  if(raw.includes('rate limit'))return '요청이 많습니다. 잠시 후 다시 시도해주세요.';
  return err?.message||'회원가입 중 오류가 발생했습니다.';
}

autoLogin.checked=localStorage.getItem(REMEMBER_FLAG)==='1';
openSignup.addEventListener('click',showSignup);
backToLogin.addEventListener('click',showLogin);

loginForm.addEventListener('submit',async(e)=>{
  e.preventDefault();
  setMessage(loginMessage);
  const id=loginId.value.trim();
  const pw=loginPassword.value;
  if(!id||!pw){setMessage(loginMessage,'아이디와 비밀번호를 입력해주세요.','error');return;}
  if(autoLogin.checked)localStorage.setItem(REMEMBER_FLAG,'1');
  else localStorage.removeItem(REMEMBER_FLAG);
  loginSubmit.disabled=true;
  loginSubmit.textContent='로그인 중…';
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email:id,password:pw});
    if(error)throw error;
    if(data.user)await startApp(data.user);
  }catch(err){
    setMessage(loginMessage,friendlyLoginError(err),'error');
  }finally{
    loginSubmit.disabled=false;
    loginSubmit.textContent='로그인';
  }
});

signupForm.addEventListener('submit',async(e)=>{
  e.preventDefault();
  setMessage(signupMessage);
  const nick=signupNickname.value.trim();
  const mail=signupEmail.value.trim();
  const pw=signupPassword.value;
  if(!mail||!pw){setMessage(signupMessage,'이메일과 비밀번호를 입력해주세요.','error');return;}
  if(pw.length<8){setMessage(signupMessage,'비밀번호는 8자 이상으로 설정해주세요.','error');return;}
  if(pw!==signupPasswordConfirm.value){setMessage(signupMessage,'비밀번호 확인이 일치하지 않습니다.','error');return;}
  localStorage.removeItem(REMEMBER_FLAG);
  signupSubmit.disabled=true;
  signupSubmit.textContent='가입 처리 중…';
  try{
    const {data,error}=await supabase.auth.signUp({
      email:mail,
      password:pw,
      options:{data:{nickname:nick||mail.split('@')[0]}}
    });
    if(error)throw error;
    if(data.session&&data.user){
      await startApp(data.user);
    }else{
      showLogin();
      loginId.value=mail;
      setMessage(loginMessage,'회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.','success');
    }
  }catch(err){
    setMessage(signupMessage,friendlySignupError(err),'error');
  }finally{
    signupSubmit.disabled=false;
    signupSubmit.textContent='회원가입';
  }
});

logout.addEventListener('click',async()=>{
  logout.disabled=true;
  try{await supabase.auth.signOut({scope:'local'});}
  finally{
    localStorage.removeItem(REMEMBER_FLAG);
    authStorage.removeItem(AUTH_STORAGE_KEY);
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

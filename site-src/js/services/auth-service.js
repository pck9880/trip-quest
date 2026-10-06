import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL='https://nlymabguyrnxhfrvzzwr.supabase.co';
const SUPABASE_KEY='sb_publishable_0LTrQJVEVnntfDovu2YgJw_22PfiXZu';
export const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
const styles=['바다','산','도시','카페','맛집','관광','체험','드라이브','도보','조용한 여행','힙한 장소'];
function msg(t,bad=false){const el=$('#authMessage');if(!el)return;el.textContent=t;el.classList.toggle('error',bad)}
function showGate(){document.body.classList.add('auth-locked');$('#authGate').hidden=false}
function hideGate(){document.body.classList.remove('auth-locked');$('#authGate').hidden=true}
function showLaunch(session){hideGate();$('#mainLanding')?.classList.add('member-ready');const box=$('#memberLaunch');if(box){box.hidden=false;box.querySelector('small').textContent=session.user.email||'회원'}}
async function ensureProfile(user,form){
  const nickname=form?.nickname?.value?.trim(); if(!nickname)return;
  const travel_styles=[...form.querySelectorAll('input[name="travelStyle"]:checked')].map(x=>x.value);
  const {error}=await supabase.from('member_profiles').upsert({user_id:user.id,nickname,birth_date:form.birthDate.value||null,travel_styles});
  if(error)throw error;
  const consentRows=['service','privacy'].map(k=>({user_id:user.id,terms_key:k,version:'2026-10-06',agreed:true}));
  await supabase.from('terms_consents').upsert(consentRows,{onConflict:'user_id,terms_key,version'});
}
async function login(e){e.preventDefault();msg('로그인 중…');const f=e.currentTarget;
  const {data,error}=await supabase.auth.signInWithPassword({email:f.email.value.trim().toLowerCase(),password:f.password.value});
  if(error)return msg(error.message,true);
  if(!f.autoLogin.checked) sessionStorage.setItem('tq-session-only','1'); else sessionStorage.removeItem('tq-session-only');
  showLaunch(data.session);
}
async function signup(e){e.preventDefault();const f=e.currentTarget;
  if(!f.serviceTerms.checked||!f.privacyTerms.checked)return msg('필수 약관에 동의해주세요.',true);
  msg('회원가입 처리 중…');
  const {data,error}=await supabase.auth.signUp({email:f.email.value.trim().toLowerCase(),password:f.password.value,options:{data:{nickname:f.nickname.value.trim()}}});
  if(error)return msg(error.message,true);
  if(data.user&&data.session){try{await ensureProfile(data.user,f)}catch(err){return msg(err.message,true)}}
  msg(data.session?'가입이 완료되었습니다.':'인증 메일을 확인한 뒤 로그인해주세요.');
  if(data.session)showLaunch(data.session);
}
async function social(provider){msg(provider+' 로그인 연결 중…');const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:location.href.split('#')[0]}});if(error)msg(error.message,true)}
async function logout(){await supabase.auth.signOut();location.reload()}
export async function initAuth(){
  const gate=$('#authGate');if(!gate)return;
  $('#travelStyleChoices').innerHTML=styles.map(x=>'<label><input type="checkbox" name="travelStyle" value="'+x+'"><span>'+x+'</span></label>').join('');
  $('#loginForm').addEventListener('submit',login);$('#signupForm').addEventListener('submit',signup);
  $('#showSignup').onclick=()=>{gate.dataset.mode='signup';msg('')};$('#showLogin').onclick=()=>{gate.dataset.mode='login';msg('')};
  gate.querySelectorAll('[data-provider]').forEach(b=>b.onclick=()=>social(b.dataset.provider));
  $('#logoutBtn').onclick=logout;$('#memberStartBtn').onclick=()=>$('#mainLocateBtn')?.click();
  let {data:{session}}=await supabase.auth.getSession();
  if(sessionStorage.getItem('tq-session-only')==='1'&&!sessionStorage.getItem('tq-tab-active')){await supabase.auth.signOut();session=null}
  sessionStorage.setItem('tq-tab-active','1');
  if(session)showLaunch(session);else showGate();
  supabase.auth.onAuthStateChange((_event,s)=>{if(s)showLaunch(s);else showGate()});
}
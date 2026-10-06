export const $=s=>document.querySelector(s);
export const all=s=>Array.from(document.querySelectorAll(s));

export function setText(sel,t){const el=$(sel);if(el)el.textContent=t}
export function loading(on){document.body.classList.toggle('loading',on)}
export function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
export function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync('site-src/index.html','utf8'),js=fs.readFileSync('site-src/js/services/auth-service.js','utf8'),css=fs.readFileSync('site-src/css/auth.css','utf8');
assert.match(html,/id="authGate"/);assert.match(html,/id="loginForm"/);assert.match(html,/id="signupForm"/);assert.match(html,/자동 로그인/);assert.match(html,/TRIP QUEST/);
assert.match(js,/signInWithPassword/);assert.match(js,/signUp/);assert.match(js,/persistSession:true/);assert.match(js,/member_profiles/);assert.match(js,/terms_consents/);assert.match(css,/auth-locked/);
console.log('auth smoke ok');
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const compiled=await build({entryPoints:['server/edit-access.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {editorIdentity,editAccessResponse,editorUnlockResponse,editorLockResponse,editorSessionIsOwner,editorSessionResponse}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const origin='https://humans-remain.example.test',key='test-private-owner-key-with-more-than-32-characters',env={WORLD_EDITOR_TOKEN:key};
const post=(body,hostOrigin=origin)=>new Request(origin+'/api/editor-unlock',{method:'POST',headers:{Origin:hostOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const get=(headers={})=>new Request(origin+'/api/edit-access',{headers});
assert.equal(editorIdentity(get(),env).canEdit,false,'public visitor is never the owner');
assert.equal((await editorUnlockResponse(post({key}),{})).status,503,'without server secret no unlock is possible');
assert.equal((await editorUnlockResponse(post({key:'not-it'}),env)).status,401,'incorrect private key rejected');
assert.equal((await editorUnlockResponse(post({key},'https://external.example'),env)).status,403,'foreign origin blocked');
assert.equal((await editorUnlockResponse(new Request(origin+'/api/editor-unlock'),env)).status,405,'unlock is POST-only');
const unlocked=await editorUnlockResponse(post({key}),env);
assert.equal(unlocked.status,200);
assert.equal((await unlocked.json()).canEdit,true);
const setCookie=unlocked.headers.get('Set-Cookie');
assert.match(setCookie,/HttpOnly/);
assert.match(setCookie,/Secure/);
assert.match(setCookie,/SameSite=Strict/);
assert.match(setCookie,/Max-Age=7776000/);
assert.doesNotMatch((await(await editAccessResponse(get(),env)).text()),new RegExp(key),'private owner key is never returned by status endpoint');
const cookie=setCookie.split(';')[0];
const owner=get({Cookie:cookie});
assert.equal(editorIdentity(owner,env).canEdit,true,'browser cookie unlocks future visits without entering a key');
assert.equal((await(await editAccessResponse(owner,env)).json()).state,'owner');
assert.equal(editorIdentity(get({Cookie:'hr_editor_owner=invalid'}),env).canEdit,false);
assert.equal(editorIdentity(get({'oai-authenticated-user-id':'spoofed',Cookie:'hr_editor_owner=invalid'}),env).canEdit,false,'public Worker identity headers cannot bypass the lock');
assert.equal(editorIdentity(get({Cookie:'hr_editor_owner=%BAD'}),env).canEdit,false,'malformed cookie cannot unlock');
const locked=editorLockResponse(new Request(origin+'/api/editor-lock',{method:'POST',headers:{Origin:origin}}));
assert.equal(locked.status,200);
assert.match(locked.headers.get('Set-Cookie'),/Max-Age=0/);
assert.equal(editorLockResponse(new Request(origin+'/api/editor-lock',{method:'POST',headers:{Origin:'https://external.example'}})).status,403);
const editor=fs.readFileSync('src/WorldEditor.tsx','utf8');
assert(editor.includes("canEdit?'Publish World':'Owner Sign-In'"),'World tab has visible owner sign-in action');
assert(editor.includes("canEdit?'Publish & Bundle World':'Owner Sign-In'"),'mobile workspace has visible owner sign-in action');
assert(!editor.includes("disabled={!canEdit||!ready||busy||terrainBusy||tierBusy} onClick={()=>void save('apply')}"),'publish is no longer disabled just because owner is not yet unlocked');
const access=fs.readFileSync('src/EditorAccess.tsx','utf8');
assert(access.includes("window.location.assign('/api/editor-session?returnTo='"),'client uses Cloudflare owner email sign-in instead of a copied key');
assert(access.includes("fetch('/api/editor-unlock'"),'legacy owner key remains available during migration');
assert(!access.includes('sessionStorage.setItem'),'client does not save owner secret into JavaScript storage');

const ownerEmail='owner@example.test';
const sessionEnv={SITE_OWNER_EMAIL:ownerEmail};
const sessions=new Map();
const DB={prepare(sql){
 let args=[];
 return{
  bind(...values){args=values;return this},
  async all(){return {results:sql.startsWith('SELECT expires_at')&&sessions.has(args[0])?[{expires_at:sessions.get(args[0])}]:[]}},
  async run(){if(sql.startsWith('INSERT INTO owner_editor_sessions'))sessions.set(args[0],args[1]);return {meta:{changes:1}}}
 };
}};
const sessionUrl=origin+'/api/editor-session?returnTo='+encodeURIComponent('/#editor');
assert.equal((await editorSessionResponse(new Request(sessionUrl),sessionEnv,DB)).status,503,'owner email alone cannot bypass Cloudflare Access');
assert.equal((await editorSessionResponse(new Request(sessionUrl,{headers:{'Cf-Access-Jwt-Assertion':'forged'}}),sessionEnv,DB)).status,503,'forged client headers cannot create a session');
assert.equal((await editorSessionResponse(new Request(sessionUrl),sessionEnv,DB,{getIdentity:async()=>({email:'someone-else@example.test'})})).status,403,'other Cloudflare Access users cannot publish');
assert.equal((await editorSessionResponse(new Request(sessionUrl),{},DB,{getIdentity:async()=>({email:ownerEmail})})).status,503,'owner allowlist must be configured server-side');
const signedIn=await editorSessionResponse(new Request(sessionUrl),sessionEnv,DB,{getIdentity:async()=>({email:ownerEmail})});
assert.equal(signedIn.status,303,'valid owner email gets a redirect back to the editor');
assert.equal(signedIn.headers.get('Location'),' /#editor'.trim(),'redirect stays inside game editor');
const sessionSetCookie=signedIn.headers.get('Set-Cookie');
assert.match(sessionSetCookie,/hr_world_owner_session=/);
assert.match(sessionSetCookie,/HttpOnly; Secure; SameSite=Lax/);
const signedCookie=sessionSetCookie.split(';')[0];
assert.equal(await editorSessionIsOwner(get({Cookie:signedCookie}),DB),true,'owner session works on later requests without copied tokens');
assert.equal(await editorSessionIsOwner(get({Cookie:'hr_world_owner_session=forged'}),DB),false,'guessing cookie cannot unlock');
assert.equal((await(await editAccessResponse(get({Cookie:signedCookie}),sessionEnv,true)).json()).state,'owner','secure session reports owner access');
for(const k of sessions.keys())sessions.set(k,Date.now()-1);
assert.equal(await editorSessionIsOwner(get({Cookie:signedCookie}),DB),false,'expired owner cookie cannot publish');

console.log('PASS: one-time owner unlock, secure persistent cookie, explicit lock, CSRF rejection, spoof rejection, and token-free Cloudflare Access session with mobile Publish UI.');

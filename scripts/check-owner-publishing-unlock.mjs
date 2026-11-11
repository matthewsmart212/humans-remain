import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const compiled=await build({entryPoints:['server/edit-access.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {editorIdentity,editAccessResponse,editorUnlockResponse,editorLockResponse,editorOwnerLoginResponse}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const origin='https://humans-remain.example.test';
const key='test-private-owner-key-with-more-than-32-characters';
const env={WORLD_EDITOR_TOKEN:key};
const post=(body,hostOrigin=origin)=>new Request(origin+'/api/editor-unlock',{method:'POST',headers:{Origin:hostOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const get=(headers={})=>new Request(origin+'/api/edit-access',{headers});

assert.equal((await editorIdentity(get(),env)).canEdit,false,'anonymous visitors cannot publish');
assert.equal((await editorUnlockResponse(post({key}),{})).status,503,'no legacy secret means legacy unlock is disabled');
assert.equal((await editorUnlockResponse(post({key:'incorrect'}),env)).status,401,'incorrect legacy key rejected');
assert.equal((await editorUnlockResponse(post({key},'https://external.example'),env)).status,403,'foreign origin blocked');
assert.equal((await editorUnlockResponse(new Request(origin+'/api/editor-unlock'),env)).status,405,'legacy unlock is POST-only');
const unlocked=await editorUnlockResponse(post({key}),env);
assert.equal(unlocked.status,200);
assert.equal((await unlocked.json()).canEdit,true);
const setCookie=unlocked.headers.get('Set-Cookie');
assert.match(setCookie,/HttpOnly/);
assert.match(setCookie,/Secure/);
assert.match(setCookie,/SameSite=Strict/);
assert.match(setCookie,/Max-Age=7776000/);
assert.doesNotMatch(await(await editAccessResponse(get(),env)).text(),new RegExp(key),'legacy key never leaks through access status');
const cookie=setCookie.split(';')[0];
assert.equal((await editorIdentity(get({Cookie:cookie}),env)).canEdit,true,'legacy unlocked browser remains compatible');
assert.equal((await(await editAccessResponse(get({Cookie:cookie}),env)).json()).state,'owner');
assert.equal((await editorIdentity(get({Cookie:'hr_editor_owner=invalid'}),env)).canEdit,false);
assert.equal((await editorIdentity(get({'oai-authenticated-user-id':'spoofed',Cookie:'hr_editor_owner=invalid'}),env)).canEdit,false,'untrusted Cloudflare identity headers cannot unlock');
assert.equal((await editorIdentity(get({Cookie:'hr_editor_owner=%BAD'}),env)).canEdit,false,'malformed cookie cannot unlock');
const locked=editorLockResponse(new Request(origin+'/api/editor-lock',{method:'POST',headers:{Origin:origin}}));
assert.equal(locked.status,200);
assert.match(locked.headers.get('Set-Cookie'),/Max-Age=0/);
assert.equal(editorLockResponse(new Request(origin+'/api/editor-lock',{method:'POST',headers:{Origin:'https://external.example'}})).status,403);

const editor=fs.readFileSync('src/WorldEditor.tsx','utf8');
assert(editor.includes("canEdit?'Publish World':'Unlock Publishing'"),'world settings offer one-time owner key unlock');
assert(editor.includes("canEdit?'Publish & Bundle World':'Unlock Publishing'"),'mobile workspace offers one-time owner key unlock');
assert(!editor.includes("disabled={!canEdit||!ready||busy||terrainBusy||tierBusy} onClick={()=>void save('apply')}"),'locked owners can initiate sign-in from publish button');
const access=fs.readFileSync('src/EditorAccess.tsx','utf8');
assert(access.includes("fetch('/api/editor-unlock'"),'editor uses existing owner key endpoint');
assert(access.includes("window.prompt("),'editor requests key only when owner chooses Unlock Publishing');
assert(access.includes("credentials:'same-origin'"),'unlock request can receive the secure same-origin session cookie');
assert(!access.includes('sessionStorage.setItem'),'no owner secret stored by client JavaScript');

// Cloudflare Access authentication requires a real RSA signature, exact AUD,
// exact issuer, and exact owner email. Verify without calling real Cloudflare.
const ownerEmail='owner@example.test';
const ownerEnv={
 CF_ACCESS_TEAM_DOMAIN:'https://owner-test.cloudflareaccess.com',
 CF_ACCESS_AUD:'owner-world-editor',
 CF_ACCESS_OWNER_EMAIL:ownerEmail,
};
const keypair=await crypto.subtle.generateKey({
 name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
 publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'
},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keypair.publicKey);
const originalFetch=globalThis.fetch;
let keyRequests=0;
globalThis.fetch=async url=>{
 assert.equal(String(url),ownerEnv.CF_ACCESS_TEAM_DOMAIN+'/cdn-cgi/access/certs');
 keyRequests++;
 return Response.json({keys:[{...jwk,kid:'test-key',use:'sig',alg:'RS256'}]});
};
const encode=(value)=>Buffer.from(JSON.stringify(value)).toString('base64url');
async function sign(claims){
 const data=encode({alg:'RS256',kid:'test-key'})+'.'+encode(claims);
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keypair.privateKey,new TextEncoder().encode(data));
 return data+'.'+Buffer.from(signature).toString('base64url');
}
try{
 const now=Math.floor(Date.now()/1000);
 const claims={iss:ownerEnv.CF_ACCESS_TEAM_DOMAIN,aud:ownerEnv.CF_ACCESS_AUD,email:ownerEmail,sub:'owner',iat:now,exp:now+3600};
 const token=await sign(claims);
 const ownerReq=get({'Cf-Access-Jwt-Assertion':token});
 assert.equal((await editorIdentity(ownerReq,ownerEnv)).canEdit,true,'valid signed Cloudflare Access JWT authorises the owner');
 assert.equal((await(await editAccessResponse(ownerReq,ownerEnv)).json()).passwordlessConfigured,true,'owner sign-in configured status exposed without secrets');
 assert.equal(editorOwnerLoginResponse(new Request(origin+'/owner-login'),ownerEnv,true).status,302,'signed-in owner returns to editor');
 assert.equal(editorOwnerLoginResponse(new Request(origin+'/owner-login'),ownerEnv,false).status,403,'unsigned visitor cannot use owner login');
 assert.equal(editorOwnerLoginResponse(new Request(origin+'/owner-login'),{},true).status,503,'missing owner config fails closed');
 assert.equal((await editorIdentity(get({'Cf-Access-Jwt-Assertion':token}),{...ownerEnv,CF_ACCESS_OWNER_EMAIL:'another@example.test'})).canEdit,false,'signed visitor with wrong owner email is rejected');
 assert.equal((await editorIdentity(get({'Cf-Access-Jwt-Assertion':token}),{...ownerEnv,CF_ACCESS_AUD:'wrong-aud'})).canEdit,false,'JWT audience must match');
 assert.equal((await editorIdentity(get({'Cf-Access-Jwt-Assertion':await sign({...claims,exp:now-1})}),ownerEnv)).canEdit,false,'expired JWT is rejected');
 const parts=token.split('.');
 const forged=parts[0]+'.'+encode({...claims,sub:'attacker'})+'.'+parts[2];
 assert.equal((await editorIdentity(get({'Cf-Access-Jwt-Assertion':forged}),ownerEnv)).canEdit,false,'tampered signed token cannot pass');
 assert.equal((await editorIdentity(get({'Cf-Access-Jwt-Assertion':'forged.fake.token'}),ownerEnv)).canEdit,false,'fake token cannot unlock');
 assert.equal(keyRequests>=1,true,'signing keys are fetched securely for signature verification');
}finally{
 globalThis.fetch=originalFetch;
}

console.log('PASS: owner email sign-in, valid signed JWT, forgery/expiry/audience rejection, legacy cookie compatibility, and mobile Publish controls.');

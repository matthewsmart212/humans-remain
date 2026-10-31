import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const worker=(await import(pathToFileURL(process.cwd()+'/dist/server/index.js'))).default;
const env={SITE_OWNER_EMAIL:'owner@example.test',SITE_OWNER_ID:'migration-test-owner'},origin='https://test.local';
const call=(query='',headers={},method='GET')=>worker.fetch(new Request(origin+'/api/edit-access'+query,{method,headers}),env);
const anonymous=await call('?returnTo='+encodeURIComponent('/#checklist'));
assert.match(anonymous.headers.get('Cache-Control'),/private.*no-store/);
let value=await anonymous.json();
assert.equal(value.state,'anonymous');assert.equal(value.canEdit,false);
assert.equal(value.signInUrl,'/signin-with-chatgpt?return_to=%2F%23checklist');
assert.equal(value.signOutUrl,'/signout-with-chatgpt?return_to=%2F%23checklist');
assert(!JSON.stringify(value).includes(env.SITE_OWNER_EMAIL),'owner allowlist must not reach the browser');
const owner={'oai-authenticated-user-id':'site-scoped-owner-subject','oai-authenticated-user-email':'OWNER@example.test'};
value=await(await call('?returnTo='+encodeURIComponent('/#editor'),owner)).json();
assert.equal(value.state,'owner');assert.equal(value.canEdit,true);
assert.equal(value.signInUrl,'/signin-with-chatgpt?return_to=%2F%23editor');
for(const headers of [{},{'oai-authenticated-user-email':env.SITE_OWNER_EMAIL},{'OAI-Sites-Authorization':'Bearer service-only'},{'canEdit':'true'}]){
 const access=await(await call('',headers)).json();assert.equal(access.canEdit,false);assert.equal(access.state,'anonymous');
}
for(const headers of [{'oai-authenticated-user-id':'someone-else'},{'oai-authenticated-user-id':'someone-else','oai-authenticated-user-email':'visitor@example.test'}]){
 const access=await(await call('',headers)).json();assert.equal(access.canEdit,false);assert.equal(access.state,'viewer');
}
assert.equal((await(await worker.fetch(new Request(origin+'/api/edit-access',{headers:owner}),{})).json()).canEdit,false,'no configured owner email must fail closed');
assert.equal((await(await call('',{'oai-authenticated-user-id':'migration-test-owner'})).json()).canEdit,true,'explicitly configured owner identity is allowed');
assert.equal((await(await worker.fetch(new Request(origin+'/api/edit-access',{headers:{'oai-authenticated-user-id':'migration-test-owner'}}),{})).json()).canEdit,false,'no configured owner identity must fail closed');
for(const unsafe of ['https://other.test/','//other.test/','/\\other.test/','/signin-with-chatgpt','/signout-with-chatgpt','/callback']){
 const access=await(await call('?returnTo='+encodeURIComponent(unsafe))).json();assert.equal(access.signInUrl,'/signin-with-chatgpt?return_to=%2F%23checklist','unsafe return target rejected');
}
assert.equal((await call('',owner,'POST')).status,405);
for(const route of ['/api/base-checklist','/api/asset-artwork','/api/world-layout','/api/asset-files']){
 for(const identity of [{},{'oai-authenticated-user-id':'visitor','oai-authenticated-user-email':'visitor@example.test'}]){
  const response=await worker.fetch(new Request(origin+route,{method:route==='/api/asset-files'?'POST':'PUT',headers:{...identity,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({canEdit:true,ownerId:'migration-test-owner'})}),env);
  assert.equal(response.status,403,route+' blocks public or other-account writes');
 }
}
console.log('PASS: anonymous/owner/other-account access, site-scoped SIWC owner, configured owner identity, safe sign-in return, no identity leaks, private access caching, all write guards.');

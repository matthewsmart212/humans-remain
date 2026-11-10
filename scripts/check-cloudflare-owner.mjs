import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['server/access-owner.ts'],bundle:true,write:false,format:'esm',platform:'node',target:'node22'});
const {isPasswordlessWorldOwner,passwordlessOwnerConfigured}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const env={CF_ACCESS_TEAM_DOMAIN:'https://owners.cloudflareaccess.com',CF_ACCESS_AUD:'aud-for-this-app',CF_ACCESS_OWNER_EMAIL:'owner@example.test'};
assert(passwordlessOwnerConfigured(env));
assert(!passwordlessOwnerConfigured({}));
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=keys.publicKey.export({format:'jwk'});
const originalFetch=globalThis.fetch;
let fetchCalls=0;
globalThis.fetch=async url=>{
 fetchCalls++;
 assert.equal(String(url),'https://owners.cloudflareaccess.com/cdn-cgi/access/certs');
 return Response.json({keys:[{...jwk,kid:'test-kid',alg:'RS256',use:'sig'}]});
};
const now=Math.floor(Date.now()/1000);
const base={iss:env.CF_ACCESS_TEAM_DOMAIN,aud:[env.CF_ACCESS_AUD],email:env.CF_ACCESS_OWNER_EMAIL,sub:'owner-id',iat:now-10,exp:now+3600};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=(claims=base,header={alg:'RS256',kid:'test-kid'})=>{
 const part=encode(header)+'.'+encode(claims);
 return part+'.'+sign('RSA-SHA256',Buffer.from(part),keys.privateKey).toString('base64url');
};
const request=t=>new Request('https://humans-remain.example.test/api/world-layout',{headers:{Cookie:'CF_Authorization='+t}});
try{
 assert.equal(await isPasswordlessWorldOwner(request(token()),env),true,'valid owner JWT accepted');
 assert.equal(fetchCalls,1,'keys cached');
 assert.equal(await isPasswordlessWorldOwner(request(token({...base,email:'visitor@example.test'})),env),false,'wrong owner email');
 assert.equal(await isPasswordlessWorldOwner(request(token({...base,aud:['different-app']})),env),false,'incorrect audience');
 assert.equal(await isPasswordlessWorldOwner(request(token({...base,iss:'https://other.cloudflareaccess.com'})),env),false,'incorrect issuer');
 assert.equal(await isPasswordlessWorldOwner(request(token({...base,exp:now-1})),env),false,'expired token');
 assert.equal(await isPasswordlessWorldOwner(request(token({...base,iat:now+7200})),env),false,'future issue time');
 assert.equal(await isPasswordlessWorldOwner(request(token(base,{alg:'none',kid:'test-kid'})),env),false,'unsigned algorithm rejected');
 const valid=token(),tampered=valid.slice(0,-5)+'AAAAA';
 assert.equal(await isPasswordlessWorldOwner(request(tampered),env),false,'tampered signature rejected');
 assert.equal(await isPasswordlessWorldOwner(new Request('https://humans-remain.example.test/',{headers:{'oai-authenticated-user-email':env.CF_ACCESS_OWNER_EMAIL}}),env),false,'spoofed header rejected');
 assert.equal(await isPasswordlessWorldOwner(request(valid),{}),false,'unconfigured identity fails closed');
 console.log('PASS: signed Access JWT verifies issuer, aud, email, expiration, cryptographic signature, spoof resistance, cached public keys.');
}finally{globalThis.fetch=originalFetch}

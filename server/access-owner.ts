/**
 * Passwordless world publishing through Cloudflare Access.
 * Owner authentication is a signed, expiring Access JWT, NEVER a client flag
 * or a trusted-looking header. The public game stays accessible to visitors.
 */
export type AccessOwnerEnv={
 CF_ACCESS_TEAM_DOMAIN?:string;
 CF_ACCESS_AUD?:string;
 CF_ACCESS_OWNER_EMAIL?:string;
};
type AccessHeader={alg?:unknown;kid?:unknown};
type AccessClaims={iss?:unknown;aud?:unknown;email?:unknown;sub?:unknown;exp?:unknown;nbf?:unknown;iat?:unknown};
type AccessKey={kid?:string;kty?:string;n?:string;e?:string;use?:string;alg?:string};
let cached:{issuer:string;keys:AccessKey[];until:number}|undefined;
const MAX_TOKEN_LENGTH=8192;
const TTL_MS=10*60*1000;

function issuerFor(env:AccessOwnerEnv){
 const domain=env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/,'')||'';
 return /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(domain)?domain:'';
}
export function passwordlessOwnerConfigured(env:AccessOwnerEnv){
 return !!issuerFor(env)&&!!env.CF_ACCESS_AUD?.trim()&&
  !!env.CF_ACCESS_OWNER_EMAIL?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}
function decodeSegment(segment:string){
 if(!/^[a-zA-Z0-9_-]+$/.test(segment))throw Error('Invalid JWT encoding');
 const decoded=atob(segment.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-segment.length%4)%4));
 return Uint8Array.from(decoded,char=>char.charCodeAt(0));
}
function jsonSegment<T>(segment:string):T{
 return JSON.parse(new TextDecoder().decode(decodeSegment(segment))) as T;
}
function accessToken(request:Request){
 const header=request.headers.get('Cf-Access-Jwt-Assertion');
 if(header)return header;
 // Access cookies can authenticate the browser after returning from the
 // protected /owner-login path to the otherwise public game.
 const cookie=request.headers.get('Cookie')?.split(';').map(p=>p.trim())
  .find(p=>p.startsWith('CF_Authorization='));
 return cookie?.slice('CF_Authorization='.length)||null;
}
async function publicKeys(issuer:string,refresh=false):Promise<AccessKey[]>{
 if(!refresh&&cached?.issuer===issuer&&cached.until>Date.now())return cached.keys;
 const response=await fetch(issuer+'/cdn-cgi/access/certs',{redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Cloudflare Access signing keys unavailable');
 const body=await response.json() as {keys?:unknown};
 if(!Array.isArray(body.keys))throw Error('Invalid Cloudflare Access key set');
 const keys=body.keys.filter((key):key is AccessKey=>
  !!key&&typeof key==='object'&&(key as AccessKey).kty==='RSA'&&
  typeof (key as AccessKey).kid==='string'&&typeof (key as AccessKey).n==='string'&&
  typeof (key as AccessKey).e==='string'&&
  (!(key as AccessKey).use||(key as AccessKey).use==='sig')&&
  (!(key as AccessKey).alg||(key as AccessKey).alg==='RS256'));
 if(!keys.length)throw Error('No suitable Access verification keys');
 cached={issuer,keys,until:Date.now()+TTL_MS};
 return keys;
}
export async function isPasswordlessWorldOwner(request:Request,env:AccessOwnerEnv):Promise<boolean>{
 if(!passwordlessOwnerConfigured(env))return false;
 const token=accessToken(request);
 if(!token||token.length>MAX_TOKEN_LENGTH)return false;
 try{
  const segments=token.split('.');
  if(segments.length!==3)return false;
  const [encodedHeader,encodedClaims,encodedSignature]=segments;
  const header=jsonSegment<AccessHeader>(encodedHeader);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>256)return false;
  const claims=jsonSegment<AccessClaims>(encodedClaims);
  const issuer=issuerFor(env),aud=env.CF_ACCESS_AUD!.trim();
  const audience=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!==issuer||!audience.includes(aud)||
     typeof claims.email!=='string'||claims.email.trim().toLowerCase()!==env.CF_ACCESS_OWNER_EMAIL!.trim().toLowerCase()||
     typeof claims.sub!=='string'||!claims.sub||
     typeof claims.exp!=='number'||claims.exp<=now||
     (claims.nbf!==undefined&&(typeof claims.nbf!=='number'||claims.nbf>now+60))||
     (claims.iat!==undefined&&(typeof claims.iat!=='number'||claims.iat>now+60)))return false;
  let keys=await publicKeys(issuer);
  let signingKey=keys.find(k=>k.kid===header.kid);
  if(!signingKey){keys=await publicKeys(issuer,true);signingKey=keys.find(k=>k.kid===header.kid)}
  if(!signingKey)return false;
  const jwk:JsonWebKey={kty:'RSA',n:signingKey.n,e:signingKey.e,alg:'RS256',ext:true};
  const cryptoKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',cryptoKey,decodeSegment(encodedSignature),
   new TextEncoder().encode(encodedHeader+'.'+encodedClaims));
 }catch{return false}
}

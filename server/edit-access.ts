// Sites dispatch verifies and forwards these headers; never take identity from
// a request body or a client-side flag. Public visitors have no identity headers.
export type EditorIdentityEnv = {SITE_OWNER_EMAIL?:string;SITE_OWNER_ID?:string;WORLD_EDITOR_TOKEN?:string};
const OWNER_COOKIE='hr_editor_owner';
const OWNER_SESSION_SECONDS=90*24*60*60;

/** Match the private server key without short-circuiting on differing content. */
function sameOwnerKey(expected:string,supplied?:string){
 if(!supplied||supplied.length!==expected.length)return false;
 let difference=0;
 for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^supplied.charCodeAt(i);
 return difference===0;
}
const noStore={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};

/** One-time key unlock, not a public no-login edit bypass.
 * The secret is set as a first-party, secure, HttpOnly cookie for this device;
 * JS never stores it in localStorage and the browser sends it automatically.
 */
export async function editorUnlockResponse(request:Request,env:EditorIdentityEnv):Promise<Response>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:{...noStore,Allow:'POST'}});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'Origin not allowed'},{status:403,headers:noStore});
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return Response.json({error:'JSON required'},{status:415,headers:noStore});
 const configured=env.WORLD_EDITOR_TOKEN;
 if(!configured||configured.length<32)return Response.json({error:'Publishing needs a one-time owner key configured on the Cloudflare Worker. Add the private WORLD_EDITOR_TOKEN under Settings → Variables and Secrets, then unlock once on this device.'},{status:503,headers:noStore});
 const body=await request.text();if(body.length>2048)return Response.json({error:'Key is too long'},{status:413,headers:noStore});
 let supplied:unknown;try{supplied=JSON.parse(body)?.key}catch{return Response.json({error:'Invalid request'},{status:400,headers:noStore})}
 if(typeof supplied!=='string'||!sameOwnerKey(configured,supplied.trim()))return Response.json({error:'That owner key was not recognised. Check the WORLD_EDITOR_TOKEN in Cloudflare Worker settings.'},{status:401,headers:noStore});
 const cookie=OWNER_COOKIE+'='+encodeURIComponent(configured)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+OWNER_SESSION_SECONDS;
 return Response.json({canEdit:true,unlocked:true},{headers:{...noStore,'Set-Cookie':cookie}});
}
export function editorLockResponse(request:Request):Response{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:{...noStore,Allow:'POST'}});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'Origin not allowed'},{status:403,headers:noStore});
 const response=Response.json({locked:true},{headers:noStore});
 response.headers.append('Set-Cookie',OWNER_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
 response.headers.append('Set-Cookie',SESSION_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
 return response;
}

/** The ChatGPT Site supplies verified owner headers. On the public Cloudflare
 * Worker those headers must NEVER be treated as identity: clients can spoof
 * arbitrary request headers. Cloudflare editing instead uses a 32+ character
 * server-only bearer secret, configured in Worker settings.
 */
export function editorIdentity(request:Request,env:EditorIdentityEnv){
 const siteHost=new URL(request.url).hostname.endsWith('.chatgpt.site');
 const id=siteHost?request.headers.get('oai-authenticated-user-id')?.trim():undefined;
 const email=siteHost?request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase():undefined;
 const ownerEmail=env.SITE_OWNER_EMAIL?.trim().toLowerCase();
 const ownerId=env.SITE_OWNER_ID?.trim();
 const siteOwner=!!id&&((!!ownerId&&id===ownerId)||(!!ownerEmail&&email===ownerEmail));
 const expected=env.WORLD_EDITOR_TOKEN;
 const supplied=request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 const ownerCookie=request.headers.get('Cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(OWNER_COOKIE+'='));
 let cookieValue:string|undefined;
 try{cookieValue=ownerCookie?decodeURIComponent(ownerCookie.slice(OWNER_COOKIE.length+1)):undefined}catch{/* Invalid cookie is never an owner. */}
 const tokenOwner=!!expected&&expected.length>=32&&(sameOwnerKey(expected,supplied)||sameOwnerKey(expected,cookieValue));
 const canEdit=siteOwner||tokenOwner;
 return {canEdit,state:canEdit?'owner':id?'viewer':'anonymous'} as const;
}


/** Passwordless owner publishing, backed by Cloudflare Access and a private D1 session.
 * Protect ONLY /api/editor-session with Cloudflare Access. The public game and
 * /api/published-world must stay accessible to regular players.
 * Never trust client-supplied Cf-Access-* identity headers.
 */
const SESSION_COOKIE='hr_world_owner_session';
const SESSION_SECONDS=60*24*60*60;
type SessionStatement={bind:(...values:unknown[])=>SessionStatement;all:()=>Promise<{results:unknown[]}>;run:()=>Promise<unknown>};
export type EditorSessionDB={prepare:(sql:string)=>SessionStatement};
export type VerifiedCloudflareAccess={getIdentity:()=>Promise<{email?:string|null}|null>};
function sessionCookie(request:Request){
 const value=request.headers.get('Cookie')?.match(/(?:^|;\s*)hr_world_owner_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 return value||null;
}
async function sessionHash(token:string){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function editorSessionIsOwner(request:Request,DB:EditorSessionDB):Promise<boolean>{
 const token=sessionCookie(request);
 if(!token)return false;
 try{
  const digest=await sessionHash(token);
  const row=(await DB.prepare('SELECT expires_at FROM owner_editor_sessions WHERE token_hash=?').bind(digest).all()).results[0] as {expires_at?:number}|undefined;
  return Number(row?.expires_at)>Date.now();
 }catch(error){
  console.error('Owner session lookup failed',error);
  return false;
 }
}
export async function editorSessionResponse(request:Request,env:EditorIdentityEnv,DB:EditorSessionDB,access?:VerifiedCloudflareAccess):Promise<Response>{
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{...noStore,Allow:'GET'}});
 // Both checks are needed: a Cloudflare-protected URL alone does not prove
 // that the authorised user owns this specific game.
 const expected=env.SITE_OWNER_EMAIL?.trim().toLowerCase();
 if(!expected)return Response.json({error:'Owner sign-in needs SITE_OWNER_EMAIL configured on the Cloudflare Worker.'},{status:503,headers:noStore});
 if(!access)return Response.json({error:'Protect /api/editor-session with a Cloudflare Access email policy for the owner before using this sign-in.'},{status:503,headers:noStore});
 let identity:Awaited<ReturnType<VerifiedCloudflareAccess['getIdentity']>>;
 try{identity=await access.getIdentity()}catch{return Response.json({error:'Could not confirm Cloudflare Access identity.'},{status:403,headers:noStore})}
 if(!identity?.email||identity.email.trim().toLowerCase()!==expected)return Response.json({error:'This email is not authorised to publish the world.'},{status:403,headers:noStore});
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 const token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 try{
  const now=Date.now();
  await DB.prepare('INSERT INTO owner_editor_sessions (token_hash,expires_at) VALUES (?,?)').bind(await sessionHash(token),now+SESSION_SECONDS*1000).run();
  const url=new URL(request.url);
  const response=new Response(null,{status:303,headers:{...noStore,Location:safeReturnTo(url.searchParams.get('returnTo')||'/#editor')}});
  response.headers.append('Set-Cookie',SESSION_COOKIE+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+SESSION_SECONDS);
  return response;
 }catch(error){
  console.error('Could not create the owner session',error);
  return Response.json({error:'Could not save owner access on this device. Try again after the database migration.'},{status:503,headers:noStore});
 }
}

function safeReturnTo(value:string|null){
 if(!value?.startsWith('/')||value.startsWith('//'))return '/#checklist';
 try{
  const url=new URL(value,'https://app.local');
  if(url.origin!=='https://app.local'||['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(url.pathname))return '/#checklist';
  return url.pathname+url.search+url.hash;
 }catch{return '/#checklist'}
}

export function editAccessResponse(request:Request,env:EditorIdentityEnv,sessionOwner=false){
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
 const returnTo=safeReturnTo(new URL(request.url).searchParams.get('returnTo'));
 const encoded=encodeURIComponent(returnTo);
 const identity=editorIdentity(request,env);
 return Response.json({...identity,...(sessionOwner?{canEdit:true,state:'owner'}:{}),signInUrl:'/signin-with-chatgpt?return_to='+encoded,signOutUrl:'/signout-with-chatgpt?return_to='+encoded},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}

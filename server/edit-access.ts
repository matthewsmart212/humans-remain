import {isPasswordlessWorldOwner,passwordlessOwnerConfigured,type AccessOwnerEnv} from './access-owner';
// Sites dispatch verifies and forwards these headers; never take identity from
// a request body or a client-side flag. Public visitors have no identity headers.
export type EditorIdentityEnv = AccessOwnerEnv & {SITE_OWNER_EMAIL?:string;SITE_OWNER_ID?:string;WORLD_EDITOR_TOKEN?:string};
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
 return Response.json({locked:true},{headers:{...noStore,'Set-Cookie':OWNER_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}});
}

/** The ChatGPT Site supplies verified owner headers. On the public Cloudflare
 * Worker those headers must NEVER be treated as identity: clients can spoof
 * arbitrary request headers. Cloudflare editing instead uses a 32+ character
 * server-only bearer secret, configured in Worker settings.
 */
export async function editorIdentity(request:Request,env:EditorIdentityEnv){
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
 const accessOwner=await isPasswordlessWorldOwner(request,env);
 const canEdit=siteOwner||tokenOwner||accessOwner;
 return {canEdit,state:canEdit?'owner':id?'viewer':'anonymous'} as const;
}

function safeReturnTo(value:string|null){
 if(!value?.startsWith('/')||value.startsWith('//'))return '/#checklist';
 try{
  const url=new URL(value,'https://app.local');
  if(url.origin!=='https://app.local'||['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(url.pathname))return '/#checklist';
  return url.pathname+url.search+url.hash;
 }catch{return '/#checklist'}
}

export async function editAccessResponse(request:Request,env:EditorIdentityEnv):Promise<Response>{
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
 const returnTo=safeReturnTo(new URL(request.url).searchParams.get('returnTo'));
 const encoded=encodeURIComponent(returnTo);
 return Response.json({...await editorIdentity(request,env),passwordlessConfigured:passwordlessOwnerConfigured(env),passwordlessSignInUrl:'/owner-login',signInUrl:'/signin-with-chatgpt?return_to='+encoded,signOutUrl:'/signout-with-chatgpt?return_to='+encoded},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}

/** This route must be protected by a path-specific Cloudflare Access policy.
 * Access signs in the owner, then returns the browser to the public editor.
 * No public header, unsigned cookie, or unconfigured policy grants access.
 */
export function editorOwnerLoginResponse(request:Request,env:EditorIdentityEnv,canEdit:boolean):Response{
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
 if(!passwordlessOwnerConfigured(env))return new Response('Passwordless world publishing has not been configured. See docs/WORLD-PUBLISHING.md for the one-time Cloudflare Access setup.',{status:503,headers:{'Cache-Control':'no-store'}});
 if(!canEdit)return new Response('This owner sign-in is not authenticated. Ensure Cloudflare Access protects /owner-login and your email is allowed.',{status:403,headers:{'Cache-Control':'no-store'}});
 return Response.redirect(new URL('/#editor',request.url),302);
}

// Sites dispatch verifies and forwards these headers; never take identity from
// a request body or a client-side flag. Public visitors have no identity headers.
export type EditorIdentityEnv = {SITE_OWNER_EMAIL?:string;SITE_OWNER_ID?:string;WORLD_EDITOR_TOKEN?:string};

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
 let tokenOwner=false;
 if(expected&&expected.length>=32&&supplied&&supplied.length===expected.length){
  let difference=0;
  for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^supplied.charCodeAt(i);
  tokenOwner=difference===0;
 }
 const canEdit=siteOwner||tokenOwner;
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

export function editAccessResponse(request:Request,env:EditorIdentityEnv){
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
 const returnTo=safeReturnTo(new URL(request.url).searchParams.get('returnTo'));
 const encoded=encodeURIComponent(returnTo);
 return Response.json({...editorIdentity(request,env),signInUrl:'/signin-with-chatgpt?return_to='+encoded,signOutUrl:'/signout-with-chatgpt?return_to='+encoded},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}

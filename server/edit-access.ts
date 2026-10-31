// Sites dispatch verifies and forwards these headers; never take identity from
// a request body or a client-side flag. Public visitors have no identity headers.
export type EditorIdentityEnv = {SITE_OWNER_EMAIL?:string;SITE_OWNER_ID?:string};

export function editorIdentity(request:Request,env:EditorIdentityEnv){
 const id=request.headers.get('oai-authenticated-user-id')?.trim();
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 const ownerEmail=env.SITE_OWNER_EMAIL?.trim().toLowerCase();
 const ownerId=env.SITE_OWNER_ID?.trim();
 // Configure an owner using server-only settings from your verified identity
 // provider. The public export intentionally contains no personal owner ID.
 const canEdit=!!id&&((!!ownerId&&id===ownerId)||(!!ownerEmail&&email===ownerEmail));
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

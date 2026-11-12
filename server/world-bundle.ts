import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout} from '../src/world-layout';

// Called only by the owner-authorized world API. The credential must be a
// server-side secret; never expose it through the editor, client JS or Expo.
const REPOSITORY='matthewsmart212/humans-remain';
const SNAPSHOT='native/assets/world-snapshot.json';
const api='https://api.github.com/repos/'+REPOSITORY;

type GitHubCommit={sha:string;tree:{sha:string}};
type GitHubRef={object:{sha:string}};
type GitHubSha={sha:string};

class GitHubResponseError extends Error {
 constructor(readonly status:number,readonly stage:string,readonly cause:'user-agent'|'permissions'|'rate-limit'|'authentication'|'unknown'='unknown'){
  super('GitHub world sync failed with HTTP '+status+' while '+stage+'.');
 }
}

/** Return a user-safe diagnostic without forwarding GitHub response bodies,
 * credentials, request headers or repository content to the browser. */
export function explainWorldSyncFailure(error:unknown):string{
 if(!(error instanceof GitHubResponseError))
  return 'GitHub could not be reached while syncing the offline iOS snapshot. Check Cloudflare Worker logs or retry once.';
 const {status,stage}=error;
 const prefix='GitHub returned HTTP '+status+' while '+stage+'. ';
 if(status===401)return prefix+'The GitHub token is invalid or expired. Replace GITHUB_WORLD_SYNC_TOKEN in Cloudflare with a valid token.';
 if(status===403){
  if(error.cause==='user-agent')return prefix+'GitHub rejected the request User-Agent. Update the world publisher before retrying.';
  if(error.cause==='rate-limit')return prefix+'GitHub is rate limiting requests. Try again later rather than regenerating your token.';
  if(error.cause==='authentication')return prefix+'GitHub rejected the authentication attempt. Verify GITHUB_WORLD_SYNC_TOKEN in the Cloudflare Production environment.';
  if(error.cause==='permissions')return prefix+'GitHub says this token cannot write repository contents. Confirm its selected repository and Contents: Read and write permission.';
  return prefix+'GitHub declined the request. Check Cloudflare Worker logs for the GitHub response category and request ID.';
 }
 if(status===404)return prefix+'Check the token resource owner and that humans-remain is selected under Repository access.';
 if(status===409||status===422)return prefix+'GitHub rejected the commit update. Retry once; if this repeats, check the repository permissions and Worker logs.';
 if(status===429||status>=500)return prefix+'GitHub may be temporarily unavailable or rate limiting. Retry shortly.';
 return prefix+'Check the token repository permissions and Cloudflare Worker logs.';
}
async function github<T>(token:string,path:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(api+path,{
  method,
  headers:{
   'Accept':'application/vnd.github+json',
   // GitHub requires a valid User-Agent. Cloudflare Worker fetch() does not
   // guarantee the browser/Node default; missing it causes HTTP 403 even
   // when the fine-grained token has Contents: write permission.
   'User-Agent':'HumansRemain-WorldPublisher/1.0',
   'Authorization':'Bearer '+token.trim(),
   'X-GitHub-Api-Version':'2022-11-28',
   ...(body===undefined?{}:{'Content-Type':'application/json'}),
  },
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
 });
 if(!response.ok){
  const stage=path==='/git/blobs'?'creating the world snapshot':
   path==='/git/ref/heads/main'?'reading the main branch':
   path.startsWith('/git/commits/')?'reading the latest commit':
   path==='/git/trees'?'building the new world snapshot tree':
   path==='/git/commits'?'creating the world snapshot commit':
   path==='/git/refs/heads/main'?'updating the main branch':'calling GitHub';
  // Classify GitHub's error without exposing a token, full response body,
  // or other potentially private API details to the browser.
  const bodyText=(await response.text().catch(()=>'')).slice(0,4096);
  const reason:GitHubResponseError['cause']=
   /user.agent/i.test(bodyText)?'user-agent':
   /rate.limit|too many requests|abuse detection/i.test(bodyText)?'rate-limit':
   /resource not accessible|permission|not permitted/i.test(bodyText)?'permissions':
   /bad credentials|authentication|token invalid/i.test(bodyText)?'authentication':'unknown';
  const requestId=(response.headers.get('x-github-request-id')||'').replace(/[^a-zA-Z0-9:-]/g,'').slice(0,80);
  console.warn('GitHub world sync rejected:',{status:response.status,stage,reason,requestId});
  throw new GitHubResponseError(response.status,stage,reason);
 }
 return await response.json() as T;
}

/**
 * Write exactly one Git tree entry, retaining everything else on main.
 * A non-force ref update protects concurrent edits from other conversations.
 * Retry conflicts against the new branch head; never force-push.
 */
export async function publishBundledWorld(layout:WorldLayout,records:ArtworkRecord[],revision:number,token:string):Promise<string>{
 if(!token.trim())throw Error('GitHub world publishing has not been configured on this site.');
 const content=JSON.stringify({revision,layout,records})+'\n';
 const blob=await github<GitHubSha>(token,'/git/blobs','POST',{content,encoding:'utf-8'});
 for(let attempt=0;attempt<3;attempt++){
  const ref=await github<GitHubRef>(token,'/git/ref/heads/main');
  const parent=await github<GitHubCommit>(token,'/git/commits/'+encodeURIComponent(ref.object.sha));
  const tree=await github<GitHubSha>(token,'/git/trees','POST',{
   base_tree:parent.tree.sha,
   tree:[{path:SNAPSHOT,mode:'100644',type:'blob',sha:blob.sha}],
  });
  const commit=await github<GitHubSha>(token,'/git/commits','POST',{
   message:'Update native bundled world from editor (revision '+revision+')',
   tree:tree.sha,
   parents:[ref.object.sha],
  });
  try{
   await github<GitHubRef>(token,'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
   return commit.sha;
  }catch(error){
   if(!(error instanceof GitHubResponseError)||![409,422].includes(error.status)||attempt===2)throw error;
  }
 }
 throw Error('A newer GitHub change interrupted the world publish. Save again.');
}

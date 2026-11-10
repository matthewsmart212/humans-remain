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
 constructor(readonly status:number){
  super('GitHub could not update the bundled world (HTTP '+status+').');
 }
}
async function github<T>(token:string,path:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(api+path,{
  method,
  headers:{
   'Accept':'application/vnd.github+json',
   'Authorization':'Bearer '+token,
   'X-GitHub-Api-Version':'2022-11-28',
   ...(body===undefined?{}:{'Content-Type':'application/json'}),
  },
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
 });
 if(!response.ok)throw new GitHubResponseError(response.status);
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

import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Exercise the real Worker publisher without contacting GitHub or using secrets.
const result=await build({entryPoints:['server/world-bundle.ts'],bundle:true,write:false,platform:'node',format:'esm',target:'node22'});
const moduleUrl='data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64');
const {publishBundledWorld,explainWorldSyncFailure}=await import(moduleUrl);
const calls=[];
const originalFetch=globalThis.fetch;
const ok=value=>Response.json(value);
globalThis.fetch=async(url,options)=>{
 const path=new URL(url).pathname;
 calls.push({path,options});
 assert.equal(options.headers.Authorization,'Bearer fake-private-server-token');
 assert.equal(options.headers['User-Agent'],'HumansRemain-WorldPublisher/1.0','Worker always sends the User-Agent GitHub requires');
 if(path.endsWith('/git/blobs'))return ok({sha:'new-blob'});
 if(path.endsWith('/git/ref/heads/main'))return ok({object:{sha:'base-commit'}});
 if(path.endsWith('/git/commits/base-commit'))return ok({sha:'base-commit',tree:{sha:'base-tree'}});
 if(path.endsWith('/git/trees'))return ok({sha:'new-tree'});
 if(path.endsWith('/git/commits'))return ok({sha:'new-commit'});
 if(path.endsWith('/git/refs/heads/main'))return ok({object:{sha:'new-commit'}});
 throw Error('Unexpected GitHub endpoint: '+path);
};
try{
 const layout={version:1,terrain:'home',name:'Camp test',spawn:{x:100,y:100},items:[],updatedAt:'2026-11-10T00:00:00.000Z'};
 const commit=await publishBundledWorld(layout,[],91,'fake-private-server-token');
 assert.equal(commit,'new-commit');
 assert.equal(calls.length,6);
 const blob=JSON.parse(calls[0].options.body);
 assert.equal(blob.encoding,'utf-8');
 assert.deepEqual(JSON.parse(blob.content),{revision:91,layout,records:[]});
 const tree=JSON.parse(calls[3].options.body);
 assert.equal(tree.base_tree,'base-tree');
 assert.deepEqual(tree.tree,[{path:'native/assets/world-snapshot.json',mode:'100644',type:'blob',sha:'new-blob'}]);
 const patch=JSON.parse(calls[5].options.body);
 assert.deepEqual(patch,{sha:'new-commit',force:false});
 await assert.rejects(()=>publishBundledWorld(layout,[],91,''),/not been configured/);
 // Report a useful diagnostic, but never reveal the secret, GitHub's
 // response body or private repository metadata to the editor.
 for(const [status,fragment] of [[401,'invalid or expired'],[403,'Contents: Read and write'],[404,'Repository access'],[422,'rejected the commit update']]){
  globalThis.fetch=async url=>{
   const path=new URL(url).pathname;
   if(status===422&&path.endsWith('/git/blobs'))return ok({sha:'new-blob'});
   return new Response('PRIVATE-GITHUB-ERROR-BODY',{status});
  };
  try{
   await publishBundledWorld(layout,[],91,'fake-private-server-token');
   assert.fail('Expected GitHub sync to fail');
  }catch(error){
   const message=explainWorldSyncFailure(error);
   assert.match(message,new RegExp(fragment,'i'));
   assert.match(message,new RegExp('HTTP '+status));
   assert(!message.includes('PRIVATE-GITHUB-ERROR-BODY'));
   assert(!message.includes('fake-private-server-token'));
  }
 }
 // A GitHub error explicitly complaining about User-Agent must be
 // classified without leaking the provider response body.
 globalThis.fetch=async()=>new Response(JSON.stringify({message:'User-Agent required'}),{status:403});
 try{
  await publishBundledWorld(layout,[],91,'fake-private-server-token');
  assert.fail('Missing User-Agent rejection should fail');
 }catch(error){
  assert.match(explainWorldSyncFailure(error),/User-Agent/);
 }
 assert.match(explainWorldSyncFailure(new Error('network error')),/could not be reached/);
 console.log('Bundled world GitHub publisher: verified authenticated commits and safe HTTP diagnostics.');
}finally{globalThis.fetch=originalFetch}

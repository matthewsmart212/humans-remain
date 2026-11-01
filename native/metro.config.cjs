const {getDefaultConfig}=require('expo/metro-config');
const fs=require('fs');
const path=require('path');
const projectRoot=__dirname;
// Expo inlines public values into the native JS bundle. Capture source identity
// when Metro starts; never pass repo credentials or local file paths to the app.
try{
  const {execFileSync}=require('child_process');
  const git=args=>execFileSync('git',args,{cwd:path.resolve(projectRoot,'..'),encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  process.env.EXPO_PUBLIC_GAME_SOURCE_COMMIT=git(['rev-parse','HEAD']);
  process.env.EXPO_PUBLIC_GAME_SOURCE_DIRTY=git(['status','--porcelain','--untracked-files=no'])?'true':'false';
}catch{
  process.env.EXPO_PUBLIC_GAME_SOURCE_COMMIT='unavailable';
  process.env.EXPO_PUBLIC_GAME_SOURCE_DIRTY='unknown';
}
process.env.EXPO_PUBLIC_GAME_SOURCE_CAPTURED_AT=new Date().toISOString();
const config=getDefaultConfig(projectRoot);
config.watchFolders=[path.resolve(projectRoot,'..')];
const nativeNodeModules=path.resolve(projectRoot,'node_modules');
config.resolver.nodeModulesPaths=[nativeNodeModules];
config.resolver.disableHierarchicalLookup=true;
// Parent src must resolve React Native from native/node_modules, not the web app.
// Packages nested under native/node_modules still have to be visible to Metro.
config.resolver.resolveRequest=(context,moduleName,platform)=>{
  try{return context.resolveRequest(context,moduleName,platform)}
  catch(error){
    const extra=[...nestedNodeModules(context.originModulePath),...nestedPackageModules()];
    if(!extra.length)throw error;
    return context.resolveRequest({...context,nodeModulesPaths:[...extra,...context.nodeModulesPaths]},moduleName,platform);
  }
};
function nestedNodeModules(origin){
  const paths=[];
  if(!origin)return paths;
  let dir=path.dirname(origin);
  const root=path.resolve(projectRoot);
  while(dir===root||dir.startsWith(root+path.sep)){
    const candidate=path.join(dir,'node_modules');
    if(path.resolve(candidate)!==nativeNodeModules)paths.push(candidate);
    if(dir===root)break;
    const parent=path.dirname(dir);
    if(parent===dir)break;
    dir=parent;
  }
  return paths;
}
let cachedPackageModules;
function nestedPackageModules(){
  if(cachedPackageModules)return cachedPackageModules;
  const paths=[];
  for(const entry of fs.readdirSync(nativeNodeModules,{withFileTypes:true})){
    if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
    const base=path.join(nativeNodeModules,entry.name);
    if(entry.name.startsWith('@')){
      for(const inner of fs.readdirSync(base,{withFileTypes:true})){
        if(!inner.isDirectory())continue;
        const nested=path.join(base,inner.name,'node_modules');
        if(fs.existsSync(nested))paths.push(nested);
      }
    }else{
      const nested=path.join(base,'node_modules');
      if(fs.existsSync(nested))paths.push(nested);
    }
  }
  cachedPackageModules=paths;
  return paths;
}
// Dev-only: the phone POSTs a finished performance log here so it lands in the repo.
const PERFORMANCE_LOG_LIMIT=80*1024*1024;
function receivePerformanceLog(req,res,next){
  const pathname=(req.url||'').split('?')[0];
  if(req.method!=='POST'||pathname!=='/__performance-log')return next();
  const chunks=[];
  let size=0,failed=false;
  req.on('data',chunk=>{
    if(failed)return;
    size+=chunk.length;
    if(size>PERFORMANCE_LOG_LIMIT){
      failed=true;
      res.writeHead(413,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:false,error:'Log is larger than 80 MB.'}));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('error',()=>{failed=true});
  req.on('end',()=>{
    if(failed||res.writableEnded)return;
    try{
      const body=Buffer.concat(chunks);
      JSON.parse(body.toString('utf8'));
      const dir=path.resolve(projectRoot,'..','performance-logs');
      fs.mkdirSync(dir,{recursive:true});
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      const named=`humans-remain-performance-${stamp}.json`;
      fs.writeFileSync(path.join(dir,named),body);
      fs.writeFileSync(path.join(dir,'latest.json'),body);
      console.log(`Saved performance log performance-logs/${named} (${body.length} bytes)`);
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true,file:`performance-logs/${named}`,latest:'performance-logs/latest.json',bytes:body.length}));
    }catch(error){
      if(res.writableEnded)return;
      res.writeHead(400,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:false,error:error&&error.message?error.message:'Could not save the log.'}));
    }
  });
}
config.server=config.server||{};
// Expo 58's Metro build never installs unstable_priorityMiddleware. enhanceMiddleware
// is mounted before the dev server's catch-all, which otherwise answers this POST with
// the Expo manifest and the phone treats that as a successful save.
config.server.unstable_priorityMiddleware=[...(config.server.unstable_priorityMiddleware||[]),receivePerformanceLog];
const passThrough=config.server.enhanceMiddleware;
config.server.enhanceMiddleware=(middleware,metroServer)=>{
  const inner=typeof passThrough==='function'?passThrough(middleware,metroServer):middleware;
  return (req,res,next)=>receivePerformanceLog(req,res,()=>inner(req,res,next));
};
module.exports=config;

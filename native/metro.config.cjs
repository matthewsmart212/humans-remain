const {getDefaultConfig}=require('expo/metro-config');
const fs=require('fs');
const path=require('path');
const projectRoot=__dirname;
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
module.exports=config;

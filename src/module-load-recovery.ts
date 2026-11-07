/** Recover an interrupted/stale code-split bundle after a deployment.
 * Safari sometimes caches a failed dynamic import for the lifetime of a page,
 * so retrying import('./skia-web') alone can never succeed. A single fresh
 * document navigation obtains the current entry/chunk manifest instead.
 *
 * This does not clear localStorage, change the world layout or restart a run;
 * the deferred renderer is only imported while opening the world.
 */
const RETRY_KEY='humans-remain-module-recovery-v1';
const RETRY_WINDOW_MS=90_000;
let reloadScheduled=false;

export function isModuleImportError(error:unknown):boolean{
 const message=error instanceof Error?error.message:String(error??'');
 return /importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|failed to load module script|loading chunk [^ ]+ failed|chunkloaderror|import\(\) failed|unable to preload (?:css|js)/i.test(message);
}

/** True when a page refresh has already been scheduled or is pending. */
export function recoverFailedModuleLoad(error:unknown,fromPreloadEvent=false):boolean{
 if(!fromPreloadEvent&&!isModuleImportError(error))return false;
 if(typeof window==='undefined')return false;
 if(reloadScheduled)return true;
 const now=Date.now();
 try{
  const previous=Number(window.sessionStorage.getItem(RETRY_KEY)||0);
  if(previous>0&&now-previous<RETRY_WINDOW_MS)return false;
  window.sessionStorage.setItem(RETRY_KEY,String(now));
 }catch{
  // Keep the page usable when Safari Private Browsing disallows storage.
  // There is no safe cross-navigation retry limit without sessionStorage.
  return false;
 }
 reloadScheduled=true;
 const address=new URL(window.location.href);
 // Bust the HTML URL as well as Safari's failed module-import cache.
 address.searchParams.set('_hr_module_retry',String(now));
 window.setTimeout(()=>window.location.replace(address.href),120);
 return true;
}

/** Optional owner key for the Cloudflare-hosted world editor.
 * Stored only for the current browser tab; never bundled into the game.
 * Worker checks the key against its separately configured secret.
 */
const KEY='humans-remain-cloudflare-editor-key';
export function editorTokenHeaders():Record<string,string>{
 try{const value=sessionStorage.getItem(KEY);return value?{Authorization:'Bearer '+value}:{}}
 catch{return{}}
}
export function setEditorToken(value:string){
 const token=value.trim();
 if(token.length<32)throw Error('The Cloudflare editor key must be at least 32 characters.');
 sessionStorage.setItem(KEY,token);
}
export function clearEditorToken(){try{sessionStorage.removeItem(KEY)}catch{}}

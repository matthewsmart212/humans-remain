/** A decoded music loop keeps iOS Safari from switching between two audible
 * media elements when narrated video starts. Its clock belongs to this player,
 * never to video buffering, seeking or the title/menu transition.
 */
export function createOpeningMusic(context:AudioContext,url:string,onError:()=>void){
 const gain=context.createGain();
 gain.gain.value=0;
 gain.connect(context.destination);
 let buffer:AudioBuffer|null=null,source:AudioBufferSourceNode|null=null;
 let requested=false,disposed=false,offset=0,startedAt=0,fadedIn=false;
 const abort=new AbortController();
 const play=()=>{
  if(disposed||!requested||!buffer||source||context.state!=='running')return;
  source=context.createBufferSource();
  source.buffer=buffer;source.loop=true;source.connect(gain);
  startedAt=context.currentTime;
  if(!fadedIn){
   gain.gain.setValueAtTime(0,startedAt);
   gain.gain.linearRampToValueAtTime(.72,startedAt+1.8);
   fadedIn=true;
  }
  source.start(0,offset%buffer.duration);
 };
 const start=()=>{
  if(disposed)return;
  requested=true;
  // Resume directly inside the tap; a pending download never consumes the
  // original user activation, and cannot restart a loop already playing.
  if(context.state!=='running')void context.resume().then(play).catch(()=>{});
  else play();
 };
 const pause=()=>{
  requested=false;
  if(!source)return;
  offset+=context.currentTime-startedAt;
  source.stop();source.disconnect();source=null;
 };
 void fetch(url,{signal:abort.signal}).then(response=>{
  if(!response.ok)throw new Error('Soundtrack download failed');
  return response.arrayBuffer();
 }).then(bytes=>context.decodeAudioData(bytes)).then(decoded=>{
  if(disposed)return;
  buffer=decoded;play();
 }).catch(error=>{if(!disposed&&error.name!=='AbortError')onError()});
 return {start,pause,dispose:()=>{
  disposed=true;abort.abort();pause();gain.disconnect();
  void context.close().catch(()=>{});
 }};
}

type StartingWorld={ready:boolean;error:string;loaded:number;total:number};
/** A tap during initial loading queues entry instead of disabling Play. */
export async function waitForStartingWorld(read:()=>StartingWorld,progress:(value:number)=>void,options:{timeoutMs?:number;pause?:()=>Promise<void>}={}){
 const deadline=Date.now()+(options.timeoutMs??120000);
 const pause=options.pause??(()=>new Promise<void>(resolve=>setTimeout(resolve,50)));
 for(;;){
  const state=read();
  if(state.error)throw Error(state.error);
  if(state.ready){progress(.2);return}
  if(Date.now()>=deadline)throw Error('Your world is taking longer to prepare. Press Play to try again.');
  progress(.04+.15*(state.total>0?Math.min(1,state.loaded/state.total):0));
  await pause();
 }
}

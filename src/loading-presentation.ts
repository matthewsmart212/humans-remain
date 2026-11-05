/** Visual estimate between real milestones; completion always requires readiness. */
export function nextLoadingProgress(previous:number,actual:number,elapsedMs:number){
 const dt=Math.min(250,Math.max(0,elapsedMs))/1000;
 const ready=actual>=1;
 const goal=ready?1:Math.min(.98,Math.max(actual,.94));
 const next=ready?previous+dt*.85:previous+Math.max((goal-previous)*(1-Math.exp(-dt/9)),Math.max(0,actual-previous)*dt*2);
 return Math.max(previous,Math.min(goal,next));
}

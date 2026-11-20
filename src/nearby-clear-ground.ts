type Point={x:number;y:number};

/** Search outwards so an obstructed landing stays close to its original spot. */
export function nearbyClearGround(from:Point,blocked:(x:number,y:number)=>boolean):Point|undefined{
 if(!blocked(from.x,from.y))return from;
 for(let radius=6;radius<=480;radius+=6){
  const count=Math.max(16,Math.min(192,Math.ceil(2*Math.PI*radius/6)));
  for(let i=0;i<count;i++){
   const angle=i*Math.PI*2/count,x=from.x+Math.cos(angle)*radius,y=from.y+Math.sin(angle)*radius;
   if(!blocked(x,y))return {x,y};
  }
 }
}

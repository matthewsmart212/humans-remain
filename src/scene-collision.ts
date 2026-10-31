import {hitCollider,type Collider} from './camp-collision';
import type {CollisionPoint} from './asset-collision';
import type {SceneDefinition} from './scene-model';

export const polygonCollider=(points:CollisionPoint[],id='scene'):Collider=>({id,shape:'polygon',points,x:0,y:0,hw:0,hh:0});
export function inSceneArea(points:CollisionPoint[],x:number,y:number){return hitCollider(polygonCollider(points),x,y,0)}
const compiled=new WeakMap<SceneDefinition,{floor:Collider;edges:Collider[];blockers:Collider[]}>();
function geometry(scene:SceneDefinition){
 let value=compiled.get(scene);if(value)return value;
 value={floor:polygonCollider(scene.walkable),edges:scene.walkable.map(([x,y],i)=>{const [ex,ey]=scene.walkable[(i+1)%scene.walkable.length];return{id:'edge'+i,shape:'segment',x,y,ex,ey,r:0}}),blockers:scene.blockers.map((p,i)=>polygonCollider(p,'fixture'+i))};
 compiled.set(scene,value);return value;
}
/** The whole player footprint stays on the floor, including concave stairs. */
export function sceneBlocked(scene:SceneDefinition,x:number,y:number,r=19){
 if(x<r||y<r||x>scene.width-r||y>scene.height-r)return true;
 const g=geometry(scene);
 return !hitCollider(g.floor,x,y,0)||g.edges.some(edge=>hitCollider(edge,x,y,r))||g.blockers.some(blocker=>hitCollider(blocker,x,y,r));
}

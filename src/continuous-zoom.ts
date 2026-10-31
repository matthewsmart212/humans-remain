import {ATLAS_FULL_ZOOM} from './continuous-zoom-state';
import {playerMapScene,playerMapView} from './player-map';
import {editorCamera,type EditorView} from './placed-world-renderer';
import type {World} from './survival-engine';

/** One scale space for gameplay and atlas; crossing .7 never resets a gesture. */
export function continuousMapCamera(world:World,view:EditorView,width:number,height:number,amount:number){
 const scene=playerMapScene(world),fit=playerMapView(scene.bounds,width,height,1).scale;
 const game=editorCamera(width,height,world,{...view,zoom:.7,follow:true,playing:true},1);
 const entry=Math.max(2,game.scale/fit),zoom=Math.max(1,entry*amount/.7);
 const t=Math.max(0,Math.min(1,(.7-amount)/(.7-ATLAS_FULL_ZOOM))),opacity=t*t*(3-2*t);
 return {entry,zoom,opacity,minimum:.7/entry,focus:{x:game.x+width/game.scale/2,y:game.y+height/game.scale/2}};
}

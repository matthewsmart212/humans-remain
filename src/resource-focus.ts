import {chooseInteractionFocus} from './interaction-focus';
import type {FieldKitTarget} from './field-kit-target';
import {canMineRock,type MiningTarget} from './rock-mining';
import {TREE_ART,treeRoot} from './tree-chopping';
import {visiblePlacements} from './layout-views';
import {placementBounds} from './world-layout';
import {axeProfile} from './axe-combat';
import {DIRECTION_ANGLES,lineClear,timeOf,type World} from './survival-engine';

export function miningFocus(w:World,rock:MiningTarget):FieldKitTarget{
 const p=rock.placement,b=placementBounds(p),allowed=canMineRock(w,rock),hit=w.rockMining?.[p.id];
 const working=!!hit&&timeOf(w)-hit.hitAt<1.3;
 return{id:`rock:${p.id}`,x:rock.point.x,y:rock.point.y,rockId:p.id,label:rock.metalOnly?'Iron boulder':'Stone boulder',detail:allowed?'Hold to mine':rock.metalOnly?'Metal pickaxe needed':'Pickaxe needed',blocked:!allowed,ground:{x:p.x,y:p.y-2,rx:Math.min(120,b.width*.46),ry:Math.min(30,b.width*.12)},...(working?{progress:1-rock.hp/rock.maxHp,progressLabel:'Mining progress'}:{})};
}

/** Only trees inside the tool's actual swing arc and reach can receive focus. */
export function nearbyTreeFocus(w:World):FieldKitTarget|undefined{
 if(!w.layout||w.scene)return;
 const spec=axeProfile({tool:w.player.equipped==='woodenAxe'?'woodenAxe':'axe'}),angle=DIRECTION_ANGLES[w.player.direction];
 const candidates=[];
 for(const p of visiblePlacements(w.layout,{x:w.player.x-150,y:w.player.y-150,width:300,height:300})){
  const art=TREE_ART.get(p.assetId),state=w.treeChops?.[p.id];if(!art||state?.hp===0)continue;
  const root=treeRoot(p),dx=root.x-w.player.x,dy=root.y-w.player.y,d=Math.hypot(dx,dy);
  if(d>spec.reach||Math.cos(Math.atan2(dy,dx)-angle)<Math.cos(spec.halfArc))continue;
  const ratio=Math.max(0,d-(38*p.scale+5))/(d||1);
  if(!lineClear(w.player,{x:w.player.x+dx*ratio,y:w.player.y+dy*ratio},w))continue;
  const value:FieldKitTarget={id:`tree:${p.id}`,...root,treeId:p.id,label:art.name,detail:'Hold to chop',ground:{...root,rx:43*p.scale,ry:12*p.scale},...(state&&timeOf(w)-state.hitAt<1.3?{progress:1-state.hp/art.hp,progressLabel:'Chopping progress'}:{})};
  candidates.push({id:value.id!,...root,available:true,value});
 }
 return chooseInteractionFocus(w,candidates)??undefined;
}

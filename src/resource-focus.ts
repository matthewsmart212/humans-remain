import {chooseInteractionFocus} from './interaction-focus';
import type {FieldKitTarget} from './field-kit-target';
import {canMineRock,type MiningTarget} from './rock-mining';
import {activeTreeChop,TREE_ART,treeStrikePoint} from './tree-chopping';
import {visiblePlacements} from './layout-views';
import {axeProfile} from './axe-combat';
import {DIRECTION_ANGLES,lineClear,timeOf,type World} from './survival-engine';

export function miningFocus(w:World,rock:MiningTarget):FieldKitTarget{
 const p=rock.placement,allowed=canMineRock(w,rock),hit=w.rockMining?.[p.id];
 const working=!!hit&&timeOf(w)-hit.hitAt<1.3;
 return{id:`rock:${p.id}`,x:rock.point.x,y:rock.point.y,rockId:p.id,label:rock.metalOnly?'Iron boulder':'Stone boulder',detail:allowed?'Hold to mine':rock.metalOnly?'Metal pickaxe needed':'Pickaxe needed',blocked:!allowed,...(working?{progress:1-rock.hp/rock.maxHp,progressLabel:'Mining progress'}:{})};
}

/** Only trees inside the tool's actual swing arc and reach can receive focus. */
export function nearbyTreeFocus(w:World):FieldKitTarget|undefined{
 if(!w.layout||w.scene)return;
 const spec=axeProfile({tool:w.player.equipped==='woodenAxe'?'woodenAxe':'axe'}),angle=DIRECTION_ANGLES[w.player.direction];
 const candidates=[];
 for(const p of visiblePlacements(w.layout,{x:w.player.x-150,y:w.player.y-150,width:300,height:300})){
  const art=TREE_ART.get(p.assetId),state=activeTreeChop(w,p.id);if(!art||state?.hp===0)continue;
  const contact=treeStrikePoint(p,w.player,angle,spec.reach,spec.halfArc,(from,to)=>lineClear(from,to,w));
  if(!contact)continue;
  const value:FieldKitTarget={id:`tree:${p.id}`,...contact,treeId:p.id,label:art.name,detail:'Hold to chop',...(state&&timeOf(w)-state.hitAt<1.3?{progress:1-state.hp/art.hp,progressLabel:'Chopping progress'}:{})};
  candidates.push({id:value.id!,...contact,available:true,value});
 }
 return chooseInteractionFocus(w,candidates)??undefined;
}

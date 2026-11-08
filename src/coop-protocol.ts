import type {Direction} from './survival-engine';
import type {SurvivorRoleId} from './survivor-roles';

/** Phase 1: position/presence only. No resources, combat or progression is synchronized. */
export const COOP_PROTOCOL_VERSION=1;
export const COOP_MAX_PLAYERS=4;
export type CoopPose={
 x:number;y:number;direction:Direction;moving:boolean;sprinting:boolean;
 walkDistance:number;sceneId:string;
};
export type CoopPeer=CoopPose&{id:string;name:string;role:SurvivorRoleId;joinedAt:number};
export type CoopClientPacket=
 | {type:'pose';pose:CoopPose}
 | {type:'ping';nonce:number}
 | {type:'start'};
export type CoopServerPacket=
 | {type:'welcome';id:string;room:string;players:CoopPeer[];version:number}
 | {type:'roster';players:CoopPeer[]}
 | {type:'pose';peer:CoopPeer}
 | {type:'pong';nonce:number}
 | {type:'start'}
 | {type:'error';message:string};
export const COOP_DIRECTIONS:readonly Direction[]=['down','down-right','right','up-right','up','up-left','left','down-left'];
export const COOP_ROLES:readonly SurvivorRoleId[]=['survivor','engineer','hunter','medic'];
export const COOP_ROOM_CODE=/^[A-HJ-NP-Z2-9]{8}$/;
export const COOP_SCENE_ID=/^[a-zA-Z0-9_-]{1,48}$/;
export function validCoopPose(value:unknown):value is CoopPose {
 if(!value||typeof value!=='object')return false;
 const p=value as Partial<CoopPose>;
 return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x!)<=30000&&Math.abs(p.y!)<=30000
  &&COOP_DIRECTIONS.includes(p.direction as Direction)
  &&typeof p.moving==='boolean'&&typeof p.sprinting==='boolean'
  &&Number.isFinite(p.walkDistance)&&Math.abs(p.walkDistance!)<1e9
  &&typeof p.sceneId==='string'&&COOP_SCENE_ID.test(p.sceneId);
}

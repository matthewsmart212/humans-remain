import type {World,Enemy} from './survival-engine';
import {BRUTE,bruteCarrying,bruteExposed} from './brute-model';
const now=(w:World)=>w.tick/60;
export function bruteCaptor(w:World){
 const grab=w.bruteGrab;if(!grab)return;
 return w.enemies.find(e=>e.id===grab.enemyId&&e.kind==='iron-brute'&&e.hp>0&&e.brute&&['pull','hold','crush','release'].includes(e.brute.phase));
}
export const brutePlayerCarried=(w:World)=>!!w.bruteGrab&&bruteCarrying(bruteCaptor(w)?.brute);
/** The real player stays on clear ground in front of the robot. Lifting into
 * its arms is presentation only, so release never embeds a player in a wall. */
export function releaseBruteGrab(w:World,reason='',safety=true){
 const g=w.bruteGrab;if(!g)return;const e=w.enemies.find(e=>e.id===g.enemyId),t=now(w);w.bruteGrab=undefined;
 if(e?.brute&&['pull','hold','crush'].includes(e.brute.phase)){e.brute.phase='release';e.brute.since=t;e.brute.resolved=true}
 w.player.moving=false;w.player.sprinting=false;w.player.walkBlend=0;w.player.runBlend=0;
 w.bruteEscapeUntil=Math.max(w.bruteEscapeUntil??0,t+BRUTE.escapeImmunity);w.attackQueuedUntil=undefined;w.attackReady=Math.max(w.attackReady,t+.15);
 if(safety)w.player.hurtUntil=Math.max(w.player.hurtUntil,t+.35);
 if(reason){w.notice=reason;w.noticeUntil=t+1.2}
}
export function validateBruteGrab(w:World){if(w.bruteGrab&&(!bruteCaptor(w)||w.player.hp<=0||w.player.downedUntil||w.phase==='over'))releaseBruteGrab(w,'',false)}
export function struggleBruteGrab(w:World){
 validateBruteGrab(w);const g=w.bruteGrab,t=now(w);if(!g)return false;
 if(t-g.lastEscapeAt<BRUTE.escapeDebounce)return false;g.lastEscapeAt=t;g.escape++;
 if(g.escape>=BRUTE.escapeTaps){releaseBruteGrab(w,'BROKE FREE');w.effects.push({x:w.player.x,y:w.player.y,id:w.serial++,born:t,type:'brute-release',label:'',enemyKind:'iron-brute'});if(w.combatStats)w.combatStats.evades++}
 return true;
}
export function bruteArmour(e:Enemy,damage:number,impact:'weapon'|'fists'){
 return Math.max(1,Math.round(damage*(impact==='fists'?BRUTE.fistMultiplier:bruteExposed(e.brute)?BRUTE.exposedMultiplier:BRUTE.weaponMultiplier)));
}
/** Strong combos interrupt anticipation or a grip; ordinary pokes cannot
 * stun-lock the tank, and an airborne slam stays committed. */
export function hitBrutePoise(w:World,e:Enemy,damage:number,impact:'weapon'|'fists',heavy=false){
 const b=e.brute,t=now(w);if(!b||impact==='fists')return false;
 b.poise=(t-b.poiseAt>BRUTE.poiseWindow?0:b.poise)+damage*(heavy?2:1);b.poiseAt=t;
 if(b.poise<BRUTE.poise||!['jump-windup','hook-windup','melee-windup','pull','hold'].includes(b.phase))return false;
 if(w.bruteGrab?.enemyId===e.id)releaseBruteGrab(w,'GRIP BROKEN');
 b.phase='stagger';b.since=t;b.resolved=true;b.poise=0;b.hook=undefined;b.jump=undefined;e.moving=false;e.attackAt=Math.max(e.attackAt,t+1.5);
 if(e.motion){e.motion.phase='stagger';e.motion.since=t;e.motion.resolved=true}return true;
}

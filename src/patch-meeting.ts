import {patchChat} from './patch-chat';
import {PATCH_ROBOT_SCALE} from './patch-art';
import {patchChatBounds} from './patch-chat-bounds';
import {conversationBubbleMetrics} from './patch-bubble-placement';
import {patchReplyStripLayout} from './patch-reply-strip-layout';
import type {PatchQuestState} from './patch-quest';
import type {World} from './survival-engine';

type Camera={x:number;y:number;scale:number};
type Shot={cx:number;cy:number;scale:number;width:number;height:number};
type Blend={start:number;from:number;to:number};
type Transition={entry:Blend;detail:Blend;shot?:Shot};
const transitions=new WeakMap<PatchQuestState,Transition>();
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;

function amountAt(blend:Blend,now:number,duration:number){
 const t=clamp((now-blend.start)/duration,0,1);
 return mix(blend.from,blend.to,t*t*(3-2*t));
}
function changeBlend(blend:Blend,to:number,now:number,duration:number){
 if(blend.to===to)return;
 blend.from=amountAt(blend,now,duration);blend.to=to;blend.start=now;
}

/** The two-shot is a presentation of the live actors. Easing their screen
 * centre and magnification independently keeps both in frame during the move. */
export function patchMeetingCamera(w:World,base:Camera,width:number,height:number,now:number){
 const q=w.patchQuest;
 if(!q||w.scene)return {...base,meeting:0};
 const chat=patchChat(w),open=!!chat;
 let transition=transitions.get(q);
 if(!open&&!transition)return {...base,meeting:0};
 if(!transition){
  transition={entry:{start:now,from:0,to:1},detail:{start:now,from:0,to:0}};
  transitions.set(q,transition);
 }
 const {entry,detail}=transition;
 changeBlend(entry,Number(open),now,entry.to===1 ? .64 : .42);
 if(open)changeBlend(detail,Number(chat.view==='answer'||chat.view==='followup'),now,.42);
 if(w.weather?.reducedMotion){entry.from=entry.to;detail.from=detail.to}
 const amount=amountAt(entry,now,open ? .64 : .42);
 if(!open&&(amount===0||Math.hypot(q.position.x-w.player.x,q.position.y-w.player.y)>280)){
  transitions.delete(q);return {...base,meeting:0};
 }
 // Hold the departing composition while the player's live camera returns.
 // Clearing the reply controls or changing command must not reframe the shot.
 let shot=transition.shot;
 if(open||!shot||shot.width!==width||shot.height!==height){
  shot=meetingShot(w,width,height,amountAt(detail,now,.42));transition.shot=shot;
 }
 const scale=base.scale*(shot.scale/base.scale)**amount;
 const cx=mix(base.x+width/(2*base.scale),shot.cx,amount),cy=mix(base.y+height/(2*base.scale),shot.cy,amount);
 return {x:cx-width/(2*scale),y:cy-height/(2*scale),scale,meeting:amount};
}

function meetingShot(w:World,width:number,height:number,detail:number):Shot{
 // The shot's lens is set by the actors' positions, independent of the
 // artwork scale. A broader lens keeps the shelter or camp in the encounter.
 const q=w.patchQuest!,player=w.player,wide=width>=height;
 const controls=patchChatBounds(w),phoneEdge=wide&&width<=960?44:0;
 const safe=controls?.safe??{left:phoneEdge,right:phoneEdge,top:0,bottom:0};
 const stageLeft=safe.left+12;
 const stageRight=width-safe.right-(wide?Math.min(355,width*.42)+26:12);
 const stageTop=height*(wide ? .095 : .12),stageBottom=height*(wide ? .64 : .49);
 const subjectSpan=Math.max(q.position.x+43,player.x+39)-Math.min(q.position.x-43,player.x-39);
 const headroom=Math.max(q.position.y,player.y)+3-Math.min(q.position.y-(q.servoInstalled?93:71),player.y-119);
 const fitted=Math.min(Math.max(90,stageRight-stageLeft)/subjectSpan,(stageBottom-stageTop)/headroom,3.25);
 const greetingScale=.70*fitted*.90;
 const lens=.70*fitted*mix(.90,1,detail);
 // Frame the actual larger silhouettes around that lens. Both outlines are
 // measured from their registered feet in atlas pixels.
 const patchHalf=(q.servoInstalled?92:83)*PATCH_ROBOT_SCALE;
 const left=Math.min(q.position.x-patchHalf,player.x-39),right=Math.max(q.position.x+patchHalf,player.x+39);
 const top=Math.min(q.position.y-(q.servoInstalled?200:158)*PATCH_ROBOT_SCALE,player.y-119),bottom=Math.max(q.position.y,player.y)+3;
 const controlsTop=controls?.y??patchReplyStripLayout(width,height,safe).bounds.y;
 // Reserve headroom for a full page throughout the exchange. Otherwise a
 // taller reply can force the pointer across the survivor on a short screen.
 const metrics=conversationBubbleMetrics(width,height,safe,controlsTop);
 const pageHeight=metrics.headerHeight+2*metrics.padY+metrics.maxLines*metrics.lineHeight;
 const speechBottom=safe.top+8+pageHeight+10;
 const availableHeight=controlsTop-12-speechBottom;
 const closeScale=wide?Math.min(lens,Math.max(60,availableHeight)/(bottom-top)):lens;
 const groupWidth=(right-left)*closeScale;
 // Keep the pair beside the shelter, with room on their right for speech
 // and a clear stretch of ground between their feet and the replies.
 const stageX=clamp(width*(wide ? .414 : .5),stageLeft+groupWidth/2,width-safe.right-12-groupWidth/2);
 const groupHeight=(bottom-top)*closeScale;
 // In landscape the closer answer shot grows down from the greeting's
 // headroom, so a page turn doesn't push the plaque across the shelter.
 const detailOffset=wide?(bottom-top)*(closeScale-greetingScale)/2:0;
 const minY=(wide?speechBottom:safe.top+10)+groupHeight/2;
 const stageY=clamp(height*(wide ? .445 : .46)+detailOffset,minY,controlsTop-12-groupHeight/2);
 const cx=(left+right)*.5+(width*.5-stageX)/closeScale;
 const cy=(top+bottom)*.5+(height*.5-stageY)/closeScale;
 return {cx,cy,scale:closeScale,width,height};
}

/** Shade the edges of the full-bleed scene during the camera transition. */
export function drawPatchMeeting(ctx:CanvasRenderingContext2D,width:number,height:number,amount:number){
 if(amount<=0)return;
 ctx.save();ctx.globalAlpha=amount;
 const vignette=ctx.createRadialGradient(width*.445,height*.37,Math.min(width,height)*.22,width*.445,height*.37,Math.hypot(width,height)*.66);
 vignette.addColorStop(0,'#11191500');vignette.addColorStop(.64,'#10171413');vignette.addColorStop(1,'#080d0bab');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
 ctx.restore();
}

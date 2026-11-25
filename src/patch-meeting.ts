import {patchChat} from './patch-chat';
import {patchChatBounds} from './patch-chat-bounds';
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
 // Fit the painted silhouettes, including the taller survivor's head, into a
 // fixed part of the composition. Ease a little closer when Patch answers,
 // holding that shot across all pages until the survivor asks again.
 const q=w.patchQuest!,wide=width>=height;
 const left=Math.min(q.position.x-43,w.player.x-39),right=Math.max(q.position.x+43,w.player.x+39);
 const top=Math.min(q.position.y-(q.servoInstalled?93:71),w.player.y-119),bottom=Math.max(q.position.y,w.player.y)+3;
 const safe=patchChatBounds(w)?.safe;
 const phoneEdge=wide&&width<=960?44:0;
 const stageLeft=(safe?.left??phoneEdge)+12;
 const stageRight=width-(safe?.right??phoneEdge)-(wide?Math.min(355,width*.42)+26:12);
 const stageTop=height*(wide ? .095 : .12),stageBottom=height*(wide ? .64 : .49);
 const closeScale=Math.min(Math.max(90,stageRight-stageLeft)/(right-left),(stageBottom-stageTop)/(bottom-top),3.25)*mix(.90,1,detail);
 const groupWidth=(right-left)*closeScale;
 const stageX=clamp(width*(wide ? .41 : .5),stageLeft+groupWidth/2,stageRight-groupWidth/2);
 const stageY=(stageTop+stageBottom)*.5;
 const cx=(left+right)*.5+(width*.5-stageX)/closeScale;
 const cy=(top+bottom)*.5+(height*.5-stageY)/closeScale;
 return {cx,cy,scale:closeScale,width,height};
}

function wrap(text:string,width:number,measure:(line:string)=>number){
 const lines:string[]=[];let line='';
 for(const word of text.trim().split(/\s+/)){
  const next=line?line+' '+word:word;
  if(line&&measure(next)>width){lines.push(line);line=word}
  else line=next;
 }
 if(line)lines.push(line);
 return lines;
}

/** Final logical-pixel pass. The soft matte is behind the type and never
 * dims the actors' faces. Native and browser controls share the same bounds. */
export function drawPatchMeeting(ctx:CanvasRenderingContext2D,w:World,width:number,height:number,amount:number){
 const chat=patchChat(w);
 if(!chat&&amount<=0)return;
 const wide=width>=height,dock=patchChatBounds(w),safe=dock?.safe;
 const side=wide&&width<=960?36:0,edge=Math.min(60,Math.max(16,width*.038));
 const left=(safe?.left??side)+edge;
 const right=wide?Math.min(width*.61,(dock?.x??width*.58)-14):width-(safe?.right??0)-edge;
 const textWidth=Math.max(92,Math.min(640,right-left));
 const bottom=wide?height-(safe?.bottom??0)-Math.max(16,height*.067):(dock?.y??height*.70)-16;
 const fontSize=clamp(Math.round(height*(wide ? .049 : .023)),17,25),leading=Math.round(fontSize*1.24);
 ctx.save();
 const font="500 "+fontSize+"px 'Barlow'";
 ctx.font=font;
 const lines=chat?wrap(chat.line,textWidth,line=>ctx.measureText(line).width):[];
 const first=bottom-(Math.max(1,lines.length)-1)*leading;
 const labelY=first-fontSize-8;
 const opacity=Math.max(amount,chat ? .35 : 0);
 // A cool edge falloff draws the eye towards the amber rescue lamp. The
 // original terrain, weather and time of day remain visible inside the shot.
 ctx.globalAlpha=amount;
 const vignette=ctx.createRadialGradient(width*.445,height*.37,Math.min(width,height)*.22,width*.445,height*.37,Math.hypot(width,height)*.66);
 vignette.addColorStop(0,'#11191500');vignette.addColorStop(.64,'#10171413');vignette.addColorStop(1,'#080d0bab');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
 const fadeStart=Math.min(height*.56,labelY-37);
 const shade=ctx.createLinearGradient(0,fadeStart,0,Math.max(bottom+9,fadeStart+1));
 shade.addColorStop(0,'#11171300');shade.addColorStop(.45,'#10161182');shade.addColorStop(1,'#0b100eeb');
 ctx.globalAlpha=opacity;ctx.fillStyle=shade;ctx.fillRect(0,Math.max(0,fadeStart),width,height-Math.max(0,fadeStart));
 const matte=Math.min(16,Math.round(height*.029))*amount;
 ctx.fillStyle='#101410';ctx.fillRect(0,0,width,matte);ctx.fillRect(0,height-matte,width,matte);
 if(chat){
  ctx.globalAlpha=1;ctx.textBaseline='alphabetic';ctx.textAlign='left';
  ctx.font="700 "+Math.round(fontSize*.72)+"px 'Barlow Condensed'";ctx.fillStyle='#efbf72';
  ctx.fillRect(left,labelY-5,16,1);ctx.fillText(chat.speaker,left+23,labelY);
  ctx.font=font;ctx.fillStyle='#fff5df';
  lines.forEach((line,i)=>ctx.fillText(line,left,first+i*leading));
 }
 ctx.restore();
}

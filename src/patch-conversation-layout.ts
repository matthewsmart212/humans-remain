import type {MenuInsets,MenuRect} from './station-menu-layout';
import type {PatchChat} from './patch-chat';

const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,n));
const rounded=(n:number)=>Math.round(n);

/** Both HUDs reserve exactly the same space for the painted conversation and camera. */
export function patchConversationLayout(width:number,height:number,safe:MenuInsets,view:PatchChat['view'],choiceCount:number){
 const greeting=view==='greeting',wide=width>=height;
 const left=Math.max(safe.left+8,rounded(width*(wide ? .045 : .03)));
 const right=Math.max(safe.right+8,rounded(width*(wide ? .045 : .03)));
 const bottom=Math.max(safe.bottom+8,rounded(height*(wide ? .054 : .025)));
 const totalWidth=Math.max(1,width-left-right);
 const scale=wide?clamp(Math.min(width/844,height/390),.84,2):1;
 const pad=clamp(rounded(9*scale),7,18),gap=clamp(rounded(10*scale),7,22);
 const row=clamp(rounded(38*scale),44,74);
 const header=clamp(rounded(38*scale),44,68);
 const font=clamp(rounded(17*scale),16,32);
 const labelFont=clamp(rounded(15*scale),15,28);
 const desiredSpeech=wide?Math.max(greeting?height*.28:height*.242,94):94;
 const speechHeight=rounded(Math.max(desiredSpeech,greeting&&wide?Math.min(choiceCount,2)*row+pad*2+11:0));
 const actionsHeight=greeting&&wide?speechHeight:Math.min(
  rounded(height*(wide ? .61 : .31)),(greeting?0:header)+row*choiceCount+pad*2+(!wide&&greeting?0:1)
 );
 const speechWidth=wide?rounded(totalWidth*(greeting ? .547 : .53)):totalWidth;
 const totalHeight=wide?Math.max(speechHeight,actionsHeight):speechHeight+actionsHeight+(greeting?0:gap);
 const hud={x:left,y:height-bottom-totalHeight,width:totalWidth,height:totalHeight};
 const speech={x:left,y:wide?height-bottom-speechHeight:hud.y,width:speechWidth,height:speechHeight};
 const actionX=wide?left+speechWidth+(greeting?0:gap):left;
 const actions={x:actionX,y:height-bottom-actionsHeight,width:width-right-actionX,height:actionsHeight};
 const portrait=rounded(Math.min(speechHeight-pad*2,speechWidth*(wide ? .235 : .25),184));
 return {hud,speech,actions,greeting,wide,pad,gap,row,header,font,labelFont,portrait};
}

export function localPatchRect(rect:MenuRect,parent:MenuRect){
 return {left:rect.x-parent.x,top:rect.y-parent.y,width:rect.width,height:rect.height};
}

export const patchChoiceIcon=(id:string)=>id==='diagnose'||id==='topic:damage'?'wrench':id==='ask'?'talk':id==='recruit'||id==='follow'?'follow':undefined;

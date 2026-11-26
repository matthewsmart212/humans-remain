import type {PatchChat} from './patch-chat';
import type {MenuInsets,MenuRect} from './station-menu-layout';

export type PatchReplyStripProps={
 width:number;
 height:number;
 safe:MenuInsets;
 choices:PatchChat['choices'];
 choiceSetKey:string;
 speaker:string;
 command?:string;
 onChoose:(id:string)=>void;
 onClose:()=>void;
};

/** Coordinates are game-view points, shared with the camera exclusion and bubble. */
export function patchReplyStripLayout(width:number,height:number,safe:MenuInsets){
 const margin=Math.round(Math.min(width*.085,Math.max(12,(width-350)*.16)));
 const closeWidth=44,closeSize=Math.max(24,Math.min(38,Math.round(width*.031)));
 const left=Math.max(safe.left+8,margin),right=Math.max(safe.right+8,Math.round(margin-(closeWidth-closeSize)/2));
 const bottom=Math.max(safe.bottom+4,Math.min(44,Math.round(height*.067)));
 const row=Math.max(46,Math.min(62,Math.round(height*.105)));
 const paintHeight=Math.min(row,Math.max(36,Math.round(width*.047)));
 const labelHeight=21;
 const bounds:MenuRect={x:left,y:height-bottom-row-labelHeight,width:Math.max(1,width-left-right),height:row+labelHeight};
 const gap=Math.max(6,Math.min(15,Math.round(width*.011)));
 const listWidth=Math.max(1,bounds.width-gap-closeWidth);
 const fontSize=Math.max(15,Math.min(22,Math.round(width*.0195)));
 return {bounds,row,paintHeight,labelHeight,gap,closeWidth,closeSize,listWidth,fontSize};
}

/** The frame includes room for the bevels around an intrinsically sized, one-line label. */
export function patchReplySizing(listWidth:number,gap:number,count:number,fontSize:number){
 const padding=Math.round(fontSize*1.28);
 // In a longer row, display roughly three frames and a glimpse of the next.
 // A label can always grow past this minimum in its platform's own typeface.
 const minimum=count>3
  ? Math.min(fontSize*13,Math.max(fontSize*7.2,Math.floor((listWidth-gap*3)/3.22)))
  : Math.ceil(fontSize*6.5);
 const grow=count===2||count===3?1:0;
 return {minimum,padding,grow};
}

export function isPatchCommand(id:string){return id==='camp'||id==='follow'||id==='stay'}
export function primaryPatchReply(id:string){return id==='diagnose'||id==='recruit'}

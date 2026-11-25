import {stationMenuLayout,type MenuInsets} from './station-menu-layout';

/** Story reading and conversation share one safe-area frame on web and iOS. */
export function patchPanelLayout(width:number,height:number,safe:MenuInsets,presentation:'letter'|'conversation'){
 const base=stationMenuLayout(width,height,safe);
 const availableWidth=Math.max(1,width-safe.left-safe.right-24);
 const availableHeight=Math.max(1,height-safe.top-safe.bottom-24);
 const panelWidth=Math.min(availableWidth,presentation==='letter'?580:760);
 const panelHeight=Math.min(availableHeight,presentation==='letter'?680:base.wide?420:570);
 return{...base,compact:panelHeight<430,panel:{
  x:safe.left+12+(availableWidth-panelWidth)/2,
  y:safe.top+12+(availableHeight-panelHeight)/2,
  width:panelWidth,height:panelHeight,
 }};
}

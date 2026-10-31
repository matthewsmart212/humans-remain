import type {QuickItem} from './quick-items';

type IconCrop={source:[number,number];bounds:[number,number,number,number];rotation:number};
// UI framing only: the held weapons and their animation textures are unchanged.
// Long weapons use their painted silhouette rather than the transparent canvas.
// Spear tips and upper grips read better here than a miniature full-length shaft.
const crops:Partial<Record<QuickItem,IconCrop>>={
 repairHammer:{source:[512,768],bounds:[60,35,402,705],rotation:30},
 woodenPickaxe:{source:[1024,1536],bounds:[10,8,1004,1510],rotation:30},
 metalPickaxe:{source:[1024,1536],bounds:[10,8,1004,1510],rotation:30},
 bow:{source:[256,256],bounds:[94,9,70,238],rotation:38},
 woodenAxe:{source:[1024,1536],bounds:[260,8,680,1505],rotation:32},
 woodenKnife:{source:[1024,1536],bounds:[375,52,300,1416],rotation:40},
 scrapKnife:{source:[1024,1536],bounds:[336,28,384,1482],rotation:40},
 woodenSpear:{source:[1024,1536],bounds:[455,8,120,920],rotation:43},
 metalSpear:{source:[1024,1536],bounds:[438,32,148,950],rotation:43},
 woodenSword:{source:[1024,1536],bounds:[282,18,464,1496],rotation:40},
 metalSword:{source:[1024,1536],bounds:[325,32,406,1460],rotation:40},
};

/** Matching crop geometry for DOM and React Native, without another asset set. */
export function quickItemArt(id:QuickItem,size:number){
 const art=crops[id];
 if(!art)return{crop:{width:size,height:size},image:{width:size,height:size,left:0,top:0},rotation:0};
 const [x,y,width,height]=art.bounds,radians=art.rotation*Math.PI/180;
 const rotatedWidth=width*Math.abs(Math.cos(radians))+height*Math.abs(Math.sin(radians));
 const rotatedHeight=width*Math.abs(Math.sin(radians))+height*Math.abs(Math.cos(radians));
 const scale=size*.94/Math.max(rotatedWidth,rotatedHeight);
 return{crop:{width:width*scale,height:height*scale},image:{width:art.source[0]*scale,height:art.source[1]*scale,left:-x*scale,top:-y*scale},rotation:art.rotation};
}

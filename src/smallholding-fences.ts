import type {WorldAsset} from './world-assets';
import type {Placement} from './world-layout';

export const FENCE_SHEET='/survival/smallholding-v1/fence.webp';
export const FENCE_SHEET_SIZE=[1506,530];

// Distance between the post feet in each painted perspective. The gate leaf
// has a brace and is permanently swung back against the inside of the yard.
const spans={
  front:[180,36], corner:[72,148], side:[15,154], shoulder:[57,167],
  back:[190,0], gate:[35,116],
} as const;
type Panel=keyof typeof spans;
const panels=Object.keys(spans) as Panel[];
const assetId=(panel:Panel)=>'smallholding-fence-'+panel;

function fenceAssets():WorldAsset[]{
  let sheetX=0;
  return panels.map(panel=>{
    const [dx,dy]=spans[panel];
    const width=dx+34,height=dy+98;
    const crop=[sheetX,0,width*2,height*2];
    sheetX+=crop[2];
    return {
      id:assetId(panel),name:panel==='gate'?'Open farm gate':'Weathered split-rail fence',
      group:'Smallholding',image:FENCE_SHEET,crop,width,height,
      anchor:[width,160+dy],role:'prop',solid:true,body:[],
      // Use the same ground-line depth ordering as the existing timber walls.
      perimeter:'wall',perimeterRise:70,
      segments:[{x:-dx/2,y:-dy/2,ex:dx/2,ey:dy/2,r:7}],
    };
  });
}

export const SMALLHOLDING_FENCE_ASSETS=fenceAssets();

export function smallholdingFences(origin:{x:number;y:number}):Placement[]{
  const items:Placement[]=[];
  function place(panel:Panel,id:string,x:number,y:number,dx:number,dy:number){
    items.push({
      assetId:assetId(panel),id:'smallholding-fence-'+id,
      x:origin.x+x+dx/2,y:origin.y+y+dy/2,flipX:dx*dy<0,
      scale:1,solid:true,locked:true,roof:'auto',role:'prop',
    });
  }

  // Follow the weathered boundary from each gatepost around to the back rail.
  for(const side of [-1,1]){
    let x=side*95,y=510;
    const run=['front','corner','side','shoulder','front'] as const;
    run.forEach((panel,i)=>{
      const [width,rise]=spans[panel];
      const dx=side*(i<2?width:-width),dy=-rise;
      for(let bay=0;bay<2;bay++){
        place(panel,(side<0?'west':'east')+'-'+i+'-'+bay,x,y,dx,dy);
        x+=dx;
        y+=dy;
      }
    });
  }
  place('back','back',-95,-572,190,0);
  place('gate','gate',-95,510,-35,-116);
  return items;
}

import type {WorldAsset} from './world-assets';

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

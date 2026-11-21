import {ABANDONED_CAMP_FRAMES} from './abandoned-camp-art';
import {WORKSITE_ROOT,WAREHOUSE_ARTWORK} from './camp-worksites-art';
import {HQ_SOUTH_INTERIOR,HQ_SOUTH_RUIN_INTERIOR} from './headquarters-south-art';
import {FURNACE_BROKEN_IMAGE,FURNACE_COLD_IMAGE} from './furnace-animation-art';
import {TREATMENT_BROKEN_IMAGE,TREATMENT_IDLE_FRAMES} from './treatment-animation-art';
import {WORKSHOP_BROKEN_IMAGE,WORKSHOP_IDLE_FRAMES} from './workshop-animation-art';
import {BUNKER_IMAGE,WELL_IMAGE} from './camp-fixture-collision';
import {placementBounds,placementPoint,type Placement} from './world-layout';

type Point=readonly [number,number];
type Panel={foot:Point;outline:readonly Point[];left:number;right:number;top:number;bottom:number};
type BuildingPainting={base:Point;panels:readonly Panel[]};

// Coordinates are percentages of the complete painted canvas. The base sorts
// at the rear of the walkable surface. Only upright objects are painted again
// at their feet, so the floor between them stays under every actor.
function panel(foot:Point,...outline:Point[]):Panel{
 const xs=outline.map(([x])=>x),ys=outline.map(([,y])=>y);
 return {foot,outline,left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
const warehouse:BuildingPainting={base:[39,65],panels:[
 // Left doorway post and barrel.
 panel([13,79],[3,46],[20,43],[20,76],[16,80],[5,81],[3,78]),
 // Right wall, doorway post and timber bin.
 panel([81,82],[56,44],[94,32],[94,78],[86,82],[78,84],[68,81],[63,76],[55,74]),
 // The cart projects past the planks, including the two separate shafts.
 panel([65,92],[42,89],[48,82],[48,77],[62,70],[67,69],[75,72],[76,87],[74,92],[70,95],[65,95],[64,91],[64,84],[61,86],[54,95],[52,95],[52,92],[59,85],[54,84],[44,91],[42,91]),
]};
const treatmentBroken:BuildingPainting={base:[40,64],panels:[
 panel([18,74],[7,57],[16,54],[30,55],[32,57],[32,70],[21,74],[20,76],[14,76],[12,73],[8,72]),
 panel([43,72],[33,62],[36,59],[48,55],[54,55],[55,59],[49,67],[49,73],[47,73],[47,69],[37,67],[36,71],[34,71]),
 panel([74,79],[54,41],[61,40],[95,52],[99,65],[95,66],[93,69],[78,79],[80,83],[79,87],[76,87],[76,82],[66,80],[58,73],[55,71]),
 panel([61,86],[51,69],[55,67],[60,69],[62,67],[68,69],[68,73],[73,74],[71,83],[64,89],[52,85]),
]};
const treatment:BuildingPainting={base:[40,61],panels:[
 panel([20,72],[8,55],[17,51],[22,51],[24,49],[28,50],[33,52],[34,55],[34,65],[22,70],[20,74],[15,75],[12,73],[13,69],[9,68]),
 panel([43,69],[35,59],[41,55],[49,51],[56,52],[56,57],[49,63],[49,70],[47,70],[47,65],[38,64],[37,68],[35,68]),
 panel([75,77],[55,39],[61,38],[93,50],[98,61],[97,65],[93,65],[76,78],[81,80],[80,84],[77,84],[76,79],[68,78],[58,73],[56,69]),
 panel([62,83],[54,66],[57,64],[59,65],[61,64],[66,64],[70,66],[70,69],[72,70],[71,81],[65,85],[54,82]),
]};
const workshop:BuildingPainting={base:[70,71],panels:[
 panel([26,83],[2,57],[21,49],[36,56],[36,49],[44,51],[45,83],[41,85],[36,84],[30,88],[24,86],[22,88],[20,85],[12,85],[3,83]),
 panel([51,88],[42,85],[45,81],[46,75],[50,72],[54,73],[56,78],[60,76],[62,78],[60,82],[61,88],[55,91],[44,90],[41,89]),
]};
const furnace:BuildingPainting={base:[58,74],panels:[
 panel([43,91],[21,71],[28,67],[34,70],[36,75],[41,72],[57,79],[57,89],[46,94],[30,87],[21,83]),
 panel([73,84],[64,69],[78,65],[82,65],[79,70],[75,73],[79,76],[80,81],[83,83],[77,86],[68,86],[64,84],[66,78],[69,75],[69,72]),
]};
const bunker:BuildingPainting={base:[41,77],panels:[
 panel([22,84],[3,70],[20,44],[33,46],[30,76],[26,85],[17,86],[6,81]),
 panel([58,86],[51,47],[77,41],[90,51],[95,69],[91,78],[73,87],[59,90],[49,86]),
]};
const hq:BuildingPainting={base:[50,29.5],panels:[
 // Side walls and the furniture against them.
 panel([13,68],[7,48],[15,21],[27,12],[31,8],[31,16],[24,26],[17,39],[15,51],[15,70],[10,72],[10,61]),
 panel([88,69],[70,9],[74,9],[87,21],[94,49],[94,53],[90,62],[90,71],[85,71],[85,59],[90,51],[83,33],[73,18]),
 panel([23,39],[18,5],[26,3],[26,23],[28,25],[30,28],[32,25],[33,26],[33,34],[29,35],[27,37],[23,40],[18,39]),
 panel([20,54],[15,40],[17,36],[23,35],[25,36],[24,41],[28,42],[27,48],[24,50],[23,48],[22,51],[20,52],[20,55],[16,56],[16,53],[15,52]),
 panel([80,50],[70,25],[75,25],[75,32],[78,32],[80,34],[84,33],[86,37],[85,41],[85,44],[87,44],[89,46],[89,53],[85,55],[85,48],[81,51],[79,49],[79,46],[76,43],[74,45],[72,44],[72,39],[71,38]),
 // Tall chair at the back, followed by the planning table and stools.
 panel([51,45],[48,44],[48,42],[48.5,42],[48.5,37],[50,35.5],[51,35],[53.5,36.5],[54,43],[54.5,44.7],[48,45.2]),
 panel([51,61],[40,46],[42,45],[42.5,43],[43,42],[44,43],[44,45],[57,45],[57,42],[59.5,42],[60,45],[61.5,45],[62,54],[61.8,59],[60.4,59],[60.3,55],[59,55],[59,62],[55,62],[55,55],[53.3,55],[53.3,62],[49.8,62],[49.7,55],[48,55],[48,62],[44.2,62],[44,55],[42,55],[42,59],[40,59]),
 // Front foundations, storage and the two stair parapets stop at the steps.
 panel([24,86],[9,68],[15,68],[15,70],[34,70],[34.5,69],[39,69],[39,74],[33.5,75],[33.5,85],[30.5,86],[30.5,88],[27,88],[27,86],[19,86],[18,84],[14,83],[10,82],[9,79]),
 panel([36,94],[34,69],[38.5,69],[39,72],[39,94.5],[37,95.5],[34,94.5],[33.5,91]),
 panel([75,86],[61,69],[66,69],[68,70],[68,68],[70,65],[71.5,68],[71,71],[74,71],[74,68],[86,68],[87,70],[89,69],[90,73],[92.5,74],[92.5,81],[90,83],[87,83],[86,86],[76,87],[71,88],[68.5,87],[68.5,84],[66,84],[65.5,74],[61,74]),
 panel([64,94],[61.5,69],[66,69],[66.5,72],[66.5,94],[64,95.5],[61.5,95],[61,88]),
]};

const ruinedHq:BuildingPainting={...hq,panels:[...hq.panels,
 // Fallen timber lies across the northeast corner in the ruined room.
 panel([67,44],[62,43],[64,39],[77,26],[79,26],[78,30],[66,45],[62,46]),
]};
const well:BuildingPainting={base:[43,75],panels:[]};
const hearth:BuildingPainting={base:[50,74],panels:[]};

// The campsite is one editor placement. Its tent, fence and hearth have
// different ground depths, so a survivor can walk between the painted props.
const abandonedCamp:BuildingPainting={base:[50,28],panels:[
 // Large shelter and chest, then its nearer left wing and bucket.
 panel([34,51],[0,39],[7,32],[15,9],[35,0],[41,0],[49,26],[54,46],[49,53],[27,53],[24,62],[5,64],[0,57]),
 panel([20,60],[7,31],[25,28],[24,60],[20,63],[5,64],[7,55],[1,54],[0,39]),
 // Broken fence, barrel and loose planks at the back.
 panel([78,46],[54,23],[60,5],[69,12],[78,26],[88,33],[100,45],[100,61],[92,59],[80,48],[70,50],[65,41],[57,32]),
 panel([55,62],[49,51],[55,46],[61,49],[60,59],[56,64],[49,61]),
 // The stone fire ring, low lean-to and spilled supplies at the front.
 panel([32,79],[19,68],[25,62],[35,60],[42,64],[46,72],[43,80],[34,85],[23,84],[19,79]),
 panel([73,83],[45,77],[54,63],[60,53],[61,43],[67,43],[68,51],[81,57],[88,58],[96,80],[93,85],[83,89],[70,85],[60,87],[45,82]),
 panel([66,96],[53,88],[62,85],[70,80],[78,84],[78,95],[68,99],[52,100]),
]};

const paintings=new Map<string,BuildingPainting>([
 [ABANDONED_CAMP_FRAMES[0],abandonedCamp],
 [HQ_SOUTH_INTERIOR,hq],[HQ_SOUTH_RUIN_INTERIOR,ruinedHq],
 [WAREHOUSE_ARTWORK.full,warehouse],[WORKSITE_ROOT+'/warehouse-broken.webp',warehouse],
 [TREATMENT_IDLE_FRAMES[0],treatment],[TREATMENT_BROKEN_IMAGE,treatmentBroken],
 [WORKSHOP_IDLE_FRAMES[0],workshop],[WORKSHOP_BROKEN_IMAGE,workshop],
 [FURNACE_COLD_IMAGE,furnace],[FURNACE_BROKEN_IMAGE,furnace],
 [WELL_IMAGE,well],['/survival/camp-ruins-v1/well.webp',well],
 ['/survival/camp-hearth-v4/flame-0.webp',hearth],['/survival/camp-ruins-v1/fire.webp',hearth],
 [BUNKER_IMAGE,bunker],['/survival/camp-ruins-v1/bunker.webp',bunker],
]);

export function campBuildingLayers(ctx:CanvasRenderingContext2D,p:Placement,source:string,drawBase:()=>void,viewport?:{x:number;y:number;width:number;height:number}){
 const painting=paintings.get(source);
 if(!painting)return;
 const b=placementBounds(p);
 const depth=([u,v]:Point)=>placementPoint(p,b.x+u*b.width/100,b.y+v*b.height/100)[1];
 // Culling in source space is valid for the usual untransformed placements.
 const visible=viewport&&!p.rotation&&!p.flipX&&!p.flipY?painting.panels.filter(panel=>
  b.x+panel.right*b.width/100>=viewport.x&&b.x+panel.left*b.width/100<=viewport.x+viewport.width&&
  b.y+panel.bottom*b.height/100>=viewport.y&&b.y+panel.top*b.height/100<=viewport.y+viewport.height):painting.panels;
 return [{y:depth(painting.base),paintingBase:p,draw:drawBase},...visible.map(({foot,outline})=>({
  y:depth(foot),bakedInto:p,draw:()=>{
   ctx.save();ctx.beginPath();
   outline.forEach(([u,v],i)=>{
    const x=b.x+u*b.width/100,y=b.y+v*b.height/100;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
   });
   ctx.closePath();ctx.clip();drawBase();ctx.restore();
  },
 }))];
}

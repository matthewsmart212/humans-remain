/** Authoritative design coordinates, in original camp source pixels.
 * Ground now covers the complete blueprint; district contents remain planned.
 * Playable bounds still derive from installed terrain, not this planning file.
 */
export type PlanPoint=readonly [number,number];
export type PlanRect={x:number;y:number;width:number;height:number};
export type PlanRoute={id:string;from:string;to:string;via?:readonly PlanPoint[];kind:'stone'|'lane'|'trail'|'bridge'|'access';status:'built'|'planned';width:number};
export type PlanDistrict={id:string;number:number;name:string;direction:string;centre:PlanPoint;outline:readonly PlanPoint[];node:string;ground:string;purpose:string;status:'built'|'planned';colour:string};
export const WORLD_PLAN_BOUNDS:PlanRect={x:-7200,y:-6200,width:20000,height:20000};
// The revision-68 saved hearth, converted without rounding or moving anything.
export const WORLD_PLAN_CAMP:PlanPoint=[2422.3919283440346,2268.9620145056724];
export const WORLD_PLAN_NODES:Record<string,PlanPoint>={
 camp:WORLD_PLAN_CAMP,
 gateNW:[1770,1480],gateNE:[3090,1630],gateW:[1530,2780],gateSW:[1780,3160],gateS:[2150,3250],gateSE:[3190,3090],
 campNW:[230,90],campNE:[4440,110],campW:[80,2720],campSW:[100,4530],campSouthEdge:[2700,4730],campS:[1770,6170],
 westFrontier:[-1528,2860],southwestFrontier:[-1528,5520],
 approach:[6600,4240],villageEdge:[5736,456],worksEdge:[8000,456],worksJunction:[8100,1350],scrapEdge:[9410,6206],
 villageGate:[5100,-500],village:[4300,-2100],factoryGate:[8400,-450],factory:[10000,-2300],scrapGate:[9200,6900],scrap:[8100,8400],
 logging:[-5300,-2500],waterworks:[-3900,8000],meadow:[2200,11200],southJunction:[2100,7900],
 b1e:[-2500,-1100],b1w:[-3700,-1100],b2e:[-4000,2800],b2w:[-4850,2800],
 b3e:[-1900,5900],b3w:[-2900,5900],b4n:[2100,8300],b4s:[1900,9100],
 b5e:[-2100,8900],b5w:[-3050,8300],b6e:[4800,10700],b6w:[3900,10700],
};
export const WORLD_PLAN_DISTRICTS:readonly PlanDistrict[]=[
 {id:'camp',number:1,name:'Your camp',direction:'Centre',centre:WORLD_PLAN_CAMP,outline:[[950,1150],[2700,750],[3850,1750],[3850,2850],[2850,3700],[1300,3500],[750,2450]],node:'camp',ground:'Existing warm camp earth and stone paths.',purpose:'The fixed home base. Keep all placed buildings, walls, foliage and camp exits in place.',status:'built',colour:'#cfa562'},
 {id:'village',number:2,name:'Overgrown village',direction:'North',centre:[4300,-2100],outline:[[2500,-3600],[4300,-4200],[6000,-3300],[6200,-1700],[5500,-500],[3500,-400],[2300,-1700]],node:'village',ground:'Deeper woodland brown, muted grass and small pockets of old paving.',purpose:'A substantial exploration district with streets, enterable buildings, courtyards and wooded gaps. Approach from camp and the eastern village trail.',status:'planned',colour:'#9ba86c'},
 {id:'factory',number:3,name:'Factory & rail yard',direction:'Northeast',centre:[10000,-2300],outline:[[8000,-4000],[10000,-4700],[11700,-3300],[11900,-1400],[10800,-400],[8400,-450],[7700,-2000]],node:'factory',ground:'Cool brown earth, grey gravel and worn service paving.',purpose:'Large industrial buildings and outdoor yards. Existing eastern paths become the southern approaches; reserve space for the railway on the far east.',status:'planned',colour:'#8b9c9b'},
 {id:'scrap',number:4,name:'Scrap warehouse',direction:'Southeast',centre:[8100,8400],outline:[[6500,7100],[8300,6600],[10100,7300],[10400,9000],[9200,10100],[7200,10100],[6200,8600]],node:'scrap',ground:'Brown dirt yards, muted rust-coloured fines and patches of encroaching grass.',purpose:'A full warehouse district with salvage yards and room to explore around the buildings. Separate from the small storage building near camp.',status:'planned',colour:'#b18b65'},
 {id:'waterworks',number:5,name:'Waterworks',direction:'Southwest',centre:[-3900,8000],outline:[[-5100,6800],[-3500,6500],[-2700,7400],[-2900,8900],[-4100,9400],[-5300,8500]],node:'waterworks',ground:'Darker damp soil, brown-grey silt and gravel around structures.',purpose:'Treatment buildings, tanks, channels and future bridge assets. Keep the river course and crossings clear before placing terrain or buildings.',status:'planned',colour:'#729da0'},
 {id:'logging',number:6,name:'Logging ground',direction:'Northwest',centre:[-5300,-2500],outline:[[-6500,-3500],[-5400,-4100],[-4300,-3000],[-4300,-1500],[-5600,-1000],[-6600,-1900]],node:'logging',ground:'Deep woodland browns, worn dirt hauling tracks and sparse leaf litter.',purpose:'Forest clearings and logging structures across the river, reached by two different approaches. Trees and harvestable resources remain separate assets.',status:'planned',colour:'#709276'},
 {id:'meadow',number:7,name:'Southern meadows',direction:'South',centre:[2200,11200],outline:[[-900,10000],[900,9500],[3300,9900],[4100,11500],[3000,13200],[700,13400],[-1500,12000]],node:'meadow',ground:'Open olive grass, plain brown earth and a few darker damp hollows.',purpose:'Room to roam, hunt and gather away from roads. Small future points of interest can sit off the main trail without adding a road grid.',status:'planned',colour:'#9caa74'},
];
export const WORLD_PLAN_RIVERS=[
 {id:'western-river',name:'Western river',width:260,points:[[-5700,-6200],[-5600,-5200],[-5000,-4600],[-4500,-3200],[-3300,-2200],[-3100,-1100],[-2500,-700],[-3500,300],[-4800,1100],[-5200,1900],[-4400,2800],[-3200,3600],[-2700,4400],[-1900,5000],[-2400,5900],[-3000,6800],[-2100,7800],[-2600,8600],[-3600,9200],[-4300,10000],[-4100,11000],[-3200,11800],[-2600,13800]] as readonly PlanPoint[]},
 {id:'meadow-channel',name:'Meadow channel',width:170,points:[[-3000,6800],[-1200,7400],[800,7900],[2000,8700],[3700,9200]] as readonly PlanPoint[]},
 {id:'eastern-creek',name:'Eastern creek',width:190,points:[[4200,7400],[4400,9000],[3700,9200],[3900,10100],[4800,11300],[6100,11900],[7600,12900],[8500,13800]] as readonly PlanPoint[]},
] as const;
export const WORLD_PLAN_ROUTES:readonly PlanRoute[]=[
 ...['NW','NE','W','SW','S','SE'].map(side=>({id:'camp-access-'+side,from:'camp',to:'gate'+side,kind:'access' as const,status:'built' as const,width:0})),
 {id:'camp-northwest',from:'gateNW',to:'campNW',via:[[1400,1130],[890,700]],kind:'stone',status:'built',width:160},
 {id:'camp-northeast',from:'gateNE',to:'campNE',via:[[3460,1130],[4000,550]],kind:'stone',status:'built',width:150},
 {id:'camp-west',from:'gateW',to:'campW',via:[[1000,2770],[500,2800]],kind:'stone',status:'built',width:155},
 {id:'camp-southwest',from:'gateSW',to:'campSW',via:[[1550,3460],[900,3830]],kind:'stone',status:'built',width:160},
 {id:'camp-south-painted',from:'gateS',to:'campSouthEdge',via:[[2170,3500],[2380,4000],[2540,4370],[2650,4560]],kind:'stone',status:'built',width:145},
 {id:'camp-south',from:'campSouthEdge',to:'campS',via:[[2670,4910],[2400,5210],[2050,5520],[1950,5750]],kind:'trail',status:'planned',width:85},
 {id:'camp-southeast',from:'gateSE',to:'approach',via:[[3600,3500],[4030,4040],[4590,4560],[5100,4540],[5630,4400],[6100,4350]],kind:'stone',status:'planned',width:180},
 {id:'village-approach',from:'approach',to:'villageEdge',via:[[6710,3600],[6650,3100],[6450,2600],[6100,2120],[6100,1600],[6100,1000]],kind:'lane',status:'planned',width:110},
 {id:'works-approach',from:'approach',to:'worksJunction',via:[[7220,4070],[7500,3900],[7900,3500],[7950,2800],[7900,2100]],kind:'lane',status:'planned',width:140},
 {id:'works-north',from:'worksJunction',to:'worksEdge',via:[[8000,900]],kind:'lane',status:'planned',width:110},
 {id:'works-scrap-trail',from:'worksJunction',to:'scrapEdge',via:[[8500,1300],[9000,1850],[9410,2500],[9460,3300],[9300,4200],[9420,4900],[9360,5600]],kind:'trail',status:'planned',width:90},
 {id:'camp-village',from:'campNE',to:'villageGate',via:[[4400,-500]],kind:'trail',status:'planned',width:90},
 {id:'village-arrival',from:'villageEdge',to:'villageGate',via:[[5600,-250]],kind:'lane',status:'planned',width:160},
 {id:'village-main',from:'villageGate',to:'village',via:[[4900,-1200]],kind:'lane',status:'planned',width:180},
 {id:'factory-arrival',from:'worksEdge',to:'factoryGate',via:[[8000,0]],kind:'lane',status:'planned',width:180},
 {id:'factory-main',from:'factoryGate',to:'factory',via:[[9300,-1100]],kind:'lane',status:'planned',width:220},
 {id:'village-factory',from:'village',to:'factoryGate',via:[[5900,-1900],[6900,-1400],[7600,-900]],kind:'lane',status:'planned',width:170},
 {id:'scrap-arrival',from:'scrapEdge',to:'scrapGate',kind:'trail',status:'planned',width:100},
 {id:'scrap-main',from:'scrapGate',to:'scrap',via:[[8800,7600]],kind:'lane',status:'planned',width:210},
 {id:'northwest-river-approach',from:'campNW',to:'b1e',via:[[-800,-500],[-1600,-700]],kind:'trail',status:'planned',width:100},
 {id:'logging-bridge',from:'b1e',to:'b1w',kind:'bridge',status:'planned',width:145},
 {id:'logging-arrival',from:'b1w',to:'logging',via:[[-4300,-1500]],kind:'lane',status:'planned',width:170},
 {id:'north-woodland-link',from:'b1e',to:'village',via:[[-1800,-2200],[0,-1700],[2100,-1500]],kind:'trail',status:'planned',width:90},
 {id:'west-camp-trail',from:'campW',to:'westFrontier',via:[[-450,2740],[-694,2640],[-1100,2770]],kind:'trail',status:'planned',width:100},
 {id:'west-river-approach',from:'westFrontier',to:'b2e',via:[[-2200,3100],[-3300,2900]],kind:'trail',status:'planned',width:100},
 {id:'west-camp-bridge',from:'b2e',to:'b2w',kind:'bridge',status:'planned',width:140},
 {id:'west-logging-link',from:'b2w',to:'logging',via:[[-5700,1800],[-5800,0],[-5300,-1400]],kind:'trail',status:'planned',width:85},
 {id:'southwest-camp-trail',from:'campSW',to:'southwestFrontier',via:[[-122,4775],[-694,5040],[-1100,5300]],kind:'trail',status:'planned',width:100},
 {id:'southwest-river-approach',from:'southwestFrontier',to:'b3e',via:[[-1700,5700]],kind:'trail',status:'planned',width:100},
 {id:'waterworks-bridge',from:'b3e',to:'b3w',kind:'bridge',status:'planned',width:150},
 {id:'waterworks-arrival',from:'b3w',to:'waterworks',via:[[-3900,6400]],kind:'lane',status:'planned',width:150},
 {id:'western-bank-link',from:'b2w',to:'b3w',via:[[-5400,4000],[-4400,5200]],kind:'trail',status:'planned',width:75},
 {id:'southern-trail',from:'campS',to:'southJunction',via:[[2000,7200]],kind:'trail',status:'planned',width:80},
 {id:'meadow-north-approach',from:'southJunction',to:'b4n',kind:'trail',status:'planned',width:75},
 {id:'meadow-footbridge',from:'b4n',to:'b4s',kind:'bridge',status:'planned',width:110},
 {id:'meadow-arrival',from:'b4s',to:'meadow',via:[[2400,10100]],kind:'trail',status:'planned',width:70},
 {id:'waterworks-south-approach',from:'waterworks',to:'b5w',via:[[-3400,7900]],kind:'trail',status:'planned',width:90},
 {id:'lower-river-bridge',from:'b5w',to:'b5e',kind:'bridge',status:'planned',width:120},
 {id:'meadow-west-link',from:'b5e',to:'b4s',via:[[-1200,9600],[800,9700]],kind:'trail',status:'planned',width:75},
 {id:'scrap-meadow-approach',from:'scrap',to:'b6e',via:[[6900,9500],[6000,9900]],kind:'trail',status:'planned',width:90},
 {id:'creek-footbridge',from:'b6e',to:'b6w',kind:'bridge',status:'planned',width:110},
 {id:'meadow-east-link',from:'b6w',to:'meadow',kind:'trail',status:'planned',width:75},
];
export const WORLD_PLAN_RAIL=[
 {id:'main-rail',points:[[10200,-6100],[10000,-5200],[11100,-4300],[12200,-3000],[12400,-1000],[12100,1500],[12300,3500],[11500,5400],[11300,7400],[12100,9400],[12400,11000],[11600,12600],[10500,13300]] as readonly PlanPoint[]},
 {id:'factory-siding',points:[[12400,-1000],[11300,-1200],[10500,-1200]] as readonly PlanPoint[]},
 {id:'scrap-siding',points:[[11300,7400],[10300,8000],[9200,8400]] as readonly PlanPoint[]},
];
export const WORLD_PLAN_QUIET=[
 {id:'west-woods',name:'Deep woodland',polygon:[[-6800,1600],[-6000,1700],[-5800,2800],[-5900,3800],[-6500,4400],[-6900,3400]] as readonly PlanPoint[]},
 {id:'north-woods',name:'North woodland',polygon:[[0,-4600],[1900,-4900],[2300,-3900],[1600,-2700],[400,-2500],[-400,-3100]] as readonly PlanPoint[]},
 {id:'east-hollows',name:'Eastern hollows',polygon:[[10600,800],[11500,700],[11800,2200],[11600,4100],[10700,4700],[10300,3000]] as readonly PlanPoint[]},
 {id:'south-grassland',name:'Open grassland',polygon:[[-400,10500],[1000,10300],[1400,11900],[900,13200],[-900,12900],[-1600,11400]] as readonly PlanPoint[]},
 {id:'camp-clearing',name:'Open camp ground',polygon:[[3000,5000],[5200,5000],[6300,5600],[5900,6100],[3000,6100]] as readonly PlanPoint[]},
];
export const WORLD_PLAN_BATCHES=[
 {id:'A1',status:'built',name:'Southwest camp corner',order:1,bounds:{x:-122,y:4412,width:1538,height:1794},joins:['original-camp'],routes:['camp-southwest','southwest-camp-trail'],goal:'Continuous ground is complete. The southwest dirt trail will be a separate road overlay.'},
 {id:'A2',status:'built',name:'West camp, lower ground',order:2,bounds:{x:-1528,y:3006,width:1794,height:3200},joins:['A1','original-camp'],routes:['camp-southwest','southwest-camp-trail'],goal:'Continuous ground wraps the southwest corner. Route overlays and scenery remain to be placed.'},
 {id:'A3',status:'built',name:'West camp, middle ground',order:3,bounds:{x:-1528,y:1598,width:1794,height:1540},joins:['A2','original-camp'],routes:['camp-west','west-camp-trail'],goal:'Continuous ground reaches the western district areas. The trail and river crossing remain planned.'},
 {id:'A4',status:'built',name:'West camp, upper woodland',order:4,bounds:{x:-1528,y:190,width:1794,height:1540},joins:['A3','original-camp'],routes:[],goal:'Broad road-free brown earth connects above the western exit, ready for separately placed foliage.'},
 {id:'A5',status:'built',name:'Northwest camp connection',order:5,bounds:{x:-1528,y:-1218,width:3200,height:1806},joins:['A4','original-camp'],routes:['camp-northwest','northwest-river-approach'],goal:'Northwest ground is complete. Add the logging approach as a separate overlay later.'},
 {id:'A6',status:'built',name:'North camp connection',order:6,bounds:{x:1540,y:-1218,width:3200,height:1806},joins:['A5','original-camp'],routes:['camp-northeast','camp-village'],goal:'Northern ground is complete. Both village approaches remain planned road overlays.'},
] as const;
export const WORLD_PLAN_PHASES=[
 {number:1,name:'Ground foundation — complete',detail:'The entire 20,000 × 20,000 terrain-pixel world is covered. The original camp stays fixed; surrounding ground uses large overlapping camp-style images with gradual colour blends.'},
 {number:2,name:'Western river — connected to the southern edge',detail:'Twenty-six painted sections connect the northwest headwaters, logging bends, waterworks approach and southern reach. Four wooden crossings are walkable; water and rapids animate. The separate meadow channel and eastern creek remain planned.'},
 {number:3,name:'Northern village',detail:'Connect both northern approaches, then build the district footprint and the woodland link back to the logging crossing.'},
 {number:4,name:'Factory and scrap districts',detail:'Add separate eastern road overlays into the northern factory and southern scrap warehouse. Reserve the railway and building footprints first.'},
 {number:5,name:'Southern meadows',detail:'Extend the southern trail, build the meadow crossings, and close the waterworks–meadow–scrap loop with substantial off-road ground.'},
 {number:6,name:'Dress and test the world',detail:'Add separate foliage, buildings, resources and encounters; check movement, sightlines, return journeys and phone performance district by district.'},
] as const;
export const routePoints=(route:PlanRoute):readonly PlanPoint[]=>[WORLD_PLAN_NODES[route.from],...(route.via||[]),WORLD_PLAN_NODES[route.to]];
export const sourcePointToWorld=(p:PlanPoint,scale:number):PlanPoint=>[(p[0]-600)*scale,(p[1]-600)*scale];

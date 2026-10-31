// Ground east of the works tracks; shared contact rows come from one master.
export const WORKS_GROUNDS={x:8442,y:2124,width:1538,height:2676} as const;
export const WORKS_GROUNDS_TERRAIN_TILES=[
 {key:'outdoor:works-grounds:yard:v1',image:'/survival/maps/consistent-terrain-v1/11-works-yard.webp',x:8442,y:2124,width:1538,height:1274,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,fadeLeft:36,westKey:'outdoor:eastern-works:north:v1',northKey:'outdoor:works-meadow:yard:v1',coveredTop:132,topNeighborKey:'outdoor:works-meadow:south:v1'},
 {key:'outdoor:works-grounds:lane:v1',image:'/survival/maps/consistent-terrain-v1/12-works-dirt-lane.webp',x:8442,y:3264,width:1538,height:1536,paintRight:0,paintBottom:0,fadeTop:192,fadeBottom:96,fadeRight:96,fadeLeft:36,westKey:'outdoor:eastern-works:south:v1',northKey:'outdoor:works-grounds:yard:v1',coveredTop:132},
] as const;

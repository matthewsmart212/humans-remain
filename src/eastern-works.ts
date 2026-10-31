// Extend east from the village footpath and woodland stone route at camp scale.
export const EASTERN_WORKS={x:7036,y:1992,width:1538,height:2808} as const;
export const WORKS_TERRAIN_TILES=[
 {key:'outdoor:eastern-works:north:v1',image:'/survival/maps/consistent-terrain-v1/07-works-footpath.webp',x:7036,y:1992,width:1538,height:1406,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,fadeLeft:36,westKey:'outdoor:village-approach:east:v2',northKey:'outdoor:northern-works:connector:v1',coveredTop:132,topNeighborKey:'outdoor:northern-works:clearing:v1'},
 {key:'outdoor:eastern-works:south:v1',image:'/survival/maps/consistent-terrain-v1/08-works-service-track.webp',x:7036,y:3264,width:1538,height:1536,paintRight:0,paintBottom:0,fadeTop:192,fadeBottom:96,fadeRight:96,fadeLeft:36,westKey:'outdoor:east-approach:east:v1',northKey:'outdoor:eastern-works:north:v1',coveredTop:132},
] as const;

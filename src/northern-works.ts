// Close the corner between village outskirts and the existing works approach.
// A short separate connector follows the same western-neighbour boundary.
export const NORTHERN_WORKS={x:7036,y:456,width:1538,height:1670} as const;
export const NORTH_WORKS_TERRAIN_TILES=[
 {key:'outdoor:northern-works:clearing:v1',image:'/survival/maps/consistent-terrain-v1/09-north-works-clearing.webp',x:7036,y:456,width:1538,height:1538,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,fadeLeft:36,westKey:'outdoor:village-outskirts:east:v1'},
 {key:'outdoor:northern-works:connector:v1',image:'/survival/maps/consistent-terrain-v1/10-works-trail-connector.webp',x:7036,y:1860,width:1538,height:266,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,fadeLeft:36,westKey:'outdoor:village-approach:east:v2',northKey:'outdoor:northern-works:clearing:v1',coveredTop:132},
] as const;

// Southward growth uses the same 132px overlap / 36px inner feather as eastward.
export const SOUTH_WORKS={x:7036,y:4668,width:2944,height:1538} as const;
export const SOUTH_WORKS_TERRAIN_TILES=[
 {key:'outdoor:south-works:clearing:v1',image:'/survival/maps/consistent-terrain-v1/16-south-works-clearing.webp',x:7036,y:4668,width:1538,height:1538,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:96,fadeLeft:96,northBlendKey:'outdoor:eastern-works:south:v1'},
 {key:'outdoor:south-works:trail:v1',image:'/survival/maps/consistent-terrain-v1/17-scrap-outskirts-trail.webp',x:8442,y:4668,width:1538,height:1538,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:96,fadeLeft:36,northBlendKey:'outdoor:works-grounds:lane:v1',westKey:'outdoor:south-works:clearing:v1'},
] as const;

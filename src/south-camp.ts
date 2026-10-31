// Return west beneath the central camp. The larger northern overlap covers
// the camp's baked edge fade without moving its artwork or saved placements.
export const SOUTH_CAMP={x:1284,y:4412,width:2944,height:1794} as const;
export const SOUTH_CAMP_TERRAIN_TILES=[
 {key:'outdoor:south-camp:clearing:v1',image:'/survival/maps/consistent-terrain-v1/20-camp-south-clearing.webp',x:2690,y:4412,width:1538,height:1794,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:36,fadeLeft:96,eastBlendKey:'outdoor:camp-return:meadow:v2'},
 {key:'outdoor:south-camp:trail:v1',image:'/survival/maps/consistent-terrain-v1/21-camp-south-trail.webp',x:1284,y:4412,width:1538,height:1794,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:36,fadeLeft:96,eastBlendKey:'outdoor:south-camp:clearing:v1'},
] as const;

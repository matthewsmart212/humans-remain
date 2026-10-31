// Master-plan batches A1–A4 wrap southwest and west. Their shared pixels are
// registered to the original camp; its coordinate origin never changes.
// v2 removes painted foliage from the new ground; plants remain separate assets.
export const WEST_CAMP_TERRAIN_TILES=[
 {key:'outdoor:west-camp:corner:v2',image:'/survival/maps/consistent-terrain-v1/22-southwest-camp-corner.webp',x:-122,y:4412,width:1538,height:1794,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:36,fadeLeft:96,eastBlendKey:'outdoor:south-camp:trail:v1'},
 {key:'outdoor:west-camp:lower:v2',image:'/survival/maps/consistent-terrain-v1/23-west-camp-lower.webp',x:-1528,y:3006,width:1794,height:1666,paintRight:0,paintBottom:0,fadeTop:96,fadeBottom:96,fadeRight:36,fadeLeft:96,eastBlendKey:'outdoor:west-camp:corner:v2'},
 {key:'outdoor:west-camp:southwest-trail:v2',image:'/survival/maps/consistent-terrain-v1/24-southwest-woodland-trail.webp',x:-1528,y:4540,width:1794,height:1666,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:36,fadeLeft:96,northBlendKey:'outdoor:west-camp:lower:v2',eastBlendKey:'outdoor:west-camp:corner:v2'},
 {key:'outdoor:west-camp:exit:v2',image:'/survival/maps/consistent-terrain-v1/25-west-camp-exit.webp',x:-1528,y:1598,width:1794,height:1540,paintRight:0,paintBottom:0,fadeTop:96,fadeBottom:36,fadeRight:36,fadeLeft:96,southBlendKey:'outdoor:west-camp:lower:v2'},
 {key:'outdoor:west-camp:upper:v2',image:'/survival/maps/consistent-terrain-v1/26-west-camp-upper-ground.webp',x:-1528,y:190,width:1794,height:1540,paintRight:0,paintBottom:0,fadeTop:96,fadeBottom:36,fadeRight:36,fadeLeft:96,southBlendKey:'outdoor:west-camp:exit:v2'},
] as const;

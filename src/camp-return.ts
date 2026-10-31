// Close the southern gap back west towards camp, without adding another road.
export const CAMP_RETURN={x:4096,y:4668,width:3072,height:1538} as const;
export const CAMP_RETURN_TERRAIN_TILES=[
 {key:'outdoor:camp-return:meadow:v2',image:'/survival/maps/consistent-terrain-v1/18-camp-southeast-meadow.webp',x:4096,y:4668,width:1666,height:1538,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:96,fadeLeft:96,northBlendKey:'outdoor:east-approach:west:v1'},
 {key:'outdoor:camp-return:open-ground:v2',image:'/survival/maps/consistent-terrain-v1/19-camp-works-open-ground.webp',x:5630,y:4668,width:1538,height:1538,paintRight:0,paintBottom:0,fadeTop:36,fadeBottom:96,fadeRight:36,fadeLeft:36,northBlendKey:'outdoor:east-approach:east:v1',westKey:'outdoor:camp-return:meadow:v2',eastBlendKey:'outdoor:south-works:clearing:v1'},
] as const;

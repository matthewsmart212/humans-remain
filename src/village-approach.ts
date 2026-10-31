// The second pair fills north from the existing junction. Coordinates are
// pixels in the ORIGINAL camp artwork, never independent scene coordinates.
export const VILLAGE_APPROACH={x:4096,y:1860,width:3072,height:1538} as const;
export const VILLAGE_TERRAIN_TILES=[
 {key:'outdoor:village-approach:west:v2',image:'/survival/maps/consistent-terrain-v1/03-camp-east-clearing.webp',x:4096,y:1860,width:1538,height:1538,paintRight:4,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:0,northKey:'outdoor:village-outskirts:west:v1',coveredTop:132},
 {key:'outdoor:village-approach:east:v2',image:'/survival/maps/consistent-terrain-v1/04-village-trail.webp',x:5630,y:1860,width:1538,height:1538,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,northKey:'outdoor:village-outskirts:east:v1',coveredTop:132},
] as const;

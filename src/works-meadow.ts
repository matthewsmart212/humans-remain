// A quieter northeast corner. Small contact strips follow western neighbours.
export const WORKS_MEADOW={x:8442,y:456,width:1538,height:1802} as const;
export const WORKS_MEADOW_TERRAIN_TILES=[
 {key:'outdoor:works-meadow:main:v1',image:'/survival/maps/consistent-terrain-v1/13-works-meadow.webp',x:8442,y:456,width:1538,height:1538,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,fadeLeft:36,westKey:'outdoor:northern-works:clearing:v1'},
 {key:'outdoor:works-meadow:south:v1',image:'/survival/maps/consistent-terrain-v1/14-meadow-south-contact.webp',x:8442,y:1860,width:1538,height:266,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,fadeLeft:36,westKey:'outdoor:northern-works:connector:v1',northKey:'outdoor:works-meadow:main:v1',coveredTop:132},
 {key:'outdoor:works-meadow:yard:v1',image:'/survival/maps/consistent-terrain-v1/15-meadow-yard-contact.webp',x:8442,y:1992,width:1538,height:266,paintRight:0,paintBottom:2,fadeTop:192,fadeBottom:0,fadeRight:96,fadeLeft:36,westKey:'outdoor:eastern-works:north:v1',northKey:'outdoor:works-meadow:south:v1',coveredTop:132,topNeighborKey:'outdoor:works-meadow:main:v1'},
] as const;

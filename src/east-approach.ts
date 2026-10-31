import {MAP_WIDTH} from './factory-map';
import {HOME_TERRAIN} from './terrain-art';

// Source pixels register against the original camp; saved objects never rescale.
export const EAST_TERRAIN_SCALE=MAP_WIDTH/HOME_TERRAIN.playableSize;
export const EAST_APPROACH={x:4096,y:3264,width:3072,height:1536} as const;
export const EAST_TERRAIN_TILES=[
 {key:'outdoor:east-approach:west:v1',image:'/survival/maps/consistent-terrain-v1/01-camp-approach.webp',x:EAST_APPROACH.x,y:EAST_APPROACH.y,width:1538,height:1536,paintRight:4,paintBottom:0,fadeTop:192,fadeBottom:96,fadeRight:0,northKey:'outdoor:village-approach:west:v2',coveredTop:132},
 {key:'outdoor:east-approach:east:v1',image:'/survival/maps/consistent-terrain-v1/02-woodland-junction.webp',x:EAST_APPROACH.x+1534,y:EAST_APPROACH.y,width:1538,height:1536,paintRight:0,paintBottom:0,fadeTop:192,fadeBottom:96,fadeRight:96,northKey:'outdoor:village-approach:east:v2',coveredTop:132},
] as const;

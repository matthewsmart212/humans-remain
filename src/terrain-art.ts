/** Preserve the original 3600px coordinate footprint and 600px scenery per side.
 * world-bounds opens that existing scenery for walking without rescaling art. */
export const HOME_TERRAIN={
 image:'/survival/camp-ground-v3/preview.webp',
 fullImage:'/survival/camp-ground-v3/full-4800.webp',
 width:1200,
 height:1200,
 fullSize:4800,
 playableSize:3600,
 border:600,
 outsideColor:'#071316',
} as const;

// Package the painted source into mobile-safe textures on the existing world grid.
// Four shared pixels avoid sampling seams. Ground-only artwork is registered to the existing full terrain.
export const HOME_TERRAIN_TILES=[
 {key:'homeTerrainNW',image:'/survival/camp-ground-v3/nw.webp',x:0,y:0,width:2402,height:2402},
 {key:'homeTerrainNE',image:'/survival/camp-ground-v3/ne.webp',x:2398,y:0,width:2402,height:2402},
 {key:'homeTerrainSW',image:'/survival/camp-ground-v3/sw.webp',x:0,y:2398,width:2402,height:2402},
 {key:'homeTerrainSE',image:'/survival/camp-ground-v3/se.webp',x:2398,y:2398,width:2402,height:2402},
] as const;

// The owner's current 4800px terrain is the requested reskin target. Resolve
// this one artwork to the tiled replacement even in existing local drafts.
// Keep the uploaded original and saved placements intact; new uploads are unaffected.
export function usesPaintedHomeTerrain(image?:{url:string}){
 return !image||image.url==='/api/asset-files/9ef30c30-c753-4e59-8d9e-a20c011bd0c6';
}

export function terrainWorldRect(x:number,y:number,width:number,height:number,worldWidth:number,worldHeight:number){
 return {x:(x-HOME_TERRAIN.border)/HOME_TERRAIN.playableSize*worldWidth,y:(y-HOME_TERRAIN.border)/HOME_TERRAIN.playableSize*worldHeight,width:width/HOME_TERRAIN.playableSize*worldWidth,height:height/HOME_TERRAIN.playableSize*worldHeight};
}

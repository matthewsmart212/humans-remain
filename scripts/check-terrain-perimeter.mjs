import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'safety-last-perimeter-'));
try{
 await build({stdin:{contents:"export * from './src/terrain-art';export * from './src/terrain-renderer';export {requiredImages} from './src/world-assets';export {MAP_WIDTH,MAP_HEIGHT} from './src/factory-map';",resolveDir:process.cwd()},outfile:path.join(dir,'check.mjs'),bundle:true,platform:'node',format:'esm'});
 const {HOME_TERRAIN:T,HOME_TERRAIN_TILES:tiles,terrainWorldRect:rect,drawHomeTerrain,clearTerrainViewport,requiredImages,MAP_WIDTH:W,MAP_HEIGHT:H}=await import(pathToFileURL(path.join(dir,'check.mjs')));
 assert.equal(W,2400*Math.SQRT2);assert.equal(H,W,'existing square playable bounds retained');
 assert.deepEqual(rect(600,600,3600,3600,W,H),{x:0,y:0,width:W,height:H},'original centre retains exact placement and scale');
 const full=rect(0,0,4800,4800,W,H);
 assert.equal(full.x,-W/6);assert.equal(full.y,-H/6);assert.equal(full.width,W*4/3);
 assert.equal(tiles.length,4);assert(tiles.every(t=>t.width<4096&&t.height<4096));
 assert.equal(tiles[0].x+tiles[0].width-tiles[1].x,4,'shared pixels prevent sampling seams');
 assert.equal(tiles[2].y+tiles[2].height,4800);assert.equal(tiles[3].x+tiles[3].width,4800);
 const draws=[],fills=[],ctx={canvas:{width:1536,height:709},drawImage(...args){draws.push(args)},clearRect(){},fillRect(...args){fills.push([this.fillStyle,...args])}};
 clearTerrainViewport(ctx);assert.deepEqual(fills,[[T.outsideColor,0,0,1536,709]]);
 const imgs=Object.fromEntries(tiles.map(t=>[t.key,{key:t.key}]));drawHomeTerrain(ctx,imgs);assert.equal(draws.length,4);
 for(let i=0;i<4;i++){const t=tiles[i],r=rect(t.x,t.y,t.width,t.height,W,H);assert.deepEqual(draws[i],[imgs[t.key],r.x,r.y,r.width,r.height])}
 const reskinned={url:'/api/asset-files/9ef30c30-c753-4e59-8d9e-a20c011bd0c6',width:4800,height:4800};
 assert.deepEqual(requiredImages([],reskinned),{},'reskinned uploaded terrain uses mobile tiles instead of loading the old image');
 draws.length=0;drawHomeTerrain(ctx,{...imgs,['placed:'+reskinned.url]:{old:true}},reskinned,600);
 assert.equal(draws.length,4,'existing local/cloud draft displays painted terrain without an old overlay');
 const custom={url:'/api/asset-files/retained-terrain'},im={custom:true};imgs['placed:'+custom.url]=im;
 assert.deepEqual(requiredImages([],custom),{['placed:'+custom.url]:custom.url},'future replacements still load normally');
 draws.length=0;drawHomeTerrain(ctx,imgs,custom);assert.equal(draws.length,5);assert.deepEqual(draws[4],[im,0,0,W,H],'custom terrain and saved object coordinates remain untouched');
 draws.length=0;drawHomeTerrain(ctx,imgs,{...custom,width:4800,height:4800},600);
 const actual=draws.at(-1);const expected=[-W/6,-H/6,W*4/3,H*4/3];
 actual.slice(1).forEach((v,i)=>assert(Math.abs(v-expected[i])<1e-9,'uploaded outer border must not shrink the centre'));
 draws.length=0;drawHomeTerrain(ctx,{homeGround:{preview:true}});assert.equal(draws.length,1);assert.deepEqual(draws[0].slice(1),[full.x,full.y,full.width,full.height]);
 for(const url of [T.image,T.centreImage,...tiles.map(t=>t.image)]){
  const file=path.join('public',url);assert(fs.existsSync(file),`missing terrain artwork: ${url}`);
  assert(fs.statSync(file).size<25*1024*1024,`terrain asset exceeds hosting limit: ${url}`);
 }
 console.log('Terrain perimeter checks passed: original camp artwork scale unchanged; 600px per side; overlapping mobile textures; preserved custom terrain; matching dark viewport.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}

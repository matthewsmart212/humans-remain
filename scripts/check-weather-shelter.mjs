import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'rain-shelter-'));
const inside=(p,x,y)=>{let result=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)result=!result}return result};
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/weather-model';export * from './src/weather-skia';export * from './src/weather-silhouette';export * from './src/weather-shelters';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit);
 const trace=m.createArtworkSilhouettes(skia),sprite=skia.Surface.Make(256,256),source=sprite.getCanvas(),paint=skia.Paint(),diamond=skia.Path.Make();paint.setColor(skia.Color('#78624b'));source.clear(skia.Color('transparent'));[[128,15],[245,128],[128,245],[15,128]].forEach(([x,y],i)=>i?diamond.lineTo(x,y):diamond.moveTo(x,y));diamond.close();source.drawPath(diamond,paint);sprite.flush();const image=sprite.makeImageSnapshot(),outline=trace.outline(image);
 assert(inside(outline,.5,.5));assert(!inside(outline,.1,.1));assert(!inside(outline,.9,.9));assert.equal(trace.outline(image),outline);assert.equal(trace.builds,1);
 const polygon=outline.map(([u,v])=>[180+u*400,60+v*280]),fx=m.createWeatherRenderer(skia),surface=skia.Surface.Make(844,390),canvas=surface.getCanvas(),view={x:0,y:0,width:844,height:390,scale:1,pixelRatio:1},s=m.createWeather({rain:true,fog:false,lightning:false,heavyRain:true});s.rain=s.heavy=1;s.rainTravel=1250;
 const capture=(polys)=>{canvas.clear(skia.Color('#394b32'));fx.draw(canvas,s,view,0,polys);surface.flush();const im=surface.makeImageSnapshot(),pixels=im.readPixels();im.dispose();return pixels};
 const all=capture([]),dry=capture([polygon]);let rainOutside=0;
 for(let y=65;y<105;y++)for(let x=190;x<265;x++){const i=(y*844+x)*4;assert.deepEqual(dry.slice(i,i+4),all.slice(i,i+4),'Rain stays intact in transparent corners inside the old rectangular shelter');if(all[i]!==57)rainOutside++}
 assert(rainOutside>30);for(let y=170;y<220;y++)for(let x=350;x<410;x++){const i=(y*844+x)*4;assert.deepEqual(Array.from(dry.slice(i,i+4)),[57,75,50,255],'Painted interior stays dry')}
 // Factory-provided geometry respects saved frames, flips and placement rotation.
 const a=m.WORLD_ASSETS.find(a=>a.interior&&a.roof);assert(a);const p=m.newPlacement(a.id,1300,1200);p.roof='hidden';p.rotation=37;p.flipX=true;p.scale=1.4;const layout={...m.emptyLayout(),items:[p]},w=m.createWorld(layout),base={},roof={},imgs={[m.assetImageKey(a.image)]:base,[m.assetImageKey(a.roof)]:roof};let calls=0;const tracer=(im)=>{calls++;return im===base?outline:[[.3,.1],[.9,.4],[.7,.9],[.1,.7]]};
 const geom=m.weatherShelters(w,imgs,tracer),b=m.placementBounds(p),expected=m.placementPoint(p,b.x+outline[0][0]*b.width,b.y+outline[0][1]*b.height);assert.deepEqual(geom[0][0],expected);assert.equal(m.weatherShelters(w,imgs,tracer),geom);assert.equal(calls,1);
 w.layout={...layout,items:[{...p,roof:'shown'}]};assert.notDeepEqual(m.weatherShelters(w,imgs,tracer),geom);assert.equal(calls,2);
 w.layout={...layout,items:[{...p,roof:'auto'}]};const bounds=a.interior,[cx,cy]=m.placementPoint(p,p.x+(bounds.x+bounds.width/2)*p.scale,p.y+(bounds.y+bounds.height/2)*p.scale);Object.assign(w.player,{x:cx,y:cy});assert.deepEqual(m.weatherShelters(w,imgs,tracer),geom,'Entering headquarters selects the cutaway outline');
 const qa=process.argv[2];if(qa){
  const art=JSON.parse(fs.readFileSync(path.join(qa,'artwork.json'))),live=JSON.parse(fs.readFileSync(path.join(qa,'layout.json'))).draft;m.installImportedArt(art.records);
  for(const r of art.records.filter(r=>live.items.some(p=>p.assetId===r.id)&&r.config.kind==='building')){
   for(const kind of ['base','roof']){const f=r.config[kind];if(!f)continue;const data=skia.Data.fromBytes(fs.readFileSync(path.join(qa,f.id+'.image'))),im=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(im);const shape=trace.outline(im),size=700,surf=skia.Surface.Make(size,size),c=surf.getCanvas(),p=skia.Paint();c.clear(skia.Color('#344332'));c.drawImageRect(im,skia.XYWHRect(0,0,im.width(),im.height()),skia.XYWHRect(0,0,size,size),p);
    assert(shape.length>20&&shape.some(([x])=>x>.1)&&shape.some(([x])=>x<.5));assert(!inside(shape,.02,.02),'HQ transparent corners are not sheltered');
    const shapes=[shape.map(([u,v])=>[u*size,v*size])];fx.draw(c,s,{x:0,y:0,width:size,height:size,scale:1,pixelRatio:1},0,shapes);surf.flush();const shot=surf.makeImageSnapshot();fs.writeFileSync(path.join(qa,`hq-${kind}-rain.png`),Buffer.from(shot.encodeToBytes()));shot.dispose();surf.dispose();p.dispose();im.dispose();
   }
  }
 }
 fx.dispose();surface.dispose();image.dispose();sprite.dispose();paint.dispose();diamond.dispose();console.log('PASS: artwork alpha silhouette, rain in old-box corners, dry interior, cached trace, rotated/flipped placements, shown roof and automatic cutaway.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

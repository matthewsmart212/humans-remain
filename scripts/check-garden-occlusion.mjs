import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'garden-occlusion-'));
try{
 for(const target of ['web','native']){
  const skia=path.resolve(target==='web'?'node_modules':'native/node_modules','@shopify/react-native-skia');
  const file=path.join(temp,target+'.cjs');
  await build({stdin:{resolveDir:process.cwd(),contents:`
   export * from './src/potato-patch-renderer';
   export * from './src/skia-adapter';
   export * from './src/world-layout';
   export {GARDEN_FENCE_FEET} from './src/camp-garden-art';
   export {assetImageKey} from './src/world-assets';
   export {JsiSkApi} from ${JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))};
  `},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error'});
  const m=createRequire(import.meta.url)(file),sdk=createRequire(path.join(skia,'package.json'));
  const kit=await sdk('canvaskit-wasm')({locateFile:name=>path.join(path.dirname(sdk.resolve('canvaskit-wasm')),name)});
  const api=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(api);
  const surface=api.Surface.Make(400,400),font=api.Font(undefined,16);
  const pixel=(pixels,x,y)=>[...pixels.slice((y*400+x)*4,(y*400+x)*4+4)];
  // Record the same way the native game does, then inspect the rasterized Picture.
  const render=draw=>{
   const recorder=api.PictureRecorder();
   const ctx=new adapter.SkiaContext(recorder.beginRecording(api.XYWHRect(0,0,400,400)),400,400,font);
   ctx.fillStyle='#0c181e';ctx.fillRect(0,0,400,400);draw(ctx);
   const picture=recorder.finishRecordingAsPicture();
   surface.getCanvas().drawPicture(picture);surface.flush();
   const image=surface.makeImageSnapshot(),pixels=image.readPixels();
   assert(pixels);image.dispose();picture.dispose();recorder.dispose();ctx.dispose();return pixels;
  };
  for(const assetId of ['art_camp_garden_t1','art_camp_garden_broken']){
   const site={...m.newPlacement(assetId,200,360),frame:{sourceAssetId:assetId,width:400,height:400,anchor:[.5,.90]}};
   const world={editorPreview:true,tick:0,player:{x:188,y:308}};
   const url=m.potatoPatchImageForWorld(world,assetId),data=api.Data.fromBytes(fs.readFileSync('public'+url));
   const texture=api.Image.MakeImageFromEncoded(data);data.dispose();assert(texture);
   const textures={[m.assetImageKey(url)]:texture};
   const scene=(x,y,showPlayer)=>render(ctx=>{
    world.player={x,y};
    const parts=m.potatoPatchDrawables(ctx,textures,world,site);
    if(showPlayer)parts.push({y,draw:()=>{ctx.fillStyle='#00ff00';ctx.fillRect(x-6,y-48,12,48)}});
    parts.sort(m.compareWorldDrawables).forEach(part=>part.draw());
   });
   const empty=scene(188,308,false),inside=scene(188,308,true);
   const covered=pixel(inside,188,297),fence=pixel(empty,188,297);
   assert(covered.every((value,i)=>Math.abs(value-fence[i])<=2),'Painted front rail covers feet from inside');
   assert.deepEqual(pixel(inside,188,263),[0,255,0,255],'Torso is visible above the fence');
   assert.deepEqual(pixel(scene(188,342,true),188,297),[0,255,0,255],'Player in front covers the rail');
   assert.deepEqual(pixel(scene(266,306,true),266,298),[0,255,0,255],'Player can be seen in the open gate');
   const transformed={...site,rotation:90,flipX:true,scale:1.6};
   const b=m.placementBounds(transformed);
   const [a,z]=m.GARDEN_FENCE_FEET;
   const [x,y]=m.placementPoint(transformed,b.x+(a[0]+z[0])*b.width/2,b.y+(a[1]+z[1])*b.height/2);
   world.player={x,y:y-10};
   const [,rail]=m.potatoPatchDrawables({},textures,world,transformed);
   assert(Math.abs(rail.y-y)<.001,'Rotated and mirrored fence depth follows its ground line');
   texture.dispose();
  }
  const occlusion=outlined=>render(ctx=>{
   const actor=()=>{ctx.fillStyle='#229977';ctx.fillRect(140,65,30,90)};
   const rails=()=>{ctx.fillStyle='#8c6240';ctx.fillRect(100,84,120,12);ctx.fillRect(100,117,120,18)};
   actor();rails();
   if(outlined)ctx.drawMaskedSpriteOutline(actor,rails,{x:132,y:57,width:46,height:106},.8,2);
  });
  const plain=occlusion(false),outlined=occlusion(true);
  assert.notDeepEqual(pixel(plain,139,90),pixel(outlined,139,90),'Hidden edge gets the warm outline');
  assert.deepEqual(pixel(plain,139,105),pixel(outlined,139,105),'Transparent gap keeps the original pixels');
  assert.deepEqual(pixel(plain,139,70),pixel(outlined,139,70),'Exposed edges keep the original pixels');
  assert.deepEqual(pixel(plain,150,90),pixel(outlined,150,90),'Fence stays fully opaque inside the outline');
  font.dispose();surface.dispose();adapter.disposeLighting();
  console.log(target+' Skia passed garden depth, gate visibility and masked outline checks');
 }
}finally{fs.rmSync(temp,{recursive:true,force:true})}

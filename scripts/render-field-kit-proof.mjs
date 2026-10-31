// Internal visual proof of the actual native component tree and its styles.
// This small software layout adapter is not a browser or physical-device capture.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const {createCanvas,loadImage,GlobalFonts}=createRequire(import.meta.url)('@napi-rs/canvas');
const flat=style=>typeof style==='function'?flat(style({pressed:false})):Array.isArray(style)?Object.assign({},...style.map(flat)):style||{};
const number=(v,total)=>typeof v==='string'&&v.endsWith('%')?parseFloat(v)*total/100:typeof v==='number'?v:undefined;
const text=n=>typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):'';
function expand(n){if(n===null||n===undefined||typeof n==='boolean')return null;if(Array.isArray(n))return n.flat(8).map(expand).filter(Boolean);if(typeof n!=='object')return n;if(typeof n.type==='function')return expand(n.type(n.props));if(n.type==='fragment'||n.type===undefined)return [n.props.children].flat(8).map(expand).flat(8).filter(n=>n!==null);if(n.type==='scroll')return expand({type:'view',props:{style:[n.props.style,{overflow:'hidden'}],children:{type:'view',props:{style:n.props.contentContainerStyle,children:n.props.children}}}});return{...n,props:{...n.props,style:flat(n.props.style),children:[n.props.children].flat(8).map(expand).flat(8).filter(n=>n!==null)}}}
export async function renderFieldKitProof(m,make){
 GlobalFonts.registerFromPath('public/fonts/barlow-condensed-black.ttf','FieldKitBarlow');
 const images=new Map();for(const file of fs.readdirSync('public/survival/ui-field-kit-v1'))images.set(path.resolve('public/survival/ui-field-kit-v1',file),await loadImage(path.resolve('public/survival/ui-field-kit-v1',file)));
 for(const file of ['public/survival/ui-backpack-v1/scrap.png','public/survival/ui-backpack-v1/fuel.png','public/survival/chicken-food-v1/raw-chicken.webp','public/survival/chicken-food-v1/cooked-chicken.webp','public/survival/rabbit-food-v1/raw-rabbit.webp','public/survival/rabbit-food-v1/cooked-rabbit.webp','public/survival/venison-food-v1/raw-venison.webp','public/survival/venison-food-v1/cooked-venison.webp'])images.set(path.resolve(file),await loadImage(file));
 fs.mkdirSync('.qa/field-kit',{recursive:true});
 const results=[];
 for(const mode of ['compact','combat','expanded','interaction','food','bag','fire','fire-cold','fire-ready','storage'])for(const [width,height,safe]of [[390,844,{top:47,left:0,right:0,bottom:34}],[844,390,{top:0,left:47,right:47,bottom:21}],...(mode.startsWith('fire')?[[390,700,{top:0,left:0,right:0,bottom:0}],[320,568,{top:0,left:0,right:0,bottom:0}],[667,320,{top:0,left:0,right:0,bottom:0}]]:[])]){
  const world=make();world.loot=[];world.player.x=-5000;world.player.y=-5000;world.player.hp=87;world.player.stamina=74;
  world.enemies=mode==='combat'||mode==='expanded'?[{id:900,x:world.player.x+120,y:world.player.y,hp:100,maxHp:100,attackAt:0,path:[],repathAt:0,flashUntil:0}]:[];
  if(mode==='interaction'){world.enemies=[];Object.assign(world.player,m.stationFront(world.camp,'well'))}
  if(mode.startsWith('fire')){Object.assign(world.player,m.stationFront(world.camp,'hearth'));world.stationPanel='fire';world.camp.hearth.fuel=mode==='fire-cold'?0:mode==='fire-ready'?145:167;world.fire.queue=mode==='fire'?[{id:9991,species:'chicken',remaining:7}]:[];world.fire.rack=mode==='fire'?['rabbit']:mode==='fire-ready'?['chicken','rabbit','venison','chicken','rabbit','venison']:[];world.bag.rawRabbit=2;world.bag.rawVenison=1;if(mode==='fire-cold')world.bag.pallets=0}
  if(mode==='storage'){const chest=m.layoutViews(world.layout).chests[0];[world.player.x,world.player.y]=m.placementPoint(chest,chest.x,chest.y+22*chest.scale);world.stationPanel='storage';world.stock.pallets=8;world.stock.scrap=15}
  if(mode==='food'){world.cooked=3;world.player.equipped='meal'}
  const originalState=globalThis.__kitReact.useState;
  globalThis.__kitReact.useState=value=>typeof value==='boolean'?[mode==='expanded',()=>{}]:originalState(value);
  const noop=()=>{},root=expand(m.NativeHUD({world:{current:world},controller:new m.FieldKitController(),input:{current:{x:0,y:0}},enabled:mode!=='bag',width,height,safe,sprinting:true,bagOpen:mode==='bag',onBag:noop,onHeld:noop,onSprint:noop,onTool:noop,onDodge:noop,onPause:noop}));
  globalThis.__kitReact.useState=originalState;
  const canvas=createCanvas(width*2,height*2),ctx=canvas.getContext('2d');ctx.scale(2,2);
  const backdrop=await loadImage(mode.startsWith('fire')?`.qa/campfire/world-${width}x${height}-${mode==='fire-cold'?'cold':mode==='fire-ready'?'ready':'cooking'}.png`:`.qa/native-world/native-${width}x${height}-${mode==='food'?'food':'1'}.png`);ctx.drawImage(backdrop,0,0,width,height);
  const children=n=>(n.props.children||[]).filter(c=>typeof c==='object');
  const font=s=>`${s.fontWeight||'normal'} ${s.fontSize||14}px ${s.fontFamily==='FieldKitBarlow'?'FieldKitBarlow':'sans-serif'}`;
  function lines(n,s,w){ctx.font=font(s);const words=text(n.props.children).split(/\s+/),out=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>w){out.push(line);line=word}else line=next}if(line)out.push(line);return n.props.numberOfLines===1?[out.join(' ')]:out}
  function measure(n,pw,ph){const s=n.props.style||{},p=s.padding||0,px=s.paddingHorizontal??p,py=s.paddingVertical??p,b=s.borderWidth||0;let w=number(s.width,pw),h=number(s.height,ph);if(w===undefined&&s.left!==undefined&&s.right!==undefined)w=pw-s.left-s.right;if(h===undefined&&s.top!==undefined&&s.bottom!==undefined)h=ph-s.top-s.bottom;
   w=w===undefined?undefined:Math.min(w,number(s.maxWidth,pw)??Infinity);
   if(n.type==='text'){ctx.font=font(s);const content=lines(n,s,w??pw);return{w:w??Math.min(pw,Math.max(0,...content.map(t=>ctx.measureText(t).width))),h:h??content.length*(s.lineHeight||(s.fontSize||14)*1.1)}}
   const cs=children(n).filter(c=>c.props.style?.position!=='absolute'),sizes=cs.map(c=>{const z=measure(c,w??pw,h??ph),m=c.props.style||{};return{w:z.w+(m.marginLeft??m.marginHorizontal??m.margin??0)+(m.marginRight??m.marginHorizontal??m.margin??0),h:z.h+(m.marginTop??m.marginVertical??m.margin??0)+(m.marginBottom??m.marginVertical??m.margin??0)}}),gap=s.gap||0,row=s.flexDirection==='row';
   let naturalHeight=row?Math.max(0,...sizes.map(c=>c.h)):sizes.reduce((t,c)=>t+c.h,0)+gap*Math.max(0,sizes.length-1);
   if(row&&s.flexWrap==='wrap'){let used=0,lineHeight=0,total=0;for(const c of sizes){if(used&&used+gap+c.w>(w??pw)-2*(px+b)){total+=lineHeight+gap;used=0;lineHeight=0}used+=(used?gap:0)+c.w;lineHeight=Math.max(lineHeight,c.h)}naturalHeight=total+lineHeight}
   const naturalWidth=row?sizes.reduce((t,c)=>t+c.w,0)+gap*Math.max(0,sizes.length-1):Math.max(0,...sizes.map(c=>c.w));
   return{w:Math.max(number(s.minWidth,pw)??0,Math.min(w??naturalWidth+2*(px+b),number(s.maxWidth,pw)??Infinity)),h:Math.max(number(s.minHeight,ph)??0,Math.min(h??naturalHeight+2*(py+b),number(s.maxHeight,ph)??Infinity))};
  }
  function draw(n,box,assigned){const s=n.props.style||{},ms=measure(n,box.w,box.h),w=assigned?.w??ms.w,h=assigned?.h??ms.h;let x=assigned?.x??box.x,y=assigned?.y??box.y;
   if(s.position==='absolute'){x=box.x+(number(s.left,box.w)??(s.right!==undefined?box.w-number(s.right,box.w)-w:((box.row?box.justifyContent:box.alignItems)==='center'?(box.w-w)/2:0)));y=box.y+(number(s.top,box.h)??(s.bottom!==undefined?box.h-number(s.bottom,box.h)-h:((box.row?box.alignItems:box.justifyContent)==='center'?(box.h-h)/2:0)))}
   ctx.save();ctx.globalAlpha*=s.opacity??1;
   for(const t of s.transform||[]){if(t.scaleX!==undefined){ctx.translate(x+w/2,0);ctx.scale(t.scaleX,1);ctx.translate(-x-w/2,0)}}
   if(s.backgroundColor){ctx.fillStyle=s.backgroundColor;ctx.beginPath();ctx.roundRect(x,y,w,h,s.borderRadius||0);ctx.fill()}
   if(s.borderWidth){ctx.strokeStyle=s.borderColor||'#000';ctx.lineWidth=s.borderWidth;ctx.beginPath();ctx.roundRect(x+s.borderWidth/2,y+s.borderWidth/2,Math.max(0,w-s.borderWidth),Math.max(0,h-s.borderWidth),Math.max(0,(s.borderRadius||0)-s.borderWidth/2));ctx.stroke()}
   if(n.type==='image'){let image=images.get(n.props.source);if(!image)throw Error('Missing native UI proof image: '+n.props.source);if(s.tintColor){const tint=createCanvas(image.width,image.height),tc=tint.getContext('2d');tc.drawImage(image,0,0);tc.globalCompositeOperation='source-in';tc.fillStyle=s.tintColor;tc.fillRect(0,0,image.width,image.height);image=tint}let iw=w,ih=h;if(n.props.resizeMode!=='stretch'){const ratio=Math.min(w/image.width,h/image.height);iw=image.width*ratio;ih=image.height*ratio}ctx.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore();return}
   if(n.type==='text'){ctx.font=font(s);ctx.fillStyle=s.color||'#000';ctx.textBaseline='middle';ctx.textAlign=s.textAlign||'left';const content=lines(n,s,w),lineHeight=s.lineHeight||(s.fontSize||14)*1.1;content.forEach((line,i)=>ctx.fillText(line,s.textAlign==='right'?x+w:s.textAlign==='center'?x+w/2:x,y+lineHeight*(i+.5)));ctx.restore();return}
   if(s.overflow==='hidden'){ctx.beginPath();ctx.roundRect(x,y,w,h,s.borderRadius||0);ctx.clip()}
   const p=s.padding||0,px=s.paddingHorizontal??p,py=s.paddingVertical??p,b=s.borderWidth||0,inner={x:x+px+b,y:y+py+b,w:Math.max(0,w-2*(px+b)),h:Math.max(0,h-2*(py+b))},cs=children(n),flow=cs.filter(c=>c.props.style?.position!=='absolute'),row=s.flexDirection==='row',gap=s.gap||0;
   if(row&&s.flexWrap==='wrap'){let cursorX=0,cursorY=0,lineHeight=0;for(const c of flow){const cm=measure(c,inner.w,inner.h);if(cursorX&&cursorX+cm.w>inner.w){cursorX=0;cursorY+=lineHeight+gap;lineHeight=0}draw(c,inner,{x:inner.x+cursorX,y:inner.y+cursorY,w:cm.w,h:cm.h});cursorX+=cm.w+gap;lineHeight=Math.max(lineHeight,cm.h)}ctx.restore();return}
   let used=gap*Math.max(0,flow.length-1),flex=0;for(const c of flow){const f=c.props.style?.flex||0;if(f)flex+=f;else{const cm=measure(c,inner.w,inner.h);used+=row?cm.w:cm.h}}
   const margins=c=>{const t=c.props.style||{},a=row?'marginLeft':'marginTop',b=row?'marginRight':'marginBottom',fallback=row?'marginHorizontal':'marginVertical';return[t[a]??t[fallback]??t.margin??0,t[b]??t[fallback]??t.margin??0]};for(const c of flow){const [before,after]=margins(c);used+=before+after}const available=Math.max(0,(row?inner.w:inner.h)-used),free=flex?0:available;let cursor=s.justifyContent==='center'?free/2:s.justifyContent==='flex-end'?free:0;
   const placed=new Map();for(const c of flow){const [before,after]=margins(c);cursor+=before;const cm=measure(c,inner.w,inner.h),f=c.props.style?.flex||0,cw=row?(f?available*f/flex:cm.w):(c.props.style?.width===undefined&&s.alignItems!=='center'?inner.w:cm.w),ch=row?cm.h:(f?available*f/flex:cm.h);const cross=s.alignItems==='center'?((row?inner.h:inner.w)-(row?ch:cw))/2:0;placed.set(c,{x:inner.x+(row?cursor:cross),y:inner.y+(row?cross:cursor),w:cw,h:ch});cursor+=(row?cw:ch)+gap+after+(s.justifyContent==='space-between'&&flow.length>1?free/(flow.length-1):0)}
   for(const c of [...cs].sort((a,b)=>(a.props.style?.zIndex||0)-(b.props.style?.zIndex||0))){if(c.props.style?.position==='absolute')draw(c,{x,y,w,h,alignItems:s.alignItems,justifyContent:s.justifyContent,row});else draw(c,inner,placed.get(c))}ctx.restore();
  }
  draw(root,{x:0,y:0,w:width,h:height},{x:0,y:0,w:width,h:height});const file=`.qa/field-kit/native-layout-${width}x${height}-${mode}.png`;fs.writeFileSync(file,canvas.toBuffer('image/png'));results.push(file);
 }
 return results;
}

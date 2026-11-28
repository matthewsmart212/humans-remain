import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import postcss from 'postcss';

// A focused DOM/cascade check, not a browser layout emulator. It reads every
// stylesheet reached by the real app entry point, including world-editor.css
// (the source of the original pale-on-paper regression). No browser/Python
// dependency is needed in CI. Safe-area geometry comes from the live story menu
// model; CanvasKit decodes the actual paper used by both web and native readers.
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'patch-ui-'));
const zero={left:0,right:0,top:0,bottom:0};
const devices=[
 {name:'iPhone portrait',width:390,height:724,safe:zero},
 {name:'iPhone landscape',width:844,height:390,safe:{left:47,right:47,top:0,bottom:21}},
 {name:'Safari short landscape',width:844,height:300,safe:{left:47,right:47,top:0,bottom:21}},
 {name:'Small Safari landscape',width:667,height:290,safe:zero},
 {name:'Small portrait',width:320,height:568,safe:{...zero,top:20}},
];

// These helpers implement only author-rule cascade and the selectors/media
// conditions present in this application. They deliberately reject unknown
// syntax instead of silently treating it as a successful visual check.
function splitOutside(value,separator){
 let depth=0,quote='',start=0;const parts=[];
 for(let i=0;i<value.length;i++){
  const c=value[i];if(quote){if(c===quote&&value[i-1]!=='\\')quote='';continue}
  if(c==='"'||c==="'"){quote=c;continue}
  if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;
  else if(!depth&&separator(c)){parts.push(value.slice(start,i));start=i+1}
 }
 parts.push(value.slice(start));return parts.map(s=>s.trim()).filter(Boolean);
}
function unescapeHTML(value){return value.replace(/&(?:amp|quot|apos|lt|gt|#x[\da-f]+|#\d+);/gi,s=>({ '&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>' }[s]??String.fromCodePoint(s.startsWith('&#x')?parseInt(s.slice(3,-1),16):Number(s.slice(2,-1)))))}
function dom(html){
 const root={tag:'document',attrs:{},children:[],parent:null,text:''},stack=[root];
 for(const token of html.match(/<!--[^]*?-->|<[^>]+>|[^<]+/g)??[]){
  if(token.startsWith('<!--'))continue;
  if(token.startsWith('</')){stack.pop();continue}
  if(token.startsWith('<')){
   const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
   const node={tag,attrs:{},children:[],parent:stack.at(-1),text:''};
   for(const match of token.slice(tag.length+1,-1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))node.attrs[match[1]]=unescapeHTML(match[2]??match[3]??match[4]??'');
   node.parent.children.push(node);if(!/\/$/.test(token.slice(0,-1))&&!['img','link','meta','input','br','hr','source'].includes(tag))stack.push(node);
  }else{for(const node of stack)node.text+=unescapeHTML(token)}
 }
 return root;
}
const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]);
const classes=node=>(node.attrs.class??'').split(/\s+/);
const find=(root,name)=>descendants(root).find(node=>classes(node).includes(name));
const selectorCache=new Map();
function selectorParts(selector){
 if(selectorCache.has(selector))return selectorCache.get(selector);
 let depth=0,quote='',word='',pending=' ';const compounds=[],relations=[];
 const flush=()=>{if(!word.trim())return;if(compounds.length)relations.push(pending);compounds.push(word.trim());word='';pending=' '};
 for(const c of selector){
  if(quote){word+=c;if(c===quote)quote='';continue}
  if(c==='"'||c==="'"){word+=c;quote=c;continue}
  if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;
  if(!depth&&/[\s>+~]/.test(c)){flush();if(!/\s/.test(c))pending=c}else word+=c;
 }
 flush();const result={compounds,relations};selectorCache.set(selector,result);return result;
}
const compoundCache=new Map();
function compoundParts(compound){
 if(compoundCache.has(compound))return compoundCache.get(compound);
 const tokens=[];let rest=compound;
 while(rest){
  const simple=rest.match(/^(\*|[a-z][\w-]*|[.#][\w-]+)/i);
  if(simple){tokens.push({kind:simple[0][0],value:simple[0]});rest=rest.slice(simple[0].length);continue}
  if(rest[0]==='['){const end=rest.indexOf(']');assert(end>0,compound);tokens.push({kind:'attr',value:rest.slice(1,end)});rest=rest.slice(end+1);continue}
  const pseudo=rest.match(/^(:{1,2})([\w-]+)/);assert(pseudo,`Unsupported selector: ${compound}`);
  let length=pseudo[0].length,arg='';
  if(rest[length]==='('){let depth=1,end=length+1;for(;end<rest.length&&depth;end++){if(rest[end]==='(')depth++;if(rest[end]===')')depth--}assert.equal(depth,0,compound);arg=rest.slice(length+1,end-1);length=end}
  tokens.push({kind:pseudo[1]==='::'?'element':'pseudo',value:pseudo[2],arg});rest=rest.slice(length);
 }
 compoundCache.set(compound,tokens);return tokens;
}
function matchesCompound(node,compound){
 if(!node)return false;
 return compoundParts(compound).every(({kind,value,arg})=>{
  if(kind==='*')return true;if(kind==='.')return classes(node).includes(value.slice(1));if(kind==='#')return node.attrs.id===value.slice(1);
  if(kind==='attr'){const m=value.match(/^([\w-]+)(?:\s*([~|^$*]?=)\s*["']?([^"']*?)["']?)?$/);assert(m,`Unsupported attribute: ${value}`);const actual=node.attrs[m[1]],expected=m[3];return m[2]?actual!==undefined&&({'=':()=>actual===expected,'~=':()=>actual.split(/\s+/).includes(expected),'^=':()=>actual.startsWith(expected),'$=':()=>actual.endsWith(expected),'*=':()=>actual.includes(expected),'|=':()=>actual===expected||actual.startsWith(expected+'-')}[m[2]])():actual!==undefined}
  if(kind==='element'||(kind==='pseudo'&&['before','after','selection'].includes(value)))return false;
  if(kind!=='pseudo')return node.tag===value;
  if(['is','where','not'].includes(value)){const any=splitOutside(arg,c=>c===',').some(s=>matches(node,s));return value==='not'?!any:any}
  if(value==='has')return descendants(node).some(child=>splitOutside(arg,c=>c===',').some(s=>matches(child,s)));
  if(value==='disabled')return 'disabled'in node.attrs;if(value==='enabled')return !('disabled'in node.attrs);
  if(value==='root')return node.tag==='html';if(value==='empty')return !node.children.length&&!node.text;
  if(value==='first-child')return node.parent?.children[0]===node;if(value==='last-child')return node.parent?.children.at(-1)===node;
  if(value==='nth-child'||value==='nth-last-child'){
   const siblings=node.parent?.children??[],index=value==='nth-child'?siblings.indexOf(node)+1:siblings.length-siblings.indexOf(node),formula=arg.replace(/\s/g,'').replace(/^odd$/,'2n+1').replace(/^even$/,'2n');
   if(/^\d+$/.test(formula))return index===Number(formula);
   const m=formula.match(/^([+-]?\d*)n([+-]\d+)?$/);assert(m,`Unsupported ${value}: ${arg}`);
   const a=m[1]===''||m[1]==='+'?1:m[1]==='-'?-1:Number(m[1]),b=Number(m[2]??0),n=(index-b)/a;return a===0?index===b:n>=0&&Number.isInteger(n);
  }
  if(['hover','focus','focus-visible','focus-within','active','checked'].includes(value))return false;
  throw new Error(`Unsupported pseudo-class: ${value}`);
 });
}
function matches(node,selector){
 const {compounds,relations}=selectorParts(selector);
 const matchAt=(current,index)=>{
  if(!matchesCompound(current,compounds[index]))return false;if(index===0)return true;
  const relation=relations[index-1];if(relation==='>')return matchAt(current.parent,index-1);
  if(relation==='+'||relation==='~'){const siblings=current.parent?.children??[],at=siblings.indexOf(current);return relation==='+'?at>0&&matchAt(siblings[at-1],index-1):siblings.slice(0,at).some(s=>matchAt(s,index-1))}
  for(let parent=current.parent;parent;parent=parent.parent)if(matchAt(parent,index-1))return true;
  return false;
 };return !!compounds.length&&matchAt(node,compounds.length-1);
}
const add=(a,b)=>a.map((value,i)=>value+b[i]),compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0};
function specificity(selector){
 let result=[0,0,0];for(const compound of selectorParts(selector).compounds)for(const token of compoundParts(compound)){
  if(token.kind==='#')result[0]++;else if(token.kind==='.'||token.kind==='attr')result[1]++;
  else if(token.kind==='pseudo'){
   if(['is','not','has'].includes(token.value))result=add(result,splitOutside(token.arg,c=>c===',').map(specificity).sort(compare).at(-1));
   else if(token.value!=='where')result[1]++;
  }else if(token.kind!=='*')result[2]++;
 }return result;
}
function condition(params,frame,container=false){
 return splitOutside(params,c=>c===',').some(branch=>branch.split(/\s+and\s+/).every(part=>{
  const m=part.trim().match(/^\(([^:]+):\s*([^]+)\)$/);assert(m,`Unsupported condition: ${part}`);const key=m[1].trim(),value=m[2].trim();
  if(key==='orientation')return value===(frame.width>frame.height?'landscape':'portrait');
  if(key==='pointer')return value==='coarse';if(key==='hover')return value==='none';if(key==='prefers-reduced-motion')return value==='no-preference';
  const dimension=key.match(/^(min|max)-(width|height|aspect-ratio)$/);assert(dimension,`Unsupported condition: ${part}`);
  const actual=dimension[2]==='aspect-ratio'?frame.width/frame.height:dimension[2]==='height'?frame.height:container?frame.containerWidth:frame.width;
  const expected=value.includes('/')?value.split('/').map(Number).reduce((a,b)=>a/b):parseFloat(value);
  return dimension[1]==='min'?actual>=expected:actual<=expected;
 }));
}
function cascade(css,frame){
 const rules=[];postcss.parse(css).walkRules(rule=>{
  for(let parent=rule.parent;parent?.type!=='root';parent=parent.parent){
   if(parent.type!=='atrule')continue;
   if(parent.name==='keyframes'||parent.name==='font-face')return;
   assert(['media','container'].includes(parent.name),`Unsupported rule context: ${parent.name}`);
   if(!condition(parent.params,frame,parent.name==='container'))return;
  }
  rules.push({selectors:rule.selectors.map(selector=>({selector,specificity:specificity(selector)})),declarations:rule.nodes.filter(n=>n.type==='decl')});
 });
 const cache=new Map();
 const properties=node=>{
  if(cache.has(node))return cache.get(node);const props=new Map();
  const assign=(property,value,rank)=>{if(!props.has(property)||compare(rank,props.get(property).rank)>=0)props.set(property,{value,rank})};
  const set=(property,value,rank)=>{
   assign(property,value,rank);
   // A high-specificity font shorthand also wins against an older font-size
   // longhand. Without expanding it, this check incorrectly reports the old
   // 14px station paragraph size even when the browser paints the new 17px ink.
   if(property==='font'){
    const size=value.match(/(?:^|\s)(\d+(?:\.\d+)?(?:px|rem|em))(?:\s*\/\s*([^\s]+))?\s/);
    if(size){assign('font-size',size[1],rank);assign('line-height',size[2]??'normal',rank)}
   }
  };
  rules.forEach((rule,index)=>{
   const matching=rule.selectors.filter(s=>matches(node,s.selector));if(!matching.length)return;
   const spec=matching.map(s=>s.specificity).sort(compare).at(-1);
   for(const decl of rule.declarations)set(decl.prop,decl.value,[Number(!!decl.important),0,...spec,index]);
  });
  if(node.attrs.style)postcss.parse(`x{${node.attrs.style}}`).first.nodes.forEach(decl=>set(decl.prop,decl.value,[Number(!!decl.important),1,0,0,0,0]));
  cache.set(node,props);return props;
 };
 const inherited=new Set(['color','-webkit-text-fill-color','font','font-size','font-family','font-weight','line-height','visibility','white-space','overflow-wrap','user-select']);
 const value=(node,property)=>{
  if(!node)return undefined;
  let raw=properties(node).get(property)?.value;
  if(raw==='inherit'||raw===undefined&&(property.startsWith('--')||inherited.has(property)))return value(node.parent,property);
  if(raw===undefined)return undefined;
  raw=raw.replace(/var\((--[\w-]+)(?:,\s*([^()]+))?\)/g,(_,name,fallback)=>value(node,name)??fallback??'');
  return raw==='currentColor'&&property!=='color'?value(node,'color'):raw;
 };
 return {value,properties};
}
function rgbLuminance(rgb){return rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
function luminance(hex){assert(/^#[\da-f]{6}$/i.test(hex),`Expected opaque color: ${hex}`);return rgbLuminance(hex.slice(1).match(/../g).map(v=>parseInt(v,16)))}
function contrast(a,b){
 const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const boxSides=value=>{const v=(value??'0').split(/\s+/).map(parseFloat);return v.length===1?[v[0],v[0],v[0],v[0]]:v.length===2?[v[0],v[1],v[0],v[1]]:v.length===3?[v[0],v[1],v[2],v[1]]:v};

async function readPaperContrast(){
 const require=createRequire(path.resolve('node_modules/@shopify/react-native-skia/package.json'));
 const kit=await require('canvaskit-wasm')({locateFile:file=>path.join(path.dirname(require.resolve('canvaskit-wasm')),file)});
 const image=kit.MakeImageFromEncoded(fs.readFileSync('public/survival/patch-v3/letter.webp'));
 assert(image,'The physical letter is an actual decodable image, not an LFS pointer');
 try{
  const width=image.width(),height=image.height();assert(width>=512&&height>=512,'Paper remains sharp on phone readers');
  const pixels=image.readPixels(0,0,{width,height,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Unpremul,colorSpace:kit.ColorSpace.SRGB});
  assert(pixels,'The actual paper pixels can be read');
  let minimumLuminance=Infinity,minimumAlpha=255,samples=0;
  // This is a texture-readability check, not browser glyph coverage. Sample
  // every pixel in the central 80% reading area, including creases. Composite
  // over black as the conservative backdrop for the slightly translucent paper.
  for(let y=Math.ceil(height*.1);y<Math.floor(height*.9);y++)for(let x=Math.ceil(width*.1);x<Math.floor(width*.9);x++){
   const i=(y*width+x)*4,alpha=pixels[i+3]/255;
   minimumLuminance=Math.min(minimumLuminance,rgbLuminance([pixels[i]*alpha,pixels[i+1]*alpha,pixels[i+2]*alpha]));
   minimumAlpha=Math.min(minimumAlpha,pixels[i+3]);samples++;
  }
  assert(minimumAlpha>=240,'The reading area must not expose the moving world through transparent holes');
  return{width,height,minimumAlpha,samples,minimumLuminance,contrast:ink=>(minimumLuminance+.05)/(luminance(ink)+.05)};
 }finally{image.delete()}
}

try{
 const [styles]=await Promise.all([
  build({entryPoints:['src/main.tsx'],bundle:true,platform:'browser',format:'esm',outdir:path.join(temporary,'app'),write:false,alias:{'react-native':'react-native-web'},define:{global:'globalThis'},loader:{'.woff':'file','.woff2':'file'},external:['/fonts/*','/survival/*','/previews/*','/art/*','fs','path'],logLevel:'error'}),
  build({stdin:{contents:`export {default as React} from 'react';export {renderToStaticMarkup} from 'react-dom/server';export {default as CampStationPanel} from './src/CampStationPanel';export {default as StationMenu} from './src/StationMenu';export {PatchChatHUD,PatchNotePanel} from './src/PatchPanel';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/run-progression';export * from './src/patch-quest';export * from './src/patch-dialogue';export * from './src/patch-chat';export * from './src/patch-placement';export * from './src/imported-art';export * from './src/loot-chest';export * from './src/station-menu-layout';export * from './src/patch-panel-layout';export * from './src/patch-reply-strip-layout';`,resolveDir:process.cwd()},outfile:path.join(temporary,'ui.cjs'),bundle:true,platform:'node',format:'cjs',alias:{'react-native':'react-native-web'},loader:{'.css':'empty'},logLevel:'error'}),
 ]);
 const css=styles.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
 assert(css.includes('.world-editor p')&&css.includes('.patch-note-paper'),'Full app CSS must include the conflicting editor rule and letter styles');
 const m=createRequire(import.meta.url)(path.join(temporary,'ui.cjs'));
 const expectedNote=m.PATCH_NOTE_TEXT;assert.match(expectedNote,/southern bridge.*west bank south/s);
 const world=m.createWorld(m.emptyLayout());m.startExpedition(world);Object.assign(world.camp.hearth,{x:1500,y:1600});Object.assign(world.player,{x:1500,y:1343});world.tick=100;
 world.stationPanel='rare-cache';world.lootChestId=m.LOOT_CHEST_ID;world.lootChests={[m.LOOT_CHEST_ID]:{openedAt:0,menuShown:true,rewardVersion:2,contents:Object.fromEntries(m.LOOT_CHEST_REWARDS.map(r=>[r.kind,r.amount]))}};
 const props={world,onClose:()=>{},onChange:()=>{}},render=()=>m.renderToStaticMarkup(m.React.createElement(m.CampStationPanel,props));
 assert(render().includes('Read the folded note'),'The starter supplies expose a readable note');
 assert(render().indexOf('Read the folded note')<render().indexOf('aria-label="Take '),'P-04 left the letter on top of the supplies, visible before scrolling the loot list');
 assert(m.readPatchNote(world));assert(world.patchQuest.noteRead);
 world.stationPanel='patch-note';const note=render();
 const wrap=markup=>dom(`<html><body><div class="world-editor camp-studio" data-mode="play" data-mobile="true"><div class="field-kit">${markup}</div></div></body></html>`);
 const initial=wrap(note),paper=find(initial,'patch-note-paper'),sheet=find(initial,'patch-note-sheet');assert(paper&&sheet,'The whole physical sheet sits inside a dedicated scroll surface');
 assert.equal(paper.attrs.tabindex,'0','The scrollable letter is keyboard reachable');assert.equal(paper.attrs['aria-label'],"P-04's note");
 assert.equal([...sheet.children.filter(n=>n.tag==='p').map(n=>n.text),find(initial,'patch-note-signature').text].join('\n\n'),expectedNote,'All paragraphs and the signature are rendered verbatim');
 assert(find(initial,'patch-note-emblem')?.tag==='svg','A folded-page emblem replaces the generic chest');
 assert(!find(initial,'station-menu-header').children.some(n=>n.tag==='img'),'The letter header does not fall back to a chest image');
 assert(find(initial,'patch-note-return')?.text.includes('Back to supplies'));
 assert.equal(find(initial,'patch-note-turn')?.attrs['aria-label'],'Turn over to see the station sketch');
 assert(!find(initial,'patch-note-postscript'),'The fresh pencil is absent before homecoming');
 world.patchQuest.suppliesDelivered=true;
 assert(find(wrap(render()),'patch-note-postscript')?.text.includes('Now I know your footsteps.'));
 world.patchQuest.suppliesDelivered=false;
 const plain=wrap(m.renderToStaticMarkup(m.React.createElement(m.StationMenu,{world,title:'Supplies',onClose:()=>{},children:'Supplies'})));
 assert(find(plain,'station-menu-header').children.some(n=>n.tag==='img'),'Other station menus keep their default emblem');
 let returned=0,closed=0;const back=m.PatchNotePanel({...props,onChange:()=>returned++,onClose:()=>closed++}).props.onClose;
 back();assert.equal(world.stationPanel,'rare-cache');assert.equal(returned,1);assert.equal(closed,0,'Back returns to nearby supplies');
 const beforeBag=JSON.stringify(world.bag);m.readPatchNote(world);assert.equal(JSON.stringify(world.bag),beforeBag,'Reading adds no inventory weight');
 m.takeAllLootChestRewards(world);assert.equal(m.lootChestRemaining(world),0);assert(render().includes('Read the folded note'),'The paper remains readable after taking all supplies');
 world.player.x+=1000;back();assert.equal(closed,1,'An out-of-range note closes instead of reopening remote supplies');world.player.x-=1000;
 world.lootChestId='other-cache';assert(!render().includes('Read the folded note'),'The note remains unique to camp supplies');world.lootChestId=m.LOOT_CHEST_ID;

 const raster=await readPaperContrast();
 let minimumContrast=Infinity,minimumBodyRasterContrast=Infinity,minimumMetadataRasterContrast=Infinity;const geometry=[];
 for(const device of devices){
  const layout=m.patchPanelLayout(device.width,device.height,device.safe),p=layout.panel;
  assert(p.x>=device.safe.left+12&&p.y>=device.safe.top+12);assert(p.x+p.width<=device.width-device.safe.right-12+1e-6);assert(p.y+p.height<=device.height-device.safe.bottom-12+1e-6,device.name);
  const root=wrap(note),panel=find(root,'station-menu');panel.attrs['data-short']=String(layout.compact);panel.attrs['data-wide']=String(layout.wide);
  let frame={...device,containerWidth:p.width},style=cascade(css,frame);const inset=boxSides(style.value(panel,'padding')),border=parseFloat(style.value(panel,'border-width')??style.value(panel,'border')??'0');
  frame={...frame,containerWidth:p.width-inset[1]-inset[3]-2*border};style=cascade(css,frame);
  const page=find(root,'patch-note-paper'),physicalSheet=find(root,'patch-note-sheet'),paragraphs=physicalSheet.children.filter(n=>n.tag==='p'),signature=find(root,'patch-note-signature'),provenance=find(root,'patch-note-provenance');
  const background=style.value(page,'--patch-paper');
  assert(background,'Keep an explicit paper-color baseline for the original CSS ink regression');
  assert(style.value(physicalSheet,'background')?.includes('/survival/patch-v3/letter.webp'),'The reader uses the verified physical paper texture');
  const printed=[...paragraphs,...descendants(signature).filter(n=>!n.children.length&&n.text.trim()),...descendants(provenance).filter(n=>!n.children.length&&n.text.trim())];
  for(const node of printed){
   const ink=style.value(node,'color'),ratio=contrast(ink,background);minimumContrast=Math.min(minimumContrast,ratio);
   assert(ratio>=7,`${device.name}: letter ink ${ink} on baseline ${background} has insufficient contrast (${ratio.toFixed(2)}:1)`);
   const metadata=node===provenance||node.parent===provenance,rasterRatio=raster.contrast(ink),required=metadata?4.5:7;
   if(metadata)minimumMetadataRasterContrast=Math.min(minimumMetadataRasterContrast,rasterRatio);else minimumBodyRasterContrast=Math.min(minimumBodyRasterContrast,rasterRatio);
   assert(rasterRatio>=required,`${device.name}: ${metadata?'provenance':'body/signature'} ink ${ink} over real paper needs ${required}:1, measured ${rasterRatio.toFixed(2)}:1`);
   assert(!['hidden','collapse'].includes(style.value(node,'visibility'))&&style.value(node,'display')!=='none','The lore must remain visible');
   assert(style.value(node,'opacity')===undefined||Number(style.value(node,'opacity'))===1,'No faded letter text');
  }
  for(const paragraph of paragraphs){assert.equal(style.value(paragraph,'-webkit-text-fill-color'),style.value(paragraph,'color'),'Safari text fill matches ink');assert.equal(style.value(paragraph,'white-space'),'pre-line');assert.equal(style.value(paragraph,'overflow-wrap'),'break-word');const fontSize=parseFloat(style.value(paragraph,'font-size')??style.value(paragraph,'font')?.match(/(\d+)px/)?.[1]);assert(fontSize>=16,`${device.name}: letter text remains at least 16px; font-size=${style.value(paragraph,'font-size')}, font=${style.value(paragraph,'font')}`)}
  assert.equal(style.value(page,'overflow-y'),'auto','The entire letter remains scrollable');assert.equal(style.value(page,'overflow-x'),'hidden','The letter never needs horizontal scrolling');assert.equal(style.value(page,'min-height'),'0','The scroll surface can shrink inside the phone panel');
  assert.equal(style.value(page,'touch-action'),'pan-y','Reading gestures scroll vertically');
  assert(parseFloat(style.value(find(root,'patch-note-return'),'min-height'))>=44,'Back keeps a 44px touch target');
  assert(parseFloat(style.value(find(root,'station-menu-close'),'min-height'))>=44,'Close keeps a 44px touch target');
  const paperInset=boxSides(style.value(physicalSheet,'padding')),textWidth=frame.containerWidth-paperInset[1]-paperInset[3];
  assert(textWidth>=230,`${device.name}: readable line width survives the actual panel and paper padding`);
  geometry.push(`${device.width}×${device.height} (${Math.round(textWidth)}px text)`);
 }
 // Prove this check catches the shipped failure: removing direct paragraph
 // ink lets .world-editor p override the inherited parchment color.
 const broken=postcss.parse(css);broken.walkRules(rule=>{if(rule.selector.includes('.patch-note-paper p'))rule.walkDecls(decl=>{if(['color','-webkit-text-fill-color'].includes(decl.prop))decl.remove()})});
 const brokenStyle=cascade(broken.toString(),{...devices[0],containerWidth:340}),paragraph=sheet.children.find(n=>n.tag==='p');
 assert(contrast(brokenStyle.value(paragraph,'color'),brokenStyle.value(paper,'--patch-paper'))<7,'The regression fixture must reproduce the original low-contrast failure');

 // Native reads the same generated paper and must retain the measured dark
 // inks too. These are declaration/asset checks, not a device-render claim.
 const nativePanel=fs.readFileSync('native/PatchPanel.tsx','utf8');
 assert(nativePanel.includes("require('../public/survival/patch-v3/letter.webp')"));
 assert(nativePanel.includes("require('../public/survival/patch-v4/gate-memory.webp')"),'The letter keeps the illustrated memory available after homecoming');
 for(const [name,required] of [['paragraph',7],['signatureText',7],['provenanceText',4.5]]){
  const ink=nativePanel.match(new RegExp(`${name}:\\{[^}]*color:'(#[\\da-f]{6})'`,'i'))?.[1];
  assert(ink,`Native ${name} has an explicit, inspectable ink color`);
  assert(contrast(ink,'#e8dfc6')>=7,`Native ${name} retains the canonical paper baseline contrast`);
  assert(raster.contrast(ink)>=required,`Native ${name} actual paper contrast must be at least ${required}:1 (measured ${raster.contrast(ink).toFixed(2)}:1)`);
 }

 // Open the same transient session as Inspect. The readout and choices belong
 // to the world HUD, so they must never create a second station or modal.
 const authored=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
 m.installImportedArt(authored.records);
 world.layout=m.placePatchMaintenanceStation(authored.layout);
 const site=m.patchQuestSite(world.layout);
 assert(site,'The published rescue shelter contains P-04');
 world.stationPanel=undefined;
 Object.assign(world.player,{x:site.robot.x+55,y:site.robot.y+30});
 const chatMarkup=()=>m.renderToStaticMarkup(m.React.createElement(m.PatchChatHUD,props));
 const readChat=()=>{
  const root=wrap(chatMarkup()),tray=find(root,'patch-chat-hud'),options=find(root,'patch-reply-list'),end=find(root,'patch-reply-close');
  const chat=m.patchChat(world);
  assert(tray&&options&&end&&chat);
  assert(!find(root,'station-menu')&&!descendants(root).some(n=>n.attrs['aria-modal']==='true'),'The conversation stays in the game world');
  assert.equal(find(tray,'patch-chat-name')?.text,chat.speaker,'The name follows the current introduction state');
  const transcript=find(tray,'patch-chat-transcript');
  assert.equal(transcript?.attrs.role,'status');
  assert.equal(find(transcript,'patch-chat-line')?.text,chat.line,'The speech bubble displays the current passage');
  assert.equal(end.attrs['aria-label'],'Close conversation');
  assert.equal(end.parent,options.parent,'The close target has its own space outside the scroller');
  const buttons=descendants(options).filter(n=>n.tag==='button');
  const choices=chat.choices;
  const labels=buttons.map(n=>n.children.find(child=>child.tag==='span')?.text);
  assert.deepEqual(buttons.map(n=>n.attrs['data-choice']),choices.map(c=>c.id),'Choices retain their authored order and gates');
  assert.deepEqual(labels,choices.map(c=>c.label),'The visible reply text retains every authored word');
  assert.equal(world.stationPanel,undefined);
  return {root,tray,options,end,buttons,labels};
 };
 assert.equal(chatMarkup(),'','Approaching alone reveals no controls');
 assert(m.inspectPatch(world));
 const finishLine=()=>{while(m.patchChat(world).choices.some(c=>c.id==='more'))assert(m.choosePatchChat(world,'more'))};
 finishLine();assert.deepEqual(readChat().labels,['Take the scanner','Thanks for the tools.','Ask a question','Back']);
 assert(m.choosePatchChat(world,'ask'));
 assert(m.choosePatchChat(world,'topic:bed'));
 while(m.patchChat(world).choices.some(c=>c.id==='more'))assert(m.choosePatchChat(world,'more'));
 assert(m.choosePatchChat(world,'topic:reclamation'));assert(m.choosePatchChat(world,'leave-wire'));
 assert.equal(m.patchChat(world).view,'greeting','The bedroll leads to the cut wire and the survivor can decline the memory');
 finishLine();assert(m.choosePatchChat(world,'arrival'));finishLine();
 assert(m.choosePatchChat(world,'ask'));
 const questions=readChat();
 assert(questions.labels.includes('Who cut that wire?'));
 assert(questions.labels.length>=6,'The shelter has a real overflowing row including Back');
 assert(m.choosePatchChat(world,'topic:reclamation'));assert(m.choosePatchChat(world,'tell-wire'));
 const pages=[m.patchChat(world).line];
 while(m.patchChat(world).pageIndex+1<m.patchChat(world).pageCount){
  const page=readChat();
  assert.equal(page.labels[0],'Continue');
  assert.equal(page.buttons[0].attrs['data-primary'],'true','The bottom bar highlights the continuation');
  assert(m.choosePatchChat(world,'more'));
  pages.push(m.patchChat(world).line);
 }
 assert.equal(pages.join(' '),m.patchDialogueReply(world,'reclamation'),'Every word of the gate story reaches the speech bubble');
 assert(m.choosePatchChat(world,'followup'));
 while(m.patchChat(world).pageIndex+1<m.patchChat(world).pageCount)assert(m.choosePatchChat(world,'more'));
 assert(readChat().labels.includes('Ask something else'));
 m.closePatchChat(world);
 assert(m.inspectPatch(world));
 finishLine();
 while(m.patchChat(world).choices.some(c=>c.id==='more'))assert(m.choosePatchChat(world,'more'));
 assert(m.choosePatchChat(world,'borrow-scanner'));
 assert(world.patchQuest.diagnosed&&world.patchQuest.scannerLoaned&&!m.patchChat(world),'Taking the scanner starts the search and restores field controls');
 assert.equal(world.stationPanel,undefined);
 m.closePatchChat(world);
 Object.assign(world.patchQuest,{servoClaimed:true,servoInstalled:true});
 assert(m.inspectPatch(world));assert(readChat().labels.includes('Walk back with me.'));assert(!readChat().labels.includes('Follow me'));
 m.closePatchChat(world);
 Object.assign(world.patchQuest,{recruited:true,returnedToCamp:true,suppliesDelivered:true});
 assert(m.inspectPatch(world));
 const {tray,options,labels,buttons,end}=readChat();
 assert.deepEqual(labels,['Ask Patch','Follow me','Stay here','Return to camp']);
 // The game-wide paragraph rule once left dispatch evidence nearly invisible on parchment.
 const journalFixture=wrap('<div class="patch-field-notes"><section class="field-notes-book"><div class="field-notes-scroll"><div class="field-notes-entry"><article><p>Stores transfer 14.</p></article></div></div></section></div>');
 const evidence=descendants(journalFixture).find(node=>node.tag==='p');
 const selected=buttons.filter(button=>button.attrs['aria-pressed']==='true');
 assert.deepEqual(selected.map(button=>button.attrs['data-choice']),[world.patchQuest.command],'The active command is announced to screen readers');
 for(const device of devices){
  const style=cascade(css,{...device,containerWidth:device.width});
  const journalInk=style.value(evidence,'color');
  assert(raster.contrast(journalInk)>=4.5,`${device.name}: field journal evidence must be legible on the actual paper`);
  assert.equal(style.value(evidence,'-webkit-text-fill-color'),journalInk,'Safari draws journal evidence in the same ink');
  assert.equal(style.value(tray,'position'),'absolute');
  assert.equal(style.value(tray,'pointer-events'),'none','The uncovered world remains interactive');
  for(const button of [...buttons,end])assert(parseFloat(style.value(button,'min-height'))>=44,'All reply targets are at least 44px tall');
  for(const button of buttons){
   const label=button.children.find(child=>child.tag==='span');
   assert(label?.text.length,'Every reply keeps its complete authored label');
   assert.equal(style.value(button,'width'),'max-content','Each frame grows to the width of its own reply and icon');
   assert.equal(style.value(label,'white-space'),'nowrap','A label occupies one line even when its row overflows');
   assert.notEqual(style.value(label,'text-overflow'),'ellipsis','The row preserves all of each response');
  }
  assert.equal(style.value(options,'overflow-x'),'auto','All replies can be reached horizontally');
  assert.equal(style.value(options,'touch-action'),'none','A drag at either edge stays with the reply strip');
  assert.equal(style.value(end,'flex'),'none','The close target cannot collapse as replies overflow');
  const {bounds,row,closeWidth,listWidth,gap,fontSize}=m.patchReplyStripLayout(device.width,device.height,device.safe);
  assert(bounds.x>=device.safe.left&&bounds.x+bounds.width<=device.width-device.safe.right);
  assert(bounds.y>=device.safe.top&&bounds.y+bounds.height<=device.height-device.safe.bottom);
  assert(closeWidth>=44&&row>=44&&listWidth+gap+closeWidth===bounds.width,'Every choice set reserves a separate 44-point close target');
  const count=questions.labels.length;
  const {minimum}=m.patchReplySizing(listWidth,gap,count,fontSize);
  assert(count*minimum+(count-1)*gap>listWidth,'The six shelter choices overflow into the scroller before the close target');
 }
 m.closePatchChat(world);
 assert.equal(chatMarkup(),'');
 console.log(`PASS: Patch UI real markup, complete app CSS cascade (canonical paper baseline minimum ${minimumContrast.toFixed(2)}:1), original pale-ink regression fixture, exact lore, retained zero-weight note, note emblem, back/range behavior and staged commands.`);
 console.log(`PASS: actual ${raster.width}×${raster.height} paper, ${raster.samples} central reading-area pixels over black; minimum body/signature contrast ${minimumBodyRasterContrast.toFixed(2)}:1, provenance ${minimumMetadataRasterContrast.toFixed(2)}:1, alpha ${raster.minimumAlpha}/255. Native ink declarations pass the same texture thresholds.`);
 console.log(`PASS: shared story safe-area bounds and scroll/text-width constraints at ${geometry.join('; ')}; ordered single-line replies, paged speech, speaker identity and independent close target.`);
}finally{fs.rmSync(temporary,{recursive:true,force:true})}

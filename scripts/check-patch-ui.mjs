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
// dependency is needed in CI. Safe-area geometry comes from the live menu model.
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'patch-ui-'));
const expectedNote=`To whoever finds this place,

The tools are yours.

I was told nobody would come. I thought it best to leave these anyway.

The well needs work. So do the walls. I wanted to have more ready for you, but I need a few replacement parts myself.

There is an old maintenance station beyond the lake. I am going to try there.

If you see three short amber flashes in the trees, that will be me. Please do not shoot.

Light the fire if you decide to stay.

I would like to know someone made it.

P-04`;
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
  const set=(property,value,rank)=>{if(!props.has(property)||compare(rank,props.get(property).rank)>=0)props.set(property,{value,rank})};
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
function contrast(a,b){
 const luminance=hex=>{assert(/^#[\da-f]{6}$/i.test(hex),`Expected opaque color: ${hex}`);return hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)};
 const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const boxSides=value=>{const v=(value??'0').split(/\s+/).map(parseFloat);return v.length===1?[v[0],v[0],v[0],v[0]]:v.length===2?[v[0],v[1],v[0],v[1]]:v.length===3?[v[0],v[1],v[2],v[1]]:v};

try{
 const [styles]=await Promise.all([
  build({entryPoints:['src/main.tsx'],bundle:true,platform:'browser',format:'esm',outdir:path.join(temporary,'app'),write:false,alias:{'react-native':'react-native-web'},define:{global:'globalThis'},loader:{'.woff':'file','.woff2':'file'},external:['/fonts/*','/survival/*','/previews/*','/art/*','fs','path'],logLevel:'error'}),
  build({stdin:{contents:`export {default as React} from 'react';export {renderToStaticMarkup} from 'react-dom/server';export {default as CampStationPanel} from './src/CampStationPanel';export {default as StationMenu} from './src/StationMenu';export {PatchNotePanel} from './src/PatchPanel';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/run-progression';export * from './src/patch-quest';export * from './src/loot-chest';export * from './src/station-menu-layout';`,resolveDir:process.cwd()},outfile:path.join(temporary,'ui.cjs'),bundle:true,platform:'node',format:'cjs',alias:{'react-native':'react-native-web'},loader:{'.css':'empty'},logLevel:'error'}),
 ]);
 const css=styles.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
 assert(css.includes('.world-editor p')&&css.includes('.patch-note-paper'),'Full app CSS must include the conflicting editor rule and letter styles');
 const m=createRequire(import.meta.url)(path.join(temporary,'ui.cjs'));
 assert.equal(m.PATCH_NOTE_TEXT,expectedNote,'Approved Reclamation-continuity letter remains intact');
 const world=m.createWorld(m.emptyLayout());m.startExpedition(world);Object.assign(world.camp.hearth,{x:1500,y:1600});Object.assign(world.player,{x:1500,y:1343});world.tick=100;
 world.stationPanel='rare-cache';world.lootChestId=m.LOOT_CHEST_ID;world.lootChests={[m.LOOT_CHEST_ID]:{openedAt:0,menuShown:true,rewardVersion:2,contents:Object.fromEntries(m.LOOT_CHEST_REWARDS.map(r=>[r.kind,r.amount]))}};
 const props={world,onClose:()=>{},onChange:()=>{}},render=()=>m.renderToStaticMarkup(m.React.createElement(m.CampStationPanel,props));
 assert(render().includes('Read the folded note'),'The starter supplies expose a readable note');
 assert(m.readPatchNote(world));assert(world.patchQuest.noteRead);
 world.stationPanel='patch-note';const note=render();
 const wrap=markup=>dom(`<html><body><div class="world-editor camp-studio" data-mode="play" data-mobile="true"><div class="field-kit">${markup}</div></div></body></html>`);
 const initial=wrap(note),paper=find(initial,'patch-note-paper');assert(paper,'The note has a dedicated paper surface');
 assert.equal(paper.attrs.tabindex,'0','The scrollable letter is keyboard reachable');assert.equal(paper.attrs['aria-label'],"P-04's note");
 assert.equal([...paper.children.filter(n=>n.tag==='p').map(n=>n.text),find(initial,'patch-note-signature').text].join('\n\n'),expectedNote,'All paragraphs and the signature are rendered verbatim');
 assert(find(initial,'patch-note-emblem')?.tag==='svg','A folded-page emblem replaces the generic chest');
 assert(!find(initial,'station-menu-header').children.some(n=>n.tag==='img'),'The letter header does not fall back to a chest image');
 assert(find(initial,'patch-note-return')?.text.includes('Back to supplies'));
 const plain=wrap(m.renderToStaticMarkup(m.React.createElement(m.StationMenu,{world,title:'Supplies',onClose:()=>{},children:'Supplies'})));
 assert(find(plain,'station-menu-header').children.some(n=>n.tag==='img'),'Other station menus keep their default emblem');
 let returned=0,closed=0;const back=m.PatchNotePanel({...props,onChange:()=>returned++,onClose:()=>closed++}).props.onClose;
 back();assert.equal(world.stationPanel,'rare-cache');assert.equal(returned,1);assert.equal(closed,0,'Back returns to nearby supplies');
 const beforeBag=JSON.stringify(world.bag);m.readPatchNote(world);assert.equal(JSON.stringify(world.bag),beforeBag,'Reading adds no inventory weight');
 m.takeAllLootChestRewards(world);assert.equal(m.lootChestRemaining(world),0);assert(render().includes('Read the folded note'),'The paper remains readable after taking all supplies');
 world.player.x+=1000;back();assert.equal(closed,1,'An out-of-range note closes instead of reopening remote supplies');world.player.x-=1000;
 world.lootChestId='other-cache';assert(!render().includes('Read the folded note'),'The note remains unique to camp supplies');world.lootChestId=m.LOOT_CHEST_ID;

 let minimumContrast=Infinity;const geometry=[];
 for(const device of devices){
  const layout=m.stationMenuLayout(device.width,device.height,device.safe),p=layout.panel;
  assert(p.x>=device.safe.left+12&&p.y>=device.safe.top+12);assert(p.x+p.width<=device.width-device.safe.right-12+1e-6);assert(p.y+p.height<=device.height-device.safe.bottom-12+1e-6,device.name);
  const root=wrap(note),panel=find(root,'station-menu');panel.attrs['data-short']=String(layout.compact);panel.attrs['data-wide']=String(layout.wide);
  let frame={...device,containerWidth:p.width},style=cascade(css,frame);const inset=boxSides(style.value(panel,'padding'));
  frame={...frame,containerWidth:p.width-inset[1]-inset[3]-2};style=cascade(css,frame);
  const page=find(root,'patch-note-paper'),paragraphs=page.children.filter(n=>n.tag==='p'),signature=find(root,'patch-note-signature'),provenance=find(root,'patch-note-provenance');
  const background=style.value(page,'background-color')??style.value(page,'background')?.match(/#[\da-f]{6}\s*$/i)?.[0].trim();
  assert(background,'The actual paper background must end in an opaque color');
  const printed=[...paragraphs,...descendants(signature).filter(n=>!n.children.length&&n.text.trim()),...descendants(provenance).filter(n=>!n.children.length&&n.text.trim())];
  for(const node of printed){
   const ink=style.value(node,'color'),ratio=contrast(ink,background);minimumContrast=Math.min(minimumContrast,ratio);
   assert(ratio>=7,`${device.name}: letter ink ${ink} on ${background} has insufficient contrast (${ratio.toFixed(2)}:1)`);
   assert(!['hidden','collapse'].includes(style.value(node,'visibility'))&&style.value(node,'display')!=='none','The lore must remain visible');
   assert(style.value(node,'opacity')===undefined||Number(style.value(node,'opacity'))===1,'No faded letter text');
  }
  for(const paragraph of paragraphs){assert.equal(style.value(paragraph,'-webkit-text-fill-color'),style.value(paragraph,'color'),'Safari text fill matches ink');assert.equal(style.value(paragraph,'white-space'),'pre-line');assert.equal(style.value(paragraph,'overflow-wrap'),'break-word');const fontSize=parseFloat(style.value(paragraph,'font-size')??style.value(paragraph,'font')?.match(/(\d+)px/)?.[1]);assert(fontSize>=16,'Phone letter text remains at least 16px')}
  assert.equal(style.value(page,'overflow-y'),'auto','The entire letter remains scrollable');assert.equal(style.value(page,'overflow-x'),'hidden','The letter never needs horizontal scrolling');assert.equal(style.value(page,'min-height'),'0','The scroll surface can shrink inside the phone panel');
  assert.equal(style.value(page,'touch-action'),'pan-y','Reading gestures scroll vertically');
  assert(parseFloat(style.value(find(root,'patch-note-return'),'min-height'))>=44,'Back keeps a 44px touch target');
  const paperInset=boxSides(style.value(page,'padding')),textWidth=frame.containerWidth-paperInset[1]-paperInset[3]-2;
  assert(textWidth>=230,`${device.name}: readable line width survives the actual panel and paper padding`);
  geometry.push(`${device.width}×${device.height} (${Math.round(textWidth)}px text)`);
 }
 // Prove this check catches the shipped failure: removing direct paragraph
 // ink lets .world-editor p override the inherited parchment color.
 const broken=postcss.parse(css);broken.walkRules(rule=>{if(rule.selector.includes('.patch-note-paper p'))rule.walkDecls(decl=>{if(['color','-webkit-text-fill-color'].includes(decl.prop))decl.remove()})});
 const brokenStyle=cascade(broken.toString(),{...devices[0],containerWidth:340}),paragraph=paper.children.find(n=>n.tag==='p');
 assert(contrast(brokenStyle.value(paragraph,'color'),brokenStyle.value(paper,'--patch-paper'))<7,'The regression fixture must reproduce the original low-contrast failure');

 world.stationPanel='patch';Object.assign(world.patchQuest,{discovered:true,servoClaimed:false});assert(render().includes('Drive servo damaged.'));assert(!render().includes('Follow me'));
 Object.assign(world.patchQuest,{servoClaimed:true,servoInstalled:true});assert(render().includes('Come with us'));assert(!render().includes('Follow me'),'Commands wait for homecoming');
 Object.assign(world.patchQuest,{recruited:true,returnedToCamp:true,suppliesDelivered:true});
 for(const [command,subtitle] of [['follow','Following you'],['stay','Waiting here'],['camp','Returning to camp']]){
  world.patchQuest.command=command;const html=render(),root=wrap(html),choices=find(root,'patch-choices');
  assert(html.includes(subtitle));assert(html.includes(m.patchStatus(world).line),'Conversation uses current core status');
  assert.deepEqual(choices.children.map(n=>n.text),['Follow me','Stay here','Return to camp']);assert.equal(choices.children.filter(n=>n.attrs['aria-pressed']==='true').length,1,'Exactly one command is selected');
  const style=cascade(css,{...devices[2],containerWidth:428});assert.equal(style.value(choices,'display'),'grid');assert.equal(style.value(choices,'grid-template-columns'),'1fr 1fr');assert.equal(style.value(choices.children[0],'grid-column')?.replace(/\s/g,''),'1/-1','Follow has its own row');
 }
 console.log(`PASS: Patch UI real markup, complete app CSS cascade (minimum letter contrast ${minimumContrast.toFixed(2)}:1), original pale-ink regression fixture, exact lore, retained zero-weight note, note emblem, back/range behavior and staged commands.`);
 console.log(`PASS: shared safe-area bounds and scroll/text-width constraints at ${geometry.join('; ')}. Browser paint, scrolling and touch interaction still require device QA.`);
}finally{fs.rmSync(temporary,{recursive:true,force:true})}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'action-hex-'));
globalThis.__hexReact={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:current=>({current}),useEffect(){},useState:initial=>[initial,()=>{}]};
try{
 await build({stdin:{contents:"export * from './src/action-hex';export {default as NativeHexActions} from './native/HexActions';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),plugins:[{name:'native-test',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native|@shopify\/react-native-skia)$/},a=>({path:a.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='@shopify/react-native-skia'?"export const Canvas='canvas',Path='path';":a.path==='react'?'module.exports=globalThis.__hexReact;':a.path==='react/jsx-runtime'?"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;":"export const View='view',Text='text',Image='image';export const AppState={addEventListener:()=>({remove(){}})};export const StyleSheet={create:x=>x,absoluteFill:{position:'absolute',inset:0}};",loader:'js'}));b.onLoad({filter:/\.png$/},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}));}}]});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs')),layout=m.ACTION_HEX,cells=layout.cells;
 const vertices=c=>Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return{x:c.left+c.width/2+c.height/2*Math.cos(a),y:c.top+c.height/2+c.height/2*Math.sin(a)}});
 const pointSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)};
 const distance=(a,b)=>Math.min(...a.flatMap(p=>b.map((q,i)=>pointSegment(p,q,b[(i+1)%6]))),...b.flatMap(p=>a.map((q,i)=>pointSegment(p,q,a[(i+1)%6]))));
 for(const[first,second]of[['primary','sprint'],['primary','dodge'],['primary','repair']])assert(Math.abs(distance(vertices(cells[first]),vertices(cells[second]))-layout.gap)<1e-8,`${first}/${second} has the same perpendicular border gap`);
 // Opposing edge midpoints must line up along their perpendicular, so the
 // smaller hexagons cannot slide inward along the main hexagon's sloping sides.
 const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2}),mainVertices=vertices(cells.primary);
 for(const[slot,mainEdge,secondaryEdge]of[['sprint',0,3],['dodge',5,2],['repair',4,1]]){
  const v=vertices(cells[slot]),a=midpoint(mainVertices[mainEdge],mainVertices[(mainEdge+1)%6]),b=midpoint(v[secondaryEdge],v[(secondaryEdge+1)%6]);
  assert(Math.abs(Math.hypot(b.x-a.x,b.y-a.y)-layout.gap)<1e-8,`${slot} facing edge is centred on the primary edge`);
 }
 for(const[first,second]of[['sprint','dodge'],['dodge','repair'],['sprint','repair']])assert(distance(vertices(cells[first]),vertices(cells[second]))>=layout.gap,`${first}/${second} controls keep clear of each other`);
 const c=Math.sqrt(3)/2,oldDistance=c*(36+27)+4,oldCentreX=oldDistance/2+c*27,oldWidth=oldCentreX*2,oldLeft={primary:oldCentreX-c*36,sprint:oldCentreX+oldDistance/2-c*27,dodge:0};
 for(const slot of ['primary','sprint','dodge'])assert(Math.abs(layout.width-cells[slot].left-(oldWidth-oldLeft[slot]))<1e-8,`${slot} keeps its existing right-anchored screen position`);
 for(const cell of Object.values(cells)){const v=vertices(cell),r=cell.height/2;for(let i=0;i<6;i++)assert(Math.abs(Math.hypot(v[i].x-v[(i+1)%6].x,v[i].y-v[(i+1)%6].y)-r)<1e-8);assert(!m.pointInActionHex(cell.left,cell.top,cell),'Transparent corner cannot activate a button')}
 assert.equal(cells.sprint.height/cells.primary.height,.75);assert.equal(cells.sprint.height,cells.dodge.height);assert.equal(cells.repair.height,cells.sprint.height);
 const counts={primary:0,sprint:0,dodge:0,repair:0,release:0,repairRelease:0};
 const props={primary:{label:'PUNCH',icon:'punch',disabled:false,onDown:()=>counts.primary++,onUp:()=>counts.release++},sprint:{label:'SPRINT',icon:'sprint',disabled:false,onDown:()=>counts.sprint++},dodge:{label:'DODGE',icon:'dodge',disabled:false,onDown:()=>counts.dodge++},repair:{label:'REPAIR',icon:'chest',disabled:false,onDown:()=>counts.repair++,onUp:()=>counts.repairRelease++}};
 const tree=m.NativeHexActions(props),contact=(slot,id)=>{const c=cells[slot];return{identifier:id,locationX:c.left+c.width/2,locationY:c.top+c.height/2}},event=t=>({nativeEvent:{changedTouches:[t]}});
 const main=contact('primary','one'),sprint=contact('sprint','two');tree.props.onTouchStart(event(main));tree.props.onTouchStart(event(sprint));assert.equal(counts.primary,1);assert.equal(counts.sprint,1);assert.equal(counts.release,0,'Sprint touch must not cancel another finger holding the main action');tree.props.onTouchEnd(event(sprint));assert.equal(counts.release,0);tree.props.onTouchEnd(event(main));assert.equal(counts.release,1);
 tree.props.onTouchStart(event({...main,identifier:'corner',locationX:cells.primary.left,locationY:cells.primary.top}));assert.equal(counts.primary,1);const dodgeBefore=counts.dodge;props.dodge.disabled=true;tree.props.onTouchStart(event(contact('dodge','blocked')));assert.equal(counts.dodge,dodgeBefore);
 tree.props.onTouchStart(event({...main,identifier:'drag'}));tree.props.onTouchMove(event({identifier:'drag',locationX:-20,locationY:-20}));assert.equal(counts.release,2,'Dragging outside a held hexagon releases the action');tree.props.onTouchCancel();assert.equal(counts.release,2,'Cancel cannot release twice');
 const repair=contact('repair','repair-finger'),menu=contact('primary','menu-finger');tree.props.onTouchStart(event(repair));tree.props.onTouchStart(event(menu));assert.equal(counts.repair,1);tree.props.onTouchEnd(event(menu));assert.equal(counts.release,3);assert.equal(counts.repairRelease,0,'Releasing the menu finger must not release the separate repair contact');tree.props.onTouchEnd(event(repair));assert.equal(counts.repairRelease,1);
 const savedRepair=props.repair;tree.props.onTouchStart(event({...repair,identifier:'finishing-repair'}));props.repair=undefined;tree.props.onTouchEnd(event({...repair,identifier:'finishing-repair'}));assert.equal(counts.repairRelease,2,'A repair that disappears on completion retains its own release callback');tree.props.onTouchStart(event({...repair,identifier:'hidden-repair'}));assert.equal(counts.repair,2,'Hidden repair control cannot activate');props.repair={...savedRepair,disabled:true};tree.props.onTouchStart(event({...repair,identifier:'disabled-repair'}));assert.equal(counts.repair,2,'Disabled repair control cannot activate');
 for(const slot of Object.keys(cells)){const point=contact(slot,'hit-test');assert.equal(m.actionHexAt(point.locationX,point.locationY),slot,`${slot} centre selects only its own control`)}
 console.log('Passed: four regular hexes; equal primary gaps; original screen positions; 25% smaller secondary controls; transparent-corner hit tests; independent menu/repair fingers; hidden/disabled controls; disappearing-repair and drag/cancel release.');
}finally{delete globalThis.__hexReact;fs.rmSync(temp,{recursive:true,force:true})}

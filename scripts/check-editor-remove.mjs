import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
// Exercise the actual UI handler, including confirmation and drag cancellation.
const source=fs.readFileSync('src/WorldEditor.tsx','utf8');
const handler=source.match(/const remove=(\(id:string\|null=viewRef.current.selected\)=>\{[\s\S]*?\n \});\n const duplicate=/)?.[1]?.replace('id:string|null','id');
assert(handler,'Remove handler found');
assert(source.includes('aria-label="Remove selected asset"'));
assert(source.includes('className="we-danger" aria-label="Remove selected asset" onClick={()=>remove(selectedItem.id)}'),'Inspector removes the inspected object');
assert(source.includes('<Trash2 size={17}/>Remove'),'Remove has a clear label and icon');
assert(!source.includes('disabled={!!selectedItem.locked} className="we-danger"'));
function setup(locked=false,confirm=true,drag=false){
 const original={items:[{id:'selected',assetId:'asset',locked},{id:'other',assetId:'asset',locked:false}]},history=[],messages=[];
 const context={mobile:false,setInspectorOpen(){},sprint:{reset(){}},attackHeld:{current:true},viewRef:{current:{selected:'selected'}},layoutRef:{current:structuredClone(original)},ASSET_BY_ID:new Map([['asset',{name:'Wall'}]]),keys:{current:new Set(['w'])},touchInput:{current:{x:1,y:0}},window:{confirm:()=>{context.confirmations++;return confirm}},confirmations:0,
 cancelGesture(){if(drag)context.layoutRef.current=structuredClone(original);context.cancelled=true},cancelPlace(){context.placing=false},setCurrent(next){history.push(context.layoutRef.current);context.layoutRef.current=next},select(id){context.viewRef.current.selected=id},setCollisionEdit(value){context.collisionEdit=value},show(message){messages.push(message)}};
 return{run:vm.runInNewContext('('+handler+')',context),context,original,history,messages};
}
for(const locked of [false,true])for(const drag of [false,true]){
 const test=setup(locked,true,drag);test.run();assert.deepEqual(test.context.layoutRef.current.items.map(p=>p.id),['other']);assert.equal(test.context.viewRef.current.selected,null);assert.equal(test.context.confirmations,locked?1:0);assert.equal(test.context.keys.current.size,0);assert.equal(test.context.touchInput.current.x,0);assert.equal(test.history.length,1);assert.deepEqual(test.history[0],test.original,'Undo retains deleted item');assert(test.messages[0].includes('removed'));
}
const cancelled=setup(true,false);cancelled.run();assert.equal(cancelled.history.length,0);assert.equal(cancelled.context.layoutRef.current.items.length,2);
const noSelection=setup();noSelection.context.viewRef.current.selected=null;noSelection.run();assert.equal(noSelection.history.length,0);
const explicit=setup();explicit.context.viewRef.current.selected=null;explicit.run('selected');assert.deepEqual(explicit.context.layoutRef.current.items.map(p=>p.id),['other'],'Inspector removes its own item even if canvas selection changes');
assert(source.includes('onClick={()=>remove(selectedItem.id)}'),'Remove is bound to the inspected item');
assert(source.includes('</header><div className="we-inspector-body">'),'Settings scroll independently of the header');
assert(source.includes('</div><div className="we-object-actions">'),'Actions are outside the scrolling settings');
assert(source.includes('if(!ready||blockedInput.current)return')&&source.includes('(mobile&&(libraryOpen||inspectorOpen))'),'Canvas cannot steal selection while mobile settings are open');
const css=fs.readFileSync('src/world-editor.css','utf8');
assert(css.includes('.we-inspector-body>*{flex-shrink:0}'),'Settings cannot collapse and overlap touch targets');
assert(css.includes('.we-inspector>.we-object-actions{flex:0 0 auto;'),'Remove action cannot shrink out of the viewport');
console.log('PASS: Remove deletes unlocked assets, confirms locked assets, preserves cancellation and Undo, clears captured input, and reads current selection.');

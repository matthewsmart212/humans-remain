import fs from 'node:fs';
const saved=JSON.parse(fs.readFileSync('docs/qa/tree-variants-v1/before.json')),changes=[],counts={};
const variants={oak:['forked','leaning'],pine:['branching','bent'],birch:['branching','bent'],deadwood:['forked','bent'],rowan:['forked','bent'],willow:['forked','bent']};
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
for(const [species,designs] of Object.entries(variants)){
 const base='art_tree_'+species,groups=new Map();
 for(const p of saved.draft.items){if(p.assetId!==base||! /^(camp-outskirts-v1-|camp-river-v1-|world-plant-v1-)/.test(p.id)||p.frame||p.locked||p.collision||p.flipY)continue;
  const group=p.id.replace(/-tree-\d+$/,'');if(!groups.has(group))groups.set(group,[]);groups.get(group).push(p);
 }
 let n=0;counts[species]=[0,0,0];
 for(const [,trees] of [...groups].sort((a,b)=>hash(a[0])-hash(b[0])))for(const p of trees.sort((a,b)=>hash(a.id)-hash(b.id))){const index=n++%3;counts[species][index]++;if(index)changes.push({original:p,assetId:base+'_'+designs[index-1]});}
}
fs.writeFileSync('src/tree-variant-placements.json',JSON.stringify({sourceRevision:saved.revision,changes},null,2)+'\n');console.log(JSON.stringify({changes:changes.length,counts}));

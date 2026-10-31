import {withImportedArt} from '../src/imported-art';
import type {ArtworkRecord} from '../src/artwork-model';
import type {CatalogueEntry} from '../src/catalogue-model';
import {entries as catalogue} from '../src/catalogue-model';
import {buildEntries,artEntries,systemEntries} from '../src/catalogue-model';
type Row={id:string;art:number|null;implemented:number|null;tested:number|null;updated_at:string};
const fields=['art','implemented','tested'] as const;
const tools=[
 {name:'read_base_checklist',description:'Read the Humans Remain home-base production checklist and current saved checkmarks. Search build, art or system views and filter by category, phase and status.',inputSchema:{type:'object',properties:{query:{type:'string'},view:{type:'string',enum:['build','art','system']},category:{type:'string'},phase:{type:'string',enum:['B0','B1','B2','B3','B4','B5']},recordType:{type:'string'},group:{type:'string',enum:['Core buildings','Core systems','Supporting props','Later upgrades','Expansion']},status:{type:'string',enum:['all','needs_art','needs_implementation','needs_testing','complete']},offset:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:50}},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
 {name:'get_base_asset',description:'Read full production details for one checklist ID, including upgrade appearance, required states, dependencies, footprints, artwork reference and saved marks.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}
];
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function handleMcp(request:Request,readRows:()=>Promise<Row[]>,readArt:()=>Promise<ArtworkRecord[]>=async()=>[]):Promise<Response>{
 if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
 let msg:any;
 try{const raw=await request.text();if(raw.length>16384)return reply({error:'Request too large'},413);msg=JSON.parse(raw)}catch{return reply({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400)}
 if(!msg||Array.isArray(msg)||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return reply({jsonrpc:'2.0',id:msg?.id??null,error:{code:-32600,message:'Invalid request'}},400);
 const result=(value:unknown)=>reply({jsonrpc:'2.0',id:msg.id??null,result:value});
 const fail=(code:number,message:string)=>reply({jsonrpc:'2.0',id:msg.id??null,error:{code,message}});
 if(msg.method==='initialize')return result({protocolVersion:['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(msg.params?.protocolVersion)?msg.params.protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'Humans Remain base planner',version:'1.0.0'},instructions:'Read-only access to the home-base catalogue. Saved checkmarks are planning marks; artwork references do not prove completed gameplay. Paginate read_base_checklist and use get_base_asset for details.'});
 if(msg.method.startsWith('notifications/'))return new Response(null,{status:204});
 if(msg.method==='ping')return result({});
 if(msg.method==='tools/list')return result({tools});
 if(msg.method!=='tools/call')return fail(-32601,'Method not found');
 // Identity is supplied and verified by Sites, never by a query/body parameter.
 // The Site remains owner-private; discovery above contains no checklist data.
 if(!request.headers.get('oai-authenticated-user-id'))return reply({jsonrpc:'2.0',id:msg.id??null,error:{code:-32001,message:'Connect to the private Humans Remain Site to read the checklist.'}},401);
 const name=msg.params?.name,args=msg.params?.arguments??{};
 if(!tools.some(t=>t.name===name))return fail(-32602,'Unknown tool');
 if(!args||typeof args!=='object'||Array.isArray(args))return fail(-32602,'Invalid arguments');
 if(name==='get_base_asset'&&(typeof args.id!=='string'||Object.keys(args).some(k=>k!=='id')))return fail(-32602,'An asset ID is required');
 if(name==='read_base_checklist'){
  if(Object.keys(args).some(k=>!['query','view','category','phase','recordType','group','status','offset','limit'].includes(k))||
   args.query!==undefined&&typeof args.query!=='string'||
   args.view!==undefined&&!['build','art','system'].includes(args.view)||
   args.category!==undefined&&typeof args.category!=='string'||
   args.phase!==undefined&&!['B0','B1','B2','B3','B4','B5'].includes(args.phase)||
   args.recordType!==undefined&&typeof args.recordType!=='string'||
   args.group!==undefined&&!['Core buildings','Core systems','Supporting props','Later upgrades','Expansion'].includes(args.group)||
   args.status!==undefined&&!['all','needs_art','needs_implementation','needs_testing','complete'].includes(args.status)||
   args.offset!==undefined&&(!Number.isInteger(args.offset)||args.offset<0)||
   args.limit!==undefined&&(!Number.isInteger(args.limit)||args.limit<1||args.limit>50))return fail(-32602,'Invalid filters or pagination');
 }
 try{
  const rows=new Map((await readRows()).map(row=>[row.id,row]));
  const imported=new Map((await readArt()).map(r=>[r.id,r]));
  const merged=catalogue.map(original=>{const item=withImportedArt(original as unknown as CatalogueEntry,imported.get(original.id));const saved=rows.get(item.id);const marks={art:item.art,implemented:item.implemented,tested:item.tested};for(const field of fields)if(saved?.[field]!=null)marks[field]=!!saved[field];return{...item,marks,marksUpdatedAt:saved?.updated_at??null}});
  let output:unknown;
  if(name==='get_base_asset'){const item=merged.find(x=>x.id===args.id);if(!item)return result({isError:true,content:[{type:'text',text:'Checklist ID not found.'}]});output={...item,image:item.image?new URL(item.image,request.url).href:null,notice:'Image may be a reuse reference. Check evidence and marks separately; pictures alone do not confirm implementation.'};}
  else{
   const q=(args.query??'').toLowerCase(),status=args.status??'all',offset=args.offset??0,limit=args.limit??30;
   const allowed=new Set(args.view==='build'?buildEntries.map(x=>x.id):args.view==='art'?artEntries.map(x=>x.id):args.view==='system'?systemEntries.map(x=>x.id):merged.map(x=>x.id));
   const filtered=merged.filter(i=>allowed.has(i.id)&&(!args.group||i.group===args.group)&&(!args.category||i.category===args.category)&&(!args.phase||i.phase===args.phase)&&(!args.recordType||i.recordType===args.recordType)&&(!q||[i.id,i.name,i.family,i.purpose].join(' ').toLowerCase().includes(q))&&(status==='all'||status==='needs_art'&&i.art!==null&&!i.marks.art||status==='needs_implementation'&&!i.marks.implemented||status==='needs_testing'&&i.marks.implemented&&!i.marks.tested||status==='complete'&&(i.art===null||i.marks.art)&&i.marks.implemented&&i.marks.tested));
   output={total:merged.length,matching:filtered.length,offset,nextOffset:offset+limit<filtered.length?offset+limit:null,notice:'Marks combine catalogue defaults and saved user checkmarks. Phases are intended work, not a guarantee of implemented game features.',entries:filtered.slice(offset,offset+limit).map(i=>({id:i.id,name:i.name,family:i.family,category:i.category,recordType:i.recordType,phase:i.phase,tier:i.tier??null,purpose:i.purpose,improvement:i.improvement,blockers:i.blockers,marks:i.marks,presentInPrototype:i.presentInPrototype,hasImage:!!i.image,evidence:i.evidence??null}))};
  }
  return result({content:[{type:'text',text:JSON.stringify(output)}]});
 }catch(error){console.error('Checklist MCP read failed',error);return result({isError:true,content:[{type:'text',text:'Checklist storage is unavailable. No current saved checkmarks could be read; please retry later.'}]});}
}

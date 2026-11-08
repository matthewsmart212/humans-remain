import assert from 'node:assert/strict';
import {build} from 'esbuild';

const code=await build({entryPoints:['server/coop.ts'],bundle:true,platform:'neutral',format:'esm',target:'es2022',write:false});
const NativeResponse=globalThis.Response;
function CloudflareResponse(body,init){
 if(init?.status===101)return {status:101,webSocket:init.webSocket};
 return new NativeResponse(body,init);
}
CloudflareResponse.json=NativeResponse.json.bind(NativeResponse);
globalThis.Response=CloudflareResponse;

const pairs=[];
class FakeSocket {
 constructor(){this.readyState=1;this.sent=[];this.attachment=undefined}
 send(text){this.sent.push(JSON.parse(text))}
 close(){this.readyState=3}
 serializeAttachment(v){this.attachment=v}
 deserializeAttachment(){return this.attachment}
}
globalThis.WebSocketPair=class {
 constructor(){const client=new FakeSocket(),server=new FakeSocket();pairs.push({client,server});this[0]=client;this[1]=server}
};
const mod=await import('data:text/javascript;base64,'+Buffer.from(code.outputFiles[0].text).toString('base64'));
const rooms=new Map();
const env={ROOMS:{
 idFromName:name=>name,
 get(name){
  if(!rooms.has(name)){
   const values=new Map(),sockets=[];
   const state={
    storage:{get:async key=>values.get(key),put:async(key,value)=>{values.set(key,value)}},
    acceptWebSocket:socket=>sockets.push(socket),
    getWebSockets:()=>sockets.filter(socket=>socket.readyState===1)
   };
   rooms.set(name,{values,state,room:new mod.CoopRoom(state)});
  }
  return {fetch:request=>rooms.get(name).room.fetch(request)};
 }
}};
const call=(path,options={})=>mod.default.fetch(new Request('https://coop.test'+path,options),env);
const initial=await call('/rooms',{method:'POST'});
assert.equal(initial.status,201);
const {code:roomCode}=await initial.json();
assert.match(roomCode,/^[A-HJ-NP-Z2-9]{8}$/);
const url='/rooms/'+roomCode+'/socket';
const connect=async(name,role)=>call(url+'?name='+encodeURIComponent(name)+'&role='+role,{headers:{Upgrade:'websocket'}});
const host=await connect('Hunter','hunter'),guest=await connect('Engineer','engineer');
assert.equal(host.status,101);
assert.equal(guest.status,101);
const room=rooms.get(roomCode).room;
const hostSocket=pairs[0].server,guestSocket=pairs[1].server;
assert.equal((await (await call('/rooms/'+roomCode)).json()).players,2);
assert.equal(guestSocket.sent.find(p=>p.type==='welcome').players.length,2);
assert.equal(hostSocket.sent.at(-1).players.length,2);
const pose={x:430,y:712,sceneId:'camp',direction:'down',moving:true,sprinting:false,walkDistance:95};
room.webSocketMessage(hostSocket,JSON.stringify({type:'pose',pose}));
const relay=guestSocket.sent.findLast(p=>p.type==='pose');
assert.equal(relay.peer.x,430);
assert.equal(relay.peer.role,'hunter');
const count=guestSocket.sent.filter(p=>p.type==='pose').length;
room.webSocketMessage(hostSocket,JSON.stringify({type:'pose',pose:{...pose,x:Infinity}}));
room.webSocketMessage(hostSocket,JSON.stringify({type:'pose',pose:{...pose,x:999999}}));
assert.equal(guestSocket.sent.filter(p=>p.type==='pose').length,count,'reject invalid positions');
room.webSocketMessage(guestSocket,JSON.stringify({type:'start'}));
assert.equal(hostSocket.sent.filter(p=>p.type==='start').length,0,'only host may start');
room.webSocketMessage(hostSocket,JSON.stringify({type:'start'}));
assert.equal(guestSocket.sent.filter(p=>p.type==='start').length,1);
for(let i=0;i<2;i++)assert.equal((await connect('Friend '+i,'survivor')).status,101);
assert.equal((await connect('Too many','medic')).status,409,'four player limit');
rooms.get(roomCode).room=new mod.CoopRoom(rooms.get(roomCode).state);
assert.equal((await (await call('/rooms/'+roomCode)).json()).players,4,'roster survives hibernation');
hostSocket.close();rooms.get(roomCode).room.webSocketClose(hostSocket);
assert.equal((await (await call('/rooms/'+roomCode)).json()).players,3);
rooms.get(roomCode).values.set('createdAt',Date.now()-25*60*60*1000);
assert.equal((await call('/rooms/'+roomCode)).status,404,'expired rooms cannot be joined');
assert.equal((await call('/rooms/INVALID')).status,404);
console.log('Co-op room contract: create/join, 4 player cap, validated relays, host start, expiry and hibernation passed.');

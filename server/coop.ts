import {COOP_MAX_PLAYERS,COOP_PROTOCOL_VERSION,COOP_ROOM_CODE,COOP_ROLES,validCoopPose,type CoopPeer,type CoopPose,type CoopClientPacket,type CoopServerPacket} from '../src/coop-protocol';

type SocketData={id:string;name:string;role:CoopPeer['role'];joinedAt:number;pose:CoopPose;lastPoseAt:number};
type RoomState={
 storage:{get<T>(key:string):Promise<T|undefined>;put(key:string,value:unknown):Promise<void>};
 acceptWebSocket(socket:WebSocket):void;
 getWebSockets():WebSocket[];
};
type RoomStub={fetch(request:Request):Promise<Response>};
type RoomNamespace={idFromName(name:string):unknown;get(id:unknown):RoomStub};
type Env={ROOMS:RoomNamespace};
declare const WebSocketPair:{new():{0:WebSocket;1:WebSocket}};
const headers={'Cache-Control':'no-store'};
const response=(data:unknown,status=200)=>Response.json(data,{status,headers});
const defaultPose:CoopPose={x:0,y:0,direction:'down',moving:false,sprinting:false,walkDistance:0,sceneId:'camp'};
const safeName=(name:string)=>name.trim().replace(/[<>\\]/g,'').slice(0,20)||'Survivor';
const socketData=(socket:WebSocket)=>socket.deserializeAttachment() as SocketData|undefined;

export class CoopRoom {
 constructor(private state:RoomState){}
 private peers():CoopPeer[]{
  return this.state.getWebSockets().map(socket=>{
   const s=socketData(socket);
   return s?{...s.pose,id:s.id,name:s.name,role:s.role,joinedAt:s.joinedAt}:null;
  }).filter((v):v is CoopPeer=>!!v).sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id));
 }
 private broadcast(packet:CoopServerPacket){
  const data=JSON.stringify(packet);
  for(const socket of this.state.getWebSockets())try{socket.send(data)}catch{}
 }
 private roster(){this.broadcast({type:'roster',players:this.peers()})}
 async fetch(request:Request):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==='/init'&&request.method==='POST'){
   if(await this.state.storage.get<number>('createdAt'))return response({error:'Room already exists'},409);
   await this.state.storage.put('createdAt',Date.now());
   return response({created:true});
  }
  const created=await this.state.storage.get<number>('createdAt');
  if(!created||Date.now()-created>24*60*60*1000)return response({error:'Room expired or not found'},404);
  if(url.pathname==='/status'&&request.method==='GET')return response({exists:true,players:this.peers().length});
  if(url.pathname!=='/socket'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return response({error:'Not found'},404);
  if(this.state.getWebSockets().length>=COOP_MAX_PLAYERS)return response({error:'Room is full'},409);
  const role=url.searchParams.get('role'),name=url.searchParams.get('name')||'Survivor';
  if(!COOP_ROLES.includes(role as CoopPeer['role'])||name.length>60)return response({error:'Invalid survivor'},400);
  const [client,server]=Object.values(new WebSocketPair());
  const joinedAt=Date.now(),id=crypto.randomUUID();
  const spawn=this.peers().at(0);
  this.state.acceptWebSocket(server);
  server.serializeAttachment({id,name:safeName(name),role,joinedAt,pose:spawn?{...defaultPose,x:spawn.x+30,y:spawn.y+20,sceneId:spawn.sceneId}:defaultPose,lastPoseAt:0} satisfies SocketData);
  server.send(JSON.stringify({type:'welcome',id,room:url.searchParams.get('room')||'',players:this.peers(),version:COOP_PROTOCOL_VERSION} satisfies CoopServerPacket));
  this.roster();
  return new Response(null,{status:101,webSocket:client} as ResponseInit);
 }
 webSocketMessage(socket:WebSocket,data:string|ArrayBuffer){
  if(typeof data!=='string'||data.length>640){socket.close(1009,'Message too large');return}
  let packet:CoopClientPacket;
  try{packet=JSON.parse(data) as CoopClientPacket}catch{return}
  const owner=socketData(socket);if(!owner)return;
  if(packet?.type==='ping'){
   if(Number.isFinite(packet.nonce))socket.send(JSON.stringify({type:'pong',nonce:packet.nonce} satisfies CoopServerPacket));
   return;
  }
  if(packet?.type==='start'){
   const first=this.peers()[0];
   if(first?.id===owner.id)this.broadcast({type:'start'});
   return;
  }
  if(packet?.type!=='pose'||!validCoopPose(packet.pose))return;
  const now=Date.now();
  if(now-owner.lastPoseAt<70)return; // cap per-connection messages near 14Hz
  owner.lastPoseAt=now;owner.pose=packet.pose;
  socket.serializeAttachment(owner); // survives hibernation without an in-memory loop
  this.broadcast({type:'pose',peer:{...owner.pose,id:owner.id,name:owner.name,role:owner.role,joinedAt:owner.joinedAt}});
 }
 webSocketClose(){this.roster()}
 webSocketError(){this.roster()}
}

const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode(){
 const random=crypto.getRandomValues(new Uint8Array(8));
 return Array.from(random,b=>alphabet[b%alphabet.length]).join('');
}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/health')return response({service:'humans-remain-coop',protocol:COOP_PROTOCOL_VERSION});
  if(request.method==='POST'&&url.pathname==='/rooms'){
   for(let i=0;i<5;i++){
    const code=roomCode(),room=env.ROOMS.get(env.ROOMS.idFromName(code));
    const created=await room.fetch(new Request('https://coop.internal/init',{method:'POST'}));
    if(created.status===200)return response({code,expiresInSeconds:86400},201);
   }
   return response({error:'Could not allocate a room'},503);
  }
  const match=/^\\/rooms\\/([A-HJ-NP-Z2-9]{8})(?:\\/(socket))?$/.exec(url.pathname);
  if(!match||!COOP_ROOM_CODE.test(match[1]))return response({error:'Not found'},404);
  const room=env.ROOMS.get(env.ROOMS.idFromName(match[1]));
  if(match[2]==='socket'){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return response({error:'Expected WebSocket'},426);
   const target=new URL('https://coop.internal/socket');
   target.searchParams.set('room',match[1]);target.searchParams.set('name',url.searchParams.get('name')||'Survivor');
   target.searchParams.set('role',url.searchParams.get('role')||'survivor');
   return room.fetch(new Request(target,request));
  }
  return request.method==='GET'?room.fetch(new Request('https://coop.internal/status')):response({error:'Method not allowed'},405);
 }
};

import {COOP_PROTOCOL_VERSION,COOP_ROOM_CODE,validCoopPose,type CoopPeer,type CoopPose,type CoopServerPacket} from '../src/coop-protocol';
import type {World} from '../src/survival-engine';
import type {SurvivorRoleId} from '../src/survivor-roles';

// The multiplayer branch defaults to its deployed co-op Worker. Developers can
// override with EXPO_PUBLIC_COOP_URL when testing staging or a local endpoint.
declare const process:{env:Partial<Record<'EXPO_PUBLIC_COOP_URL',string>>};
export const COOP_API=(process.env.EXPO_PUBLIC_COOP_URL||'https://humans-remain-coop.matthew-smart212.workers.dev').trim().replace(/\/$/,'');
export type CoopStatus='connecting'|'connected'|'reconnecting'|'offline'|'failed';
const reason=(value:unknown)=>value instanceof Error?value.message:String(value);
export async function createCoopRoom():Promise<string>{
 if(!COOP_API.startsWith('https://'))throw Error('Co-op server is not configured for this iOS build.');
 const response=await fetch(COOP_API+'/rooms',{method:'POST',headers:{'Content-Type':'application/json'}});
 if(!response.ok)throw Error('Could not create the expedition ('+response.status+').');
 const data=await response.json() as {code?:string};
 if(!data.code||!COOP_ROOM_CODE.test(data.code))throw Error('Invalid lobby response.');
 return data.code;
}
type Snapshot={from:CoopPose;to:CoopPose;receivedAt:number};
export class CoopClient {
 readonly code:string;
 status:CoopStatus='offline';
 error='';
 id='';
 pingMs:number|undefined;
 private peers=new Map<string,CoopPeer>();
 private snapshots=new Map<string,Snapshot>();
 private listeners=new Set<(event:'update'|'start')=>void>();
 private ws:WebSocket|undefined;
 private reconnectTimer:ReturnType<typeof setTimeout>|undefined;
 private disposed=false;
 private foreground=true;
 private tries=0;
 private lastPoseAt=0;
 private lastPingAt=0;
 constructor(code:string,readonly name:string,readonly role:SurvivorRoleId,private api=COOP_API){
  if(!COOP_ROOM_CODE.test(code))throw Error('Room code must contain eight letters or numbers.');
  this.code=code;
 }
 get players(){return [...this.peers.values()].sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id))}
 get isHost(){return !!this.id&&this.players[0]?.id===this.id}
 subscribe(listener:(event:'update'|'start')=>void){this.listeners.add(listener);listener('update');return()=>{this.listeners.delete(listener)}}
 private emit(event:'update'|'start'='update'){for(const fn of this.listeners)fn(event)}
 connect(){
  if(this.disposed||!this.foreground||this.ws||!this.api.startsWith('https://'))return;
  this.status=this.tries?'reconnecting':'connecting';this.error='';this.emit();
  const url=this.api.replace(/^https:/,'wss:')+'/rooms/'+this.code+'/socket?name='+encodeURIComponent(this.name)+'&role='+encodeURIComponent(this.role);
  const ws=new WebSocket(url);this.ws=ws;
  ws.onmessage=(event)=>{
   if(this.ws!==ws||typeof event.data!=='string'||event.data.length>8192)return;
   let packet:CoopServerPacket;
   try{packet=JSON.parse(event.data) as CoopServerPacket}catch{return}
   if(packet.type==='welcome'){
    if(packet.version!==COOP_PROTOCOL_VERSION){this.error='Incompatible co-op game version';this.status='failed';this.emit();ws.close(1000);return}
    this.id=packet.id;this.peers=new Map(packet.players.map(peer=>[peer.id,peer]));this.snapshots.clear();
    this.tries=0;this.status='connected';this.emit();
   }else if(packet.type==='roster'){
    this.peers=new Map(packet.players.map(peer=>[peer.id,peer]));
    for(const id of this.snapshots.keys())if(!this.peers.has(id))this.snapshots.delete(id);
    this.emit();
   }else if(packet.type==='pose'){
    const peer=packet.peer;if(!validCoopPose(peer))return;
    const previous=this.peers.get(peer.id);
    this.peers.set(peer.id,peer);
    const now=Date.now();
    const from=this.snapshots.get(peer.id)?.to||previous||peer;
    this.snapshots.set(peer.id,{from:from.sceneId===peer.sceneId?from:peer,to:peer,receivedAt:now});
    // No React re-render for 10 Hz position packets. The Skia frame loop samples them.
   }else if(packet.type==='pong'){
    if(Number.isFinite(packet.nonce))this.pingMs=Math.max(0,Date.now()-packet.nonce);
   }else if(packet.type==='start'){this.emit('start')}
   else if(packet.type==='error'){this.error=packet.message;this.emit()}
  };
  ws.onerror=()=>{if(this.ws===ws){this.error='Connection interrupted';this.emit()}};
  ws.onclose=(e)=>{
   if(this.ws!==ws)return;this.ws=undefined;this.id='';this.peers.clear();this.snapshots.clear();
   if(this.disposed||!this.foreground){this.status='offline';this.emit();return}
   if(e.code===1008||e.code===1009||e.code===1013||this.status==='failed'){
    this.status='failed';this.error=e.reason||this.error||'Unable to join the room';this.emit();return;
   }
   this.status='reconnecting';this.emit();
   this.tries++;
   this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=undefined;this.connect()},Math.min(10000,750*2**Math.min(this.tries,4)));
  };
 }
 setForeground(active:boolean){
  if(this.foreground===active)return;this.foreground=active;
  if(!active){
   if(this.reconnectTimer)clearTimeout(this.reconnectTimer);this.reconnectTimer=undefined;
   const socket=this.ws;this.ws=undefined;socket?.close(1000,'iOS background');
   this.id='';this.status='offline';this.peers.clear();this.snapshots.clear();this.emit();
  }else{this.tries=0;this.connect()}
 }
 start(){if(this.isHost&&this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({type:'start'}))}
 sendPose(world:World,now=Date.now()){
  if(this.ws?.readyState!==WebSocket.OPEN||this.status!=='connected'||now-this.lastPoseAt<100)return;
  this.lastPoseAt=now;
  const p=world.player;
  const pose:CoopPose={x:p.x,y:p.y,direction:p.direction,moving:p.moving,sprinting:p.sprinting,walkDistance:p.walkDistance,sceneId:world.scene?.id||'camp'};
  this.ws.send(JSON.stringify({type:'pose',pose}));
  if(now-this.lastPingAt>5000){this.lastPingAt=now;this.ws.send(JSON.stringify({type:'ping',nonce:now}))}
 }
 remotePoses(now=Date.now()):CoopPeer[]{
  const result:CoopPeer[]=[];
  for(const peer of this.players){
   if(peer.id===this.id)continue;
   const s=this.snapshots.get(peer.id);
   if(!s){result.push(peer);continue}
   // Smooth each incoming 10 Hz sample over the next 100 ms without advancing early.
   const alpha=Math.max(0,Math.min(1,(now-s.receivedAt)/100));
   result.push({...peer,x:s.from.x+(s.to.x-s.from.x)*alpha,y:s.from.y+(s.to.y-s.from.y)*alpha,walkDistance:s.from.walkDistance+(s.to.walkDistance-s.from.walkDistance)*alpha});
  }
  return result;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  if(this.reconnectTimer)clearTimeout(this.reconnectTimer);
  const socket=this.ws;this.ws=undefined;socket?.close(1000,'Left expedition');
  this.listeners.clear();this.peers.clear();this.snapshots.clear();
 }
}

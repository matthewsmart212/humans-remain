/** Device-local identity/preferences, independent of the survival save. */
export const START_PROFILE_KEY='humans-remain-survivor-profile-v1';
export type StartProfile={name:string;motion:boolean;muted:boolean};
export const DEFAULT_START_PROFILE:StartProfile={name:'Survivor',motion:true,muted:false};
export function readStartProfile(text:string|null):StartProfile{
 try{const p=JSON.parse(text||'null');return {name:typeof p?.name==='string'&&p.name.trim()?p.name.trim().slice(0,20):'Survivor',motion:typeof p?.motion==='boolean'?p.motion:true,muted:typeof p?.muted==='boolean'?p.muted:false}}catch{return {...DEFAULT_START_PROFILE}}
}

import type {FishingHud} from './fishing-types';

export const FISHING_HUD_WIDTH=184;
export const FISHING_CATCH_WIDTH=200;

/** Short visible guidance, with the complete instruction available to assistive
 * technology. This only presents the existing state; it never drives fishing. */
export function fishingCompactCopy(hud:FishingHud,inputMode:'touch'|'keyboard'='touch'){
 const touch=inputMode==='touch',aiming=hud.phase==='aiming';
 const fullDetail=aiming?(touch?'Drag on the left to move the landing marker.':'Use WASD to move the landing marker.'):
  hud.phase==='ready'&&!hud.disabled?(touch?'Hold CAST, then drag on the left to aim.':'Hold Space, then use WASD to aim.'):hud.detail;
 let command=hud.command,detail:string|undefined;
 switch(hud.phase){
  case 'ready':
   if(hud.bait<1){command='GATHER BAIT';detail='Lakeshore reeds · tap BAIT'}
   else if(hud.disabled){command='FIND CLEAR WATER';detail='Pier edge or clear bank'}
   else{command=touch?'TAP TO CAST':'TAP SPACE TO CAST';detail=touch?'Hold CAST · drag on left':'Hold Space · WASD to aim'}
   break;
  case 'aiming':
   command=hud.castValid?'RELEASE TO CAST':'ADJUST AIM';
   detail=!hud.castValid?hud.castHint:hud.castHint.includes('Metal')?'Metal glint · heavy salvage':touch?'Drag on left to aim':'WASD moves landing marker';
   break;
  case 'casting':command='CASTING…';break;
  case 'waiting':command='WATCH THE FLOAT';detail='Tap RETRIEVE to stop';break;
  case 'nibble':command='NIBBLE · WAIT';detail='Wait for the float to sink';break;
  case 'bite':command='BITE! TAP HOOK';break;
  case 'reeling':{
   const easing=hud.tension>.78||hud.fightBehavior==='warning'||hud.fightBehavior==='surge';
   if(easing){
    command=!hud.holding?'WAIT · EASING':hud.assists.toggleReel?'TAP TO EASE':'RELEASE REEL';
    detail=hud.tension>.78?'Line too tight':hud.fightBehavior==='warning'?'Strong pull coming':'Strong pull';
   }else{
    command=hud.assists.toggleReel?(hud.holding?'REELING':'TAP TO REEL'):'HOLD TO REEL';
    detail=hud.assists.toggleReel&&hud.holding?'Tap to ease off':hud.fightBehavior==='tiring'?'Fish tiring · reel it in':hud.species==='drone'?'Heavy salvage':undefined;
   }
   break;
  }
  case 'landing':command=hud.species==='drone'?'LIFTING SALVAGE':'LANDING FISH…';break;
  case 'escaped':
   command='CATCH LOST';
   detail=hud.detail.startsWith('Line snapped')?'Line snapped · ease off sooner':
    hud.detail.startsWith('Missed the bite')?'Missed bite · tap HOOK sooner':
    hud.detail.startsWith('Lost the snag')?'Lost snag · tap HOOK sooner':
    hud.detail.startsWith('Fish slipped')?'Fish escaped · reel between pulls':
    hud.detail.startsWith('The snag slipped')?'Snag lost · haul between pulls':hud.detail;
   break;
 }
 return{command,detail,accessibilityLabel:[command,fullDetail,aiming?hud.castHint:undefined].filter(Boolean).join('. ')};
}

export function fishingCompactReward(hud:FishingHud){
 // Use the actual reward label, including its legacy-save and invalid-catch
 // handling; only remove the species already named directly above it.
 const reward=(hud.rewardLabel??'').replace(/ raw (perch|carp|pike) /,' raw ');
 return`${reward} · ${(hud.rewardWeight??0).toFixed(2)} kg in bag`;
}

import {useStationFeedback} from './use-station-feedback';
import React from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {packLoad} from './expedition-inventory';
import {BAG_IMAGES} from './backpack';
import {LOOT_CHEST_ID,lootChestName,lootChestEmptyMessage,lootChestRewards,lootChestContents,lootChestRemaining,canCarryLootChestReward,takeLootChestReward,takeAllLootChestRewards,type LootChestRewardKind} from './loot-chest';
import {readPatchNote} from './patch-quest';
import './loot-chest-panel.css';
import './patch-panel.css';

type Props={world:World;onClose:()=>void;onChange:()=>void};

export default function LootChestPanel({world,onClose,onChange}:Props){
 const [message,setMessage]=useStationFeedback();
 const name=lootChestName(world.lootChestId);
 const hasNote=!!world.progression&&(world.lootChestId??LOOT_CHEST_ID)===LOOT_CHEST_ID;
 const contents=lootChestContents(world,world.lootChestId),remaining=lootChestRemaining(world,world.lootChestId),load=packLoad(world);
 const rewards=lootChestRewards(world.lootChestId).map(reward=>{
  const count=contents[reward.kind]??0;
  return {...reward,count,capacity:canCarryLootChestReward(world,reward.kind,count)};
 }).filter(reward=>reward.count>0);
 const take=(kind:LootChestRewardKind)=>{
  const gained=takeLootChestReward(world,kind);
  setMessage(gained?`Collected ${gained} ${gained===1?'item':'items'} into your backpack.`:'Not enough room in your backpack.');
  onChange();
 };
 const takeAll=()=>{
  const gained=takeAllLootChestRewards(world);
  setMessage(gained?`Collected ${gained} ${gained===1?'item':'items'}. ${lootChestRemaining(world,world.lootChestId)?'The rest stays here.':'Nothing left to collect.'}`:'No room in your backpack.');
  onChange();
 };
 const readNote=()=>{if(readPatchNote(world)){world.stationPanel='patch-note';onChange()}};
 const canTake=rewards.some(reward=>reward.capacity>0);
 return <StationMenu compact fitContent world={world} title={name} label={`${name} supplies`} onClose={onClose}
  weight={load.weight} loadLabel={load.label} message={message} className="rare-cache-menu">
  {(remaining&&!canTake||!remaining&&!hasNote)&&<p className="rare-cache-empty">{remaining?'Backpack full':lootChestEmptyMessage(world.lootChestId)}</p>}
  <div className="rare-cache-list" aria-label={`${name} contents`}>
   {rewards.map(({kind,name,description,count,capacity})=><div className="rare-cache-reward" key={kind}>
    <img src={BAG_IMAGES[kind==='pallets'?'logs':kind]} alt="" draggable={false}/>
    <div><strong>{name}</strong><small>{description}</small></div>
    {count>1&&<span className="rare-cache-quantity">×{count}</span>}
    <button type="button" disabled={!capacity} aria-label={`Take ${name}`} onClick={()=>take(kind)}>
     {canTake&&!capacity?'Pack full':'Take'}
    </button>
   </div>)}
   {hasNote&&<div className="rare-cache-reward">
    <span className="rare-cache-note-icon" aria-hidden="true"/>
    <div><strong>A folded note</strong><small>{world.patchQuest?.noteRead?'Signed P-04':'Left with the supplies'}</small></div>
    <button type="button" aria-label="Read the folded note" onClick={readNote}>Read</button>
   </div>}
  </div>
  {canTake&&rewards.length>1&&<button className="supply-primary rare-cache-collect-all" onClick={takeAll}>
   Take all that fits
  </button>}
 </StationMenu>;
}

import {useStationFeedback} from './use-station-feedback';
import React from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {packLoad,ITEM_RULES} from './expedition-inventory';
import {GEAR,isGear} from './player-gear';
import {lootChestName,lootChestRewards,lootChestContents,lootChestRemaining,canCarryLootChestReward,takeLootChestReward,takeAllLootChestRewards,type LootChestRewardKind} from './loot-chest';
import './loot-chest-panel.css';

type Props={world:World;onClose:()=>void;onChange:()=>void};

export default function LootChestPanel({world,onClose,onChange}:Props){
 const [message,setMessage]=useStationFeedback();
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
  setMessage(gained?`Collected ${gained} ${gained===1?'item':'items'}. ${lootChestRemaining(world,world.lootChestId)?'The rest stays in the chest.':'The chest is empty.'}`:'No room in your backpack.');
  onChange();
 };
 const canTake=rewards.some(reward=>reward.capacity>0);
 return <StationMenu compact fitContent world={world} title={lootChestName(world.lootChestId)} label="Open loot chest and its contents" onClose={onClose}
  weight={load.weight} loadLabel={load.label} message={message} className="rare-cache-menu">
  {(!remaining||!canTake)&&<p className="rare-cache-empty">{remaining?'Backpack full':'Chest empty'}</p>}
  <div className="rare-cache-list" aria-label="Loot chest contents">
   {rewards.map(({kind,name,description,count,capacity})=><div className="rare-cache-reward" key={kind}>
    <img src={isGear(kind)?GEAR[kind].image:ITEM_RULES[kind].image} alt="" draggable={false}/>
    <div><strong>{name}</strong><small>{description}</small></div>
    {count>1&&<span className="rare-cache-quantity">×{count}</span>}
    <button type="button" disabled={!capacity} aria-label={`Take ${name}`} onClick={()=>take(kind)}>
     {canTake&&!capacity?'Pack full':'Take'}
    </button>
   </div>)}
  </div>
  {canTake&&rewards.length>1&&<button className="supply-primary rare-cache-collect-all" onClick={takeAll}>
   Take all that fits
  </button>}
 </StationMenu>;
}

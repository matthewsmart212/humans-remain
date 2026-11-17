import React,{useState} from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {packLoad,canCarryCount} from './expedition-inventory';
import {BAG_IMAGES} from './backpack';
import {LOOT_CHEST_REWARDS,lootChestContents,lootChestRemaining,takeLootChestReward,takeAllLootChestRewards,type LootChestRewardKind} from './loot-chest';
import './loot-chest-panel.css';
type Props={world:World;onClose:()=>void;onChange:()=>void};
export default function LootChestPanel({world,onClose,onChange}:Props){
 const [message,setMessage]=useState('');
 const contents=lootChestContents(world),remaining=lootChestRemaining(world),load=packLoad(world);
 const take=(kind:LootChestRewardKind)=>{
  const gained=takeLootChestReward(world,kind);
  setMessage(gained?'Collected '+gained+' item'+(gained===1?'':'s')+' into your backpack.':'Not enough room in your backpack.');
  onChange();
 };
 const all=()=>{
  const gained=takeAllLootChestRewards(world);
  setMessage(gained?'Collected '+gained+' supplies. '+(lootChestRemaining(world)?'Anything left stays safely inside.':'The cache is empty.'):'No room in your backpack.');
  onChange();
 };
 return <StationMenu compact world={world} title="Loot chest" label="Open rare cache and its contents" subtitle="THE RECLAMATION · SEALED SUPPLIES" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} className="rare-cache-menu">
  <div className="rare-cache-hero">
   <div><small>DISCOVERY UNLOCKED</small><strong>{remaining?'A forgotten supply cache':'Cache emptied'}</strong><p>{remaining?'The supplies are still inside. Choose what to take.':'You collected everything in this cache.'}</p></div>
  </div>
  <div className="rare-cache-heading"><span>CONTENTS</span><span>{remaining} remaining</span></div>
  <div className="rare-cache-list" aria-label="Supplies stored inside the rare cache">
   {LOOT_CHEST_REWARDS.map(reward=>{
    const count=contents[reward.kind]??0,capacity=canCarryCount(world,reward.kind,count);
    return <div className="rare-cache-reward" key={reward.kind} data-empty={!count}>
     <img src={BAG_IMAGES[reward.artId]} alt="" draggable={false}/>
     <div className="rare-cache-reward-copy"><strong>{reward.name}</strong><small>{reward.description}</small></div>
     <span className="rare-cache-quantity">×{count}</span>
     <button type="button" disabled={!count||!capacity} onClick={()=>take(reward.kind)}>{count?'TAKE':'EMPTY'}</button>
    </div>;
   })}
  </div>
  <button className="rare-cache-collect-all" disabled={!remaining||!LOOT_CHEST_REWARDS.some(r=>(contents[r.kind]??0)>0&&canCarryCount(world,r.kind,contents[r.kind]??0)>0)} onClick={all}>Collect all that fits <span>→</span></button>
 </StationMenu>;
}

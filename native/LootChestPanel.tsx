import {patchLetterDescription} from '../src/patch-letter';
import {useStationFeedback} from '../src/use-station-feedback';
import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import StationMenu from './StationMenu';
import {ItemArt} from './InventoryUI';
import {StationButton} from './StationControls';
import {stationPalette as palette} from '../src/station-palette';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';
import {packLoad} from '../src/expedition-inventory';
import {LOOT_CHEST_ID,lootChestName,lootChestEmptyMessage,lootChestRewards, lootChestContents, lootChestRemaining, canCarryLootChestReward, takeLootChestReward, takeAllLootChestRewards} from '../src/loot-chest';
import {readPatchNote} from '../src/patch-quest';
import {PatchNoteIcon} from './PatchPanel';

type Props = {world: World; width: number; height: number; safe: MenuInsets; onClose: () => void; onChange: () => void};

export default function LootChestPanel({world, width, height, safe, onClose, onChange}: Props) {
 const [message, setMessage] = useStationFeedback();
 const name = lootChestName(world.lootChestId);
 const hasNote = !!world.progression&&(world.lootChestId??LOOT_CHEST_ID)===LOOT_CHEST_ID;
 const contents = lootChestContents(world,world.lootChestId);
 const remaining = lootChestRemaining(world,world.lootChestId);
 const load = packLoad(world);
 const rewards = lootChestRewards(world.lootChestId).map(reward => {
  const count = contents[reward.kind] ?? 0;
  return {...reward, count, capacity: canCarryLootChestReward(world, reward.kind, count)};
 }).filter(reward=>reward.count>0);
 const canTake = rewards.some(reward => reward.capacity > 0);
 const collect = (gained: number) => {
  setMessage(gained ? `Collected ${gained} ${gained === 1 ? 'item' : 'items'}.` : 'Backpack full. Make room before collecting.');
  onChange();
 };
 const readNote=()=>{if(readPatchNote(world)){world.stationPanel='patch-note';onChange()}};
 return <StationMenu compact fitContent world={world} title={name} label={`${name} supplies`} onClose={onClose} width={width} height={height} safe={safe} weight={load.weight} loadLabel={load.label} message={message}>
  {(remaining&&!canTake||!remaining&&!hasNote)&&<Text style={s.name}>{remaining?'Backpack full':lootChestEmptyMessage(world.lootChestId)}</Text>}
  <ScrollView style={s.list} contentContainerStyle={s.content} accessibilityLabel={`${name} contents`}>
   {hasNote&&<View style={[s.reward,s.letter]}>
    <PatchNoteIcon/>
    <View style={s.details}><Text style={s.name}>A folded note</Text><Text style={s.note}>{patchLetterDescription(world)}</Text></View>
    <StationButton label="Read" accessibilityLabel="Read the folded note" onPress={readNote}/>
   </View>}
   {rewards.map(({kind, name, description, count, capacity}) => <View key={kind} style={s.reward}>
    <ItemArt id={kind==='pallets'?'logs':kind} size={38}/>
    <View style={s.details}><Text style={s.name}>{name}</Text><Text style={s.note}>{description}</Text></View>
    {count>1&&<Text style={s.amount}>×{count}</Text>}
    <StationButton label={canTake && !capacity ? 'Pack full' : 'Take'} accessibilityLabel={`Take ${name}`} disabled={!capacity} onPress={() => collect(takeLootChestReward(world, kind))} />
   </View>)}
  </ScrollView>
  {canTake&&rewards.length>1&&<StationButton primary label="Take all that fits" accessibilityLabel="Collect all rewards that fit in backpack" onPress={() => collect(takeAllLootChestRewards(world))} />}
 </StationMenu>;
}
const s = StyleSheet.create({
 list: {flexGrow: 0, flexShrink: 1, flexBasis: 'auto', minHeight: 0}, content: {gap: 6, paddingBottom: 4},
 reward: {flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, backgroundColor: palette.surface, borderRadius: 6},
 letter: {backgroundColor:'#34392b',borderLeftWidth:2,borderLeftColor:'#bca06b'},
 details: {flex: 1, minWidth: 0}, name: {fontSize: 15, fontWeight: '700', color: palette.text},
 note: {fontSize: 12, lineHeight: 16, color: palette.muted}, amount: {fontSize: 15, fontWeight: '600', color: palette.text},
});

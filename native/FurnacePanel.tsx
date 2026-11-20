import {useStationFeedback} from '../src/use-station-feedback';
import React, {useState} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {furnaceView} from '../src/furnace-view';
import {FURNACE_LOG_SECONDS, FURNACE_RULES, type SmeltRecipe} from '../src/ironworks-data';
import {furnaceBatchSelection, queueFurnaceBatches, smeltMaterialName, smeltCostLabel, furnaceCollectCount, furnaceFuelTime, furnaceJobLabel} from '../src/furnace-menu';
import {stationPalette as palette} from '../src/station-palette';
import {ItemArt} from './FieldItemArt';
import StationMenu from './StationMenu';
import {SectionHeading, RecipeRow, StationDetails, StationButton} from './StationControls';
import {IRONWORKS_NATIVE_ART as art} from './ironworks-art';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';

type Props = {world: World; width: number; height: number; onClose: () => void; onChange: () => void; safe: MenuInsets};

export default function FurnacePanel({world, width, height, onClose, onChange, safe}: Props) {
 const [message, setMessage] = useStationFeedback();
 const [details, setDetails] = useState<SmeltRecipe | 'upgrade' | null>(null);
 const [picking, setPicking] = useState<SmeltRecipe | null>(null);
 const v = furnaceView(world);
 if (!v) return null;
 const recipe = v.recipes.find(r => r.id === details);
 const collectCount = furnaceCollectCount(world, v);
 const upgrade = FURNACE_RULES[2];
 const closeDetails = () => setDetails(null);
 const back = details ? closeDetails : picking ? () => setPicking(null) : onClose;
 const act = (run: () => boolean | number, success: string) => {
  setMessage(run() ? success : 'Supplies or backpack space changed.');
  onChange();
 };
 const smelt = (id: SmeltRecipe, amount: number) => {
  const count = queueFurnaceBatches(world, id, amount);
  setMessage(count ? `${count} ${count === 1 ? 'ingot' : 'ingots'} queued.${v.fuel ? '' : ' Add wood to start.'}` : 'Supplies or queue space changed.');
  setPicking(null); onChange();
 };
 const fuel = <View style={s.row}>
  <ItemArt id="logs" size={24} /><Text style={s.growText}>{v.fuel ? `Heat · ${furnaceFuelTime(v.fuel)}` : 'Furnace cold'}</Text>
  <StationButton label={!v.logs ? 'Need wood' : !v.canFuel ? 'Fuel full' : 'Add wood'} accessibilityLabel={`Add wood. ${v.logs} logs available. ${v.heatLabel}`}
   disabled={!v.canFuel} onPress={() => act(v.feed, `Added ${FURNACE_LOG_SECONDS}s of heat.`)} />
 </View>;
 const needsHeat = v.jobs.length > 0 && !v.fuel;
 return <StationMenu compact fitContent={!details} world={world} title="Camp furnace" image={art.campFurnace} closeLabel="Leave furnace"
  onClose={onClose} onBack={back} message={message} width={width} height={height} safe={safe}
  footerAction={!v.upgrade.complete ? <StationButton label="Bellows upgrade" onPress={() => {setPicking(null); setDetails('upgrade');}}/> : undefined}>
  <ScrollView nestedScrollEnabled style={s.scroll} contentContainerStyle={s.body} accessibilityElementsHidden={!!details} importantForAccessibility={details ? 'no-hide-descendants' : 'auto'}>
   {v.ready > 0 && <View style={s.row}><ItemArt id="ironIngot" size={30} /><Text style={s.growText}>{v.ready} {v.ready === 1 ? 'ingot' : 'ingots'} ready</Text>
    <StationButton primary label={collectCount ? 'Collect' : 'Backpack full'} accessibilityLabel={`Collect ${collectCount} ready ingots`}
     disabled={!v.canTake} onPress={() => act(v.collect, 'Ingots added to backpack.')} />
   </View>}
   {needsHeat && fuel}
   {v.recipes.map(r => {
    const {limit, blocked} = furnaceBatchSelection(v, r.id, 1);
    return <RecipeRow key={r.id} name={smeltMaterialName(r.id)} image={r.id === 'ore' ? 'ironOre' : 'scrap'} detail={`${smeltCostLabel(r.id)} · ${r.available} held`}
     verb="Smelt" limit={limit} blocked={blocked} picking={picking === r.id}
     onPicker={() => setPicking(picking === r.id ? null : r.id)} onPickerClose={() => setPicking(null)}
     onDetails={() => {setPicking(null); setDetails(r.id);}} onSubmit={n => smelt(r.id, n)} />;
   })}
   {!needsHeat && fuel}
   {v.jobs.length > 0 && <>
    <SectionHeading title="Smelting" info={`${v.queueSize} / ${v.queueMax}`}/>
    {v.jobs.map(j => <View key={j.id} style={s.row}>
     <ItemArt id={j.name.includes('ore') ? 'ironOre' : 'scrap'} size={26}/>
     <View style={s.grow}><Text style={s.bodyText}>{j.name}</Text><Text style={s.note}>{furnaceJobLabel(j.label)}</Text></View>
     <StationButton label="Cancel" accessibilityLabel={`Cancel ${j.name}. Return materials to camp stores.`} disabled={!j.canCancel} onPress={() => act(j.cancel, 'Materials returned to camp stores.')} />
    </View>)}
   </>}
  </ScrollView>
  {recipe && <StationDetails title={smeltMaterialName(recipe.id)} onClose={closeDetails}>
   <View style={s.row}><ItemArt id="ironIngot" size={36}/><Text style={s.growText}>{smeltCostLabel(recipe.id)} · {Math.ceil(recipe.seconds)}s</Text></View>
   <Text style={s.note}>Materials from backpack + camp</Text>
  </StationDetails>}
  {details === 'upgrade' && <StationDetails title="Bellows upgrade" onClose={closeDetails}>
   <Text style={s.bodyText}>Faster smelting · {upgrade.queue} queue slots · {upgrade.rack} output slots · {upgrade.fuel}s fuel</Text>
   {v.upgrade.ingredients.map(m => <View key={m.id} style={s.row}>
    <ItemArt id={m.id === 'pallets' ? 'logs' : m.id as 'stone' | 'ironIngot'} size={24}/><Text style={s.growText}>{m.name}</Text>
    <Text style={m.enough ? s.note : s.warning}>{m.enough ? `${m.available} / ${m.needed}` : `Need ${m.needed - m.available} more`}</Text>
   </View>)}
   <StationButton primary disabled={!v.upgrade.canUpgrade} label="Upgrade bellows" onPress={() => {
    if (v.upgrade.run()) {closeDetails(); setMessage('Bellows reinforced.');} else setMessage('Supplies changed.');
    onChange();
   }} />
  </StationDetails>}
 </StationMenu>;
}
const s = StyleSheet.create({
 scroll: {minHeight: 0, flexShrink: 1, flexGrow: 0}, body: {gap: 6, padding: 1},
 row: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2}, grow: {flex: 1},
 growText: {flex: 1, fontSize: 15, color: palette.text}, bodyText: {fontSize: 15, color: palette.text},
 note: {fontSize: 12, color: palette.muted}, warning: {fontSize: 12, color: palette.danger},
});

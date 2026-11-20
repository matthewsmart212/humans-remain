import React, {useState} from 'react';
import {View, Text, Pressable, ScrollView, StyleSheet} from 'react-native';
import {furnaceView} from '../src/furnace-view';
import {FURNACE_LOG_SECONDS, FURNACE_RULES, type SmeltRecipe} from '../src/ironworks-data';
import {furnaceBatchSelection, queueFurnaceBatches, smeltMaterialName, smeltCostLabel, furnaceCollectCount, furnaceFuelTime, furnaceJobLabel} from '../src/furnace-menu';
import {stationPalette as palette} from '../src/station-palette';
import {ItemArt} from './InventoryUI';
import StationMenu, {stationMenuLayout} from './StationMenu';
import {SectionHeading, FuelMeter, QuantityControl, StationButton} from './StationControls';
import {IRONWORKS_NATIVE_ART as art} from './ironworks-art';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';

type Props = {world: World; width: number; height: number; onClose: () => void; onChange: () => void; safe: MenuInsets};

export default function FurnacePanel({world, width, height, onClose, onChange, safe}: Props) {
 const [message, setMessage] = useState('');
 const [selected, setSelected] = useState<SmeltRecipe>('ore');
 const [quantity, setQuantity] = useState(1);
 const [more, setMore] = useState<'recipe' | 'upgrade' | null>(null);
 const v = furnaceView(world);
 if (!v) return null;

 const {recipe, input, limit, amount, blocked} = furnaceBatchSelection(v, selected, quantity);
 const material = smeltMaterialName(recipe.id);
 const wide = stationMenuLayout(width, height, safe).panel.width >= 470;
 const collectCount = furnaceCollectCount(world, v);
 const upgrade = FURNACE_RULES[2];
 const back = more ? () => setMore(null) : onClose;
 const act = (run: () => boolean | number, success: string) => {
  setMessage(run() ? success : 'Supplies or backpack space changed.');
  onChange();
 };
 const queue = () => {
  const count = queueFurnaceBatches(world, recipe.id, amount);
  setMessage(count ? `Queued ${count} ${count === 1 ? 'ingot' : 'ingots'}.${v.fuel ? '' : ' Add wood to start.'}` : 'Supplies or queue space changed.');
  setQuantity(1);
  onChange();
 };

 return <StationMenu compact world={world} title="Camp furnace" image={art.campFurnace} closeLabel="Leave furnace"
  onClose={onClose} onBack={back} weight={v.weight} loadLabel={v.loadLabel} message={message} width={width} height={height} safe={safe}
  footerAction={<Pressable accessibilityRole="button" accessibilityLabel="Bellows upgrade" accessibilityState={{expanded: more === 'upgrade'}} onPress={() => setMore('upgrade')} style={s.link}><Text style={s.linkText}>{v.upgrade.complete ? 'Reinforced bellows' : 'Bellows upgrade'}</Text></Pressable>}>
  <ScrollView nestedScrollEnabled style={s.scroll} contentContainerStyle={s.body} accessibilityElementsHidden={!!more} importantForAccessibility={more ? 'no-hide-descendants' : 'auto'}>
   <View style={[s.utilities, wide && s.row]}>
    <View style={[s.utility, wide && s.utilityWide]}>
     <ItemArt id="logs" size={28} />
     <View style={s.details}><Text style={s.title}>{v.fuel ? `Fuel · ${furnaceFuelTime(v.fuel)}` : 'Furnace cold'}</Text><FuelMeter amount={v.fuel} max={v.fuelMax} label="Furnace heat" /></View>
     <StationButton label={v.fuel > v.fuelMax - FURNACE_LOG_SECONDS ? 'Fuel full' : v.logs ? `Add wood (${v.logs})` : 'Need wood'} accessibilityLabel={`Add wood. ${v.logs} logs available. ${v.heatLabel}`} disabled={!v.canFuel} onPress={() => act(v.feed, `Added one log · +${FURNACE_LOG_SECONDS}s heat.`)} />
    </View>
    <View style={[s.utility, wide && s.utilityWide]}>
     <ItemArt id="ironIngot" size={28} />
     <View style={s.details}><Text style={s.title}>{v.ready} ready</Text><Text style={s.meta}>{v.ready && !v.canTake ? 'Backpack full' : v.ready >= v.rackMax ? 'Output full' : 'Iron ingots'}</Text></View>
     <StationButton label={collectCount ? `Collect ×${collectCount}` : 'Collect'} disabled={!v.canTake} onPress={() => act(v.collect, 'Ingots added to backpack.')} />
    </View>
   </View>
   <SectionHeading title="Smelting recipes" info="Backpack + camp" />
   <View style={s.row}>{v.recipes.map(r => (
    <Pressable key={r.id} accessibilityRole="button" accessibilityState={{selected: selected === r.id}}
     accessibilityLabel={`Select ${smeltMaterialName(r.id)}. ${r.cost} makes one ingot. ${r.available} available.`}
     onPress={() => {setSelected(r.id); setQuantity(1); setMessage('');}} style={[s.recipe, selected === r.id && s.selected]}>
     <ItemArt id={r.id === 'ore' ? 'ironOre' : 'scrap'} size={40} />
     <Text style={s.title}>{smeltMaterialName(r.id)}</Text><Text style={s.recipeInfo}>{smeltCostLabel(r.id)}</Text><Text style={s.recipeInfo}>{r.available} available</Text>
    </Pressable>
   ))}</View>
   <SectionHeading title="Smelting queue" info={`${v.queueSize} / ${v.queueMax}`} />
   {v.jobs.length ? v.jobs.map(job => (
    <View key={job.id} style={s.utility}>
     <ItemArt id={job.name.includes('ore') ? 'ironOre' : 'scrap'} size={28}/>
     <View style={s.details}><Text style={s.title}>{job.name}</Text><Text style={s.meta}>{furnaceJobLabel(job.label)}</Text><FuelMeter label={`${job.name} progress`} amount={Math.round(job.progress * 100)} max={100}/></View>
     <StationButton label="Cancel" accessibilityLabel={`Cancel ${job.name}. Return materials to camp stores.`} disabled={!job.canCancel} onPress={() => act(job.cancel, 'Materials returned to camp stores.')} />
    </View>
   )) : <Text style={s.meta}>No ingots queued.</Text>}
  </ScrollView>
  <View style={s.tray} accessibilityElementsHidden={!!more} importantForAccessibility={more ? 'no-hide-descendants' : 'auto'}>
   <View style={s.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${material} recipe details`} onPress={() => setMore('recipe')} style={s.recipeLink}><Text style={s.linkText}>{material} · Info</Text></Pressable>
    <Text accessibilityLiveRegion="polite" style={[s.cost, !!blocked && s.warning]}>{blocked || `${input.count * amount} ${recipe.id === 'ore' ? 'ore' : 'scrap'} · ${Math.ceil(recipe.seconds * amount)}s`}</Text>
   </View>
   <View style={s.row}><QuantityControl amount={amount} limit={limit} onChange={setQuantity} />
    <StationButton grow primary label={`Queue ×${amount}`} accessibilityLabel={`Queue ${amount} ${amount === 1 ? 'ingot' : 'ingots'} using ${material.toLowerCase()}`} disabled={!limit} onPress={queue} />
   </View>
  </View>
  {more && <View style={s.overlay}>
   <Pressable accessible={false} onPress={back} style={StyleSheet.absoluteFill} />
   <View accessibilityViewIsModal onAccessibilityEscape={back} style={s.dialog}>
    <View style={s.row}><Text accessibilityRole="header" style={s.dialogTitle}>{more === 'recipe' ? material : v.upgrade.complete ? 'Reinforced bellows' : 'Bellows upgrade'}</Text><StationButton label="×" accessibilityLabel="Close furnace information" onPress={back}/></View>
    <ScrollView contentContainerStyle={s.body}>{more === 'recipe' ? <>
     <Text style={s.title}>{smeltCostLabel(recipe.id)}</Text>
     <Text style={s.copy}>Each ingot takes {Math.ceil(recipe.seconds)} seconds. The furnace uses materials from your backpack first, then camp stores.</Text>
     <Text style={s.copy}>Add wood to keep smelting and collect finished ingots to free up space. Queued batches keep their progress while you explore.</Text>
    </> : <>
     <Text style={s.copy}>Reinforced bellows smelt faster and hold {upgrade.queue} queued ingots, {upgrade.rack} finished ingots and {upgrade.fuel} seconds of fuel.</Text>
     {v.upgrade.complete ? <Text style={s.meta}>Installed on this furnace.</Text> : <>
      {v.upgrade.ingredients.map(m => <View key={m.id} style={s.row}><ItemArt id={m.id === 'pallets' ? 'logs' : m.id as 'stone' | 'ironIngot'} size={25}/><Text style={s.copy}>{m.name}</Text><Text style={[s.cost, !m.enough && s.warning]}>{m.enough ? `${m.available} / ${m.needed}` : `Need ${m.needed - m.available} more`}</Text></View>)}
      <StationButton primary disabled={!v.upgrade.canUpgrade} label="Upgrade bellows" onPress={() => {
       if (v.upgrade.run()) {setMore(null); setMessage('Bellows reinforced.');} else setMessage('Supplies changed.');
       onChange();
      }}/>
     </>}
    </>}</ScrollView>
   </View>
  </View>}
 </StationMenu>;
}

const s = StyleSheet.create({
 scroll: {flex: 1, minHeight: 0}, body: {gap: 8, padding: 1, paddingBottom: 6}, row: {flexDirection: 'row', alignItems: 'center', gap: 6},
 utilities: {gap: 6}, utilityWide: {flex: 1}, utility: {minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 6, borderRadius: 7, backgroundColor: palette.surface},
 details: {flex: 1, minWidth: 0}, title: {color: palette.text, fontFamily: 'FieldKitBarlow', fontSize: 16},
 meta: {fontSize: 12, color: palette.muted}, recipeInfo: {fontSize: 12, color: palette.muted, textAlign: 'center'},
 recipe: {flex: 1, minWidth: 0, alignItems: 'center', padding: 8, gap: 3, borderWidth: 1, borderBottomWidth: 3, borderColor: palette.line, backgroundColor: palette.inset, borderRadius: 7},
 selected: {borderColor: palette.brass, backgroundColor: palette.surface},
 tray: {flexShrink: 0, gap: 4, paddingTop: 4, borderTopWidth: 1, borderColor: palette.line},
 link: {minHeight: 30, justifyContent: 'center'}, recipeLink: {minHeight: 32, justifyContent: 'center'},
 linkText: {fontWeight: '700', fontSize: 13, color: palette.brass}, cost: {flex: 1, textAlign: 'right', fontSize: 13, color: palette.text},
 warning: {color: palette.danger}, overlay: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,12,10,.72)', justifyContent: 'center', alignItems: 'center', padding: 6, zIndex: 5},
 dialog: {width: '100%', maxWidth: 440, maxHeight: '100%', gap: 6, padding: 10, borderWidth: 1, borderColor: palette.brass, borderRadius: 8, backgroundColor: palette.panel},
 dialogTitle: {flex: 1, fontSize: 22, fontFamily: 'FieldKitBarlow', color: palette.text}, copy: {fontSize: 14, lineHeight: 20, color: palette.text},
});

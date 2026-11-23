import {useStationFeedback} from '../src/use-station-feedback';
import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {campfireView} from '../src/campfire-view';
import {campfireFoodSelection, queueCampfireFood} from '../src/campfire-menu';
import {LOG_BURN_SECONDS} from '../src/camp-kitchen';
import type {FoodSpecies} from '../src/food-items';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';
import {stationPalette as palette} from '../src/station-palette';
import {RecipeBatch, RecipeRow, SectionHeading, StationButton, StationDetails} from './StationControls';
import StationMenu from './StationMenu';
import {ItemArt} from './FieldItemArt';

const foodIds = {
 fish: {raw: 'fishRaw', cooked: 'fishMeal'},
 chicken: {raw: 'raw', cooked: 'meal'}, rabbit: {raw: 'rabbitRaw', cooked: 'rabbitMeal'}, venison: {raw: 'venisonRaw', cooked: 'venisonMeal'},
} as const;
type Props = {world: World; width: number; height: number; safe: MenuInsets; onClose: () => void; onChange: () => void};

export default function CampfirePanel({world, width, height, safe, onClose, onChange}: Props) {
 const [details, setDetails] = useState<FoodSpecies | 'meal' | null>(null);
 const [message, setMessage] = useStationFeedback();
 const v = campfireView(world);
 const owned = v.food.filter(f => f.count > 0);
 const jobs = v.jobs.filter(j => j !== null);
 const food = owned.find(f => f.species === details);
 const batch = food && campfireFoodSelection(v, food.species, 1);
 useEffect(() => {
  if (details === 'meal' ? !v.preparedMeal.count : details && !food) setDetails(null);
 }, [details, food?.species, v.preparedMeal.count]);

 const closeDetails = () => setDetails(null);
 const back = details ? closeDetails : onClose;
 const cook = (species: FoodSpecies, amount: number) => {
  const n = queueCampfireFood(world, species, amount);
  setMessage(n ? `${n} ${n === 1 ? 'portion' : 'portions'} added.${v.burning || v.incoming ? '' : ' Add wood to cook.'}` : 'Supplies or fire space changed.');
  onChange();
 };
 const fuel = <View style={s.row}>
  <ItemArt id="logs" size={24} />
  <Text style={s.growText}>{v.burning ? `Heat · ${v.time}` : v.incoming ? 'Lighting…' : 'Fire out'}</Text>
  <StationButton label={!v.logs ? 'Need wood' : !v.canStoke ? 'Fuel full' : 'Add wood'} disabled={!v.canStoke}
   accessibilityLabel={`Add wood. ${v.logs} logs available. One log adds ${LOG_BURN_SECONDS} seconds.`}
   onPress={() => {setMessage(v.stoke() ? `Added ${LOG_BURN_SECONDS}s of heat.` : 'Wood supply changed.'); onChange();}} />
 </View>;
 const needsHeat = jobs.length > 0 && !v.burning && !v.incoming;
 const full = jobs.length >= v.queueMax;
 const queueList = jobs.length > 0 && <>
    <SectionHeading title={full ? 'Fire full' : 'On the fire'} info={`${jobs.length} / ${v.queueMax}`} />
    {jobs.map(j => <View key={j.id} style={s.row}>
     <ItemArt id={foodIds[j.species].raw} size={26} /><View style={s.grow}><Text style={s.bodyText}>{j.name}</Text>
      <Text style={s.note}>{j.label === 'NO HEAT' ? v.incoming ? 'Lighting…' : 'Needs wood' : j.label === 'WAIT' ? 'Waiting' : `${j.label} left`}</Text></View>
     <StationButton label="Cancel" accessibilityLabel={`Return raw ${j.name.toLowerCase()} to backpack. ${j.canReturn ? 'Cancel cooking.' : 'Backpack full.'}`} disabled={!j.canReturn} onPress={() => {
      setMessage(j.remove() ? 'Raw food returned to backpack.' : 'Backpack full.'); onChange();
     }} />
    </View>)}
    <Text style={s.note}>Cooked food lands on the ground beside the fire.</Text>
   </>;

 return <StationMenu compact fitContent={!details} world={world} title="Campfire" label="Tend the campfire" image={require('../public/survival/ui-field-kit-v1/cook.png')}
  closeLabel="Leave campfire" onClose={onClose} onBack={back} width={width} height={height} safe={safe} message={message}
  footerAction={v.preparedMeal.count > 0 ? <StationButton label="Prepare meal" onPress={() => setDetails('meal')} /> : undefined}>
  <ScrollView nestedScrollEnabled style={s.scroll} contentContainerStyle={s.body} accessibilityElementsHidden={!!details} importantForAccessibility={details ? 'no-hide-descendants' : 'auto'}>
   {needsHeat && fuel}
   {full && queueList}
   {owned.length ? owned.map(f => {
    const name = `Raw ${f.name.toLowerCase()}`;
    const {blocked} = campfireFoodSelection(v, f.species, 1);
    return <RecipeRow key={f.species} name={name} image={foodIds[f.species].raw} detail={`×${f.count} · ${f.seconds}s`} disabled={!!blocked} blocked={full ? '' : blocked} verb="Cook"
     actionLabel={`Cook 1 ${name.toLowerCase()}`} onDetails={() => setDetails(f.species)} onSubmit={() => cook(f.species, 1)} />;
   }) : <Text style={s.bodyText}>No raw food in your backpack</Text>}
   {!needsHeat && fuel}
   {!full && queueList}
  </ScrollView>
  {food && batch && <StationDetails title={`Raw ${food.name.toLowerCase()}`} closeLabel="Close food information" onClose={closeDetails}>
   <View style={s.row}><ItemArt id={foodIds[food.species].cooked} size={38} /><Text style={s.growText}>{food.seconds}s · +{food.food} food{food.health ? ` · +${food.health} health` : ''}</Text></View>
   <RecipeBatch action="Cook" limit={batch.limit} blocked={batch.blocked} actionLabel={n => `Cook ${n} raw ${food.name.toLowerCase()}`}
    onSubmit={n => {cook(food.species, n); closeDetails();}} />
  </StationDetails>}
  {details === 'meal' && <StationDetails title="Hunter’s meal" onClose={closeDetails}>
   <View style={s.row}><ItemArt id="huntersMeal" size={38}/><Text style={s.growText}>{v.preparedMeal.ingredientLabel}</Text></View>
   <Text style={s.bodyText}>+{v.preparedMeal.food} food · +{v.preparedMeal.healthOverTime} health over {v.preparedMeal.duration}s.</Text>
   <StationButton primary label={v.preparedMeal.canPrepare ? 'Prepare meal' : v.preparedMeal.actionLabel === 'PACK FULL' ? 'Backpack full' : 'Wait a moment'}
    accessibilityLabel="Prepare Hunter’s meal" disabled={!v.preparedMeal.canPrepare} onPress={() => {
     if (v.preparedMeal.prepare()) {setMessage('Hunter’s meal added to backpack.'); closeDetails();} else setMessage('Ingredients or backpack space changed.');
     onChange();
    }} />
  </StationDetails>}
 </StationMenu>;
}

const s = StyleSheet.create({
 scroll: {minHeight: 0, flexShrink: 1, flexGrow: 0}, body: {gap: 6, padding: 1},
 row: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2}, grow: {flex: 1},
 growText: {flex: 1, fontSize: 15, color: palette.text}, bodyText: {fontSize: 15, color: palette.text},
 note: {fontSize: 12, color: palette.muted},
});

import React, {useState} from 'react';
import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType} from 'react-native';
import {campRecipes} from './camp-recipes';
import {stationPalette as colors} from './station-palette';
import type {World} from './survival-engine';

type Props = {
 world: World;
 width: number;
 source: (path: string) => ImageSourcePropType;
 openPlan: (id: string, trigger?: string) => void;
};

export default function HeadquartersCrafting({world, width, source, openPlan}: Props) {
 const [readyOnly, setReadyOnly] = useState(false);
 const groups = campRecipes(world);
 const ready = groups.reduce((count, station) => count + station.recipes.filter(recipe => recipe.ready).length, 0);
 return <ScrollView testID="hq-crafting-list" style={s.scroll} contentContainerStyle={[s.content, width < 620 && s.compact]}>
  <View style={s.toolbar}>
   <View accessibilityRole="tablist" style={s.switcher}>
    {[false, true].map(filter => <Pressable key={String(filter)} accessibilityRole="tab"
     accessibilityState={{selected: readyOnly === filter}} onPress={() => setReadyOnly(filter)}
     style={[s.filter, readyOnly === filter && s.selected]}>
     <Text style={[s.filterText, readyOnly === filter && s.selectedText]}>{filter ? 'Ready at station · ' + ready : 'All recipes'}</Text>
    </Pressable>)}
   </View>
   <Text style={s.legend}>Ingredients shown as on hand / needed</Text>
  </View>
  {readyOnly && !ready && <View style={s.empty}><Text style={s.title}>No recipes ready yet</Text>
   <Text style={s.note}>Open All recipes to see which repairs and ingredients you need.</Text></View>}
  {groups.map(station => {
   const rows = station.recipes.filter(recipe => !readyOnly || recipe.ready);
   if (!rows.length) return null;
   return <View key={station.id} style={s.section}>
    <View style={s.header}><Text accessibilityRole="header" style={s.stationName}>{station.name}</Text>
     <View style={s.rule}/><Text style={s.note}>{station.packOnly ? 'From backpack' : 'Backpack + stores'}</Text></View>
    <View style={s.grid}>{rows.map(recipe => {
     const trigger = 'hq-recipe-' + recipe.id;
     return <Pressable key={recipe.id} accessibilityRole="button" testID={trigger}
      accessibilityLabel={[recipe.name, station.name, recipe.detail, recipe.status,
       ...recipe.ingredients.map(part => part.name + ', ' + part.have + ' on hand, ' + part.need + ' needed'),
       'View plan'].filter(Boolean).join(', ')}
      onPress={() => openPlan(recipe.planId, trigger)}
      style={({pressed}) => [s.card, width >= 760 && s.half, recipe.ready && s.readyCard, pressed && s.pressed]}>
      <View style={s.icon}><Image accessible={false} accessibilityIgnoresInvertColors source={source(recipe.art)} resizeMode="contain" style={s.art}/></View>
      <View style={s.description}>
       <Text style={s.title}>{recipe.name}</Text>
       {!!recipe.detail && <Text style={s.note}>{recipe.detail}</Text>}
       <View style={s.ingredients}>{recipe.ingredients.map(part =>
        <Text key={part.name} style={[s.ingredient, part.have < part.need && s.short]}>
         {part.name} {part.have}/{part.need}
        </Text>)}</View>
       <Text style={[s.status, recipe.ready && s.readyText]}>{recipe.status}</Text>
      </View>
      <Text accessible={false} style={s.chevron}>›</Text>
     </Pressable>;
    })}</View>
   </View>;
  })}
 </ScrollView>;
}

const face = Platform.OS === 'web' ? 'Barlow Condensed' : 'FieldKitBarlow';
const s = StyleSheet.create({
 scroll: {flex: 1, minHeight: 0, backgroundColor: colors.inset},
 content: {padding: 20, gap: 22}, compact: {padding: 12, gap: 16},
 toolbar: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 9},
 switcher: {flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 3, overflow: 'hidden'},
 filter: {justifyContent: 'center', minHeight: 44, paddingHorizontal: 12},
 selected: {backgroundColor: colors.brass}, filterText: {fontFamily: face, fontSize: 18, fontWeight: '700', color: colors.text},
 selectedText: {color: colors.ink}, legend: {fontSize: 12, color: colors.muted},
 section: {gap: 8}, header: {flexDirection: 'row', alignItems: 'center', gap: 9},
 stationName: {fontFamily: face, color: colors.brass, fontSize: 22, fontWeight: '700'}, rule: {flex: 1, height: 1, backgroundColor: colors.line},
 grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 7},
 card: {width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: colors.panel,
  borderColor: colors.line, borderWidth: 1, borderLeftWidth: 3, borderRadius: 3},
 half: {width: '49%'}, readyCard: {borderLeftColor: '#adc391'}, pressed: {opacity: .75},
 icon: {height: 46, width: 46, backgroundColor: '#30362f', borderRadius: 3}, art: {width: '100%', height: '100%'},
 description: {flex: 1, minWidth: 0, gap: 3}, title: {fontFamily: face, fontWeight: '700', fontSize: 21, lineHeight: 23, color: colors.text},
 note: {color: colors.muted, fontSize: 12, lineHeight: 16}, ingredients: {flexDirection: 'row', gap: 7, flexWrap: 'wrap'},
 ingredient: {color: colors.muted, fontSize: 13, lineHeight: 18}, short: {color: colors.danger},
 status: {color: colors.brass, fontSize: 13, fontWeight: '600'}, readyText: {color: '#cee2ae'},
 chevron: {fontSize: 22, color: colors.muted}, empty: {gap: 6, paddingVertical: 16}
});

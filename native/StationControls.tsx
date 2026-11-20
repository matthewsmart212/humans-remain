import React, {useState, useEffect} from 'react';
import {View, Text, Pressable, ScrollView, StyleSheet} from 'react-native';
import {ItemArt} from './FieldItemArt';
import type {BagItemId} from '../src/backpack';
import {stationPalette as palette} from '../src/station-palette';

type ButtonProps = {
 label: string;
 accessibilityLabel?: string;
 accessibilityHint?: string;
 onPress: () => void;
 disabled?: boolean;
 primary?: boolean;
 grow?: boolean;
};

export function StationButton({label, accessibilityLabel = label, accessibilityHint, onPress, disabled, primary, grow}: ButtonProps) {
 return (
  <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} accessibilityState={{disabled}}
   disabled={disabled} onPress={onPress} style={({pressed}) => [
    s.button, grow && s.grow, primary && !disabled && s.primary, disabled && s.off, pressed && s.pressed,
   ]}>
   <Text style={[s.buttonText, primary && !disabled && s.darkText, disabled && s.mutedText]}>{label}</Text>
  </Pressable>
 );
}

type RecipeRowProps = {
 name: string; image: BagItemId; detail: string; verb: string; actionLabel: string; blocked?: string; disabled?: boolean;
 onDetails: () => void; onSubmit: () => void;
};

export function RecipeRow({name, image, detail, verb, actionLabel, blocked, disabled = !!blocked, onDetails, onSubmit}: RecipeRowProps) {
 return <View style={[s.recipe, s.row]}>
  <Pressable accessibilityRole="button" accessibilityLabel={`About ${name.toLowerCase()}`} accessibilityHint={blocked || detail} onPress={onDetails} style={s.recipeInfo}>
   <ItemArt id={image} size={34} />
   <View style={s.details}><Text style={s.recipeName}>{name} <Text accessible={false} style={s.note}>›</Text></Text><Text style={[s.note, blocked && s.warning]}>{blocked || detail}</Text></View>
  </Pressable>
  <StationButton primary label={verb} accessibilityLabel={actionLabel} accessibilityHint={blocked || detail} disabled={disabled} onPress={onSubmit} />
 </View>;
}

type BatchProps = {
 action: string; limit: number; blocked: string;
 actionLabel: (n: number) => string; onSubmit: (n: number) => void;
};

export function RecipeBatch({action, limit, blocked, actionLabel, onSubmit}: BatchProps) {
 const [chosen, setChosen] = useState(1);
 const quantity = Math.max(1, Math.min(limit, chosen));
 useEffect(() => {if (chosen !== quantity) setChosen(quantity);}, [chosen, quantity]);
 return <View style={s.batch}>
  {limit > 1 && <>
   <Text style={s.note}>Quantity</Text>
   <View style={s.choices}>{Array.from({length: limit}, (_, i) => i + 1).map(n =>
    <Pressable key={n} accessibilityRole="button" accessibilityLabel={`Use quantity ${n}`} accessibilityState={{selected: n === quantity}}
     onPress={() => setChosen(n)} style={[s.numberButton, n === quantity && s.chosen]}><Text style={s.buttonText}>{n}</Text></Pressable>
   )}</View>
  </>}
  {!!blocked && <Text style={s.warning}>{blocked}</Text>}
  <StationButton primary label={quantity > 1 ? `${action} ×${quantity}` : action} accessibilityLabel={actionLabel(quantity)}
   disabled={!limit} onPress={() => onSubmit(quantity)} />
 </View>;
}

export function StationDetails({title, closeLabel = 'Close details', onClose, children}: {
 title: string; closeLabel?: string; onClose: () => void; children: React.ReactNode;
}) {
 return <View style={s.shade}>
  <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
  <View accessibilityViewIsModal accessibilityLabel={title} onAccessibilityEscape={onClose} style={s.dialog}>
   <View style={s.headingRow}><Text accessibilityRole="header" style={s.heading}>{title}</Text>
    <StationButton label="×" accessibilityLabel={closeLabel} onPress={onClose} />
   </View>
   <ScrollView contentContainerStyle={s.dialogBody}>{children}</ScrollView>
  </View>
 </View>;
}

export function SectionHeading({title, info}: {title: string; info?: string}) {
 return <View style={s.headingRow}>
  <Text accessibilityRole="header" style={s.heading}>{title}</Text>
  {!!info && <Text style={s.note}>{info}</Text>}
 </View>;
}

const s = StyleSheet.create({
 row: {flexDirection: 'row', alignItems: 'center', gap: 3},
 recipe: {padding: 6, gap: 5, backgroundColor: palette.surface, borderRadius: 7},
 recipeInfo: {flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7},
 details: {flex: 1, minWidth: 0}, recipeName: {fontFamily: 'FieldKitBarlow', fontSize: 17, color: palette.text},
 batch: {gap: 5}, choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
 numberButton: {minWidth: 40, minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: 5, backgroundColor: palette.inset},
 chosen: {borderColor: palette.brass}, warning: {color: palette.danger},
 shade: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,12,10,.74)', justifyContent: 'center', alignItems: 'center', padding: 6, zIndex: 6},
 dialog: {width: '100%', maxWidth: 440, maxHeight: '100%', gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.panel},
 dialogBody: {gap: 8, paddingBottom: 4},
 headingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6},
 heading: {flexShrink: 1, fontFamily: 'FieldKitBarlow', fontSize: 18, color: palette.text},
 note: {fontSize: 12, color: palette.muted, flexShrink: 1},
 button: {minWidth: 40, minHeight: 44, paddingHorizontal: 7, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6, borderColor: palette.line, backgroundColor: palette.surface},
 grow: {flex: 1}, primary: {backgroundColor: palette.brass, borderColor: palette.brass},
 off: {backgroundColor: palette.inset}, pressed: {borderColor: palette.brass, opacity: .8},
 buttonText: {color: palette.text, fontSize: 14, fontWeight: '700', textAlign: 'center'},
 darkText: {color: palette.ink}, mutedText: {color: palette.muted},
});

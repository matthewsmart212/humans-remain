import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {stationPalette as palette} from '../src/station-palette';

type ButtonProps = {
 label: string;
 accessibilityLabel?: string;
 onPress: () => void;
 disabled?: boolean;
 primary?: boolean;
 grow?: boolean;
};

export function StationButton({label, accessibilityLabel = label, onPress, disabled, primary, grow}: ButtonProps) {
 return (
  <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{disabled}}
   disabled={disabled} onPress={onPress} style={({pressed}) => [
    s.button, grow && s.grow, primary && !disabled && s.primary, disabled && s.off, pressed && s.pressed,
   ]}>
   <Text style={[s.buttonText, primary && !disabled && s.darkText, disabled && s.mutedText]}>{label}</Text>
  </Pressable>
 );
}

export function QuantityControl({amount, limit, onChange}: {amount: number; limit: number; onChange: (amount: number) => void}) {
 return <View style={s.row}>
  <StationButton label="−" accessibilityLabel="Decrease quantity" disabled={amount <= 1 || !limit} onPress={() => onChange(amount - 1)} />
  <Text accessibilityLiveRegion="polite" accessibilityLabel={`Selected quantity ${amount}`} style={s.quantity}>{amount}</Text>
  <StationButton label="+" accessibilityLabel="Increase quantity" disabled={amount >= limit} onPress={() => onChange(amount + 1)} />
  <StationButton label="Max" accessibilityLabel="Select maximum quantity" disabled={!limit} onPress={() => onChange(limit)} />
 </View>;
}

export function SectionHeading({title, info}: {title: string; info?: string}) {
 return <View style={s.headingRow}>
  <Text accessibilityRole="header" style={s.heading}>{title}</Text>
  {!!info && <Text style={s.note}>{info}</Text>}
 </View>;
}

export function FuelMeter({amount, max, label}: {amount: number; max: number; label: string}) {
 const value = Math.min(max, Math.max(0, amount));
 return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{min: 0, max, now: value}} style={s.track}>
  <View style={[s.fill, {width: `${value / max * 100}%`}]} />
 </View>;
}

const s = StyleSheet.create({
 row: {flexDirection: 'row', alignItems: 'center', gap: 3},
 quantity: {minWidth: 22, textAlign: 'center', color: palette.text, fontSize: 17, fontWeight: '700'},
 headingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6},
 heading: {flexShrink: 1, fontFamily: 'FieldKitBarlow', fontSize: 18, color: palette.text},
 note: {fontSize: 12, color: palette.muted, textAlign: 'right', flexShrink: 1},
 button: {minWidth: 40, minHeight: 44, paddingHorizontal: 7, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6, borderColor: palette.line, backgroundColor: palette.surface},
 grow: {flex: 1}, primary: {backgroundColor: palette.brass, borderColor: palette.brass},
 off: {backgroundColor: palette.inset}, pressed: {borderColor: palette.brass, opacity: .8},
 buttonText: {color: palette.text, fontSize: 14, fontWeight: '700', textAlign: 'center'},
 darkText: {color: palette.ink}, mutedText: {color: palette.muted},
 track: {height: 4, marginVertical: 3, backgroundColor: palette.line, overflow: 'hidden', borderRadius: 2},
 fill: {height: '100%', backgroundColor: palette.brass},
});

import React, {useEffect, useRef, useState} from 'react';
import {BackHandler, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType} from 'react-native';
import {menuPackReadout} from '../src/station-menu-model';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {stationMenuLayout, presentStationMenu, type MenuInsets} from '../src/station-menu-layout';
import {stationPalette as palette} from '../src/station-palette';
import type {World} from '../src/survival-engine';

export {stationMenuLayout} from '../src/station-menu-layout';

type Props = {
 world: World;
 title: string;
 label?: string;
 subtitle?: string;
 image?: ImageSourcePropType;
 closeLabel?: string;
 onClose: () => void;
 onBack?: () => void;
 weight?: number;
 loadLabel?: string;
 message?: string;
 hint?: string;
 kind?: 'backpack';
 compact?: boolean;
 fitContent?: boolean;
 footerAction?: React.ReactNode;
 width: number;
 height: number;
 safe: MenuInsets;
 children: React.ReactNode;
};

export default function StationMenu({
 world, title, label = title, subtitle, image, closeLabel = `Leave ${title.toLowerCase()}`,
 onClose, onBack = onClose, weight, loadLabel, message, hint, kind, compact = false, fitContent = false,
 footerAction, width, height, safe, children,
}: Props) {
 const [closeFocused, setCloseFocused] = useState(false);
 const back = useRef(onBack);
 back.current = onBack;
 const layout = stationMenuLayout(width, height, safe);
 const panel = layout.panel;
 const tight = compact && layout.compact;
 const pack = menuPackReadout(weight, loadLabel, kind === 'backpack');

 useEffect(() => {
  const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
   back.current();
   return true;
  });
  return () => subscription.remove();
 }, []);

 useEffect(() => {
  presentStationMenu(world, true, kind === 'backpack', safe);
  return () => presentStationMenu(world, false);
 }, [world.fire, kind, width, height, safe.top, safe.right, safe.bottom, safe.left]);

 return (
  <View accessibilityViewIsModal onAccessibilityEscape={onBack} style={StyleSheet.absoluteFill}>
   <Pressable accessible={false} importantForAccessibility="no" onPress={onBack} style={styles.scrim} />
   <View accessibilityLabel={label} style={[
    styles.frame, tight && styles.tightFrame,
    {left: panel.x, top: panel.y, width: panel.width},
    fitContent ? {maxHeight: panel.height} : {height: panel.height},
   ]}>
    <View style={styles.header}>
     <View style={styles.emblem}>
      <Image source={image ?? art[kind === 'backpack' ? 'backpack' : 'chest']} resizeMode="contain" style={styles.icon} />
     </View>
     <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>{message}</Text> :
       !!subtitle && <Text style={styles.secondary}>{subtitle}</Text>}
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}
      onFocus={() => setCloseFocused(true)} onBlur={() => setCloseFocused(false)}
      style={({pressed}) => [styles.close, (pressed || closeFocused) && styles.closeFocused]}>
      <Text accessible={false} style={styles.closeGlyph}>×</Text>
     </Pressable>
    </View>

    <View style={[styles.content, tight && styles.tightContent, fitContent && styles.fitContent]}>{children}</View>

    {(!!pack || !!hint || !!footerAction) && <View style={styles.footer}>
     {!!hint && <Text style={styles.secondary}>{hint}</Text>}
     <View style={styles.load}>
      {pack&&<>
       <Image accessible={false} source={art.backpack} resizeMode="contain" style={styles.packIcon}/>
       <Text accessibilityLabel={`Backpack weight, ${pack.amount}`} style={styles.weight}>{pack.amount}</Text>
       {!!pack.status&&<Text style={styles.secondary}>{pack.status}</Text>}
      </>}
      {footerAction}
     </View>
    </View>}
   </View>
  </View>
 );
}

const styles = StyleSheet.create({
 scrim: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,12,10,0.22)'},
 frame: {
  position: 'absolute', padding: 12, gap: 8, borderWidth: 1, borderTopWidth: 2,
  borderColor: palette.line, borderTopColor: palette.brass, borderRadius: 12, backgroundColor: palette.panel,
  shadowColor: '#000', shadowOpacity: .35, shadowRadius: 12, elevation: 6,
 },
 tightFrame: {padding: 8, gap: 4},
 header: {flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0, paddingBottom: 4, borderBottomWidth: 1, borderColor: palette.line},
 emblem: {width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: palette.inset},
 icon: {width: 32, height: 32},
 heading: {flex: 1},
 title: {fontFamily: 'FieldKitBarlow', fontSize: 24, color: palette.text},
 secondary: {fontSize: 12, color: palette.muted},
 close: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: 6, backgroundColor: palette.surface},
 closeFocused: {borderWidth: 2, borderColor: palette.brass},
 closeGlyph: {fontSize: 26, lineHeight: 30, textAlign: 'center', color: palette.text},
 content: {flex: 1, minHeight: 0, gap: 8}, tightContent: {gap: 4}, fitContent: {flexGrow: 0, flexShrink: 1, flexBasis: 'auto'},
 footer: {paddingTop: 5, gap: 4, borderTopWidth: 1, borderColor: palette.line, flexShrink: 0},
 load: {flexDirection: 'row', alignItems: 'center', gap: 6},
 packIcon: {width: 18, height: 18}, weight: {fontSize: 12, fontWeight: '600', color: palette.text},
 feedback: {color: palette.brass, fontSize: 13, lineHeight: 17},
});

import React, {useEffect, useRef, useState} from 'react';
import {BackHandler, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType} from 'react-native';
import {menuPackReadout} from '../src/station-menu-model';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {stationMenuLayout, presentStationMenu, type MenuInsets} from '../src/station-menu-layout';
import {patchPanelLayout} from '../src/patch-panel-layout';
import {stationPalette as palette} from '../src/station-palette';
import type {World} from '../src/survival-engine';

export {stationMenuLayout} from '../src/station-menu-layout';

type Props = {
 world: World;
 title: string;
 label?: string;
 subtitle?: string;
 image?: ImageSourcePropType;
 emblem?: React.ReactNode;
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
 presentation?: 'station' | 'letter';
 footerAction?: React.ReactNode;
 width: number;
 height: number;
 safe: MenuInsets;
 children: React.ReactNode;
};

export default function StationMenu({
 world, title, label = title, subtitle, image, emblem, closeLabel = `Leave ${title.toLowerCase()}`,
 onClose, onBack = onClose, weight, loadLabel, message, hint, kind, compact = false, fitContent = false,
 footerAction, width, height, safe, children, presentation = 'station',
}: Props) {
 const [closeFocused, setCloseFocused] = useState(false);
 const back = useRef(onBack);
 back.current = onBack;
 const story = presentation !== 'station', letter = presentation === 'letter';
 const layout = story ? patchPanelLayout(width, height, safe) : stationMenuLayout(width, height, safe);
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
   <Pressable accessible={false} importantForAccessibility="no" onPress={onBack} style={[styles.scrim, story && styles.storyScrim]} />
   <View accessibilityLabel={label} style={[
    styles.frame, tight && styles.tightFrame,
    story && styles.storyFrame, letter && styles.letterFrame,
    {left: panel.x, top: panel.y, width: panel.width},
    fitContent ? {maxHeight: panel.height} : {height: panel.height},
   ]}>
    <View style={[styles.header, story && styles.storyHeader, letter && styles.letterHeader]}>
     {!story && <View style={styles.emblem}>
      {emblem??<Image source={image ?? art[kind === 'backpack' ? 'backpack' : 'chest']} resizeMode="contain" style={styles.icon} />}
     </View>}
     <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.title, story && styles.storyTitle]}>{title}</Text>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>{message}</Text> :
       !!subtitle && <Text style={[styles.secondary, story && styles.storySubtitle]}>{subtitle}</Text>}
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}
      onFocus={() => setCloseFocused(true)} onBlur={() => setCloseFocused(false)}
      style={({pressed}) => [styles.close, story && styles.storyClose, (pressed || closeFocused) && styles.closeFocused]}>
      <Text accessible={false} style={styles.closeGlyph}>×</Text>
     </Pressable>
    </View>

    <View style={[styles.content, tight && styles.tightContent, fitContent && styles.fitContent, story && styles.storyContent]}>{children}</View>

    {(!!pack || !!hint || !!footerAction) && <View style={[styles.footer, story && styles.storyFooter, letter && styles.letterFooter]}>
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
 storyScrim: {backgroundColor: 'rgba(6,10,8,.76)'},
 storyFrame: {padding: 12, gap: 10, borderRadius: 7, borderColor: '#59604a', borderTopColor: '#c6a36b', backgroundColor: '#19211c', shadowOpacity: .55, shadowRadius: 24},
 letterFrame: {padding: 0, gap: 4, borderWidth: 0, borderTopWidth: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0},
 storyHeader: {minHeight: 44, paddingBottom: 7, gap: 10},
 letterHeader: {paddingHorizontal: 12, paddingBottom: 2, borderBottomWidth: 0, backgroundColor: '#101a16f5', borderRadius: 4},
 storyTitle: {fontSize: 24, lineHeight: 28, letterSpacing: .3, color: '#f0e9d6'},
 storySubtitle: {fontSize: 12, lineHeight: 17, color: '#bdc5b6'},
 storyClose: {borderColor: '#89907170', backgroundColor: '#18201bd9', borderRadius: 4},
 storyContent: {gap: 0},
 storyFooter: {paddingTop: 0, borderTopWidth: 0},
 letterFooter: {paddingHorizontal: 12},
});

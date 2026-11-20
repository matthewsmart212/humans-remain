import type {CSSProperties} from 'react';
import {stationPalette} from './station-palette';

export const stationCSSColors = Object.fromEntries(
  Object.entries(stationPalette).map(([name, value]) => [`--station-${name}`, value])
) as CSSProperties;

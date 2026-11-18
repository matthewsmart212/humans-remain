import {FURNACE_BROKEN_IMAGE,FURNACE_COLD_IMAGE} from '../src/furnace-animation-art';
import {FURNACE_NATIVE_ART} from './furnace-animation-art';

export const IRONWORKS_NATIVE_ART={
 ironOre:require('../public/survival/ironworks-v1/iron-ore.png'),
 ironIngot:require('../public/survival/ironworks-v1/iron-ingot.png'),
 campFurnace:FURNACE_NATIVE_ART[FURNACE_COLD_IMAGE],
 campFurnaceRuined:FURNACE_NATIVE_ART[FURNACE_BROKEN_IMAGE],
 ironBoulder:require('../public/survival/ironworks-v1/iron-boulder.png'),
};

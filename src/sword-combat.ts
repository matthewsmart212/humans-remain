import type {SwordKind} from './player-gear';
import {SPEAR_THRUST} from './spear-combat';

/** The spear's approved thrust timing, with the sword's shorter reach. */
export const SWORD_THRUST={...SPEAR_THRUST,cooldown:.68,reach:155,push:20} as const;
export type SwordThrust={started:number;angle:number;tool:SwordKind;resolved:boolean};

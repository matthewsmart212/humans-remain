import type {SpearKind} from './player-gear';

/** A committed, single-target thrust. Contact is shared with the visual pose. */
export const SPEAR_THRUST={cooldown:.62,duration:.43,contact:.14,extend:.08,retract:.28,reach:190,halfArc:Math.PI/7,push:22} as const;
export type SpearThrust={started:number;angle:number;tool:SpearKind;resolved:boolean};

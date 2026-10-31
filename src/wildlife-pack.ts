import {timeOf,type Animal,type World} from './survival-engine';
/** Pack mates surround and alternate attacks, instead of overlapping tells. */
export function packAttackAvailable(w:World,a:Animal){return !a.wildlife||!w.animals.some(other=>other!==a&&other.hp>0&&other.wildlife?.group===a.wildlife!.group&&other.predator&&(other.predator.state==='warn'||other.predator.state==='attack'||other.predator.state==='recover'&&timeOf(w)-other.predator.since<.25))}

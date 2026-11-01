import snapshot from './assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {validateLayout,type WorldLayout} from '../src/world-layout';
import {prepareAuthoredWorld} from '../src/authored-world';
import type {ArtworkRecord} from '../src/artwork-model';

export type SavedWorld={layout:WorldLayout;records:ArtworkRecord[];revision?:number;source?:string};
export function validateSavedWorld(raw:unknown,source:string):SavedWorld{
 const v=raw as SavedWorld;if(!v||!Array.isArray(v.records))throw Error('World artwork metadata is missing.');
 installImportedArt(v.records);
 const checked=validateLayout(v.layout);if(!checked.layout||checked.errors.length)throw Error(checked.errors.join(' ')||'The saved world is invalid.');
 return {...v,layout:prepareAuthoredWorld(checked.layout),source};
}
/** Native releases own their world. Editor drafts and old draft caches must
 * never decide what ships, delay startup or replace the device's Survival run. */
export function loadGameWorld():SavedWorld{
 return validateSavedWorld(snapshot,'Game world');
}

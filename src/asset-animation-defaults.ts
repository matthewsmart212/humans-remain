import type {ArtworkRecord} from './artwork-model';

/** Enable the owner's existing bunker without changing its images or placements.
 * Explicit library settings always win, including switching back to Loop.
 * Different artwork must be configured afresh rather than inheriting these steps. */
export function resolveAnimationDefaults(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!=='misc_2dd09bb8-883b-42e3-b765-c2a1c735b016'||c.animationMode!==undefined)return record;
 const frames=['2401745e-7f2d-4a8c-b6da-7351bc248ca7','c3ca8339-9c06-46f9-bbdd-ffe6b58d5376','588cd1b0-8ac3-4283-a358-e6e86bd2ba10'];
 if(c.frames.length!==frames.length||c.frames.some((f,i)=>f.id!==frames[i]))return record;
 return {...record,config:{...c,animationMode:'step-on',animationArea:{points:[[.29,.70],[.53,.51],[.74,.60],[.49,.86]]}}};
}

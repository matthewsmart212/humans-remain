import {patchRouteSite} from './patch-placement';
import {withinActionReach,type World} from './survival-engine';

const dispatch={
 title:'West bank dispatch book',provenance:'Transfer 14 · Last entry',
 art:'/survival/patch-v5/dispatch-slip.webp',
 text:'Last W-6 fitted to the cable-hauler, west of the logging bridge. Leave installed for the next lift.',
 annotation:'Last lift was the evacuation sled.',
 annotationLabel:'Pencilled in the margin',
} as const;
const plate={
 title:'Cable-hauler load plate',provenance:'Service plate · W-6',
 art:'/survival/patch-v5/drive-rubbing.webp',
 text:'Three pinholes. The socket matches the rubbing from P-04’s knee.',
 annotation:'Follow the cable around the drum. The brake releases from the other side.',
 annotationLabel:'Service instruction',
} as const;

export function patchEvidence(w:World){
 return w.patchQuest?.haulerInspected?plate:dispatch;
}

export function atPatchEvidence(w:World){
 const q=w.patchQuest;
 if(w.scene||!q?.dispatchRead||q.servoClaimed)return false;
 const site=patchRouteSite(w.layout,q.haulerInspected?'hauler':'dispatch');
 return !!site&&withinActionReach(w,site.approach,90);
}

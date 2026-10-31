import {PROVISION_IDS,PROVISIONS,type ProvisionId} from './food-provisions-data';

export const provisionImageKey=(id:ProvisionId)=>`provision_${id}`;
export const PROVISION_IMAGES:Record<string,string>=Object.fromEntries(
 PROVISION_IDS.map(id=>[provisionImageKey(id),PROVISIONS[id].image]),
);

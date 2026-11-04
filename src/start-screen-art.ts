import type {ImageSourcePropType} from 'react-native';
import type {StartScreenIconName} from './start-screen-icons';

/** Shared exports keep the browser and Expo menus on the same artwork. */
export type StartScreenArtwork={
 logo:ImageSourcePropType;
 selectionGlow:ImageSourcePropType;
 icons:Record<StartScreenIconName,ImageSourcePropType>;
};
export const START_SCREEN_MENU_FONT='CampMenu';
const uri=(name:string)=>({uri:`/survival/starting-screen-ui-v2/${name}.png`});
export const WEB_START_SCREEN_ART:StartScreenArtwork={
 logo:uri('humans-remain-logo'),
 selectionGlow:uri('play-selection-glow'),
 icons:{play:uri('play'),friends:uri('friends'),customise:uri('customise'),upgrades:uri('upgrades'),lock:uri('lock'),settings:uri('settings')},
};

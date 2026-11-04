import type {ImageSourcePropType} from 'react-native';
import type {StartScreenIconName} from './start-screen-icons';

/** Shared exports keep the browser and Expo menus on the same artwork. */
export type StartScreenArtwork={
 logo:ImageSourcePropType;
 selectionGlow:ImageSourcePropType;
 expeditionScene:ImageSourcePropType;
 cardTexture:ImageSourcePropType;
 icons:Record<StartScreenIconName,ImageSourcePropType>;
};
export const START_SCREEN_MENU_FONT='CampMenu';
const uri=(name:string)=>({uri:`/survival/starting-screen-ui-v2/${name}.png`});
export const WEB_START_SCREEN_ART:StartScreenArtwork={
 logo:uri('humans-remain-logo'),
 selectionGlow:uri('play-selection-glow'),
 expeditionScene:{uri:'/survival/expedition-menu-v1/camp-gate.webp'},
 cardTexture:{uri:'/survival/ui-field-kit-v1/utility-panel.png'},
 icons:{play:uri('play'),friends:uri('friends'),customise:uri('customise'),upgrades:uri('upgrades'),lock:uri('lock'),settings:uri('settings')},
};

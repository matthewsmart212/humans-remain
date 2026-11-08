import type {ImageSourcePropType} from 'react-native';
import type {StartScreenIconName} from './start-screen-icons';

/** Shared exports keep the browser and Expo menus on the same artwork. */
export type StartScreenArtwork={
 logo:ImageSourcePropType;
 selectionGlow:ImageSourcePropType;
 expeditionCards:ImageSourcePropType;
 /** The approved original signs, individually cut out as transparent PNGs. */
 expeditionPanels?:Record<'play'|'customise'|'upgrades'|'friends',ImageSourcePropType>;
 expeditionLoading:ImageSourcePropType;
 icons:Record<StartScreenIconName,ImageSourcePropType>;
};
export const START_SCREEN_MENU_FONT='CampMenu';
const uri=(name:string)=>({uri:`/survival/starting-screen-ui-v2/${name}.png`});
export const WEB_START_SCREEN_ART:StartScreenArtwork={
 logo:uri('humans-remain-logo'),
 selectionGlow:uri('play-selection-glow'),
 expeditionCards:{uri:'/survival/expedition-menu-v2/approved-cards.webp'},
 expeditionPanels:{
  play:{uri:'/survival/expedition-menu-v2/panels/play.png'},
  customise:{uri:'/survival/expedition-menu-v2/panels/customise.png'},
  upgrades:{uri:'/survival/expedition-menu-v2/panels/upgrades.png'},
  friends:{uri:'/survival/expedition-menu-v2/panels/friends.png'},
 },
 expeditionLoading:{uri:'/survival/expedition-menu-v2/loading-panel.webp'},
 icons:{play:uri('play'),friends:uri('friends'),customise:uri('customise'),upgrades:uri('upgrades'),lock:uri('lock'),settings:uri('settings')},
};

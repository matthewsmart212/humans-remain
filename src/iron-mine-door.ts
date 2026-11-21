import type {WorldAsset} from './world-assets';

export const IRON_MINE_DOOR_ID='iron-mine-timber-doors';
const closed='/survival/iron-mine-v1/door-closed.webp';
const open='/survival/iron-mine-v1/door-open.webp';
const size=[400,380];
const width=238;

// Both paintings share a threshold at y=369, between the posts at x=38
// and x=364. At world scale those posts meet the 194-unit passage walls.
export const ironMineDoor:WorldAsset={
  id:IRON_MINE_DOOR_ID, name:'Mine timber doors', group:'Mine workings',
  image:closed, crop:[0,0,...size], anchor:[201,369], width, height:width*380/400,
  role:'prop', solid:true, body:[],
  gate:{
    a:[38/400,369/380], b:[364/400,369/380], height:194,
    leaf:closed, leafSize:size, post:closed, postSize:size, postWidth:24, postHeight:194,
    states:{closed,open,size},
  },
};

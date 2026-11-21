import type {WorldAsset} from './world-assets';

export const IRON_MINE_DOOR_ID = 'iron-mine-timber-doors';
const closed = '/survival/iron-mine-v1/slate-door-closed.webp';
const open = '/survival/iron-mine-v1/slate-door-open.webp';
const size = [888, 444];
const leftPost = 232;
const rightPost = 652;
const threshold = 367;
// Only the opening spans the surveyed 194-unit neck. The slate shoulders
// extend past both jambs into the surrounding rock.
const scale = 194 / (rightPost - leftPost);

export const ironMineDoor: WorldAsset = {
  id: IRON_MINE_DOOR_ID, name: 'Mine timber doors', group: 'Mine workings',
  image: closed, crop: [0, 0, ...size], anchor: [(leftPost + rightPost) / 2, threshold],
  width: size[0] * scale, height: size[1] * scale,
  role: 'prop', solid: true, body: [],
  gate: {
    a: [leftPost / size[0], threshold / size[1]], b: [rightPost / size[0], threshold / size[1]],
    height: 136, leaf: closed, leafSize: size, post: closed, postSize: size,
    postWidth: 24, postHeight: 136, states: {closed, open, size},
  },
};

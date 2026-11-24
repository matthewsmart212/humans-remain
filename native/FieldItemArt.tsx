import React from 'react';
import {Image,View} from 'react-native';
import {BAG_IMAGES,type BagItemId} from '../src/backpack';
import {QUICK_ITEMS,type QuickItem} from '../src/quick-items';
import {quickItemArt} from '../src/quick-item-art';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {FOOD_NATIVE_ART} from './food-art';
import {IRONWORKS_NATIVE_ART} from './ironworks-art';

const itemImages:Record<BagItemId|QuickItem,number>={
 ...FOOD_NATIVE_ART,
 fishingRod:require('../public/survival/fishing-gameplay-v1/rod.webp'),
 fishRaw:require('../public/survival/fishing-gameplay-v1/raw-perch.webp'),
 carpRaw:require('../public/survival/fishing-gameplay-v2/raw-carp.webp'),
 pikeRaw:require('../public/survival/fishing-gameplay-v2/raw-pike.webp'),
 repairHammer:require('../public/survival/equipment/repair-hammer-v1.webp'),
 ironOre:IRONWORKS_NATIVE_ART.ironOre,
 ironIngot:IRONWORKS_NATIVE_ART.ironIngot,
 woodenPickaxe:require('../public/survival/equipment/wooden-pickaxe-v1.png'),
 metalPickaxe:require('../public/survival/equipment/metal-pickaxe-v1.png'),
 stone:require('../public/survival/world-rocks-v1/river-stone-trio.webp'),
 bow:require('../public/survival/scrap-runner/bow-v1/bow-icon.webp'),
 arrows:require('../public/survival/scrap-runner/bow-v1/arrows-icon.webp'),
 woodenSword:require('../public/survival/equipment/wooden-sword-v1.png'),
 metalSword:require('../public/survival/equipment/metal-sword-v1.png'),
 woodenSpear:require('../public/survival/equipment/wooden-spear-v1.png'),
 metalSpear:require('../public/survival/equipment/metal-spear-v1.png'),
 woodenKnife:require('../public/survival/equipment/wooden-knife-v1.png'),
 scrapKnife:require('../public/survival/equipment/scrap-knife-v1.png'),
 woodenAxe:require('../public/survival/equipment/wooden-axe-v1.webp'),
 venisonRaw:require('../public/survival/venison-food-v1/raw-venison.webp'),
 rabbitRaw:require('../public/survival/rabbit-food-v1/raw-rabbit.webp'),
 raw:require('../public/survival/chicken-food-v1/raw-chicken.webp'),
 scrap:require('../public/survival/ui-backpack-v1/scrap.png'),
 fuel:require('../public/survival/ui-backpack-v1/fuel.png'),
 axe:art.axe,logs:art.logs,fists:art.punch,torch:art.torch,
};

export function ItemArt({id,size=56}:{id:BagItemId;size?:number}){
 return <Image source={itemImages[id]} resizeMode="contain" style={{width:size,height:size}}/>;
}

export function QuickItemIcon({id,size}:{id:QuickItem;size:number}){
 const frame=quickItemArt(id,size);
 return <View pointerEvents="none" accessible={false} style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
  <View style={{...frame.crop,overflow:'hidden',transform:[{rotate:`${frame.rotation}deg`}]}}>
   <Image source={itemImages[id]} resizeMode="stretch" style={{position:'absolute',...frame.image}}/>
  </View>
 </View>;
}

const quickItemsByPath=new Map(QUICK_ITEMS.map(item=>[item.image,item.id]));
const actionImages:Record<string,number>={
 '/survival/fishing-gameplay-v2/scout-drone.webp':require('../public/survival/fishing-gameplay-v2/scout-drone.webp'),
 ...Object.fromEntries(Object.entries(BAG_IMAGES).map(([id,path])=>[path,itemImages[id as BagItemId]])),
 '/survival/fishing-gameplay-v1/reel.webp':require('../public/survival/fishing-gameplay-v1/reel.webp'),
 '/survival/fishing-gameplay-v1/hook.webp':require('../public/survival/fishing-gameplay-v1/hook.webp'),
 '/survival/fishing-gameplay-v1/worms.webp':require('../public/survival/fishing-gameplay-v1/worms.webp'),
 '/survival/headquarters-thumbnails-v1/c516848e71523b4a.webp':require('../public/survival/headquarters-thumbnails-v1/c516848e71523b4a.webp'),
 '/survival/headquarters-thumbnails-v1/323ca55ca57c492a.webp':require('../public/survival/headquarters-thumbnails-v1/323ca55ca57c492a.webp'),
 '/survival/headquarters-thumbnails-v1/8d4f357abc8188bf.webp':require('../public/survival/headquarters-thumbnails-v1/8d4f357abc8188bf.webp'),
 '/survival/headquarters-thumbnails-v1/8b986841b1d18bc2.webp':require('../public/survival/headquarters-thumbnails-v1/8b986841b1d18bc2.webp'),
 '/survival/headquarters-thumbnails-v1/4c9a274f8223bc40.webp':require('../public/survival/headquarters-thumbnails-v1/4c9a274f8223bc40.webp'),
};

// Both HUDs use the path chosen by the action. Metro needs literal requires for offline play.
export function actionImageGlyph(path:string|undefined,size:number){
 if(!path)return undefined;
 const item=quickItemsByPath.get(path);
 if(item)return <QuickItemIcon id={item} size={size}/>;
 const source=actionImages[path];
 return source?<Image source={source} resizeMode="contain" style={{width:size,height:size}}/>:undefined;
}

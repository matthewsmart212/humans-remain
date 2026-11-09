/** Bundled assets keep native inventory, quick slots and use buttons in sync. */
export const PROVISION_NATIVE_ART={
 berries:require('../public/survival/food-provisions-v1/berries.webp'),
 apple:require('../public/survival/food-provisions-v1/apple.webp'),
 potato:require('../public/survival/potato-v1/potato.webp'),
 beans:require('../public/survival/food-provisions-v1/old-tin-of-beans.webp'),
 energyBar:require('../public/survival/food-provisions-v1/energy-bar.webp'),
 huntersMeal:require('../public/survival/food-provisions-v1/hunters-meal.webp'),
};
export const FOOD_NATIVE_ART={...PROVISION_NATIVE_ART,
 meal:require('../public/survival/chicken-food-v1/cooked-chicken.webp'),
 rabbitMeal:require('../public/survival/rabbit-food-v1/cooked-rabbit.webp'),
 venisonMeal:require('../public/survival/venison-food-v1/cooked-venison.webp'),
};
export const heldFoodArt=(id:string):number|undefined=>FOOD_NATIVE_ART[id as keyof typeof FOOD_NATIVE_ART];

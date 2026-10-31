/** Food definitions shared by inventory, rendering and both platform UIs. */
export const PROVISION_IDS=['berries','apple','beans','energyBar','huntersMeal'] as const;
export type ProvisionId=typeof PROVISION_IDS[number];
export type ProvisionCounts=Record<ProvisionId,number>;
export type ProvisionDefinition={name:string;image:string;description:string;food:number;water:number;stamina:number;healOverTime:number;duration:number;weight:number;cooldown:number};
const image=(name:string)=>`/survival/food-provisions-v1/${name}.webp`;
export const PROVISIONS={
 berries:{name:'Berries',image:image('berries'),description:'A handful of wild berries. A small food top-up while exploring.',food:6,water:0,stamina:0,healOverTime:0,duration:0,weight:.04,cooldown:1.2},
 apple:{name:'Apple',image:image('apple'),description:'Fresh fruit that restores some food and a little water.',food:14,water:6,stamina:0,healOverTime:0,duration:0,weight:.18,cooldown:1.2},
 beans:{name:'Old tin of beans',image:image('old-tin-of-beans'),description:'A dependable scavenged meal. Ready to eat straight from the tin.',food:32,water:0,stamina:0,healOverTime:0,duration:0,weight:.4,cooldown:3},
 energyBar:{name:'Energy bar',image:image('energy-bar'),description:'A compact oat bar. Restores food and gives an immediate stamina boost.',food:18,water:0,stamina:30,healOverTime:0,duration:0,weight:.08,cooldown:3},
 huntersMeal:{name:'Hunter’s meal',image:image('hunters-meal'),description:'Cooked meat and berries prepared at camp. A filling meal with gradual health recovery.',food:65,water:0,stamina:0,healOverTime:20,duration:20,weight:.75,cooldown:8},
} as const satisfies Record<ProvisionId,ProvisionDefinition>;
export const isProvision=(kind:unknown):kind is ProvisionId=>typeof kind==='string'&&PROVISION_IDS.includes(kind as ProvisionId);
export const emptyProvisionCounts=():ProvisionCounts=>({berries:0,apple:0,beans:0,energyBar:0,huntersMeal:0});

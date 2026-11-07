/** Four selectable archetypes. Modifiers and alternate sprite atlases will be wired up later. */
export const SURVIVOR_ROLES=[
 {id:'survivor',label:'Survivor',subtitle:'All-rounder',glyph:'★',health:100,stamina:100,gathering:3,support:3,description:'A reliable choice with balanced survival stats.'},
 {id:'engineer',label:'Engineer',subtitle:'Builds & repairs',glyph:'⚙',health:95,stamina:95,gathering:4,support:5,description:'Strong camp utility and gathering, with slightly less health and stamina.'},
 {id:'hunter',label:'Hunter',subtitle:'Tracks & provides',glyph:'➶',health:90,stamina:120,gathering:5,support:2,description:'Excellent stamina and gathering, but less health and team support.'},
 {id:'medic',label:'Medic',subtitle:'Heals & supports',glyph:'✚',health:110,stamina:90,gathering:2,support:5,description:'The strongest health and support stats, with less stamina and gathering.'},
] as const;
export type SurvivorRoleId=typeof SURVIVOR_ROLES[number]['id'];
export const isSurvivorRoleId=(value:unknown):value is SurvivorRoleId=>typeof value==='string'&&SURVIVOR_ROLES.some(role=>role.id===value);
export const survivorRole=(id:SurvivorRoleId)=>SURVIVOR_ROLES.find(role=>role.id===id)??SURVIVOR_ROLES[0];

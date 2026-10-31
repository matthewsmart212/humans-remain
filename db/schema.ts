import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const customAssets=sqliteTable('custom_assets',{
 id:text('id').primaryKey(),name:text('name').notNull(),createdAt:text('created_at').notNull(),
});
export const checklist=sqliteTable('base_checklist',{
 id:text('id').primaryKey(),
 art:integer('art',{mode:'boolean'}),
 concept:integer('concept',{mode:'boolean'}),
 exportComplete:integer('export_complete',{mode:'boolean'}),
 implemented:integer('implemented',{mode:'boolean'}),
 tested:integer('tested',{mode:'boolean'}),
 updatedAt:text('updated_at').notNull(),
});
export const worldLayout=sqliteTable('world_layout',{
 id:text('id').primaryKey(),draftJson:text('draft_json'),appliedJson:text('applied_json'),revision:integer('revision').notNull().default(0),updatedAt:text('updated_at'),
});
export const artFiles=sqliteTable('asset_art_files',{
 id:text('id').primaryKey(),entryId:text('entry_id').notNull(),objectKey:text('object_key').notNull(),name:text('name').notNull(),mime:text('mime').notNull(),width:integer('width').notNull(),height:integer('height').notNull(),bytes:integer('bytes').notNull(),published:integer('published').notNull().default(0),createdAt:text('created_at').notNull(),
});
export const artwork=sqliteTable('asset_artwork',{
 id:text('id').primaryKey(),entryId:text('entry_id').notNull(),revision:integer('revision').notNull(),configJson:text('config_json').notNull(),createdAt:text('created_at').notNull(),
});

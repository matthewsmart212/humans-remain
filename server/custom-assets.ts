import {entries} from '../src/catalogue-model';
import {customCatalogueEntry,type CustomAsset} from '../src/custom-assets';
import type {ArtEnv} from './artwork';
import {isLibraryAssetId} from '../src/asset-library-policy';
export async function readCustomAssets(DB:ArtEnv['DB'],includeRetired=false):Promise<CustomAsset[]>{
 const assets:CustomAsset[]=(await DB.prepare('SELECT id,name,created_at AS createdAt FROM custom_assets ORDER BY created_at,id').all()).results;
 return includeRetired?assets:assets.filter(a=>isLibraryAssetId(a.id));
}
export async function artworkEntry(DB:ArtEnv['DB'],id:unknown){
 if(typeof id!=='string'||!isLibraryAssetId(id))return undefined;
 const builtIn=entries.find(e=>e.id===id&&e.art!==null);if(builtIn)return builtIn;
 const row=(await DB.prepare('SELECT id,name,created_at AS createdAt FROM custom_assets WHERE id=?').bind(id).all()).results[0];
 return row?customCatalogueEntry(row):undefined;
}

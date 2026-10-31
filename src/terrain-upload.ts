import {MAX_TERRAIN_FILE} from './terrain-limits';

/** Upload original bytes: no full-size canvas, recompression or downscaling on iPhone. */
export async function prepareTerrainUpload(file:File):Promise<File>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG or WebP image. Unzip tile packs before selecting an image.');
 if(!file.size)throw Error('This image file is empty. Choose the original image again.');
 if(file.size>MAX_TERRAIN_FILE)throw Error('Background images must be 64 MB or smaller. Try exporting as WebP at the same resolution.');
 return file;
}

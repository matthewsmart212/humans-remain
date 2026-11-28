import type {RunnerSprite} from './runner-cycles';

/** Body and clipped hand redraws use the same source-to-world registration. */
export function drawCharacterSprite(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sprite:RunnerSprite){
 const [sx,sy,sw,sh]=sprite.crop,xScale=sprite.scaleX??sprite.scale,yScale=sprite.scale;
 ctx.drawImage(image,sx,sy,sw,sh,-sprite.anchor[0]*xScale,-sprite.anchor[1]*yScale,sw*xScale,sh*yScale);
}

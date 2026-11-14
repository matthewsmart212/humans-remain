/** React Native Skia always allocates a Canvas drawable at the full screen
 * scale: three pixels per point on most iPhones. The world renderer's camera,
 * detail levels and terrain streams already assume at most two, matching the
 * web canvas cap, so the third pixel adds fill cost without adding detail.
 *
 * Lay the game Canvas out smaller than the screen and let Core Animation
 * enlarge it. The HUD is ordinary React Native views and keeps full density.
 *
 * Skia sizes its Metal layer from whole points, so the layout is rounded up to
 * whole points and each axis carries its own exact enlargement. */
export const GAME_CANVAS_MAX_DENSITY=2;
export type GameCanvasLayout={
 /** Canvas layout size in points. */
 width:number;height:number;
 /** Enlargement that maps the Canvas back onto the full screen. */
 scaleX:number;scaleY:number;
 /** Drawable pixels per screen point after the reduction. */
 density:number;
 reduced:boolean;
};
export function gameCanvasLayout(width:number,height:number,deviceDensity:number,maxDensity=GAME_CANVAS_MAX_DENSITY):GameCanvasLayout{
 if(!(width>0&&height>0&&deviceDensity>maxDensity&&maxDensity>0))return{width,height,scaleX:1,scaleY:1,density:deviceDensity,reduced:false};
 // The epsilon keeps an exact result such as 852*2/3 from rounding up a point.
 const ratio=maxDensity/deviceDensity,w=Math.ceil(width*ratio-1e-6),h=Math.ceil(height*ratio-1e-6);
 return{width:w,height:h,scaleX:width/w,scaleY:height/h,density:Math.max(w/width,h/height)*deviceDensity,reduced:true};
}

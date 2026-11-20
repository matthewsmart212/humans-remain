/** Short ambient shadow at the trunk. The feathered root artwork lets the
 * terrain texture show through on grass, earth and stone alike. */
export function drawTreeContact(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number){
 ctx.save();
 ctx.translate(x,y-radius*.09);
 ctx.scale(radius,radius*.27);
 const shade=ctx.createRadialGradient(0,0,0,0,0,1);
 shade.addColorStop(0,'rgba(30,21,12,.49)');
 shade.addColorStop(.55,'rgba(36,25,15,.23)');
 shade.addColorStop(1,'rgba(36,25,15,0)');
 ctx.fillStyle=shade;
 ctx.fillRect(-1,-1,2,2);
 ctx.restore();
}

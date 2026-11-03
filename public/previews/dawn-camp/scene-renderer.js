/* Dawn-camp renderer. The supplied scene stays fixed outside local animation regions. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),fract=n=>n-Math.floor(n);
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
const hash=n=>fract(Math.sin(n*127.1+311.7)*43758.5453123);
function createCampRenderer(ctx,manifest,images){
 const W=manifest.scene.width,H=manifest.scene.height,assets=manifest.assets,LOOP=manifest.animation.loopSeconds;
 const makeSurface=(w,h)=>{const c=typeof document!=='undefined'?document.createElement('canvas'):root.createCampSurface?.(w,h);if(c){c.width=w;c.height=h;}return c;};
 function polygon(g,points,append=false){if(!append)g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();}
 const original=images['approved-background'],clean=images['dawn-clean-plate'];
 const scene=makeSurface(W,H),sg=scene.getContext('2d');sg.drawImage(original,0,0,W,H);
 for(const patch of manifest.reconstruction){
  const mask=makeSurface(W,H),mg=mask.getContext('2d');mg.fillStyle='#fff';mg.shadowColor='#fff';mg.shadowBlur=patch.feather;polygon(mg,patch.points);mg.fill();
  const layer=makeSurface(W,H),g=layer.getContext('2d');g.drawImage(images[patch.asset]??clean,0,0,W,H);g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);sg.drawImage(layer,0,0);
 }
 // Restore the supplied tree trunk and static firewood, preserving their pixels.
 for(const points of manifest.fixedForeground){sg.save();polygon(sg,points);sg.clip();sg.drawImage(original,0,0,W,H);sg.restore();}
 const bp=manifest.placements.canopy,ba=assets['autumn-canopy'];
 const margin=bp.topOverscan??0;
 const bough=makeSurface(bp.textureWidth,bp.textureHeight+margin),bg=bough.getContext('2d');
 if(images['canopy-top-extension']){
  // Add only the newly painted crown above the original asset. Its overlap
  // fades under the approved leaves; the lower bough keeps the original pixels.
  const cap=makeSurface(bp.textureWidth,bough.height),cg=cap.getContext('2d');
  cg.drawImage(images['canopy-top-extension'],bp.sourceX,margin+bp.sourceY-bp.extensionSourceTop*bp.sourceScaleY,ba.width*bp.sourceScaleX,(ba.height+bp.extensionSourceTop)*bp.sourceScaleY);
  const fadeStart=margin+bp.sourceY,fadeEnd=fadeStart+bp.extensionBlendSource*bp.sourceScaleY;
  const fade=cg.createLinearGradient(0,fadeStart,0,fadeEnd);fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(1,'rgba(255,255,255,0)');
  cg.globalCompositeOperation='destination-in';cg.fillStyle=fade;cg.fillRect(0,0,cap.width,cap.height);bg.drawImage(cap,0,0);
 }
 bg.drawImage(images['autumn-canopy'],bp.sourceX,bp.sourceY+margin,ba.width*bp.sourceScaleX,ba.height*bp.sourceScaleY);
 function boughOffset(x,t,wind){
  const q=clamp((x-bp.rootX)/bp.span);
  // Move the full visible limb, with a little extra flex toward its tips.
  // A mostly linear weight replaces the old tip-only quadratic movement.
  const weight=q*(1-bp.bendEase+bp.bendEase*q);
  const sway=Math.sin(TAU*t/LOOP*bp.swayCycles)*bp.bendPixels;
  const gust=Math.sin(TAU*t/LOOP*bp.secondaryCycles+.6)*bp.secondaryBendPixels;
  const flutter=Math.sin(TAU*t/LOOP*bp.flutterCycles-x*.021)*bp.tipFlutterPixels*q;
  return wind*((sway+gust)*weight+flutter);
 }
 function windBranch(t,wind){
  // Adjacent 24-pixel strips share endpoints, creating a continuous bend. The
  // root stays fixed; wood and leaves use the same deformation field.
  for(let x=0;x<bough.width;x+=bp.stripWidth){
   const width=Math.min(bp.stripWidth,bough.width-x),left=boughOffset(x,t,wind),right=boughOffset(x+width,t,wind),slope=(right-left)/width;
   ctx.save();ctx.transform(1,slope,0,1,0,left-slope*x);
   ctx.drawImage(bough,x,0,width,bough.height,x,-margin,width,bough.height);ctx.restore();
  }
  // Hide the joint inside the fixed trunk, keeping the bough visibly attached.
  ctx.save();polygon(ctx,bp.trunkOcclusion);ctx.clip();ctx.drawImage(original,0,0,W,H);ctx.restore();
 }
 const fp=manifest.placements.fire,flame=makeSurface(fp.planeWidth,fp.planeHeight),fg=flame.getContext('2d');
 function sprite(key,index,x,y,width,opts={}){
  const a=assets[key],im=images[key];if(!a||!im)return;
  const f=a.frames[(index%a.frames.length+a.frames.length)%a.frames.length],b=f.bounds;if(!b)return;
  const scale=width/a.referenceBounds.width,dw=b.width*scale,dh=opts.height??b.height*scale;
  ctx.save();ctx.translate(x,y);if(opts.rotation)ctx.rotate(opts.rotation);ctx.scale(opts.scaleX??1,opts.scaleY??1);ctx.globalAlpha=opts.alpha??1;if(opts.blend)ctx.globalCompositeOperation=opts.blend;
  ctx.drawImage(im,b.x,b.y,b.width,b.height,-dw*(opts.anchorX??.5),-dh*(opts.anchorY??1),dw,dh);ctx.restore();
 }
 function glow(x,y,rx,ry,alpha,colour='255,126,29'){
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${colour},${alpha})`);g.addColorStop(.45,`rgba(${colour},${alpha*.3})`);g.addColorStop(1,`rgba(${colour},0)`);ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 // Cache the approved neutral body and a transparent closed-eye patch once.
 // The eye patch is composited before deformation, so it follows the face.
 const cp=manifest.placements.survivor,ca=assets['survivor-idle-8'];
 const neutral=makeSurface(cp.poseWidth,cp.poseHeight),closedEyes=makeSurface(cp.poseWidth,cp.poseHeight),characterPose=makeSurface(cp.poseWidth,cp.poseHeight);
 function paintCharacter(g,index){
  const b=ca.frames[index].bounds,dw=b.width*cp.width/ca.referenceBounds.width;
  g.drawImage(images['survivor-idle-8'],b.x,b.y,b.width,b.height,(cp.poseWidth-dw)/2,cp.poseGround-cp.height,dw,cp.height);
 }
 paintCharacter(neutral.getContext('2d'),0);
 const eg=closedEyes.getContext('2d');eg.save();eg.beginPath();
 for(const e of cp.eyes)eg.ellipse(e.x-cp.x+cp.poseWidth/2,e.y-cp.y+cp.poseGround,e.rx,e.ry,0,0,TAU);
 eg.clip();paintCharacter(eg,5);eg.restore();
 function blinkAmount(t){
  let amount=0;
  for(const start of cp.blinkStarts){const q=(t-start)/cp.blinkDuration;if(q>=0&&q<1){const value=q<.3?smooth(q/.3):q<.55?1:1-smooth((q-.55)/.45);amount=Math.max(amount,value);}}
  return amount;
 }
 function characterOffset(y,t){
  const phase=TAU*t/LOOP,breath=(1-Math.cos(phase*cp.breathCycles))*.5;
  const upper=smooth((cp.poseGround-62-y)/164),head=1-smooth((y-188)/86);
  const settle=Math.sin(phase*cp.settleCycles),nod=Math.sin(phase*cp.headCycles);
  return {x:upper*cp.torsoShift*settle+head*(cp.headShift*settle+cp.headLean*nod*(220-y)),y:-upper*cp.breathLift*breath-head*(1.3*nod+.7*breath)};
 }
 function survivor(t){
  ctx.save();ctx.translate(cp.x,cp.y+1);ctx.scale(105,12);const shadow=ctx.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,'rgba(31,20,12,.32)');shadow.addColorStop(1,'rgba(31,20,12,0)');ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore();
  const blink=blinkAmount(t);let texture=neutral;
  if(blink>0){const g=characterPose.getContext('2d');g.reset?.();g.clearRect(0,0,cp.poseWidth,cp.poseHeight);g.globalAlpha=1;g.drawImage(neutral,0,0);g.globalAlpha=blink;g.drawImage(closedEyes,0,0);g.globalAlpha=1;texture=characterPose;}
  ctx.save();ctx.translate(cp.x-cp.poseWidth/2,cp.y-cp.poseGround);
  // Smooth connected strips move the upper body while the feet remain planted.
  for(let y=0;y<cp.poseHeight;y+=cp.stripHeight){
   const h=Math.min(cp.stripHeight,cp.poseHeight-y),a=characterOffset(y,t),b=characterOffset(y+h,t),shear=(b.x-a.x)/h,scaleY=1+(b.y-a.y)/h;
   ctx.save();ctx.transform(1,0,shear,scaleY,a.x-shear*y,a.y+(1-scaleY)*y);
   // Small overlap prevents antialiasing cracks between bent horizontal strips.
   const top=Math.max(0,y-.9),bottom=Math.min(cp.poseHeight,y+h+.9);
   ctx.drawImage(texture,0,top,cp.poseWidth,bottom-top,0,top,cp.poseWidth,bottom-top);ctx.restore();
  }
  ctx.restore();
 }
 function fire(t){
  const phase=t*manifest.animation.fireFps,frame=Math.floor(phase),mix=smooth(phase-frame),a=assets['campfire-flames-8'];
  fg.reset?.();fg.clearRect(0,0,fp.planeWidth,fp.planeHeight);fg.globalCompositeOperation='lighter';
  for(const[i,alpha]of[[frame,1-mix],[frame+1,mix]]){const c=a.frames[i%a.frames.length].cell;fg.globalAlpha=alpha;fg.drawImage(images['campfire-flames-8'],c.x,c.y,c.width,c.height,0,0,fp.planeWidth,fp.planeHeight);}
  fg.globalAlpha=1;fg.globalCompositeOperation='source-over';ctx.save();ctx.beginPath();ctx.rect(fp.x-fp.planeWidth/2-3,fp.y-fp.planeHeight,fp.planeWidth+6,fp.planeHeight);ctx.clip();ctx.drawImage(flame,fp.x-fp.planeWidth/2,fp.y-fp.planeHeight*fp.rootFraction);ctx.restore();
  // Each solid log has its own trace; gaps continue to show moving flames.
  ctx.save();ctx.beginPath();for(const points of manifest.fireOccluders){polygon(ctx,points,true);}ctx.clip();ctx.drawImage(original,0,0,W,H);ctx.restore();
 }
 function leafGroup(t,wind,fallingGroup){for(let j=fallingGroup?0:8;j<(fallingGroup?8:12);j++){const q=fract(t/LOOP+hash(j+35)),falling=j<8,x=falling?45+hash(j+13)*535+q*190*wind:30+q*(W+60),y=falling?-35+q*(H+90):752+hash(j+5)*72+Math.sin(q*TAU*3+j)*9,alpha=smooth(q*7)*smooth((1-q)*7)*.85*clamp(wind);sprite('autumn-leaves-16',Math.floor(hash(j+1)*4)*4+Math.floor(q*12+j)%4,x+Math.sin(q*8+j)*14,y,10+hash(j+10)*13,{alpha,rotation:q*TAU*1.8+j,anchorY:.5,scaleX:.45+Math.abs(Math.sin(q*15+j))*.55});}}
 function draw(t=0,settings={}){
  if(settings.motion===false)t=0;else t=((t%LOOP)+LOOP)%LOOP;const wind=clamp(settings.wind??1,0,1.7);
  ctx.reset?.();ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.scale(ctx.canvas.width/W,ctx.canvas.height/H);ctx.imageSmoothingEnabled=true;ctx.drawImage(scene,0,0);
  if(settings.lighting!==false){const pulse=.92+.035*Math.sin(TAU*t/LOOP*7)+.02*Math.sin(TAU*t/LOOP*14);glow(fp.x,fp.y+36,232,79,.065*pulse);glow(fp.x,fp.y-85,83,116,.04*pulse);}
  if(settings.leaves!==false)leafGroup(t,wind,true);
  if(settings.survivor!==false)survivor(t);if(settings.fire!==false)fire(t);
  if(settings.smoke!==false){for(let j=0;j<2;j++){
   const life=j?LOOP:LOOP/2,q=fract(t/life+j*.43),opacity=Math.pow(Math.sin(q*Math.PI),2)*.14;
   const phase=t*manifest.animation.smokeFps+j*1.7,index=Math.floor(phase),mix=smooth(phase-index);
   for(const [f,weight]of [[index,1-mix],[index+1,mix]])sprite('smoke-12',f%12,fp.x+q*26*wind,fp.y-124-q*130,58+q*70,{alpha:opacity*weight});
  }}
  if(settings.particles!==false){for(let j=0;j<19;j++){
   const life=hash(j+12)>.45?LOOP/4:LOOP/2,q=fract(t/life+hash(j+22));
   sprite('embers-and-dust-16',j%8,fp.x+(hash(j+19)-.5)*68+Math.sin(q*6+j)*9+q*12*wind,fp.y-54-q*(112+hash(j+7)*100),2+hash(j+3)*3,{alpha:Math.pow(Math.sin(q*Math.PI),2)*.75,anchorY:.5,blend:'screen'});
  }}
  if(settings.branches!==false)windBranch(t,wind);
  if(settings.leaves!==false)leafGroup(t,wind,false);
  ctx.restore();
 }
 return{draw,width:W,height:H};
}
root.createCampRenderer=createCampRenderer;if(typeof module!=='undefined')module.exports={createCampRenderer};
})(typeof globalThis!=='undefined'?globalThis:this);

/** Ground material and earth-tone blends use global world coordinates, so
 * clearings cross tile edges instead of repeating as one patch per square.
 * Vegetation is placed separately; there is no green terrain colour pass. */
export const WORLD_GROUND_COLOUR_SHADER=`
uniform shader terrain;
uniform shader clearEarth;
uniform float sourceScale;

float region(float2 p,float2 centre,float2 radius){
 return 1.0-smoothstep(0.32,1.0,length((p-centre)/radius));
}

float groundHash(float2 p){
 float3 q=fract(float3(p.x,p.y,p.x)*0.1031);
 q+=dot(q,q.yzx+33.33);
 return fract((q.x+q.y)*q.z);
}

float groundNoise(float2 p){
 float2 cell=floor(p),t=fract(p);
 t=t*t*(3.0-2.0*t);
 return mix(mix(groundHash(cell),groundHash(cell+float2(1.0,0.0)),t.x),
            mix(groundHash(cell+float2(0.0,1.0)),groundHash(cell+float2(1.0,1.0)),t.x),t.y);
}

half4 main(float2 xy){
 half4 ground=terrain.eval(xy);
 float2 p=xy/sourceScale+float2(600.0);
 // Broad bends give the regions irregular outlines without adding a new
 // repeated grain pattern or changing any of the painted surface detail.
 float2 q=p+float2(
  560.0*sin(p.y*0.00072)+220.0*sin((p.x+p.y)*0.0011),
  480.0*sin(p.x*0.00061)+180.0*sin((p.y-p.x)*0.0013));
 float meadow=region(q,float2(1600.0,11400.0),float2(8300.0,6500.0));
 float lowland=region(q,float2(-4400.0,5300.0),float2(4700.0,7600.0));
 float village=region(q,float2(3900.0,-2400.0),float2(5000.0,5100.0));
 float woodland=region(q,float2(-4600.0,-2600.0),float2(7500.0,6000.0));
 float industry=region(q,float2(10100.0,-1700.0),float2(6100.0,7200.0));
 float scrapyard=region(q,float2(9300.0,8600.0),float2(5700.0,6000.0));
 // A warm clearing surrounds the untouched original camp; no rectangular
 // exclusion mask that could reveal the camp image's outside edge.
 float away=smoothstep(2450.0,5000.0,length((p-float2(2400.0,2400.0))/float2(1.05,1.0)));
 // Former green areas now use lighter earth tones. Dark woodland and works
 // still have their deeper brown ground, with the same broad soft transitions.
 float lightEarth=max(meadow*0.36,max(lowland*0.52,village*0.28));
 float brown=max(lightEarth,max(woodland*0.95,max(industry*0.94,scrapyard*0.88)))*away;

 // Broad openings plus smaller breaks. This continuous mask never resets at
 // a tile origin, and varies independently of the image rotation/mirroring.
 float2 clearingPoint=p+float2(
  260.0*sin(p.y*0.0017)+180.0*sin(p.x*0.0011),
  230.0*sin(p.x*0.0014)-170.0*sin(p.y*0.0019));
 float field=0.72*groundNoise(clearingPoint/1900.0+float2(12.3,5.7))
            +0.28*groundNoise(clearingPoint/780.0+float2(31.4,19.2));
 float clearAmount=smoothstep(0.44,0.61,field);
 float3 bare=float3(clearEarth.eval(xy).rgb);
 // Let clear soil inherit the broad surrounding brown tone rather than
 // creating bright orange spots in the distant darker districts.
 float distanceBrown=clamp((length(p-float2(2400.0))-3240.0)/8760.0,0.0,1.0)*0.8;
 bare*=mix(float3(1.0),float3(0.82,0.86,0.94),distanceBrown);
 float3 original=mix(float3(ground.rgb),bare,clearAmount);
 float light=dot(original,float3(0.2126,0.7152,0.0722));
 float3 earth=mix(original,light*float3(1.05,0.82,0.61),0.82)*0.82;
 float3 colour=mix(original,earth,brown);
 return half4(clamp(colour,0.0,1.0),ground.a);
}
`;

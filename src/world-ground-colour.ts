/** Full-resolution painted textures; the extra sampler contains only slow
 * world-space colour masks, not replacement terrain artwork. */
export const WORLD_GROUND_COLOUR_SHADER=`
uniform shader terrain;
uniform shader clearEarth;
uniform shader colourField;
uniform float sourceScale;
half4 main(float2 xy){
 half4 ground=terrain.eval(xy);
 float3 field=float3(colourField.eval(xy).rgb);
 float3 bare=float3(clearEarth.eval(xy).rgb);
 bare*=mix(float3(1.0),float3(0.82,0.86,0.94),field.b);
 float3 original=mix(float3(ground.rgb),bare,field.r);
 float light=dot(original,float3(0.2126,0.7152,0.0722));
 float3 earth=mix(original,light*float3(1.05,0.82,0.61),0.82)*0.82;
 float3 colour=mix(original,earth,field.g);
 return half4(clamp(colour,0.0,1.0),ground.a);
}
`;

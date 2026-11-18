/** Full-resolution painted textures; the extra sampler contains only slow
 * world-space colour masks, not replacement terrain artwork. */
// Older road and river paintings include opaque orange soil around their edges.
// Let the painted ground beneath show through the warm earth between stones.
export const EARTH_SHOULDER_SKSL = `
half4 blendEarthShoulder(half4 paint) {
 float3 rgb = float3(paint.rgb) / max(float(paint.a), 0.001);
 float warmth = min(rgb.r - rgb.g, rgb.g - rgb.b);
 float soil = smoothstep(0.055, 0.17, warmth) * smoothstep(0.20, 0.40, rgb.r - rgb.b);
 half3 colour = paint.rgb * half3(mix(float3(1.0), float3(0.66, 0.83, 0.96), soil));
 return half4(colour, paint.a) * (1.0 - 0.74 * soil);
}
`;

export const WORLD_GROUND_COLOUR_SHADER=`
uniform shader terrain;
uniform shader clearEarth;
uniform shader colourField;
half4 main(float2 xy){
 half4 ground=terrain.eval(xy);
 float3 field=float3(colourField.eval(xy).rgb);
 float3 bare=float3(clearEarth.eval(xy).rgb);
 bare*=mix(float3(1.0),float3(0.82,0.86,0.94),field.b);
 float3 original=mix(float3(ground.rgb),bare,field.r);
 // Shade distant woodland while retaining the colours of the painted materials.
 float3 colour=original*mix(float3(1.0),float3(0.84,0.88,0.92),field.g);
 return half4(clamp(colour,0.0,1.0),ground.a);
}
`;

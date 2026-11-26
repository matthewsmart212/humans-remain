/** Group lines already measured by the platform, retaining a natural amount of
 * copy on the last page. Each proposed single-line tail has a conservative
 * glyph-width budget even at the largest supported text size. */
export function patchSpeechSections(measured:readonly string[],maxLines:number,width:number,font:number){
 const lines=measured.map(line=>line.trim());
 const tail=lines.length-1;
 if(tail>0&&lines[tail].length<13&&maxLines===1){
  const previous=lines[tail-1].split(/\s+/);
  while(previous.length>2&&lines[tail].split(/\s+/).length<3){
   const word=previous.at(-1)!;
   if(/[.!?]$/.test(word))break;
   const longer=word+' '+lines[tail];
   // A space or punctuation mark needs much less room than a wide capital.
   // Leave a full em for lowercase, and extra room for all other glyphs.
   const ems=Array.from(longer).reduce((sum,glyph)=>sum+(glyph===' '?.38:/[.,!?]/.test(glyph)?.6:/[a-z]/.test(glyph)?1:1.22),0);
   if(ems*font>width)break;
   lines[tail]=longer;previous.pop();
  }
  lines[tail-1]=previous.join(' ');
 }
 const sections:{text:string;start:number;count:number}[]=[];
 for(let start=0;start<lines.length;){
  const remaining=lines.length-start;
  // If one page must be shorter, use the fuller opening lines there.
  // A short last measured line then stays attached to the preceding line.
  const count=Math.floor(remaining/Math.ceil(remaining/maxLines));
  sections.push({text:lines.slice(start,start+count).join('\n'),start,count});
  start+=count;
 }
 return sections;
}

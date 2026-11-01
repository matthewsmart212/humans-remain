import type {SkPath,SkRect} from '@shopify/react-native-skia';

type Commands={
 moveTo(x:number,y:number):unknown;lineTo(x:number,y:number):unknown;close():unknown;reset():unknown;
 addArc(rect:SkRect,start:number,sweep:number):unknown;addOval(rect:SkRect):unknown;
 build?():SkPath;dispose():void;
};
type PathApi={Path:{Make():unknown};PathBuilder?:{Make():unknown}};

/** New native Skia paths are immutable. Keep a builder and reuse its snapshot
 * until geometry changes. Older browser Skia still supports mutable paths. */
export function createDrawingPath(Skia:PathApi){
 const modern=typeof Skia.PathBuilder?.Make==='function';
 const commands=(modern?Skia.PathBuilder!.Make():Skia.Path.Make()) as Commands;
 let snapshot:SkPath|undefined,disposed=false;
 const edit=(update:()=>unknown)=>{snapshot?.dispose();snapshot=undefined;update()};
 return{
  moveTo:(x:number,y:number)=>edit(()=>commands.moveTo(x,y)),
  lineTo:(x:number,y:number)=>edit(()=>commands.lineTo(x,y)),
  close:()=>edit(()=>commands.close()),
  reset:()=>edit(()=>commands.reset()),
  addArc:(rect:SkRect,start:number,sweep:number)=>edit(()=>commands.addArc(rect,start,sweep)),
  addOval:(rect:SkRect)=>edit(()=>commands.addOval(rect)),
  path:():SkPath=>modern?(snapshot??=commands.build!()):commands as unknown as SkPath,
  dispose(){if(disposed)return;disposed=true;snapshot?.dispose();snapshot=undefined;commands.dispose()},
 };
}

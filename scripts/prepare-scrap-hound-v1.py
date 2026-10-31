"""Pack genuine-alpha generated hound sprites; no repaint, keying or per-pose scaling."""
from pathlib import Path
import json, math, hashlib
import numpy as np
from scipy import ndimage as nd
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/scrap-hound-v1'; OUT=ROOT/'public/survival/scrap-hound-v1'
OUT.mkdir(parents=True,exist_ok=True)
VIEWS=['down','down-left','right','up-right','up']; CELL=384; ANCHOR=(192,320); SCALE=.84
# Reviewed source-cell landmarks. Refinement follows only red within an 11px seed disk.
EYES={
 'down':[[[161,229],[196,231]],[[165,228],[201,228]],[[165,228],[200,229]],[[168,233],[204,235]],[[161,253],[199,253]],[[176,218],[211,219]],[[187,193],[222,195]],[[165,253],[200,253]],[[161,203],[195,212]],[[181,237],[213,247]],[[197,261],[233,261]],[]],
 'down-left':[[[79,233],[52,234]],[[71,229]],[[69,236],[43,239]],[[68,239]],[[87,220]],[[88,205]],[[86,159]],[[109,210]],[[166,38]],[[104,204]],[[72,213]],[]],
 'right':[[[334,180]],[[356,186]],[[333,180]],[[328,178]],[[334,210]],[[332,129]],[[341,145]],[[331,202]],[[287,82]],[[347,164]],[[336,194]],[]],
 'up-right':[[] for _ in range(12)],'up':[[] for _ in range(12)]}
VENTS={
 'down':[[[148,97],[212,96]],[[151,89],[219,90]],[[144,96],[211,94]],[[146,96],[213,96]],[[145,110],[219,109]],[[158,80],[229,80]],[[151,103],[227,101]],[[149,113],[218,113]],[[154,77],[219,77]],[[156,93],[228,94]],[[140,133],[202,115]],[]],
 'down-left':[[[169,108]],[[166,109]],[[165,107]],[[163,109]],[[180,114]],[[189,99]],[[201,92]],[[182,114]],[],[[188,77]],[],[]],
 'right':[[[123,154],[135,145]],[[153,150],[166,140]],[[140,149],[152,142]],[[123,163],[132,153]],[[152,115]],[[136,107],[145,100]],[[162,125],[173,120]],[[157,143]],[[98,66]],[[146,55],[156,48]],[[148,134]],[]],
 'up-right':[[[166,140],[181,145]],[[165,143],[181,147]],[[163,133],[177,138]],[[171,143],[186,146]],[[157,148],[173,153]],[[174,108],[190,110]],[[144,124],[160,126]],[[161,124],[177,128]],[[159,104],[177,106]],[[159,105],[175,111]],[[187,143]],[]],
 'up':[[[158,106],[200,106]],[[159,103],[195,104]],[[167,109],[199,110]],[[177,103],[208,103]],[[168,164],[205,166]],[[166,109],[201,109]],[[164,124],[199,124]],[[168,154],[206,154]],[[182,100],[213,101]],[[156,114],[193,118]],[[189,157],[223,164]],[]]}

def parts(a):
 lab,n=nd.label(a[:,:,3]>=100,np.ones((3,3))); sz=np.bincount(lab.ravel());sz[0]=0
 ids=np.argsort(sz)[-12:];ids=sorted(ids,key=lambda i:(int(nd.center_of_mass(lab==i)[0]//(a.shape[0]/3)),nd.center_of_mass(lab==i)[1]));assert min(sz[i] for i in ids)>25000
 main=np.zeros(lab.shape,dtype=np.int16)
 for j,i in enumerate(ids,1):main[lab==i]=j
 dist,nearest=nd.distance_transform_edt(main==0,return_indices=True);own=main[tuple(nearest)];own[(a[:,:,3]==0)|(dist>3)]=0
 sprites=[]
 for j in range(1,13):
  yy,xx=np.where(own==j);l,t,r,b=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
  pixels=a[t:b,l:r].copy();pixels[own[t:b,l:r]!=j]=0;sprites.append((Image.fromarray(pixels),(l,t,r,b)))
 return sprites

def landmark(a,seed,col,row,cw,ch,l,t,left,top,size,part,default_r):
 x0=seed[0]+col*cw;y0=seed[1]+row*ch
 yy,xx=np.ogrid[:a.shape[0],:a.shape[1]];rr,gg,bb,aa=a.transpose(2,0,1).astype(float)
 mask=((xx-x0)**2+(yy-y0)**2<=11**2)&(rr>190)&(gg<105)&(bb<95)&(rr>gg*2.3)&(aa>200)
 ey,ex=np.where(mask)
 if len(ex)>=8:
  x,y=float(ex.mean()),float(ey.mean());radius=max(2.5,min(7,math.sqrt(len(ex)/math.pi)*.95))
 else:x,y,radius=x0,y0,default_r
 assert a[min(a.shape[0]-1,round(y)),min(a.shape[1]-1,round(x)),3]>100,(x,y)
 return [round(left+(x-l)*size[0]/part.width,2),round(top+(y-t)*size[1]/part.height,2),round(radius*SCALE,2)]

reports=[];eyes={};vents={};thumb=None
for heading in VIEWS:
 a=np.array(Image.open(SOURCE/(heading+'.png')).convert('RGBA'));hh,ww=a.shape[:2];cw,ch=ww/4,hh/3
 assert (a[:,:,3]==0).sum()>ww*hh*.4
 sprites=parts(a);origin_x=float(np.mean([(b[0]+b[2])/2-i*cw for i,(_,b) in enumerate(sprites[:4])]))
 sheet=Image.new('RGBA',(1536,1152));direction_eyes=[];direction_vents=[];frames=[]
 for f,(part,(l,t,r,b)) in enumerate(sprites):
  col,row=f%4,f//4;size=tuple(round(v*SCALE)for v in part.size);left=round(ANCHOR[0]+(l-col*cw-origin_x)*SCALE);top=ANCHOR[1]-size[1]
  assert min(left,top,CELL-left-size[0],CELL-top-size[1])>=9,(heading,f,left,top,size)
  tile=Image.new('RGBA',(CELL,CELL));tile.paste(part.resize(size,Image.Resampling.LANCZOS),(left,top));sheet.paste(tile,(col*CELL,row*CELL))
  convert=lambda seed,default:landmark(a,seed,col,row,cw,ch,l,t,left,top,size,part,default)
  direction_eyes.append([convert(s,4)for s in EYES[heading][f]]);direction_vents.append([convert(s,4.8)for s in VENTS[heading][f]])
  frames.append({'frame':f,'sourceBounds':[l,t,r-l,b-t],'contentBounds':[left,top,*size]})
  if heading=='down-left'and f==0:thumb=tile
 sheet.save(OUT/(heading+'.webp'),'WEBP',quality=92,method=6)
 eyes[heading]=direction_eyes;vents[heading]=direction_vents;reports.append({'direction':heading,'source':heading+'.png','sourceSize':[ww,hh],'sourceCell':[cw,ch],'sourceOriginX':round(origin_x,3),'frames':frames,'bytes':(OUT/(heading+'.webp')).stat().st_size})
thumb.save(OUT/'thumbnail.webp','WEBP',quality=92,method=6)
image=lambda h:'/survival/scrap-hound-v1/'+h+'.webp'
directions={name:{'image':image(h),'mirror':mirror,'source':h}for name,h,mirror in [('down','down',False),('down-right','down-left',True),('right','right',False),('up-right','up-right',False),('up','up',False),('up-left','up-right',True),('left','right',True),('down-left','down-left',False)]}
meta={'version':1,'name':'Scrap Hound','cell':[384,384],'anchor':list(ANCHOR),'columns':4,'rows':3,'idleFrame':0,'walkFrames':[0,1,2,3],'combatFrames':[4,5,6,7],'windupFrames':[4],'strikeFrames':[5,6],'recoveryFrames':[7],'hitFrames':[8,9],'disabledFrames':[10,11],'directions':directions,'eyes':eyes,'vents':vents,'packing':{'scale':SCALE,'perFrameScale':False,'perViewScale':False,'registration':'Fixed per-view walk origin X; translation-only feet baseline Y. No per-frame resizing.','emissiveCoordinates':'Packed source-cell [x,y,r]; indexed by source heading/frame. Hidden rear eyes intentionally absent. Visible dark dorsal apertures retain reviewed landmarks.'},'sources':reports,'provenance':'art-source/scrap-hound-v1/provenance.json'}
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
for h in VIEWS:
 a=np.array(Image.open(OUT/(h+'.webp')).convert('RGBA'));seen=set()
 for f in range(12):
  cell=a[f//4*384:(f//4+1)*384,f%4*384:(f%4+1)*384];alpha=cell[:,:,3]
  assert max(alpha[:9].max(),alpha[-9:].max(),alpha[:,:9].max(),alpha[:,-9:].max())==0
  assert (alpha>16).sum()>15000
  seen.add(hashlib.sha256(cell.tobytes()).hexdigest())
 assert len(seen)==12
print(json.dumps({'views':VIEWS,'poses':60,'scale':SCALE,'totalWebpBytes':sum(p.stat().st_size for p in OUT.glob('*.webp')),'allGuttersAtLeast9':True}))

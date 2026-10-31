"""Pack generated alpha sprites with one shared scale and translation-only registration.
No recolouring, alpha keying, painting or per-frame resizing.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/skitter-v1'; OUT=ROOT/'public/survival/skitter-v1'; OUT.mkdir(parents=True,exist_ok=True)
VIEWS=['down','down-left','right','up-right','up']; CELL=384; ANCHOR=(192,320); SCALE=.86
# Manually reviewed red lens landmarks, cell-relative in the 362px generated sources.
LENSES={
'down':[(205,204),(217,200),(199,204),(181,206),(215,200),(206,195),(205,195),(193,173),(229,148),(221,163),(208,210),(172,200)],
'down-left':[(153,211),(156,220),(143,212),(126,219),(148,216),(163,210),(138,198),(133,183),(212,140),(156,161),(138,204),(144,209)],
'right':[(258,223),(251,229),(248,229),(240,229),(265,230),(267,206),(299,202),(249,181),(265,158),(267,166),(267,211),(253,222)],
'up-right':[None]*12,'up':[None]*12}
def parts(a):
 lab,n=nd.label(a[:,:,3]>=100,np.ones((3,3))); sz=np.bincount(lab.ravel());sz[0]=0
 ids=np.argsort(sz)[-12:]; ids=sorted(ids,key=lambda i:(int(nd.center_of_mass(lab==i)[0]//362),nd.center_of_mass(lab==i)[1])); assert min(sz[i] for i in ids)>30000
 main=np.zeros(lab.shape,dtype=np.int16)
 for j,i in enumerate(ids,1): main[lab==i]=j
 dist,nearest=nd.distance_transform_edt(main==0,return_indices=True);own=main[tuple(nearest)];own[(a[:,:,3]==0)|(dist>3)]=0
 out=[]
 for j in range(1,13):
  yy,xx=np.where(own==j);l,t,r,b=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
  rgba=a[t:b,l:r].copy();rgba[own[t:b,l:r]!=j]=0;out.append((Image.fromarray(rgba),(l,t,r,b)))
 return out
reports=[];eyes={};thumb=None
for heading in VIEWS:
 a=np.array(Image.open(SOURCE/(heading+'.png')).convert('RGBA'));assert a.shape==(1086,1448,4)
 sprites=parts(a); origin_x=float(np.mean([(b[0]+b[2])/2-i*362 for i,(_,b) in enumerate(sprites[:4])]))
 sheet=Image.new('RGBA',(1536,1152)); direction_eyes=[];frames=[]
 for f,(part,(l,t,r,b)) in enumerate(sprites):
  col,row=f%4,f//4;size=tuple(round(v*SCALE)for v in part.size);left=round(ANCHOR[0]+(l-col*362-origin_x)*SCALE);top=ANCHOR[1]-size[1]
  assert min(left,top,CELL-left-size[0],CELL-top-size[1])>=9,(heading,f,left,top,size)
  tile=Image.new('RGBA',(CELL,CELL));tile.paste(part.resize(size,Image.Resampling.LANCZOS),(left,top));sheet.paste(tile,(col*CELL,row*CELL))
  seed=LENSES[heading][f];frame_eyes=[]
  if seed:
   src=a[row*362:(row+1)*362,col*362:(col+1)*362];yy,xx=np.ogrid[:362,:362];rr,gg,bb,aa=src.transpose(2,0,1).astype(float)
   mask=((xx-seed[0])**2+(yy-seed[1])**2<=12**2)&(rr>190)&(gg<100)&(bb<90)&(rr>gg*2.4)&(aa>200)
   ey,ex=np.where(mask);assert len(ex)>50,(heading,f,seed)
   cx,cy=float(ex.mean()),float(ey.mean());radius=max(4,min(10,(max(np.ptp(ex),np.ptp(ey))+1)/2))
   px=left+(cx-(l-col*362))*size[0]/part.width;py=top+(cy-(t-row*362))*size[1]/part.height
   frame_eyes=[[round(px,2),round(py,2),round(radius*SCALE,2)]]
  direction_eyes.append(frame_eyes);frames.append({'frame':f,'sourceBounds':[l,t,r-l,b-t],'contentBounds':[left,top,*size]})
  if heading=='down-left' and f==0:thumb=tile
 sheet.save(OUT/(heading+'.webp'),'WEBP',quality=92,method=6)
 eyes[heading]=direction_eyes;reports.append({'direction':heading,'source':heading+'.png','sourceSize':[1448,1086],'sourceCell':[362,362],'sourceOriginX':round(origin_x,3),'frames':frames,'bytes':(OUT/(heading+'.webp')).stat().st_size})
thumb.save(OUT/'thumbnail.webp','WEBP',quality=92,method=6)
image=lambda h:'/survival/skitter-v1/'+h+'.webp'
directions={name:{'image':image(h),'mirror':mirror,'source':h}for name,h,mirror in [('down','down',False),('down-right','down-left',True),('right','right',False),('up-right','up-right',False),('up','up',False),('up-left','up-right',True),('left','right',True),('down-left','down-left',False)]}
meta={'version':1,'name':'Skitter','cell':[384,384],'anchor':list(ANCHOR),'columns':4,'rows':3,'idleFrame':0,'walkFrames':[0,1,2,3],'combatFrames':[4,5,6,7],'windupFrames':[4],'strikeFrames':[5,6],'recoveryFrames':[7],'hitFrames':[8,9],'disabledFrames':[10,11],'directions':directions,'eyes':eyes,'packing':{'scale':SCALE,'perFrameScale':False,'perViewScale':False,'registration':'Fixed per-view walk origin X; translation-only feet baseline Y. Painted shell displacement preserved.','eyeCoordinates':'Packed source-cell coordinates [x,y,r]; indexed by source heading/frame. Rear eyes intentionally absent. Disabled lens positions supplied for runtime darkening.'},'sources':reports,'provenance':'art-source/skitter-v1/provenance.json'}
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
# Check actual alpha gutters, unique cell payloads and source preservation.
for h in VIEWS:
 im=Image.open(OUT/(h+'.webp')).convert('RGBA');arr=np.array(im);seen=set()
 for f in range(12):
  cell=arr[f//4*384:(f//4+1)*384,f%4*384:(f%4+1)*384];alpha=cell[:,:,3]
  assert max(alpha[:9].max(),alpha[-9:].max(),alpha[:,:9].max(),alpha[:,-9:].max())==0
  assert (alpha>16).sum()>15000
  seen.add(hash(cell.tobytes()))
 assert len(seen)==12
print(json.dumps({'views':VIEWS,'poses':60,'scale':SCALE,'totalWebpBytes':sum(p.stat().st_size for p in OUT.glob('*.webp')),'allGuttersAtLeast9':True}))

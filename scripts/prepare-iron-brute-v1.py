"""Pack native-alpha generated tank poses with one shared scale.
No painting, colour keying or per-pose fitting. See source/provenance.json.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as nd
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/iron-brute-v1'; OUT=ROOT/'public/survival/iron-brute-v1'; OUT.mkdir(parents=True,exist_ok=True)
VIEWS=['down','down-left','right','up-right','up'];CELL=384;ANCHOR=(192,330);SCALE=.86
# Manually reviewed eye landmarks in 313.5px source cells. Restricted local
# refinement never searches orange armour or the whole robot for red pixels.
EYES={
'down':[[[160,98],[175,97]],[[161,97],[175,96]],[[158,101],[172,102]],[[154,95],[168,96]],[[163,148],[177,148]],[[162,105],[175,105]],[[155,158],[170,158]],[[155,103],[169,103]],[[155,96],[169,96]],[[151,97],[163,95]],[[145,103],[159,104]],[[137,88],[151,89]],[[160,61],[175,62]],[[151,61],[165,61]],[[216,125]],[[155,142],[169,144]]],
'down-left':[[[171,113],[187,114]],[[168,117],[181,115]],[[170,123],[184,123]],[[180,120],[192,120]],[[166,161],[180,162]],[[165,126],[180,127]],[[137,183],[153,183]],[[173,130],[185,132]],[[153,113],[167,114]],[[154,116],[169,116]],[[151,117],[165,118]],[[122,108],[136,109]],[[151,71],[165,71]],[[143,67],[157,66]],[[187,115],[199,121]],[[163,124],[176,125]]],
'right':[[[211,114]],[[229,108]],[[223,113]],[[217,121]],[[230,169]],[[229,108]],[[218,184]],[[203,108]],[[198,103]],[[224,108]],[[207,123]],[[174,90]],[[203,59]],[[184,56]],[[248,173]],[[204,119]]],
'up-right':[[] for _ in range(16)],'up':[[] for _ in range(16)]}
HANDS={
'down':[[275,190],[273,187],[260,207],[278,200],[278,210],[253,34],[273,248],[270,195],[262,155],[262,134],[249,158],[271,151],[212,142],[279,148],[284,254],[266,224]],
'down-left':[[286,207],[283,187],[267,204],[277,205],[287,234],[249,48],[269,266],[276,210],[261,156],[270,151],[250,177],[274,146],[205,140],[276,155],[280,251],[265,233]],
'right':[[275,191],[282,184],[278,190],[274,194],[279,243],[263,39],[277,256],[270,200],[272,137],[274,124],[272,191],[275,140],[207,144],[280,140],[278,263],[274,211]],
'up-right':[[281,207],[272,194],[268,205],[270,190],[277,252],[253,26],[278,254],[276,211],[274,110],[274,105],[274,199],[279,127],[205,153],[273,133],[279,247],[262,224]],
'up':[[264,197],[272,187],[269,188],[267,200],[274,244],[253,28],[272,256],[268,201],[269,133],[273,102],[262,235],[270,145],[202,136],[279,136],[279,229],[264,201]]}
# Grip is the centre of held victim's torso, using the open-arms pose11.
GRIP={'down':[143,137],'down-left':[137,155],'right':[198,144],'up-right':[157,129],'up':[154,137]}
# Tight foreground forearm/fist rectangles for victim compositing. These do
# not cover the visor/head or the central open chest gap in hold/release poses.
FOREARMS={
'down':{11:[[0,125,80,82],[235,119,71,87]],12:[[63,106,94,79],[156,104,80,82]],13:[[-10,111,105,98],[245,102,100,104]]},
'down-left':{11:[[-29,119,105,85],[236,112,74,84]],12:[[60,109,95,82],[154,108,79,81]],13:[[-17,108,105,102],[247,100,94,105]]},
'right':{11:[[-2,112,83,87],[240,106,78,91]],12:[[112,99,84,88],[193,103,54,81]],13:[[-9,102,111,112],[237,95,89,113]]},
'up-right':{11:[[-17,108,88,88],[243,103,74,86]],12:[[69,108,89,84],[157,111,74,79]],13:[[-13,85,108,112],[246,87,94,101]]},
'up':{11:[[-24,110,103,86],[238,101,76,91]],12:[[64,104,93,81],[156,103,78,80]],13:[[-23,103,107,103],[244,88,100,108]]}}

def parts(a,count,cols,rows):
 lab,n=nd.label(a[:,:,3]>=100,np.ones((3,3)));sz=np.bincount(lab.ravel());sz[0]=0
 ids=np.argsort(sz)[-count:];ids=sorted(ids,key=lambda i:(int(nd.center_of_mass(lab==i)[0]//(a.shape[0]/rows)),nd.center_of_mass(lab==i)[1]));assert min(sz[i]for i in ids)>20000
 main=np.zeros(lab.shape,dtype=np.int16)
 for j,i in enumerate(ids,1):main[lab==i]=j
 dist,nearest=nd.distance_transform_edt(main==0,return_indices=True);own=main[tuple(nearest)];own[(a[:,:,3]==0)|(dist>3)]=0
 out=[]
 for j in range(1,count+1):
  yy,xx=np.where(own==j);l,t,r,b=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1);rgba=a[t:b,l:r].copy();rgba[own[t:b,l:r]!=j]=0;out.append((Image.fromarray(rgba),(l,t,r,b)))
 return out

def refine(a,seed,ox,oy):
 sx,sy=seed;y,x=np.ogrid[:a.shape[0],:a.shape[1]];r,g,b,al=a.transpose(2,0,1).astype(float)
 mask=((x-(sx+ox))**2+(y-(sy+oy))**2<=7.5**2)&(r>160)&(r>g*4)&(g<66)&(b<90)&(al>200)
 yy,xx=np.where(mask);assert len(xx)>3,('Missing lens',seed)
 return [float(xx.mean()-ox),float(yy.mean()-oy)],max(2.5,min(7,(max(np.ptp(xx),np.ptp(yy))+1)/2))

eyes={};hands={};grip={};forearms={};reports=[];thumb=None
for h in VIEWS:
 a=np.array(Image.open(SOURCE/(h+'.png')).convert('RGBA'));assert a.shape==(1254,1254,4);cw=ch=313.5;sprites=parts(a,16,4,4)
 origin=float(np.mean([(b[0]+b[2])/2-i*cw for i,(_,b)in enumerate(sprites[:4])]))
 sheet=Image.new('RGBA',(1536,1536));outEyes=[];outHands=[];outArms={};frames=[]
 for f,(part,(l,t,r,b))in enumerate(sprites):
  col,row=f%4,f//4;size=[round(part.width*SCALE),round(part.height*SCALE)];left=round(ANCHOR[0]+(l-col*cw-origin)*SCALE);top=ANCHOR[1]-size[1]
  assert left>=9 and left+size[0]<=375 and top>=9 and top+size[1]<=375,(h,f,left,top,size)
  scaled=part.resize(size,Image.Resampling.LANCZOS);sheet.alpha_composite(scaled,(col*384+left,row*384+top))
  def point(p):return [round(left+(p[0]+col*cw-l)*size[0]/part.width,2),round(top+(p[1]+row*ch-t)*size[1]/part.height,2)]
  frameEyes=[]
  for seed in EYES[h][f]:
   q,radius=refine(a,seed,col*cw,row*ch);x,y=point(q);frameEyes.append([x,y,round(radius*SCALE,2)])
  outEyes.append(frameEyes);outHands.append(point(HANDS[h][f]));frames.append({'frame':f,'sourceBounds':[l,t,r-l,b-t],'contentBounds':[left,top,*size]})
  if f==11:grip[h]=point(GRIP[h])
  if f in FOREARMS[h]:
   outArms[str(f)]=[]
   for x,y,w,height in FOREARMS[h][f]:
    px,py=point([x,y]);pr,pb=point([x+w,y+height]);px=max(0,px);py=max(0,py);pr=min(384,pr);pb=min(384,pb);outArms[str(f)].append([round(px,2),round(py,2),round(pr-px,2),round(pb-py,2)])
  if h=='down-left' and f==0:thumb=scaled.copy()
 sheet.save(OUT/(h+'.webp'),format='WEBP',quality=92,method=6,exact=True)
 eyes[h]=outEyes;hands[h]=outHands;forearms[h]=outArms;reports.append({'direction':h,'source':h+'.png','sourceSize':[1254,1254],'sourceOriginX':round(origin,2),'frames':frames,'bytes':(OUT/(h+'.webp')).stat().st_size})

thumb.thumbnail((236,236),Image.Resampling.LANCZOS);icon=Image.new('RGBA',(256,256));icon.alpha_composite(thumb,((256-thumb.width)//2,(256-thumb.height)//2));icon.save(OUT/'thumbnail.webp',quality=94,method=6,exact=True)
clawParts=parts(np.array(Image.open(SOURCE/'claws.png').convert('RGBA')),6,3,2);claws={}
for h,(part,bounds)in zip(VIEWS,clawParts[:5]):
 part.thumbnail((222,222),Image.Resampling.LANCZOS);sprite=Image.new('RGBA',(256,256));sprite.alpha_composite(part,((256-part.width)//2,(256-part.height)//2));sprite.save(OUT/('claw-'+h+'.webp'),quality=94,method=6,exact=True);claws[h]='/survival/iron-brute-v1/claw-'+h+'.webp'
image=lambda h:'/survival/iron-brute-v1/'+h+'.webp'
directions={name:{'image':image(h),'source':h,'mirror':mirror}for name,h,mirror in [('down','down',False),('down-right','down-left',True),('right','right',False),('up-right','up-right',False),('up','up',False),('up-left','up-right',True),('left','right',True),('down-left','down-left',False)]}
meta={'version':1,'name':'Iron Brute','cell':[384,384],'anchor':list(ANCHOR),'columns':4,'rows':4,'idleFrame':0,'walkFrames':[0,1,2,3],'jumpFrames':[4,5,6,7],'grappleFrames':[8,9,10,11,12,13],'disabledFrames':[14,15],'directions':directions,'eyes':eyes,'hands':hands,'grip':grip,'forearms':forearms,'claws':claws,'clawCell':[256,256],'clawAnchor':[128,128],'packing':{'scale':SCALE,'perFrameScale':False,'perViewScale':False,'registration':'Common scale; fixed per-view walking origin X and foot baseline Y. Source pose displacement retained.','eyeCoordinates':'Source-cell [x,y,r], manually measured local visor ROIs. Rear eyes hidden. Disabled eye positions retained for runtime darkening.','handCoordinates':'Source-cell [x,y] at claw wrist/muzzle per pose.','gripCoordinates':'Source-cell [x,y] at chest holding space, open-arms pose11.','forearmCoordinates':'Source-cell [x,y,width,height] per foreground limb patch in poses11/12/13; no head redraw.'},'sources':reports,'provenance':'art-source/iron-brute-v1/provenance.json'}
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
for h in VIEWS:
 a=np.array(Image.open(OUT/(h+'.webp')).convert('RGBA'));seen=set()
 for f in range(16):
  p=a[f//4*384:(f//4+1)*384,f%4*384:(f%4+1)*384];al=p[:,:,3]
  assert max(al[:9].max(),al[-9:].max(),al[:,:9].max(),al[:,-9:].max())==0,(h,f,'crop')
  assert (al>16).sum()>12000;seen.add(hash(p.tobytes()))
 assert len(seen)==16
assert sum(p.stat().st_size for p in OUT.glob('*.webp'))<5000000
print(json.dumps({'views':VIEWS,'poses':80,'scale':SCALE,'totalWebpBytes':sum(p.stat().st_size for p in OUT.glob('*.webp')),'allGuttersAtLeast9':True}))

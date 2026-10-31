"""Generate runtime clip metadata for arms/equipment, without editing pixels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import contourpy
root=Path(__file__).resolve().parents[1]
arms={
 'right':[
  [[(157,228),(197,260)],[(209,231),(213,253)]],
  [[(163,227),(214,231)],[(224,229),(287,226)]],
  [[(145,222),(190,219)],[(218,231),(289,231)]],
  [[(135,206),(180,207)],[(220,219),(308,220)]],
  [[(110,207),(133,214)],[(213,219),(289,219)]],
  [[(172,236),(211,260)],[(213,237),(241,271)]]],
 'up-right':[
  [[(189,235),(224,249)],[(208,226),(226,229)]],
  [[(199,232),(236,218)],[(243,204),(268,178)]],
  [[(205,232),(223,217)],[(234,204),(264,172)]],
  [[(145,226),(180,211)],[(220,199),(267,152)]],
  [[(189,223),(209,218)],[(223,206),(265,162)]],
  [[(211,231),(241,252)],[(228,226),(246,233)]]],
 'down-right':[
  [[(151,222),(184,252)],[(214,237),(225,275)]],
  [[(99,215),(126,228)],[(168,230),(207,274)]],
  [[(95,199),(128,215)],[(165,234),(209,275)]],
  [[(71,192),(105,201)],[(171,219),(220,250)]],
  [[(78,186),(97,199)],[(165,216),(221,253)]],
  [[(139,223),(156,243)],[(207,241),(231,277)]]],
 'down':[
  [[(172,238),(193,259)],[(215,242),(205,272)]],
  [[(151,212),(170,232)],[(221,239),(215,270)]],
  [[(144,208),(170,224)],[(219,238),(216,270)]],
  [[(130,192),(150,203)],[(220,225),(211,264)]],
  [[(147,199),(169,209)],[(221,224),(214,263)]],
  [[(167,237),(190,255)],[(215,238),(198,277)]]],
 'up':[
  [[(138,232),(119,244)],[(219,228),(226,230)]],
  [[(166,139),(158,163)],[(234,195),(236,209)]],
  [[(131,149),(136,187)],[(247,219),(268,213)]],
  [[(122,145),(125,190)],[(236,216),(268,194)]],
  [[(123,148),(129,182)],[(236,225),(252,199)]],
  [[(154,237),(142,249)],[(251,238),(265,253)]]]}
ends={
 'right':[[[300,174],[239,280]],[[265,100],[235,292]],[[272,103],[260,286]],[[271,106],[260,291]],[[271,99],[265,294]],[[307,164],[221,280]]],
 'up-right':[[[282,155],[235,257]],[[225,85],[236,263]],[[238,80],[252,256]],[[224,83],[253,245]],[[236,76],[249,249]],[[279,155],[231,250]]],
 'down-right':[[[268,215],[207,305]],[[209,175],[171,293]],[[215,182],[169,295]],[[215,164],[169,284]],[[212,150],[168,290]],[[273,197],[201,298]]],
 'down':[[[128,195],[251,304]],[[183,194],[201,319]],[[185,194],[201,317]],[[190,179],[199,310]],[[197,184],[202,309]],[[132,195],[246,308]]],
 'up':[[[91,156],[121,244]],[[186,56],[172,130]],[[185,54],[127,132]],[[180,55],[121,135]],[[178,58],[127,136]],[[90,156],[143,279]]]
}
arrows={
 'right':[[[199,259],[290,304]],[[207,214],[337,212]],[[190,210],[344,207]],[[184,203],[356,203]]],
 'up-right':[[[206,240],[279,290]],[[220,219],[305,125]],[[219,215],[309,110]],[[190,202],[307,105]]],
 'down-right':[[[185,251],[266,333]],[[130,218],[255,311]],[[130,217],[262,319]],[[111,201],[267,287]]],
 'down':[[[187,276],[193,340]],[[171,232],[199,343]],[[173,222],[200,339]],[[164,205],[197,333]]],
 'up':[[[140,235],[82,280]],[[186,200],[186,55]],[[184,210],[184,53]],[[180,210],[180,43]]]
}
necks={'up':[211,221,225,230,229,219],'up-right':[214,219,228,229,230,218],'right':[216,218,216,218,219,216],'down-right':[223,225,224,220,219,219],'down':[216,222,222,220,218,221]}
scales={'up':.45,'up-right':.46,'right':.46,'down-right':.49,'down':.49}
def region(paths,width):
 im=Image.new('1',(384,384));draw=ImageDraw.Draw(im)
 for points in paths:
  draw.line(points,fill=1,width=width,joint='curve')
  for x,y in (points[0],points[-1]):draw.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=1)
 return np.asarray(im)
def simplify(points,tolerance=.8):
 if len(points)<3:return points
 delta=points[-1]-points[0];length=np.linalg.norm(delta);offset=points-points[0]
 distances=abs(delta[0]*offset[:,1]-delta[1]*offset[:,0])/length if length else np.linalg.norm(offset,axis=1)
 index=int(distances.argmax())
 if distances[index]<=tolerance:return points[[0,-1]]
 return np.vstack((simplify(points[:index+1],tolerance)[:-1],simplify(points[index:],tolerance)))
def outlines(mask):
 result=[]
 for contour in contourpy.contour_generator(z=mask.astype(float)).lines(.5):
  if len(contour)<10:continue
  p=simplify(contour)[:-1]
  area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,np.roll(p,-1,axis=0)))
  if abs(area)<18:continue
  # Preserve opposite windings for holes in the silhouette.
  result.append(p.tolist())
 return result
registered={}
for view in arms:
 source=Image.open(root/'public/survival/scrap-runner/bow-v1'/f'{view}.webp');frames=[]
 for frame,arm_paths in enumerate(arms[view]):
  rgba=np.asarray(source.crop((frame*384,0,(frame+1)*384,384)))
  red,green,blue,alpha=rgba.transpose(2,0,1).astype(float)
  warm=(red>green*1.35)&(red>blue*1.6)&(red>95)&(green<210)
  cool=(green>red*1.15)&(blue>red*1.05)&(green>35)
  arm_region=region(arm_paths,48)
  teal=(green>red*1.15)&(green>35)&(blue>red*1.05)&(alpha>120)
  labels,count=ndimage.label(ndimage.binary_closing(teal,iterations=2));wraps=[]
  for label in range(1,count+1):
   wy,wx=np.where(labels==label)
   if len(wx)>65:wraps.append((float(wx.mean()),float(wy.mean())))
  wraps.sort(key=lambda p:p[1])
  begin,end=[np.array(p) for p in ends[view][frame]]
  bow_path=[tuple(begin),*wraps,tuple(end)]
  bow_region=region([bow_path],28)
  wood=(red>green*1.45)&(red>110)&(blue<green*.9)
  seed=((warm&arm_region)|((wood|cool)&bow_region))&(alpha>100)
  mask=ndimage.binary_dilation(seed,iterations=3)&(arm_region|bow_region)&(alpha>15)
  # Discard detached colour flecks; preserve holes between limbs and string.
  pieces,_=ndimage.label(mask);sizes=np.bincount(pieces.ravel());sizes[0]=0
  mask=sizes[pieces]>60
  yy,_=np.indices(alpha.shape)
  hair=(alpha>170)&(red<115)&(green<100)&(blue<100)&(yy>130)&(yy<168)
  cols=np.where(hair.sum(axis=0)>18)[0];runs=np.split(cols,np.where(np.diff(cols)>1)[0]+1);run=max(runs,key=len)
  centre=float((run[0]+run[-1])/2);scale=scales[view]
  draw_hand=arm_paths[0][-1] if view!='up' else arm_paths[1][-1]
  string=[begin.tolist(),draw_hand,end.tolist()]
  frames.append({'layers':outlines(mask),'x':round(-centre*scale,3),'y':round(-46-necks[view][frame]*scale,3),'scale':scale,'string':string,'arrow':arrows[view][frame] if frame<4 else []})
 registered[view]=frames
(root/'src/bow-registration.json').write_text(json.dumps(registered,separators=(',',':'))+'\n')
print('Registered 30 arms/equipment layers.')

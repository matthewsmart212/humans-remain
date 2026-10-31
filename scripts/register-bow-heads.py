"""Trace the existing head alpha for runtime clipping; never rewrite artwork."""
from pathlib import Path
import json,re
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage
import contourpy
root=Path(__file__).resolve().parents[1]
art_text=(root/'src/survivor-art.ts').read_text()
art=json.loads('{'+art_text.split('>={',1)[1].split('\n};',1)[0]+'}')
front=(root/'src/runner-combat-head.ts').read_text();rear=(root/'src/bow-composition.ts').read_text()
result={}
for view in ['down','down-right','right','up-right','up']:
 text=rear if view in ['up','up-right'] else front
 match=re.search(r"(?:'"+re.escape(view)+r"'|\b"+re.escape(view)+r"):(\[\[.*?\]\])[,\n]",text)
 outline=json.loads(match[1]);s=art[view]['idle'];x,y,w,h=s['crop']
 sheet='motion-a-v1.webp' if s['sheet']=='survivorBase' else 'motion-b-v1.webp'
 rgba=np.asarray(Image.open(root/'public/survival/scrap-runner'/sheet).crop((x,y,x+w,y+h)))
 region=Image.new('1',(w,h));ImageDraw.Draw(region).polygon([tuple(p) for p in outline],fill=1)
 mask=(rgba[:,:,3]>5)&np.asarray(region)
 mask=ndimage.binary_fill_holes(mask)
 # Padding closes contours at a crop edge, and retains all original hair tips.
 contour=max(contourpy.contour_generator(z=np.pad(mask,1).astype(float)).lines(.5),key=len)-1
 def simplify(p):
  if len(p)<3:return p
  d=p[-1]-p[0];length=np.linalg.norm(d);o=p-p[0]
  distance=abs(d[0]*o[:,1]-d[1]*o[:,0])/length if length else np.linalg.norm(o,axis=1)
  i=int(distance.argmax())
  if distance[i]<.4:return p[[0,-1]]
  return np.vstack((simplify(p[:i+1])[:-1],simplify(p[i:])))
 p=simplify(contour)[:-1]
 area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,np.roll(p,-1,axis=0)))
 if area<0:p=p[::-1]
 result[view]=p.tolist()
(root/'src/bow-head-outlines.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print('Traced five original head silhouettes; unchanged source art and scale.')

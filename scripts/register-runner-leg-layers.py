"""Measure source leg bounds and opaque outlines. Never modifies PNG pixels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import ConvexHull

root = Path(__file__).resolve().parents[1]
a = np.array(Image.open(root/'public/survival/scrap-runner/scrap-runner-leg-layers-v1.png'))
labels, _ = ndimage.label(a[:,:,3] > 235)
boxes = []
for i, s in enumerate(ndimage.find_objects(labels),1):
    if s and np.count_nonzero(labels[s]==i)>10000:
        y,x=s
        boxes.append((x.start,y.start,x.stop,y.stop))
boxes.sort(key=lambda b:b[1])
assert len(boxes)==6
boxes=sum([sorted(boxes[i:i+2]) for i in range(0,6,2)],[])
output={}
for direction,pair in zip(['right','down-right','up-right'],[boxes[:2],boxes[2:4],boxes[4:]]):
    legs=[]
    for x0,y0,x1,y1 in pair:
        # The unused upper trouser section is an attachment tab, not a shin.
        top=y0+int((y1-y0)*.46)
        rows=list(range(top,y1,6))+[y1-1]
        left=[];right=[]
        for y in rows:
            xs=np.flatnonzero(a[y,x0:x1,3]>235)
            if len(xs):
                left.append([int(xs.min()),y-top]);right.append([int(xs.max()),y-top])
        root_x=(left[0][0]+right[0][0])/2
        legs.append(dict(crop=[x0,top,x1-x0,y1-top],root=[root_x,0],outline=left+right[::-1]))
    output[direction]=legs
(root/'src/runner-leg-layers.json').write_text(json.dumps(output,separators=(',',':'))+'\n')
print('Registered six complete leg layers and their source silhouettes.')

# Keep the orange rear arm intact where it overlaps a raised source boot.
# These are source-coordinate clipping outlines, not new or modified pixels.
frames=json.loads((root/'src/runner-cycle-frames.json').read_text())['down-right']
source=np.array(Image.open(root/'public/survival/scrap-runner/scrap-runner-down-right-walk-sprint-v1.png'))
arms=[]
for index in [8,9,12,13]:
    f=frames[index];x,y,w,h=f['crop'];k=f['scale'];ax,ay=f['anchor']
    region=source[y:y+h,x:x+w].astype(float)
    yy,xx=np.indices(region.shape[:2]);wx=(xx-ax)*k;wy=(yy-ay)*k
    r,g,b=region[:,:,0],region[:,:,1],region[:,:,2]
    mask=(region[:,:,3]>200)&(r>170)&(r>g*1.45)&(g>b*1.4)&(wx>-42)&(wx<-12)&(wy>-66)&(wy<-27)
    mask=ndimage.binary_dilation(mask,iterations=4)
    points=np.argwhere(mask)[:,::-1]
    hull=points[ConvexHull(points).vertices]
    arms.append([[round((float(px)-ax)*k,3),round((float(py)-ay)*k,3)] for px,py in hull])
(root/'src/runner-arm-outlines.json').write_text(json.dumps(arms,separators=(',',':'))+'\n')

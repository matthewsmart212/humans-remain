"""Mechanically pack generated Scrap Walker art; no painting or per-pose fitting.

Run: python3 scripts/prepare-scrap-walker-v3.py
Requires Pillow, NumPy and SciPy. Eye locations are manually identified visor
landmarks, refined only inside small lens ROIs, never a global rust detector.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/scrap-walker-v3'
OUT = ROOT / 'public/survival/scrap-walker-v3'
CELL, SCALE, ANCHOR = 384, .76, (192, 320)
VIEWS = ['down', 'down-left', 'right', 'up-right', 'up']
# Lens centers manually identified in each generated source cell (362x362).
# Rear views intentionally have no visible eyes. Disabled positions are included
# so consumers can suppress their baked lens light when the robot is defeated.
LENSES = {
 'down': [
  [[174,102],[229,102]], [[173,103],[228,106]], [[159,110],[216,111]], [[174,103],[229,104]],
  [[182,115],[222,96]], [[158,95],[209,106]], [[153,118],[201,101]], [[156,94],[208,103]],
  [[184,62],[231,79]], [[161,98],[214,86]], [[191,119],[233,146]], [[230,184],[265,219]]],
 'down-left': [
  [[152,134],[203,145]], [[143,134],[193,147]], [[140,136],[190,150]], [[151,138],[200,150]],
  [[179,130],[223,113]], [[140,123],[189,143]], [[136,123],[181,137]], [[142,116],[189,126]],
  [[214,61],[255,85]], [[133,110],[183,99]], [[192,135],[228,167]], [[244,192],[279,228]]],
 'right': [
  [[230,132],[268,133]], [[226,127]], [[260,135]], [[264,132]],
  [[245,119]], [[272,125]], [[286,129]], [[262,122]],
  [[183,71]], [[287,129]], [[277,180]], [[288,246]]],
 'up-right': [[] for _ in range(12)], 'up': [[] for _ in range(12)],
}

def robot_parts(a):
    labels, _ = nd.label(a[:, :, 3] >= 100, np.ones((3, 3)))
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    ids = sorted(np.argsort(sizes)[-12:], key=lambda i: (
        int(nd.center_of_mass(labels == i)[0] // (a.shape[0] / 3)), nd.center_of_mass(labels == i)[1]))
    assert min(sizes[i] for i in ids) > 35000, 'Twelve complete humanoid cores required'
    main = np.zeros(labels.shape, dtype=np.int16)
    for i, ident in enumerate(ids, 1): main[labels == ident] = i
    dist, nearest = nd.distance_transform_edt(main == 0, return_indices=True)
    ownership = main[tuple(nearest)]
    ownership[(a[:, :, 3] == 0) | (dist > 3)] = 0
    parts = []
    for ident in range(1, 13):
        yy, xx = np.where(ownership == ident)
        l,t,r,b = int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
        rgba = a[t:b,l:r].copy(); rgba[ownership[t:b,l:r] != ident] = 0
        parts.append((Image.fromarray(rgba), (l,t,r,b)))
    return parts

def refine_lens(a, seed):
    # Deliberately restrict refinement to the manually reviewed visible lens.
    y,x = np.ogrid[:a.shape[0], :a.shape[1]]
    roi = (x-seed[0])**2+(y-seed[1])**2 <= 10**2
    r,g,b,alpha = a.transpose(2,0,1).astype(float)
    mask = roi & (r > 220) & (r > g*1.22) & (g < 185) & (b < 150) & (alpha > 200)
    yy,xx = np.where(mask)
    assert len(xx)>4, ('Missing manually identified lens',seed)
    radius = max(3.5, min(8, (max(np.ptp(xx),np.ptp(yy))+1)/2))
    return np.array([xx.mean(), yy.mean()]), float(radius)

OUT.mkdir(parents=True, exist_ok=True)
reports, eyes = [], {}
for direction in VIEWS:
    a = np.array(Image.open(SOURCE/(direction+'.png')).convert('RGBA'))
    assert a.shape[:2] == (1086,1448), 'Sources must share 362px source cells'
    cw,ch = a.shape[1]//4,a.shape[0]//3
    parts = robot_parts(a)
    # Fixed per-view horizontal origin from the four walk poses; attacks retain
    # their source lateral displacement, including the outstretched fist.
    origin_x = float(np.mean([(b[0]+b[2])/2-i*cw for i,(_,b) in enumerate(parts[:4])]))
    sheet = Image.new('RGBA',(CELL*4,CELL*3))
    frames, direction_eyes = [], []
    for i,(part,bounds) in enumerate(parts):
        col,row = i%4,i//4
        l,t,r,b = bounds
        left = round(ANCHOR[0]+(l-col*cw-origin_x)*SCALE)
        size = tuple(round(v*SCALE) for v in part.size)
        # Reviewed lower silhouettes are planted boots (or the collapsed shell).
        # Frame4 down's hanging fist is 3px below the boot; explicit boot baseline
        # prevents that fist from lifting the character's feet off the ground.
        ground_correction = 3 if direction == 'down' and i == 4 else 0
        top = ANCHOR[1]-size[1]+round(ground_correction*SCALE)
        assert min(left,top,CELL-left-size[0],CELL-top-size[1])>=8,(direction,i,left,top,size)
        tile = Image.new('RGBA',(CELL,CELL))
        tile.paste(part.resize(size,Image.Resampling.LANCZOS),(left,top))
        sheet.paste(tile,(col*CELL,row*CELL))
        source_tile=a[row*ch:(row+1)*ch,col*cw:(col+1)*cw]
        frame_eyes=[]
        for seed in LENSES[direction][i]:
            center,radius=refine_lens(source_tile,seed)
            # Account for exact integer resize dimensions to retain subpixel lens
            # registration. These differ from .76 only by rounding to pixels.
            px=left+(center[0]-(l-col*cw))*size[0]/part.width
            py=top+(center[1]-(t-row*ch))*size[1]/part.height
            frame_eyes.append([round(float(px),2),round(float(py),2),round(radius*SCALE,2)])
        direction_eyes.append(frame_eyes)
        frames.append({'frame':i,'sourceBounds':[l,t,r-l,b-t], 'contentBounds':[left,top,*size],
                       'groundCorrectionSourcePx':ground_correction})
        if direction=='down-left' and i==0:
            tile.save(OUT/'thumbnail.webp','WEBP',quality=92,method=6)
    sheet.save(OUT/(direction+'.webp'),'WEBP',quality=92,method=6)
    eyes[direction]=direction_eyes
    reports.append({'direction':direction,'source':direction+'.png','sourceSize':[a.shape[1],a.shape[0]],
                    'sourceCell':[cw,ch],'sourceOriginX':round(origin_x,3),'frames':frames,
                    'bytes':(OUT/(direction+'.webp')).stat().st_size})

image=lambda view:'/survival/scrap-walker-v3/'+view+'.webp'
directions={name:{'image':image(view),'mirror':mirror,'source':view} for name,view,mirror in [
 ('down','down',False),('down-right','down-left',True),('right','right',False),
 ('up-right','up-right',False),('up','up',False),('up-left','up-right',True),
 ('left','right',True),('down-left','down-left',False)]}
meta={'version':3,'name':'Scrap Walker','cell':[CELL,CELL],'anchor':list(ANCHOR),'columns':4,'rows':3,
 'idleFrame':0,'walkFrames':[0,1,2,3],'combatFrames':[4,5,6,7], 'windupFrames':[4],
 'strikeFrames':[5,6],'recoveryFrames':[7],'hitFrames':[8,9],'disabledFrames':[10,11],
 'directions':directions,'eyes':eyes,
 'packing':{'scale':SCALE,'perFrameScale':False,'perViewScale':False,
            'registration':'Fixed per-view walk origin X; translation-only boot baseline Y. Attack and hit painted body displacement preserved.',
            'eyeCoordinates':'Packed source-cell coordinates [x,y,r], indexed by source heading and frame. Mirror x as cellWidth-x when heading is mirrored.'},
 'sources':reports,'provenance':'art-source/scrap-walker-v3/provenance.json'}
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps({'views':VIEWS,'poses':60,'cell':[CELL,CELL],'anchor':ANCHOR,'scale':SCALE,
                  'webpBytes':sum(p.stat().st_size for p in OUT.glob('*.webp')),
                  'eyeCounts':{k:[len(p) for p in v] for k,v in eyes.items()}}))

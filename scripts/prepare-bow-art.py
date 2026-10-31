"""Pack the approved eight-direction bow asset pack for the shared renderer."""
from pathlib import Path
from PIL import Image
import json
import sys

source = Path(sys.argv[1])
out = Path('public/survival/scrap-runner/bow-v1')
out.mkdir(parents=True, exist_ok=True)
directions = {'up':'north','up-right':'north-east','right':'east','down-right':'south-east','down':'south'}
# Unused opposite-facing textures are intentionally not exported or bundled.
for unused in ['left','up-left','down-left']:
    (out/(unused+'.webp')).unlink(missing_ok=True)
for direction, name in directions.items():
    image = Image.new('RGBA',(2304,384))
    for index,state in enumerate(['ready','raise','half-draw','full-draw','release','lower']):
        frame=Image.open(source/'frames'/name/(state+'.png')).convert('RGBA')
        image.alpha_composite(frame.resize((384,384),Image.Resampling.LANCZOS),(index*384,0))
    image.save(out/(direction+'.webp'),lossless=True,method=6)
for name, source_name in [('bow','bow-inventory-256.png'),('arrows','arrow-inventory-256.png')]:
    Image.open(source/'items'/source_name).save(out/(name+'-icon.webp'),lossless=True,method=6)
Image.open(source/'items/arrow-projectile-west.png').save(out/'arrow.webp',lossless=True,method=6)
bow = Image.open(source/'items/makeshift-bow.png').convert('RGBA')
box = bow.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
bow = bow.crop((max(0,box[0]-3),max(0,box[1]-3),min(bow.width,box[2]+3),min(bow.height,box[3]+3)))
bow.resize((round(bow.width*512/bow.height),512),Image.Resampling.LANCZOS).save(out/'bow-carry.webp',lossless=True,method=6)
manifest = {'cell':[384,384],'columns':6,'anchor':[192,1000/3],'scale':.5,'states':['ready','raise','half-draw','full-draw','release','lower'],'views':{d:'/survival/scrap-runner/bow-v1/'+d+'.webp' for d in directions},'directions':{d:{'view':d.replace('left','right'),'mirror':'left' in d} for d in ['up','up-right','right','down-right','down','down-left','left','up-left']},'composition':'Original survivor head and lower body; bow jacket, arms and weapon layers only.','sourceLibraryFile':'libfile_fbf4320628f48191be9b65d2167be077'}
(out/'atlas.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'files':len(list(out.iterdir())),'downloadBytes':sum(p.stat().st_size for p in out.iterdir()),'textureBytes':len(directions)*2304*384*4,'carrySize':Image.open(out/'bow-carry.webp').size}))

"""Pack approved generated cutouts without repainting their pixels.

Usage: python3 scripts/package-patch-art.py ROBOT_ATLAS STATION LOCKER
Only crop, register, resize and encode; alpha is preserved from the source.
"""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image

output = Path('public/survival/patch-v1')
output.mkdir(parents=True, exist_ok=True)
robot_path, station_path, locker_path = map(Path, sys.argv[1:4])
robot = Image.open(robot_path).convert('RGBA')
assert robot.size == (1261, 1247), 'Use the approved nine-pose source atlas.'

def visible_bounds(image):
    # Ignore almost transparent antialiasing when measuring the registration.
    # The source alpha itself is never thresholded or replaced.
    box = image.getchannel('A').point(lambda v: 255 if v > 80 else 0).getbbox()
    assert box is not None
    return (max(0, box[0]-4), max(0, box[1]-4), min(image.width, box[2]+4), min(image.height, box[3]+4))

def registered(source, height, baseline=228):
    source = source.crop(visible_bounds(source))
    scale = min(height/source.height, 216/source.width)
    size = (round(source.width*scale), round(source.height*scale))
    source = source.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (256,256))
    canvas.alpha_composite(source, ((256-size[0])//2, baseline-size[1]))
    return canvas

# Generation margins are not a mathematical grid: these cuts fall entirely
# within the clear gutters, retaining every beacon and foot.
columns = [0,435,855,1261]
rows = [0,395,795,1247]
frames=[]
for index in range(9):
    col,row=index%3,index//3
    cell=robot.crop((columns[col],rows[row],columns[col+1],rows[row+1]))
    frames.append(registered(cell, 200 if index<8 else 160))
atlas=Image.new('RGBA',(1024,512))
for index,frame in enumerate(frames[:8]):
    atlas.alpha_composite(frame, ((index%4)*256,(index//4)*256))
atlas.save(output/'robot.webp',quality=91,method=6)
frames[8].save(output/'damaged.webp',quality=91,method=6)
frames[0].resize((192,192),Image.Resampling.LANCZOS).save(output/'portrait.webp',quality=91,method=6)
station=Image.open(station_path).convert('RGBA')
station.resize((1100,825),Image.Resampling.LANCZOS).save(output/'station.webp',quality=89,method=6)
registered(Image.open(locker_path).convert('RGBA'),220,230).save(output/'locker.webp',quality=91,method=6)
manifest={
    'version':1,'frameSize':[256,256],'footAnchor':[128,228],
    'directions':['down','down-right','right','up-right','up','up-left','left','down-left'],
    'standingPixels':200,'seatedPixels':160,
    'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [robot_path,station_path,locker_path]},
    'files':{p.name:{'bytes':p.stat().st_size,'size':list(Image.open(p).size)} for p in sorted(output.glob('*.webp'))},
}
(output/'atlas.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['files'],indent=2))

"""Measure material-edit displacement; emit numeric alignment fields, not images."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import zoom, gaussian_filter, uniform_filter, map_coordinates
from concurrent.futures import ThreadPoolExecutor

root = Path('.qa/river-quality')
jobs = [json.loads(p.read_text()) for p in (root / 'jobs').glob('*.json') if not p.name.endswith('.flow.json')]

def analyse(job):
    target = np.asarray(Image.open(job['input']).convert('RGB'), dtype=np.float32) / 255
    candidate = np.asarray(Image.open(job['output']).convert('RGB').resize((target.shape[1], target.shape[0]), Image.Resampling.LANCZOS), dtype=np.float32) / 255
    ratio = min(1, 340 / max(target.shape[:2]))
    target = zoom(target, (ratio, ratio, 1), order=1)
    candidate = zoom(candidate, (ratio, ratio, 1), order=1)
    # Local contrast removes differences in paint brightness from the match.
    def channels(a):
        v = np.stack((a[..., 0]*.3+a[..., 1]*.6+a[..., 2]*.1, (a[..., 2]-a[..., 0])*.6), axis=0)
        return np.stack([c-gaussian_filter(c, 5) for c in v])
    t, c = channels(target), channels(candidate)
    u = v = None
    for fraction in (.125, .25, .5, 1):
        template = zoom(t, (1, fraction, fraction), order=1)
        moving = zoom(c, (1, fraction, fraction), order=1)
        h, w = template.shape[1:]
        if u is None:
            u, v = np.zeros((h, w), np.float32), np.zeros((h, w), np.float32)
        else:
            previous = u.shape
            u = zoom(u, (h/previous[0], w/previous[1]), order=1)*w/previous[1]
            v = zoom(v, (h/previous[0], w/previous[1]), order=1)*h/previous[0]
        yy, xx = np.mgrid[:h, :w].astype(np.float32)
        for _ in range(18):
            warped = np.stack([map_coordinates(ch, [yy+v, xx+u], order=1, mode='nearest') for ch in moving])
            gy, gx = np.gradient(warped, axis=(1, 2))
            residual = warped-template
            average = lambda a: uniform_filter(np.sum(a, axis=0), 9, mode='nearest')
            a, b, d = average(gx*gx), average(gx*gy), average(gy*gy)
            ex, ey = average(gx*residual), average(gy*residual)
            det = a*d-b*b+1e-9
            du = np.clip((b*ey-d*ex)/det, -.8, .8)
            dv = np.clip((b*ex-a*ey)/det, -.8, .8)
            u = gaussian_filter(np.clip(u+du*.65, -22*ratio*fraction, 22*ratio*fraction), .7)
            v = gaussian_filter(np.clip(v+dv*.65, -22*ratio*fraction, 22*ratio*fraction), .7)
    flow = np.stack((u/ratio, v/ratio), axis=-1).astype('<f4')
    output = root / 'jobs' / (job['id']+'.flow')
    flow.tofile(output)
    info = {'width': flow.shape[1], 'height': flow.shape[0], 'file': str(output), 'maximumSourceDisplacement': float(np.max(np.linalg.norm(flow, axis=-1)))}
    (root / 'jobs' / (job['id']+'.flow.json')).write_text(json.dumps(info))
    return {'id': job['id'], **info}

with ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(analyse, jobs):
        print(json.dumps(result), flush=True)

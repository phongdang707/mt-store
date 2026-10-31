"""Tách dữ liệu từ bản HTML của app bán hàng (artifact) ra seed/:
catalog.json (ảnh trỏ tới file), images/*.jpg|png, logo.svg, paper.png, qr.png, storefront.css."""
import base64, hashlib, json, re, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
img_dir = out / 'images'
img_dir.mkdir(parents=True, exist_ok=True)
html = src.read_text(encoding='utf8')

def save(uri, stem):
    m = re.match(r'data:image/([a-z+]+);base64,(.*)', uri, re.S)
    if not m:
        return uri
    ext = {'jpeg': 'jpg', 'svg+xml': 'svg'}.get(m.group(1), m.group(1))
    raw = base64.b64decode(m.group(2))
    name = f'{stem}.{ext}'
    (img_dir / name).write_bytes(raw)
    return name

data = json.loads(re.search(r'<script type="application/json" id="data">(.*?)</script>', html, re.S).group(1))
for p in data['products']:
    if p.get('img'):
        p['img'] = save(p['img'], p['id'])
    for i, v in enumerate(p.get('variants') or []):
        if v.get('img'):
            v['img'] = save(v['img'], f"{p['id']}--{i}")
if data.get('qr'):
    raw = base64.b64decode(data['qr'].split(',', 1)[1])
    (out / 'qr.png').write_bytes(raw)
    data['qr'] = 'qr.png'
(out / 'catalog.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')

logo = re.search(r'<template id="logo-src">(.*?)</template>', html, re.S).group(1)
(out / 'logo.svg').write_text(logo, encoding='utf8')

css = re.search(r'<style id="css">(.*?)</style>', html, re.S).group(1)
paper = re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', css).group(1)
(out / 'paper.png').write_bytes(base64.b64decode(paper))
css = re.sub(r'url\(data:image/png;base64,[A-Za-z0-9+/=]+\)', 'url(paper.png)', css)
(out / 'storefront.css').write_text(css, encoding='utf8')
print(len(data['products']), 'products;', len(list(img_dir.iterdir())), 'images;', len(css), 'css chars')

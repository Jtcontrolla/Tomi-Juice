// Prepares web assets from the genuine Tomi Juice photography in /assets.
// - Label textures: straightened crops of the real can fronts, wrapped onto the 3D can.
// - Logo: the real tomi logo cut out of a brand photo (background flood-filled away).
// - Gallery/section images: resized WebP copies; videos copied as-is.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'assets';
const OUT = 'public';
const id = (n) => `${SRC}/6048743077825942${n}.jpg`;
fs.mkdirSync(`${OUT}/tex`, { recursive: true });
fs.mkdirSync(`${OUT}/img`, { recursive: true });
fs.mkdirSync(`${OUT}/video`, { recursive: true });

const TEX_W = 512, TEX_H = 1228; // label aspect ≈ 2.4 (slim can body)

// Crop boxes measured on the rotated source photos.
const labels = {
  mango:     { file: id(147), rot: -19.7, box: { left: 465, top: 1002, width: 158, height: 380 }, padBottom: 0 },
  cranberry: { file: id(155), rot: 0,   box: { left: 438, top: 693, width: 167, height: 401 }, padBottom: 0 },
  orange:    { file: id(149), rot: -19, box: { left: 510, top: 362, width: 336, height: 806 }, padBottom: 0 },
};

for (const [name, c] of Object.entries(labels)) {
  const rotated = await sharp(c.file).rotate(c.rot, { background: '#ffffff' }).png().toBuffer();
  let img = sharp(rotated).extract(c.box);
  if (c.padBottom) img = sharp(await img.png().toBuffer()).extend({ bottom: c.padBottom, extendWith: 'copy' });
  await sharp(await img.png().toBuffer())
    .resize(TEX_W, TEX_H, { fit: 'fill', kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8 })
    .linear(1.08, -10)
    .modulate({ saturation: 1.06 })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(`${OUT}/tex/label-${name}.jpg`);
  console.log('label', name);
}

// Logo: crop from the flat-lay photo (light-blue background) and flood-fill the background out.
{
  const box = { left: 380, top: 112, width: 312, height: 196 };
  const { data, info } = await sharp(id(148)).extract(box).resize({ width: box.width * 2, kernel: 'lanczos3' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = [data[0], data[1], data[2]];
  const near = (i) => Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) < 70;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!near(p * 4)) continue;
    data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  // soften the cut edge: partially transparent pixels next to removed ones
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    if (data[p * 4 + 3] === 0) continue;
    const n = [p - 1, p + 1, p - w, p + w].filter((q) => data[q * 4 + 3] === 0).length;
    if (n) data[p * 4 + 3] = 255 - n * 45;
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim().png().toBuffer().then((b) => Promise.all([
    sharp(b).resize({ width: 360 }).webp({ quality: 90, alphaQuality: 90 }).toFile(`${OUT}/img/tomi-logo.webp`),
    sharp(b).resize({ width: 64 }).png().toFile(`${OUT}/img/favicon.png`),
  ]));
  console.log('logo');
}

// Section / gallery imagery
const photos = {
  'fresh-vibes': 147, 'tote': 148, 'orange-splash': 149, 'ice-bucket': 150,
  'quad': 151, 'same-quality': 152, 'trio': 155, 'cranberry-girl': 166,
};
for (const [name, n] of Object.entries(photos)) {
  await sharp(id(n)).resize({ width: 900 }).webp({ quality: 80 }).toFile(`${OUT}/img/${name}.webp`);
}
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.mp4'))) {
  fs.copyFileSync(path.join(SRC, f), `${OUT}/video/${f.replace('insta_video_', 'reel-')}`);
}
console.log('done');

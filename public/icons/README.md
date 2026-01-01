# Icon Generation Guide

To generate the PWA icons, you can use any of these methods:

## Option 1: Online Generator
1. Go to https://realfavicongenerator.net/
2. Upload your logo (use the favicon.svg as base)
3. Download the generated icon pack
4. Place icons in this folder

## Option 2: Using ImageMagick
If you have ImageMagick installed:

```bash
# From the public folder
convert favicon.svg -resize 72x72 icons/icon-72x72.png
convert favicon.svg -resize 96x96 icons/icon-96x96.png
convert favicon.svg -resize 128x128 icons/icon-128x128.png
convert favicon.svg -resize 144x144 icons/icon-144x144.png
convert favicon.svg -resize 152x152 icons/icon-152x152.png
convert favicon.svg -resize 192x192 icons/icon-192x192.png
convert favicon.svg -resize 384x384 icons/icon-384x384.png
convert favicon.svg -resize 512x512 icons/icon-512x512.png
```

## Option 3: Using Sharp (Node.js)
Create a script:

```javascript
const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  sharp('favicon.svg')
    .resize(size, size)
    .png()
    .toFile(`icons/icon-${size}x${size}.png`);
});
```

## Required Icons
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

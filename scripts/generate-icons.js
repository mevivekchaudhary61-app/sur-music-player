import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Clean brand SVG
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="70%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="roseAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="112" fill="#09090b"/>
  
  <!-- Outer Grooved Vinyl Disc -->
  <circle cx="256" cy="256" r="210" fill="url(#discGrad)" stroke="#27272a" stroke-width="4"/>
  <circle cx="256" cy="256" r="185" fill="none" stroke="#27272a" stroke-width="2" opacity="0.4"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="#27272a" stroke-width="2" opacity="0.5"/>
  <circle cx="256" cy="256" r="135" fill="none" stroke="#27272a" stroke-width="2" opacity="0.6"/>

  <!-- Center Label Core -->
  <circle cx="256" cy="256" r="96" fill="url(#amberGrad)" stroke="#fbbf24" stroke-width="4"/>
  <circle cx="256" cy="256" r="80" fill="url(#roseAccent)" opacity="0.9"/>
  
  <!-- Spindle Hole -->
  <circle cx="256" cy="256" r="26" fill="#09090b" stroke="#ffffff" stroke-width="4"/>
  <circle cx="256" cy="256" r="10" fill="#ffffff"/>

  <!-- Stylized Sound Notes / Accents -->
  <path d="M 330 140 L 330 200 A 24 24 0 1 1 306 176 L 306 140 Z" fill="#fbbf24" opacity="0.9"/>
</svg>`;

// Maskable version with 15% safe padding
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#09090b"/>
  <g transform="translate(51.2, 51.2) scale(0.8)">
    ${svgIcon.replace(/<\/?svg[^>]*>/g, '')}
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);

async function run() {
  const svgBuf = Buffer.from(svgIcon);
  const maskableBuf = Buffer.from(maskableSvg);

  await sharp(svgBuf).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(svgBuf).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuf).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.ico'));
  await sharp(maskableBuf).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('PWA icons successfully generated in public/');
}

run().catch(console.error);

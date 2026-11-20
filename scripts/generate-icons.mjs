import fs from "node:fs";
import path from "node:path";
import { PUBLIC_DIR, renderHtmlToBuffer, withHeadlessBrowser } from "./lib/cdp-browser.mjs";

function buildRenderHtml(svgMarkup, size, transparent) {
  const sizedSvg = svgMarkup.replace(
    /<svg\b([^>]*)>/i,
    (_, attrs) =>
      `<svg${attrs.replace(/\s+(?:width|height)=["'][^"']*["']/gi, "")} width="${size}" height="${size}" style="display:block">`,
  );
  const background = transparent ? "transparent" : "#1E3A8A";
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;width:${size}px;height:${size}px;background:${background};}</style></head><body>${sizedSvg}</body></html>`;
}

function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = 6 + directory.length;

  images.forEach(({ size, buffer }, index) => {
    const entryOffset = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    directory.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2);
    directory.writeUInt8(0, entryOffset + 3);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(buffer.length, entryOffset + 8);
    directory.writeUInt32LE(offset, entryOffset + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, directory, ...images.map((item) => item.buffer)]);
}

function buildDesktopSquircleSvg(logoSvg) {
  const defsStart = logoSvg.indexOf("<defs>");
  const defsEnd = logoSvg.indexOf("</defs>");
  const svgClose = logoSvg.lastIndexOf("</svg>");
  if (
    defsStart === -1 ||
    defsEnd === -1 ||
    svgClose === -1 ||
    defsEnd <= defsStart ||
    svgClose <= defsEnd
  ) {
    throw new Error("Expected <defs>...</defs> and </svg> in public/logo.svg");
  }

  const beforeDefs = logoSvg.slice(0, defsStart);
  const defsBlock = logoSvg.slice(defsStart, defsEnd);
  const bodyBlock = logoSvg.slice(defsEnd + "</defs>".length, svgClose);

  return `${beforeDefs}${defsBlock}  <filter id="repota-tile-shadow" x="-15%" y="-15%" width="130%" height="135%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#050C22" flood-opacity="0.28" />
    </filter>
    <clipPath id="repota-desktop-squircle">
      <rect x="42" y="42" width="428" height="428" rx="94" />
    </clipPath>
  </defs>
  <rect x="42" y="42" width="428" height="428" rx="94" fill="#0B152B" filter="url(#repota-tile-shadow)" />
  <g clip-path="url(#repota-desktop-squircle)">
    <g transform="translate(42 42) scale(0.8359375)">${bodyBlock}    </g>
  </g>
  <rect x="44" y="44" width="424" height="424" rx="92" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="4" />
</svg>\n`;
}

async function main() {
  const logoSvgPath = path.join(PUBLIC_DIR, "logo.svg");
  const faviconSvgPath = path.join(PUBLIC_DIR, "favicon.svg");

  const logoSvg = fs.readFileSync(logoSvgPath, "utf8");
  const faviconSvg = fs.readFileSync(faviconSvgPath, "utf8");

  const maskableTarget = '<g id="repota-artwork"';
  if (!logoSvg.includes(maskableTarget)) {
    throw new Error('Expected <g id="repota-artwork" in public/logo.svg');
  }
  const maskableSvg = logoSvg.replace(
    maskableTarget,
    '<g id="repota-artwork" transform="translate(256 256) scale(0.86) translate(-256 -256)"',
  );
  const desktopSquircleSvg = buildDesktopSquircleSvg(logoSvg);

  await withHeadlessBrowser(async ({ send, frameId }) => {
    const pngTargets = [
      { name: "pwa-any-64x64.png", size: 64, svg: desktopSquircleSvg, transparent: true },
      { name: "pwa-any-192x192.png", size: 192, svg: desktopSquircleSvg, transparent: true },
      { name: "pwa-any-512x512.png", size: 512, svg: desktopSquircleSvg, transparent: true },
      { name: "maskable-icon-512x512.png", size: 512, svg: maskableSvg, transparent: false },
      { name: "apple-touch-icon.png", size: 180, svg: logoSvg, transparent: false },
      { name: "favicon-96x96.png", size: 96, svg: faviconSvg, transparent: true },
    ];

    for (const target of pngTargets) {
      const pngBuffer = await renderHtmlToBuffer(send, frameId, {
        html: buildRenderHtml(target.svg, target.size, target.transparent),
        width: target.size,
        height: target.size,
        transparent: target.transparent,
        label: target.name,
      });
      fs.writeFileSync(path.join(PUBLIC_DIR, target.name), pngBuffer);
      console.log(
        `Generated ${target.name} (${target.size}x${target.size}, ${pngBuffer.length} B)`,
      );
    }

    const icoSizes = [16, 32, 48];
    const icoImages = [];
    for (const size of icoSizes) {
      const buffer = await renderHtmlToBuffer(send, frameId, {
        html: buildRenderHtml(faviconSvg, size, true),
        width: size,
        height: size,
        transparent: true,
        label: `favicon-${size}.png`,
      });
      icoImages.push({ size, buffer });
    }
    const icoBuffer = packIco(icoImages);
    fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.ico"), icoBuffer);
    console.log(`Generated favicon.ico (16/32/48, ${icoBuffer.length} B)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

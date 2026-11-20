import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function findBrowserExecutable() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates = [];
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(localAppData, "Google\\Chrome\\Application\\chrome.exe"),
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    );
  } else {
    for (const bin of ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"]) {
      const result = spawnSync("which", [bin], { encoding: "utf8" });
      if (result.status === 0 && result.stdout.trim()) {
        candidates.push(result.stdout.trim());
      }
    }
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find Chrome or Edge executable. Set CHROME_PATH to a Chromium-based browser binary.",
  );
}

async function launchBrowser(executablePath, userDataDir) {
  const proc = spawn(
    executablePath,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const port = await new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for headless browser DevTools port. Output:\n${stderr}`));
    }, 15000);

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\/[^\s]+/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });

    proc.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Headless browser exited prematurely with code ${code}.\n${stderr}`));
    });
  });

  const targetsResponse = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!targetsResponse.ok) {
    throw new Error(`Failed to fetch DevTools target list: HTTP ${targetsResponse.status}`);
  }
  const targets = await targetsResponse.json();
  const pageTarget = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!pageTarget) {
    throw new Error("No DevTools page target found.");
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out opening CDP WebSocket.")), 10000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", (event) => {
      clearTimeout(timer);
      reject(new Error(`CDP WebSocket error: ${event.message || "connection failed"}`));
    });
  });

  let nextId = 0;
  const pending = new Map();

  ws.addEventListener("message", async (event) => {
    const raw = typeof event.data === "string" ? event.data : await event.data.text();
    const msg = JSON.parse(raw);
    if (typeof msg.id === "number" && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      pending.delete(msg.id);
      clearTimeout(timer);
      if (msg.error) {
        reject(new Error(`CDP error (${msg.error.code}): ${msg.error.message}`));
      } else {
        resolve(msg.result);
      }
    }
  });

  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP call timed out: ${method}`));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { proc, ws, send };
}

function buildRenderHtml(svgMarkup, size, transparent) {
  const sizedSvg = svgMarkup.replace(
    /<svg\b([^>]*)>/i,
    (_, attrs) =>
      `<svg${attrs.replace(/\s+(?:width|height)=["'][^"']*["']/gi, "")} width="${size}" height="${size}" style="display:block">`,
  );
  const background = transparent ? "transparent" : "#1E3A8A";
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;width:${size}px;height:${size}px;background:${background};}</style></head><body>${sizedSvg}</body></html>`;
}

function validatePng(buffer, expectedSize, label) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`Invalid PNG signature for ${label}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expectedSize || height !== expectedSize) {
    throw new Error(
      `Unexpected PNG dimensions for ${label}: got ${width}x${height}, expected ${expectedSize}x${expectedSize}`,
    );
  }
}

async function renderSvgToPng(send, frameId, svgMarkup, size, transparent, label) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: size,
    height: size,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send("Emulation.setDefaultBackgroundColorOverride", {
    color: transparent ? { r: 0, g: 0, b: 0, a: 0 } : { r: 30, g: 58, b: 138, a: 1 },
  });

  await send("Page.setDocumentContent", {
    frameId,
    html: buildRenderHtml(svgMarkup, size, transparent),
  });

  await send("Runtime.evaluate", {
    expression: "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))",
    awaitPromise: true,
  });

  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
  });

  const buffer = Buffer.from(data, "base64");
  validatePng(buffer, size, label);
  return buffer;
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

function buildSquircleSvg(logoSvg) {
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

  return `${beforeDefs}${defsBlock}  <clipPath id="repota-squircle">
      <rect width="512" height="512" rx="112" />
    </clipPath>
  </defs>
  <g clip-path="url(#repota-squircle)">${bodyBlock}  </g>
  <rect x="2" y="2" width="508" height="508" rx="110" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="4" />
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
  const squircleSvg = buildSquircleSvg(logoSvg);

  const browserPath = findBrowserExecutable();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repota-icons-"));
  let session = null;

  try {
    session = await launchBrowser(browserPath, tmpDir);
    const { send } = session;
    await send("Page.enable");
    await send("Runtime.enable");
    const { frameTree } = await send("Page.getFrameTree");
    const frameId = frameTree.frame.id;

    const pngTargets = [
      { name: "pwa-64x64.png", size: 64, svg: squircleSvg, transparent: true },
      { name: "pwa-192x192.png", size: 192, svg: squircleSvg, transparent: true },
      { name: "pwa-512x512.png", size: 512, svg: squircleSvg, transparent: true },
      { name: "maskable-icon-512x512.png", size: 512, svg: maskableSvg, transparent: false },
      { name: "apple-touch-icon.png", size: 180, svg: logoSvg, transparent: false },
      { name: "favicon-96x96.png", size: 96, svg: faviconSvg, transparent: true },
    ];

    for (const target of pngTargets) {
      const pngBuffer = await renderSvgToPng(
        send,
        frameId,
        target.svg,
        target.size,
        target.transparent,
        target.name,
      );
      fs.writeFileSync(path.join(PUBLIC_DIR, target.name), pngBuffer);
      console.log(
        `Generated ${target.name} (${target.size}x${target.size}, ${pngBuffer.length} B)`,
      );
    }

    const icoSizes = [16, 32, 48];
    const icoImages = [];
    for (const size of icoSizes) {
      const buffer = await renderSvgToPng(
        send,
        frameId,
        faviconSvg,
        size,
        true,
        `favicon-${size}.png`,
      );
      icoImages.push({ size, buffer });
    }
    const icoBuffer = packIco(icoImages);
    fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.ico"), icoBuffer);
    console.log(`Generated favicon.ico (16/32/48, ${icoBuffer.length} B)`);
  } finally {
    if (session) {
      try {
        session.ws.close();
      } catch {
        // Ignore close errors during teardown.
      }
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2000);
        session.proc.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
        session.proc.kill();
      });
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {
      // Ignore temporary directory cleanup races on Windows.
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

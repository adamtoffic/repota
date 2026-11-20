import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const PUBLIC_DIR = path.join(ROOT_DIR, "public");
export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function findBrowserExecutable() {
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
      }, 20000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { proc, ws, send };
}

export async function withHeadlessBrowser(fn) {
  const browserPath = findBrowserExecutable();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repota-cdp-"));
  let session = null;

  try {
    session = await launchBrowser(browserPath, tmpDir);
    const { send } = session;
    await send("Page.enable");
    await send("Runtime.enable");
    const { frameTree } = await send("Page.getFrameTree");
    return await fn({ send, frameId: frameTree.frame.id });
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

export function validatePng(buffer, expectedWidth, expectedHeight, label) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`Invalid PNG signature for ${label}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `Unexpected PNG dimensions for ${label}: got ${width}x${height}, expected ${expectedWidth}x${expectedHeight}`,
    );
  }
}

export async function renderHtmlToBuffer(
  send,
  frameId,
  {
    html,
    width,
    height,
    deviceScaleFactor = 1,
    transparent = false,
    format = "png",
    quality,
    label = "render",
  },
) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile: false,
  });

  await send("Emulation.setDefaultBackgroundColorOverride", {
    color: transparent ? { r: 0, g: 0, b: 0, a: 0 } : { r: 30, g: 58, b: 138, a: 1 },
  });

  await send("Page.setDocumentContent", { frameId, html });

  await send("Runtime.evaluate", {
    expression: `Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            })
      )
    ).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`,
    awaitPromise: true,
  });

  const screenshotParams = {
    format,
    fromSurface: true,
    clip: { x: 0, y: 0, width, height, scale: deviceScaleFactor },
  };
  if (format === "jpeg" && typeof quality === "number") {
    screenshotParams.quality = quality;
  }

  const { data } = await send("Page.captureScreenshot", screenshotParams);
  const buffer = Buffer.from(data, "base64");
  if (format === "png") {
    validatePng(
      buffer,
      Math.round(width * deviceScaleFactor),
      Math.round(height * deviceScaleFactor),
      label,
    );
  }
  return buffer;
}

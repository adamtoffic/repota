import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  PUBLIC_DIR,
  ROOT_DIR,
  renderHtmlToBuffer,
  validatePng,
  withHeadlessBrowser,
} from "./lib/cdp-browser.mjs";

const DIST_DIR = path.join(ROOT_DIR, "dist");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const AVATAR_PALETTES = [
  ["#1E3A8A", "#2563EB"],
  ["#0F766E", "#14B8A6"],
  ["#7C3AED", "#8B5CF6"],
  ["#B45309", "#F59E0B"],
  ["#BE185D", "#EC4899"],
];

function makeAvatarDataUri(name, index) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
  const [c1, c2] = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="16" fill="url(#g)" />
    <circle cx="60" cy="46" r="18" fill="rgba(255,255,255,0.20)" />
    <path d="M 28 106 C 32 82 88 82 92 106 Z" fill="rgba(255,255,255,0.20)" />
    <text x="60" y="70" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="800">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function makeSchoolCrestDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" fill="#FFFFFF" />
    <path d="M 60 12 C 82 12 98 18 104 24 V 58 C 104 84 84 102 60 110 C 36 102 16 84 16 58 V 24 C 22 18 38 12 60 12 Z" fill="#1E3A8A" />
    <path d="M 60 20 C 78 20 91 25 96 30 V 58 C 96 80 80 94 60 101 C 40 94 24 80 24 58 V 30 C 29 25 42 20 60 20 Z" fill="#FFFFFF" />
    <polygon points="60,34 65,49 81,49 68,59 73,74 60,65 47,74 52,59 39,49 55,49" fill="#F59E0B" />
    <rect x="38" y="81" width="44" height="6" rx="3" fill="#1E3A8A" />
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function buildSeedSettings() {
  return {
    schoolName: "Ahibenso Anglican Basic",
    className: "JHS 2",
    schoolMotto: "Discipline & Excellence",
    phoneNumber: "0240000000",
    address: "P.O. Box 42, Ahibenso",
    email: "info@ahibensobasic.edu.gh",
    logoUrl: makeSchoolCrestDataUri(),
    headTeacherSignature: "",
    teacherSignature: "",
    schoolType: "STANDARD",
    level: "JHS",
    term: "Second Term",
    academicYear: "2025/2026",
    examType: "TERMLY",
    templateId: "original",
    nextTermStarts: "2026-05-05",
    headTeacherName: "Mr. Samuel Mensah",
    classTeacherName: "Mrs. Grace Boateng",
    totalAttendanceDays: 65,
    classScoreMax: 50,
    examScoreMax: 50,
    classSize: 32,
    defaultSubjects: [
      "Mathematics",
      "English Language",
      "Integrated Science",
      "Social Studies",
      "Computing",
      "Religious & Moral Education",
    ],
    componentLibrary: [
      { name: "Class Test 1", maxScore: 20, category: "CAT" },
      { name: "Group Work", maxScore: 15, category: "GROUP" },
      { name: "Project Work", maxScore: 15, category: "PROJECT" },
    ],
  };
}

function buildDemoStudents(settings) {
  const roster = [
    { name: "Ama Mensah", gender: "Female", att: 64, base: [46, 46] },
    { name: "Efua Frimpong", gender: "Female", att: 65, base: [44, 44] },
    { name: "Kwame Boateng", gender: "Male", att: 63, base: [42, 42] },
    { name: "Abena Osei", gender: "Female", att: 62, base: [39, 40] },
    { name: "Adwoa Asante", gender: "Female", att: 61, base: [37, 38] },
    { name: "Kofi Agyemang", gender: "Male", att: 60, base: [35, 36] },
    { name: "Akua Darko", gender: "Female", att: 59, base: [33, 35] },
    { name: "Kojo Appiah", gender: "Male", att: 58, base: [31, 32] },
    { name: "Yaw Owusu", gender: "Male", att: 57, base: [28, 30] },
    { name: "Nana Yeboah", gender: "Male", att: 55, base: [25, 27] },
  ];

  return roster.map((entry, idx) => ({
    id: `demo-stu-${idx + 1}`,
    name: entry.name,
    className: "JHS 2",
    gender: entry.gender,
    attendancePresent: entry.att,
    conduct: "Respectful and attentive in class",
    interest: idx % 2 === 0 ? "Science & Computing" : "Reading & Debate",
    teacherRemark: "Consistent effort throughout the term.",
    pictureUrl: makeAvatarDataUri(entry.name, idx),
    subjects: settings.defaultSubjects.map((subName, subIdx) => {
      const offset = ((idx + subIdx) % 5) - 2;
      const classScore = Math.max(15, Math.min(50, entry.base[0] + offset));
      const examScore = Math.max(15, Math.min(50, entry.base[1] - offset));
      const cat = Math.min(20, Math.round((classScore * 20) / 50));
      const grp = Math.min(15, Math.round((classScore * 15) / 50));
      const prj = Math.max(0, Math.min(15, classScore - cat - grp));
      return {
        id: `demo-sub-${idx + 1}-${subIdx + 1}`,
        name: subName,
        classScore,
        examScore,
        classScoreComponents: [
          {
            id: `comp-${idx}-${subIdx}-1`,
            name: "Class Test 1",
            score: cat,
            maxScore: 20,
            category: "CAT",
          },
          {
            id: `comp-${idx}-${subIdx}-2`,
            name: "Group Work",
            score: grp,
            maxScore: 15,
            category: "GROUP",
          },
          {
            id: `comp-${idx}-${subIdx}-3`,
            name: "Project Work",
            score: prj,
            maxScore: 15,
            category: "PROJECT",
          },
        ],
      };
    }),
  }));
}

function startDistServer() {
  const indexHtmlPath = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(
      "dist/index.html not found. Run `npm run build` before generating screenshots.",
    );
  }

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
    let relPath = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, "");
    if (!relPath) relPath = "index.html";

    const candidate = path.resolve(DIST_DIR, relPath);
    const insideDist = candidate === DIST_DIR || candidate.startsWith(DIST_DIR + path.sep);
    const filePath =
      insideDist && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
        ? candidate
        : indexHtmlPath;

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve local preview server port."));
        return;
      }
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function seedAppStorage(send, settings) {
  const settingsJson = JSON.stringify(settings);
  const studentsJson = JSON.stringify(buildDemoStudents(settings));

  await send("Runtime.evaluate", {
    expression: `new Promise((resolve, reject) => {
      try {
        const now = String(Date.now());
        localStorage.setItem("repota_welcome_tour_v2", "true");
        localStorage.setItem("pwa-install-dismissed", now);
        localStorage.setItem("repota_last_backup", now);
        sessionStorage.setItem("repota_dismiss_photo_warning", "true");
        sessionStorage.setItem("repota_backup_reminder_shown", "true");
        sessionStorage.setItem("data_loss_checked", "true");

        const req = indexedDB.open("repota-storage", 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("app-data")) db.createObjectStore("app-data");
          if (!db.objectStoreNames.contains("media-blobs")) db.createObjectStore("media-blobs");
        };
        req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(["app-data"], "readwrite");
          const store = tx.objectStore("app-data");
          store.put(${settingsJson}, "ges_v1_settings");
          store.put(${studentsJson}, "ges_v1_students");
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
        };
      } catch (err) {
        reject(err);
      }
    })`,
    awaitPromise: true,
  });
}

async function waitForCondition(send, checkExpr, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { result } = await send("Runtime.evaluate", {
      expression: checkExpr,
      returnByValue: true,
    });
    if (result?.value === true) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for browser condition.`);
}

async function captureRawAppBuffer(send, baseUrl, routeConfig) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: routeConfig.width,
    height: routeConfig.height,
    deviceScaleFactor: routeConfig.deviceScaleFactor,
    mobile: routeConfig.mobile,
  });

  await send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 249, g: 250, b: 251, a: 1 },
  });

  await send("Page.navigate", { url: `${baseUrl}${routeConfig.route}` });
  await waitForCondition(
    send,
    `(() => {
      if (document.readyState !== "complete") return false;
      const text = document.body ? document.body.innerText : "";
      if (!text.includes(${JSON.stringify(routeConfig.markerText)})) return false;
      if (${Boolean(routeConfig.waitForImages)}) {
        const imgs = Array.from(document.images);
        if (imgs.some((img) => !img.complete || img.naturalWidth === 0)) return false;
      }
      if (${Boolean(routeConfig.waitForRecharts)}) {
        const svg = document.querySelector(".recharts-wrapper svg");
        if (!svg || svg.getBoundingClientRect().height < 40) return false;
      }
      return true;
    })()`,
  );

  if (routeConfig.clickQuickGradebook) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((el) =>
          (el.textContent || "").includes("Quick Gradebook")
        );
        if (!btn) throw new Error("Quick Gradebook toggle button not found");
        btn.click();
      })()`,
    });
    await waitForCondition(
      send,
      `(() => {
        const text = document.body ? document.body.innerText : "";
        return text.includes("Mathematics") && document.querySelectorAll("input").length >= 3;
      })()`,
    );
  }

  // Allow GPU/chart animations and AutoSaveIndicator (3.5s auto-hide) to settle.
  await new Promise((r) => setTimeout(r, routeConfig.settleMs ?? 4000));

  if (typeof routeConfig.scrollExpr === "string") {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const targetY = (${routeConfig.scrollExpr})();
        window.scrollTo(0, Math.max(0, Math.round(targetY)));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 150));
  } else {
    await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
  }

  await send("Runtime.evaluate", {
    expression: "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))",
    awaitPromise: true,
  });

  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });

  const buffer = Buffer.from(data, "base64");
  const expectedWidth = Math.round(routeConfig.width * routeConfig.deviceScaleFactor);
  const expectedHeight = Math.round(routeConfig.height * routeConfig.deviceScaleFactor);
  validatePng(buffer, expectedWidth, expectedHeight, `raw:${routeConfig.id}`);
  return buffer;
}

function embedMiniLogo(logoSvg, sizePx) {
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

  const clipId = `sc-sq-${sizePx}`;
  const defsBlock = logoSvg.slice(defsStart, defsEnd);
  const bodyBlock = logoSvg.slice(defsEnd + "</defs>".length, svgClose);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 512 512" fill="none" style="display:block;flex-shrink:0;">
    ${defsBlock}
      <clipPath id="${clipId}">
        <rect width="512" height="512" rx="112" />
      </clipPath>
    </defs>
    <g clip-path="url(#${clipId})">${bodyBlock}</g>
    <rect x="2" y="2" width="508" height="508" rx="110" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="4" />
  </svg>`;
}

function buildMobileShowcaseHtml(logoSvg, slide, rawBuffer) {
  const rawUri = `data:image/png;base64,${rawBuffer.toString("base64")}`;
  const miniLogo = embedMiniLogo(logoSvg, 24);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 780px;
        height: 1688px;
        overflow: hidden;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
    </style>
  </head>
  <body>
    <div style="position:relative;width:780px;height:1688px;overflow:hidden;background:linear-gradient(150deg,#173078 0%,#1E3A8A 46%,#0B152B 100%);display:flex;flex-direction:column;justify-content:space-between;align-items:center;">
      <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.065) 1.5px,transparent 1.5px);background-size:26px 26px;"></div>
      <div style="position:absolute;left:50%;top:260px;transform:translateX(-50%);width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,0.16) 0%,rgba(250,204,21,0) 68%);"></div>

      <!-- Top Marketing Header -->
      <div style="position:relative;z-index:2;width:100%;padding:40px 44px 18px;text-align:center;display:flex;flex-direction:column;align-items:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);border-radius:999px;padding:7px 16px;">
          <div style="width:24px;height:24px;border-radius:6px;overflow:hidden;">${miniLogo}</div>
          <span style="font-size:14px;font-weight:800;letter-spacing:0.06em;color:#F8FAFC;text-transform:uppercase;">${slide.eyebrow}</span>
        </div>

        <h1 style="margin:18px 0 0 0;font-size:46px;line-height:1.06;font-weight:900;letter-spacing:-0.03em;color:#FFFFFF;">
          ${slide.mobileTitleLine1}<br />
          <span style="color:#FDE047;">${slide.mobileTitleLine2}</span>
        </h1>
        <p style="margin:12px 0 0 0;font-size:20px;line-height:1.35;font-weight:500;color:#CBD5E1;max-width:640px;">
          ${slide.subtitle}
        </p>
      </div>

      <!-- Universal Dark-Glass Phone Bezel (docked flush at bottom, shows complete 390x844 UI) -->
      <div style="position:relative;z-index:2;width:660px;border-radius:46px 46px 0 0;background:#0F172A;padding:14px 14px 0 14px;border:2px solid rgba(255,255,255,0.24);border-bottom:0;box-shadow:0 -10px 56px rgba(5,12,34,0.58);">
        <img src="${rawUri}" style="display:block;width:632px;height:auto;border-radius:34px 34px 0 0;" />
      </div>
    </div>
  </body>
</html>`;
}

function buildDesktopShowcaseHtml(logoSvg, slide, rawBuffer) {
  const rawUri = `data:image/png;base64,${rawBuffer.toString("base64")}`;
  const headerLogo = embedMiniLogo(logoSvg, 40);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 1280px;
        height: 720px;
        overflow: hidden;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
    </style>
  </head>
  <body>
    <div style="position:relative;width:1280px;height:720px;overflow:hidden;background:linear-gradient(145deg,#173078 0%,#1E3A8A 46%,#0B152B 100%);display:flex;flex-direction:column;justify-content:space-between;align-items:center;">
      <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.06) 1.5px,transparent 1.5px);background-size:26px 26px;"></div>
      <div style="position:absolute;left:50%;top:110px;transform:translateX(-50%);width:960px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,0.14) 0%,rgba(250,204,21,0) 68%);"></div>

      <!-- Compact Top Marketing Header -->
      <div style="position:relative;z-index:2;width:100%;padding:20px 64px 14px;display:flex;align-items:center;justify-content:space-between;gap:24px;">
        <div style="display:flex;align-items:center;gap:16px;min-width:0;">
          <div style="width:42px;height:42px;border-radius:11px;overflow:hidden;box-shadow:0 8px 20px rgba(5,12,34,0.35);flex-shrink:0;">${headerLogo}</div>
          <div>
            <h1 style="margin:0;font-size:30px;line-height:1.1;font-weight:900;letter-spacing:-0.025em;color:#FFFFFF;">
              ${slide.desktopTitlePrefix} <span style="color:#FDE047;">${slide.desktopTitleAccent}</span>
            </h1>
            <p style="margin:4px 0 0 0;font-size:15px;line-height:1.3;font-weight:500;color:#CBD5E1;">
              ${slide.subtitle}
            </p>
          </div>
        </div>

        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);border-radius:999px;padding:8px 16px;flex-shrink:0;">
          <span style="display:inline-flex;align-items:center;gap:2px;" aria-hidden="true">
            <span style="width:5px;height:11px;border-radius:2px;background:#EF4444;display:inline-block;"></span>
            <span style="width:5px;height:11px;border-radius:2px;background:#FCD34D;display:inline-block;"></span>
            <span style="width:5px;height:11px;border-radius:2px;background:#22C55E;display:inline-block;"></span>
          </span>
          <span style="font-size:13px;font-weight:800;letter-spacing:0.05em;color:#F8FAFC;text-transform:uppercase;">${slide.eyebrow}</span>
        </div>
      </div>

      <!-- Modern Browser / App Window Frame (docked flush at bottom) -->
      <div style="position:relative;z-index:2;width:1152px;border-radius:16px 16px 0 0;background:#0F172A;border:1.5px solid rgba(255,255,255,0.22);border-bottom:0;box-shadow:0 -8px 48px rgba(5,12,34,0.58);overflow:hidden;">
        <div style="height:26px;background:#0F172A;padding:0 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,0.25);display:inline-block;"></span>
            <span style="width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,0.25);display:inline-block;"></span>
            <span style="width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,0.25);display:inline-block;"></span>
          </div>
          <span style="font-size:11px;font-weight:600;letter-spacing:0.02em;color:rgba(226,232,240,0.72);">repota.app</span>
          <div style="width:42px;"></div>
        </div>
        <img src="${rawUri}" style="display:block;width:1149px;height:auto;" />
      </div>
    </div>
  </body>
</html>`;
}

async function main() {
  const logoSvg = fs.readFileSync(path.join(PUBLIC_DIR, "logo.svg"), "utf8");
  const settings = buildSeedSettings();
  const { server, baseUrl } = await startDistServer();

  const slides = [
    {
      id: "dashboard",
      eyebrow: "Offline-First · Free",
      mobileTitleLine1: "Manage Your Class",
      mobileTitleLine2: "100% Offline.",
      desktopTitlePrefix: "Manage Your Class",
      desktopTitleAccent: "100% Offline.",
      subtitle: "Track student enrollment, positions, and term progress without internet.",
      mobileFile: "screenshot-mobile.png",
      desktopFile: "screenshot-desktop.png",
      mobileCapture: {
        id: "dashboard-mobile",
        route: "/",
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
        markerText: "Ama Mensah",
        settleMs: 4000,
      },
      desktopCapture: {
        id: "dashboard-desktop",
        route: "/",
        width: 1440,
        height: 754,
        deviceScaleFactor: 1.5,
        mobile: false,
        markerText: "Ama Mensah",
        settleMs: 4000,
      },
    },
    {
      id: "report",
      eyebrow: "GES Aligned · A4 Ready",
      mobileTitleLine1: "Print-Ready A4",
      mobileTitleLine2: "GES Report Cards.",
      desktopTitlePrefix: "Print-Ready A4",
      desktopTitleAccent: "GES Report Cards.",
      subtitle: "Generate complete reports with Coat of Arms watermark, grades & remarks.",
      mobileFile: "screenshot-report-mobile.png",
      desktopFile: "screenshot-report-desktop.png",
      mobileCapture: {
        id: "report-mobile",
        route: "/print",
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
        markerText: "Print Preview",
        waitForImages: true,
        settleMs: 1200,
      },
      desktopCapture: {
        id: "report-desktop",
        route: "/print",
        width: 1440,
        height: 754,
        deviceScaleFactor: 1.5,
        mobile: false,
        markerText: "Print Preview",
        waitForImages: true,
        settleMs: 1200,
        scrollExpr: `() => {
          const card = document.querySelector('[data-pdf-card="true"]');
          return card ? card.getBoundingClientRect().top + window.scrollY - 76 : 0;
        }`,
      },
    },
    {
      id: "gradebook",
      eyebrow: "Quick Score Entry",
      mobileTitleLine1: "Fast Gradebook",
      mobileTitleLine2: "& SBA Entry.",
      desktopTitlePrefix: "Fast Gradebook",
      desktopTitleAccent: "& SBA Entry.",
      subtitle: "Enter class & exam scores across subjects in seconds — auto-saved locally.",
      mobileFile: "screenshot-gradebook-mobile.png",
      desktopFile: "screenshot-gradebook-desktop.png",
      mobileCapture: {
        id: "gradebook-mobile",
        route: "/",
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
        markerText: "Ama Mensah",
        clickQuickGradebook: true,
        settleMs: 4000,
        scrollExpr: `() => {
          const btn = Array.from(document.querySelectorAll("button")).find((el) =>
            (el.textContent || "").includes("Quick Gradebook")
          );
          return btn ? btn.getBoundingClientRect().top + window.scrollY - 76 : 0;
        }`,
      },
      desktopCapture: {
        id: "gradebook-desktop",
        route: "/",
        width: 1440,
        height: 754,
        deviceScaleFactor: 1.5,
        mobile: false,
        markerText: "Ama Mensah",
        clickQuickGradebook: true,
        settleMs: 4000,
        scrollExpr: `() => {
          const btn = Array.from(document.querySelectorAll("button")).find((el) =>
            (el.textContent || "").includes("Quick Gradebook")
          );
          return btn ? btn.getBoundingClientRect().top + window.scrollY - 24 : 0;
        }`,
      },
    },
    {
      id: "analytics",
      eyebrow: "Class Insights",
      mobileTitleLine1: "Instant Class",
      mobileTitleLine2: "Analytics & Charts.",
      desktopTitlePrefix: "Instant Class",
      desktopTitleAccent: "Analytics & Charts.",
      subtitle: "Spot score distributions, grade spreads, and AI-powered class insights.",
      mobileFile: "screenshot-analytics-mobile.png",
      desktopFile: "screenshot-analytics-desktop.png",
      mobileCapture: {
        id: "analytics-mobile",
        route: "/analytics",
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
        markerText: "Score Distribution",
        waitForRecharts: true,
        settleMs: 4000,
        scrollExpr: `() => {
          const heading = Array.from(document.querySelectorAll("h3")).find((el) =>
            (el.textContent || "").includes("Score Distribution")
          );
          const card = heading ? heading.closest("div.rounded-xl, div.rounded-2xl") : null;
          const target = card || heading;
          return target ? target.getBoundingClientRect().top + window.scrollY - 78 : 0;
        }`,
      },
      desktopCapture: {
        id: "analytics-desktop",
        route: "/analytics",
        width: 1440,
        height: 754,
        deviceScaleFactor: 1.5,
        mobile: false,
        markerText: "Score Distribution",
        waitForRecharts: true,
        settleMs: 4000,
        scrollExpr: `() => {
          const el = Array.from(document.querySelectorAll("p")).find((p) =>
            (p.textContent || "").toLowerCase().includes("class pulse story")
          );
          const box = el ? el.closest("div.rounded-xl, div.rounded-2xl") : null;
          const target = box || el;
          return target ? target.getBoundingClientRect().top + window.scrollY - 18 : 140;
        }`,
      },
    },
  ];

  try {
    await withHeadlessBrowser(async ({ send, frameId }) => {
      await send("Page.navigate", { url: `${baseUrl}/` });
      await waitForCondition(
        send,
        'document.readyState === "complete" && document.body && document.body.innerText.includes("REPOTA")',
      );
      await seedAppStorage(send, settings);

      for (const slide of slides) {
        const rawMobile = await captureRawAppBuffer(send, baseUrl, slide.mobileCapture);
        const mobileShowcase = await renderHtmlToBuffer(send, frameId, {
          html: buildMobileShowcaseHtml(logoSvg, slide, rawMobile),
          width: 780,
          height: 1688,
          transparent: false,
          label: slide.mobileFile,
        });
        fs.writeFileSync(path.join(PUBLIC_DIR, slide.mobileFile), mobileShowcase);
        console.log(`Generated ${slide.mobileFile} (780x1688, ${mobileShowcase.length} B)`);

        const rawDesktop = await captureRawAppBuffer(send, baseUrl, slide.desktopCapture);
        const desktopShowcase = await renderHtmlToBuffer(send, frameId, {
          html: buildDesktopShowcaseHtml(logoSvg, slide, rawDesktop),
          width: 1280,
          height: 720,
          transparent: false,
          label: slide.desktopFile,
        });
        fs.writeFileSync(path.join(PUBLIC_DIR, slide.desktopFile), desktopShowcase);
        console.log(`Generated ${slide.desktopFile} (1280x720, ${desktopShowcase.length} B)`);
      }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

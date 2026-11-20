import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { PUBLIC_DIR, ROOT_DIR, validatePng, withHeadlessBrowser } from "./lib/cdp-browser.mjs";

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

const SEED_SETTINGS = {
  schoolName: "Ahibenso Anglican Basic",
  className: "JHS 2",
  schoolMotto: "Discipline & Excellence",
  phoneNumber: "0240000000",
  address: "P.O. Box 42, Ahibenso",
  email: "info@ahibensobasic.edu.gh",
  logoUrl: "",
  headTeacherSignature: "",
  teacherSignature: "",
  schoolType: "STANDARD",
  level: "JHS",
  term: "Second Term",
  academicYear: "2025/2026",
  examType: "TERMLY",
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
};

function buildDemoStudents() {
  const roster = [
    { name: "Ama Mensah", gender: "Female", att: 64, base: [46, 46] },
    { name: "Kwame Boateng", gender: "Male", att: 63, base: [44, 43] },
    { name: "Abena Osei", gender: "Female", att: 65, base: [42, 41] },
    { name: "Kofi Agyemang", gender: "Male", att: 61, base: [39, 40] },
    { name: "Akua Darko", gender: "Female", att: 62, base: [38, 37] },
    { name: "Yaw Owusu", gender: "Male", att: 59, base: [35, 36] },
    { name: "Efua Frimpong", gender: "Female", att: 64, base: [45, 44] },
    { name: "Kojo Appiah", gender: "Male", att: 60, base: [37, 38] },
    { name: "Adwoa Asante", gender: "Female", att: 62, base: [41, 40] },
    { name: "Nana Yeboah", gender: "Male", att: 58, base: [33, 34] },
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
    subjects: SEED_SETTINGS.defaultSubjects.map((subName, subIdx) => {
      const offset = ((idx + subIdx) % 5) - 2;
      return {
        id: `demo-sub-${idx + 1}-${subIdx + 1}`,
        name: subName,
        classScore: Math.max(20, Math.min(50, entry.base[0] + offset)),
        examScore: Math.max(20, Math.min(50, entry.base[1] - offset)),
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

async function waitForPageReady(send, markerText, waitForRecharts) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const { result } = await send("Runtime.evaluate", {
      expression: `(() => {
        if (document.readyState !== "complete") return false;
        const text = document.body ? document.body.innerText : "";
        if (!text.includes(${JSON.stringify(markerText)})) return false;
        if (${Boolean(waitForRecharts)}) {
          const svg = document.querySelector(".recharts-wrapper svg");
          if (!svg || svg.getBoundingClientRect().height < 40) return false;
        }
        return true;
      })()`,
      returnByValue: true,
    });

    if (result?.value === true) {
      await new Promise((r) => setTimeout(r, 4000));
      await send("Runtime.evaluate", {
        expression:
          "window.scrollTo(0, 0); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))",
        awaitPromise: true,
      });
      return;
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  throw new Error(`Timed out waiting for route readiness (marker: ${markerText})`);
}

async function seedAppStorage(send) {
  const settingsJson = JSON.stringify(SEED_SETTINGS);
  const studentsJson = JSON.stringify(buildDemoStudents());

  await send("Runtime.evaluate", {
    expression: `new Promise((resolve, reject) => {
      try {
        const now = String(Date.now());
        localStorage.setItem("repota_welcome_tour_v2", "true");
        localStorage.setItem("pwa-install-dismissed", now);
        localStorage.setItem("repota_backup_check", now);
        localStorage.setItem("repota_had_data", "true");
        localStorage.setItem("repota_last_backup", now);
        sessionStorage.setItem("repota_dismiss_photo_warning", "true");
        sessionStorage.setItem("repota_backup_reminder_shown", "true");

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

async function captureRouteScreenshot(send, baseUrl, config) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: config.width,
    height: config.height,
    deviceScaleFactor: config.deviceScaleFactor,
    mobile: config.mobile,
  });

  await send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 249, g: 250, b: 251, a: 1 },
  });

  await send("Page.navigate", { url: `${baseUrl}${config.route}` });
  await waitForPageReady(send, config.markerText, config.waitForRecharts);

  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });

  const buffer = Buffer.from(data, "base64");
  const outWidth = Math.round(config.width * config.deviceScaleFactor);
  const outHeight = Math.round(config.height * config.deviceScaleFactor);
  validatePng(buffer, outWidth, outHeight, config.name);

  fs.writeFileSync(path.join(PUBLIC_DIR, config.name), buffer);
  console.log(`Generated ${config.name} (${outWidth}x${outHeight}, ${buffer.length} B)`);
}

async function main() {
  const { server, baseUrl } = await startDistServer();

  try {
    await withHeadlessBrowser(async ({ send }) => {
      await send("Page.navigate", { url: `${baseUrl}/` });
      await waitForPageReady(send, "REPOTA", false);
      await seedAppStorage(send);

      const captures = [
        {
          name: "screenshot-desktop.png",
          route: "/",
          width: 1280,
          height: 720,
          deviceScaleFactor: 1.5,
          mobile: false,
          markerText: "Ama Mensah",
          waitForRecharts: false,
        },
        {
          name: "screenshot-mobile.png",
          route: "/",
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          mobile: true,
          markerText: "Ama Mensah",
          waitForRecharts: false,
        },
        {
          name: "screenshot-analytics-desktop.png",
          route: "/analytics",
          width: 1280,
          height: 720,
          deviceScaleFactor: 1.5,
          mobile: false,
          markerText: "Analytics",
          waitForRecharts: true,
        },
        {
          name: "screenshot-analytics-mobile.png",
          route: "/analytics",
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          mobile: true,
          markerText: "Analytics",
          waitForRecharts: true,
        },
      ];

      for (const config of captures) {
        await captureRouteScreenshot(send, baseUrl, config);
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

import fs from "node:fs";
import path from "node:path";
import { PUBLIC_DIR, renderHtmlToBuffer, withHeadlessBrowser } from "./lib/cdp-browser.mjs";

function embedSquircleLogo(logoSvg, sizePx) {
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

  const clipId = `og-sq-${sizePx}`;
  const defsBlock = logoSvg.slice(defsStart, defsEnd);
  const bodyBlock = logoSvg.slice(defsEnd + "</defs>".length, svgClose);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 512 512" fill="none" style="display:block;flex-shrink:0;">
    ${defsBlock}
      <clipPath id="${clipId}">
        <rect width="512" height="512" rx="112" />
      </clipPath>
    </defs>
    <g clip-path="url(#${clipId})">${bodyBlock}</g>
    <rect x="2" y="2" width="508" height="508" rx="110" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="4" />
  </svg>`;
}

function buildOgHtml(logoSvg) {
  const lockupLogo = embedSquircleLogo(logoSvg, 56);
  const cardBadgeLogo = embedSquircleLogo(logoSvg, 38);

  const scoreRows = [
    { subject: "Mathematics", classScore: 46, examScore: 46, total: 92, grade: "1" },
    { subject: "English Lang.", classScore: 43, examScore: 44, total: 87, grade: "1" },
    { subject: "Int. Science", classScore: 45, examScore: 45, total: 90, grade: "1" },
    { subject: "Computing", classScore: 44, examScore: 44, total: 88, grade: "1" },
  ]
    .map(
      (row, idx) => `
      <tr style="background:${idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF"};">
        <td style="padding:8px 10px;font-weight:700;color:#0F172A;border-radius:6px 0 0 6px;">${row.subject}</td>
        <td style="padding:8px 6px;text-align:center;color:#475569;font-weight:600;">${row.classScore}</td>
        <td style="padding:8px 6px;text-align:center;color:#475569;font-weight:600;">${row.examScore}</td>
        <td style="padding:8px 6px;text-align:center;color:#0F172A;font-weight:800;">${row.total}</td>
        <td style="padding:8px 8px;text-align:right;border-radius:0 6px 6px 0;">
          <span style="display:inline-block;min-width:24px;text-align:center;background:#DCFCE7;color:#166534;font-weight:800;font-size:12px;padding:2px 7px;border-radius:6px;">${row.grade}</span>
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        padding: 0;
        width: 1200px;
        height: 630px;
        overflow: hidden;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
    </style>
  </head>
  <body>
    <div
      style="position:relative;width:1200px;height:630px;overflow:hidden;background:linear-gradient(135deg,#173078 0%,#1E3A8A 48%,#0B152B 100%);"
    >
      <div
        style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.065) 1.5px,transparent 1.5px);background-size:28px 28px;"
      ></div>
      <div
        style="position:absolute;right:-60px;top:-40px;width:680px;height:680px;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,0.19) 0%,rgba(250,204,21,0) 68%);"
      ></div>

      <div
        style="position:relative;z-index:1;height:630px;padding:56px 64px;display:flex;align-items:center;justify-content:space-between;gap:36px;"
      >
        <!-- Left Column -->
        <div
          style="width:600px;height:100%;display:flex;flex-direction:column;justify-content:space-between;"
        >
          <!-- Brand Lockup -->
          <div style="display:flex;align-items:center;gap:16px;">
            <div
              style="width:56px;height:56px;border-radius:14px;overflow:hidden;box-shadow:0 12px 26px rgba(5,12,34,0.38);"
            >
              ${lockupLogo}
            </div>
            <span
              style="font-size:30px;font-weight:900;letter-spacing:-0.02em;color:#FFFFFF;"
            >REPOTA</span>
            <span
              style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.20);border-radius:999px;padding:6px 14px;font-size:15px;font-weight:700;color:#E2E8F0;"
            >
              <span style="display:inline-flex;align-items:center;gap:2px;" aria-hidden="true">
                <span style="width:6px;height:12px;border-radius:2px;background:#EF4444;display:inline-block;"></span>
                <span style="width:6px;height:12px;border-radius:2px;background:#FCD34D;display:inline-block;"></span>
                <span style="width:6px;height:12px;border-radius:2px;background:#22C55E;display:inline-block;"></span>
              </span>
              repota.app
            </span>
          </div>

          <!-- Hero Headline & Subtitle -->
          <div>
            <h1
              style="margin:0;font-size:60px;line-height:1.04;font-weight:900;letter-spacing:-0.035em;color:#FFFFFF;"
            >
              Generate GES<br />
              Report Cards<br />
              <span style="color:#FDE047;">in Minutes.</span>
            </h1>
            <p
              style="margin:20px 0 0 0;max-width:560px;font-size:21px;line-height:1.45;font-weight:500;color:#CBD5E1;"
            >
              Free, offline-first grading, SBA &amp; A4 printing built for Ghanaian teachers.
            </p>
          </div>

          <!-- Bottom Feature Pills -->
          <div style="display:flex;align-items:center;gap:10px;white-space:nowrap;">
            <span
              style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.20);padding:9px 15px;border-radius:999px;font-size:15px;font-weight:700;color:#FFFFFF;"
            >
              <span style="width:9px;height:9px;border-radius:50%;background:#FDE047;display:inline-block;"></span>
              Offline-First
            </span>
            <span
              style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.20);padding:9px 15px;border-radius:999px;font-size:15px;font-weight:700;color:#FFFFFF;"
            >
              <span style="width:9px;height:9px;border-radius:50%;background:#4ADE80;display:inline-block;"></span>
              100% Private
            </span>
            <span
              style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.20);padding:9px 15px;border-radius:999px;font-size:15px;font-weight:700;color:#FFFFFF;"
            >
              <span style="width:9px;height:9px;border-radius:50%;background:#93C5FD;display:inline-block;"></span>
              KG &middot; Primary &middot; JHS &middot; SHS
            </span>
          </div>
        </div>

        <!-- Right Column: Tilted Ghana Gold Card + Authentic GES Report Preview -->
        <div
          style="width:430px;height:100%;display:flex;align-items:center;justify-content:center;position:relative;"
        >
          <div
            style="position:absolute;width:392px;height:468px;border-radius:22px;background:linear-gradient(135deg,#FDE047 0%,#FACC15 50%,#F59E0B 100%);transform:rotate(5.5deg) translate(12px,4px);box-shadow:0 24px 50px rgba(5,12,34,0.40);"
          ></div>

          <div
            style="position:relative;width:400px;border-radius:20px;background:#FFFFFF;padding:22px;transform:rotate(-1.5deg);box-shadow:0 28px 60px rgba(5,12,34,0.48);color:#0F172A;"
          >
            <!-- School Header -->
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:38px;height:38px;border-radius:10px;overflow:hidden;flex-shrink:0;">
                ${cardBadgeLogo}
              </div>
              <div>
                <div style="font-size:12px;font-weight:900;letter-spacing:0.03em;color:#1E3A8A;">
                  AHIBENSO ANGLICAN BASIC
                </div>
                <div style="font-size:11px;font-weight:700;color:#64748B;margin-top:1px;">
                  GHANA EDUCATION SERVICE &middot; JHS 2
                </div>
              </div>
            </div>

            <!-- Ghana Hairline -->
            <div style="display:flex;height:3px;border-radius:999px;overflow:hidden;margin:13px 0;">
              <div style="flex:1;background:#DC2626;"></div>
              <div style="flex:1;background:#FCD34D;"></div>
              <div style="flex:1;background:#16A34A;"></div>
            </div>

            <!-- Student Banner -->
            <div
              style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"
            >
              <div>
                <div style="font-size:16px;font-weight:800;color:#0F172A;">Ama Mensah</div>
                <div style="font-size:12px;font-weight:600;color:#64748B;margin-top:1px;">
                  Term 2 &middot; 2025/2026
                </div>
              </div>
              <span
                style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:800;white-space:nowrap;"
              >
                1st &middot; 89.2%
              </span>
            </div>

            <!-- GES Score Table -->
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="color:#64748B;font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
                  <th style="padding:4px 10px 6px;text-align:left;">Subject</th>
                  <th style="padding:4px 6px 6px;text-align:center;">Class</th>
                  <th style="padding:4px 6px 6px;text-align:center;">Exam</th>
                  <th style="padding:4px 6px 6px;text-align:center;">Total</th>
                  <th style="padding:4px 8px 6px;text-align:right;">Grd</th>
                </tr>
              </thead>
              <tbody>
                ${scoreRows}
              </tbody>
            </table>

            <!-- Footer -->
            <div
              style="margin-top:12px;padding-top:11px;border-top:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;gap:8px;"
            >
              <span style="font-size:12px;font-weight:600;color:#475569;">
                Conduct: Diligent &amp; respectful
              </span>
              <span
                style="background:#1E3A8A;color:#FFFFFF;font-size:12px;font-weight:700;padding:4px 10px;border-radius:7px;white-space:nowrap;"
              >
                A4 Print Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function main() {
  const logoSvg = fs.readFileSync(path.join(PUBLIC_DIR, "logo.svg"), "utf8");
  const html = buildOgHtml(logoSvg);

  await withHeadlessBrowser(async ({ send, frameId }) => {
    const buffer = await renderHtmlToBuffer(send, frameId, {
      html,
      width: 1200,
      height: 630,
      transparent: false,
      label: "og-image.png",
    });

    const outPath = path.join(PUBLIC_DIR, "og-image.png");
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated og-image.png (1200x630, ${buffer.length} B)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

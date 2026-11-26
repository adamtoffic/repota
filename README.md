# Repota 🇬🇭

**Ghana's Offline-First Report Card Generator for Teachers**

Repota is an open-source Progressive Web App built for Ghanaian educators. It helps teachers manage class scores, generate GES-aligned report cards, and work reliably even without internet access.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## ✨ Core Features

- **GES-aligned grading & SBA markbook** for KG, Primary, JHS, and SHS (multi-task SBA weights, Quick Gradebook, CSV import/export)
- **7 A4 print-ready report templates** with live scaled previews, Color & monochrome `B&W` print modes, custom school brand colors, Islamic Bismillah headers, and iOS PWA PDF Share Sheet support
- **Offline-first IndexedDB storage** with dark/light/system themes and mobile-first navigation shell
- **Class analytics dashboard** across Overview, Subjects, Demographics, and AI Insights
- **Encrypted `.repota` backup & restore** (JSON / password-protected AES-GCM `.repota` files) with atomic rollback recovery
- **PIN and biometric lock options** with auto-lock and recovery code / security question reset

---

## 🔒 Privacy First

Repota is designed so teacher and student data remains on-device in local IndexedDB storage by default.

- Zero-PII architecture — student names, scores, and photos never leave the device
- No mandatory account setup
- Works without internet after initial Service Worker installation

---

## 🚀 Quick Start

### For users

1. Visit [repota.app](https://repota.app)
2. Configure school, grading weights, and template settings
3. Add students manually or import via CSV / spreadsheet paste
4. Enter SBA and exam scores in Quick Gradebook, SBA Markbook, or Student Modal
5. Print A4 report cards or export multi-page PDFs

### For developers

```bash
git clone https://github.com/adamtoffic/repota.git
cd repota
npm install
npm run dev
```

---

## 🏗️ Tech Stack

- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS v4 + Lucide Icons
- TanStack Router + TanStack Virtual
- IndexedDB (`idb`) + AES-GCM `.repota` Web Crypto encryption
- `jsPDF` + `html2canvas-pro` + Recharts
- Vitest + Testing Library + Playwright

---

## 📚 Documentation

- [CHANGELOG.md](CHANGELOG.md)
- [SECURITY.md](SECURITY.md)
- [docs/analytics-events.md](docs/analytics-events.md)

---

## 🤝 Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, standards, and pull request guidelines.

---

## 📞 Support

- Email: repota.team@proton.me
- Issues: [GitHub Issues](https://github.com/adamtoffic/repota/issues)

---

## 📄 License

MIT License © 2026 Repota

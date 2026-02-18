# Repota 🇬🇭

**Ghana's Offline-First Report Card Generator for Teachers**

Repota is an open-source Progressive Web App built for Ghanaian educators. It helps teachers manage class scores, generate GES-aligned report cards, and work reliably even without internet access.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## ✨ Core Features

- **GES-aligned grading support** for KG, Primary, JHS, and SHS
- **Offline-first data storage** with IndexedDB
- **Professional A4 print-ready reports**
- **Bulk student import** and quick score entry workflows
- **Analytics dashboard** for class insights
- **Local backup and restore** via JSON export/import
- **PIN and biometric lock options**

---

## 🔒 Privacy First

Repota is designed so teacher and student data remains on-device in local storage by default.

- No mandatory account setup
- No required cloud dependency for core usage
- Works without internet after initial load

---

## 🚀 Quick Start

### For users

1. Visit [repota.app](https://repota.app)
2. Configure school and term settings
3. Add students (manually or bulk import)
4. Enter class and exam scores
5. Generate and print report cards

### For developers

```bash
git clone https://github.com/adamtoffic/repota.git
cd repota
npm install
npm run dev
```

---

## 🏗️ Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- TanStack Router
- Recharts
- Vitest + Testing Library

---

## 📚 Documentation

- [SECURITY.md](SECURITY.md)

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

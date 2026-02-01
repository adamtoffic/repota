# Repota 🇬🇭

**Ghana's Professional Report Card Generator for Teachers**

A free, offline-first Progressive Web App designed specifically for Ghanaian educators. Generate GES-compliant report cards on any device, even without internet connection.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## ✨ Features

### 📊 GES-Compliant Grading System

- Full support for **KG, Primary, JHS, and SHS** grading standards
- Automatic grade calculation (A1, B2, C3... F9)
- Position ranking per subject and overall performance
- Customizable class score components (tests, quizzes, assignments)

### 📱 Offline-First Architecture

- **Progressive Web App (PWA)** - Install on any device
- Works 100% offline using **IndexedDB** (50MB+ storage capacity)
- Auto-save with intelligent debouncing
- Data persistence guaranteed across sessions

### 🎨 Professional Report Cards

- **A4 print-ready** format with Ghana Coat of Arms watermark
- Customizable school headers (logo, name, motto, contact)
- Multi-page support for students with many subjects
- Teacher signature fields and headteacher endorsement

### 🚀 Productivity Tools

- **Bulk student import** - Paste multiple names at once
- **Smart remark generator** - Auto-generate contextual class teacher remarks
- **Analytics dashboard** - Class performance insights, gender analysis, subject trends
- **Data backup & restore** - Export/import via encrypted JSON files

### 🔒 Privacy & Security

- **No login required** - Zero authentication friction
- **PIN protection** - Optional 4-digit PIN with biometric unlock (Face ID/Touch ID)
- **Data stays local** - Never leaves your device
- **Android cleaner-proof** - Persistent storage protection

### 🎓 School Types Supported

- Standard Government Schools (GES curriculum)
- Private Schools (custom subjects & grading)
- Islamic Schools (integrated Islamic studies)

### 📊 Advanced Features

- Real-time performance analytics with interactive charts
- Subject-wise performance tracking
- Gender-based performance comparison
- Attendance management
- Promotion status tracking
- Age distribution analysis

## Quick Start

1. Visit [repota.app](https://repota.app)
2. Configure your school details (name, term, academic year, grading system)
3. Add students (manually or bulk import)
4. Enter class scores and exam scores
5. Generate and print A4 report cards

## 🏗️ Tech Stack

### Frontend

- **React 19.2** - Latest React with concurrent features
- **TypeScript 5.9** - Type-safe development
- **TanStack Router 1.146** - Type-safe routing
- **Tailwind CSS 4** - Utility-first styling with custom design tokens
- **Recharts 3.7** - Interactive analytics charts
- **Lucide React** - Clean, consistent iconography
  🔒 Privacy & Security

**Your data NEVER leaves your device.**

- ✅ **Zero backend** - No servers, no APIs, no cloud storage
- ✅ **IndexedDB encryption** - Browser-level data protection
- ✅ **Optional PIN lock** - 4-digit PIN with recovery options
- ✅ **Biometric authentication** - Face ID / Touch ID support (iOS/Android)
- ✅ **No tracking** - Zero analytics, zero cookies, zero telemetry
- ✅ **Persistent storage** - Protected from Android cleaner apps
- ✅ **Offline-first** - Works without internet, data stays local

**Data Storage**:

- Students, scores, and settings stored in **IndexedDB**
- 50MB+ storage capacity (vs 5MB localStorage limit)
- Automatic migration from localStorage (legacy users)
- Export data anytime via JSON backup files
- **SWC** - Rust-based compilation for speed
- **ESLint 9** + Prettier - Code quality and formatting
- **Vitest** - Unit and integration testing
- **TypeScript ESLint** - Enhanced type checking

### Storage & Offline

- **IndexedDB (idb 8.0)** - 50MB+ local storage capacity
- **Vite PWA Plugin** - Service worker for offline support
- \*🚀 Getting Started

### For Users

1. **Visit**: [repota.app](https://repota.app) (or your deployed URL)
2. **Install** (Optional): Click "Add to Home Screen" for PWA experience
3. **Configure**: Set up school details (Settings page)
4. **Add Students**: Use bulk import or add individually
5. **Enter Scores**: Fill in class scores and exam scores
6. **Generate Reports**: Print A4-formatted report cards

### For Developers

#### Prerequisites

- Node.js 18+ and npm 9+
- Git

#### Installation

```bash
# Clone the repository
git clone https://github.com/adamtoffic/repota.git
cd repota

# Install dependencies
npm install

# Start development server
npm run dev
# → Opens http://localhost:5173
📚 Documentation

- **[Data Flow Overview](DATA-FLOW-OVERVIEW.md)** - Complete architecture diagram
- **[Code Patterns Audit](CODE-PATTERNS-AUDIT.md)** - Best practices and patterns
- **[Performance Optimization](PERFORMANCE-OPTIMIZATION.md)** - Optimization strategies
- **[Mobile Performance](MOBILE-PERFORMANCE-OPTIMIZATION.md)** - Mobile-specific optimizations
- **[Android Data Protection](docs/ANDROID-DATA-PROTECTION.md)** - How data is protected
- **[Supabase Setup](SUPABASE-SETUP.md)** - Backend integration guide (V2)

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code standards**:
   - Use TypeScript strict mode
   - Follow existing patterns (see CODE-PATTERNS-AUDIT.md)
   - Write tests for new features
   - Run `npm run lint` and `npm run format`
4. **Commit with clear messages**: `git commit -m 'feat: add amazing feature'`
5. **Push to your fork**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- **No React.FormEvent** - Use `FormEvent<HTMLFormElement>` instead
- **Use controlled components** - Prefer useState for simple forms
- **Memoize expensive computations** - Use useMemo/useCallback
- **Test on mobile** - Always test responsive design on real devices
- **IndexedDB over localStorage** - Use idbStorage utils

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea?

1. **Check existing issues** first
2. **Open a new issue** with:
   - Clear description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Device/browser info

## 📞 Support

- **WhatsApp**: [+233 24 814 0806](https://wa.me/233248140806?text=Hi!%20I%20need%20help%20with%20Repota)
- **Email**: repota.team@proton.me
- **Issues**: [GitHub Issues](https://github.com/adamtoffic/repota/issues)

## 🗺️ Roadmap

### V1 (Current)
- ✅ Offline-first architecture
- ✅ GES-compliant grading
- ✅ Analytics dashboard
- ✅ Mobile optimization
- ✅ PIN protection

### V2 (Planned)
- [ ] Supabase backend integration
- [ ] Real-time multi-device sync
- [ ] TanStack Query for data management
- [ ] Teacher collaboration features
- [ ] School admin dashboard
- [ ] Bulk SMS/WhatsApp report delivery

## 📄 License

MIT License © 2026 Repota

**Built with ❤️ for Ghanaian Teachers**

---

### Star History

If you find Repota useful, please star ⭐ this repository to show your support!

### Acknowledgments

- Ghana Education Service (GES) for grading standards
- All teachers who provided feedback
- Open source community for amazing tool
npm run format
```

#### Build for Production

```bash
# Create production build
npm run build
# → Output in dist/

# Preview production build locally
npm run preview
# → Opens http://localhost:4173

# Analyze bundle size
npm run build
# Check dist/assets/ for bundle breakdown
```

#### Project Structure

````
repota/
├── src/
│   ├── api/              # API abstraction layer (ready for backend)
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components (Button, Input, etc.)
│   │   ├── tabs/        # Modal tab components
│   │   └── ...          # Feature components
│   ├── context/         # React Context (SchoolContext - global state)
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Route pages (Dashboard, Analytics, Settings)
│   ├── schemas/         # Zod validation schemas
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (grading, storage, etc.)
│   ├── constants/       # App constants (subjects, classes, etc.)
│   └── test/            # Test files
├── public/              # Static assets
├── docs/                # Documentation
└── dist/                # Production build output
## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
````

## Support

- **WhatsApp**: [+233 24 814 0806](https://wa.me/233248140806?text=Hi!%20I%20need%20help%20with%20Repota)
- **Email**: repota.team@proton.me

## License

MIT © 2026 Repota - Built with ❤️ for Ghanaian Teachers

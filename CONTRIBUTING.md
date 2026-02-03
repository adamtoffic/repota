# Contributing to Repota 🇬🇭

First off, thank you for considering contributing to Repota! It's people like you that make Repota such a great tool for Ghanaian teachers.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs 🐛

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (screenshots, error messages, etc.)
- **Describe the behavior you observed** and what you expected
- **Include details about your environment** (browser, OS, device)

### Suggesting Enhancements ✨

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to Ghanaian teachers
- **Include mockups or examples** if applicable

### Pull Requests 🚀

#### Development Process

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our code standards
4. **Test your changes**: `npm run test`
5. **Run the linter**: `npm run lint`
6. **Format your code**: `npm run format`
7. **Commit your changes** using descriptive commit messages
8. **Push to your fork** and submit a pull request

#### Pull Request Guidelines

- **Keep PRs focused** - One feature/fix per PR
- **Update documentation** - Update README.md if needed
- **Add tests** - Ensure new features have test coverage
- **Follow code style** - Use ESLint and Prettier configs
- **Write clear commit messages** - Use conventional commits format
- **Reference issues** - Link related issues in PR description

#### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add bulk delete students feature
fix: resolve grade calculation for SHS students
docs: update installation instructions
style: format code with prettier
refactor: simplify grading logic
test: add tests for report generation
chore: update dependencies
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Modern browser (Chrome, Firefox, Safari, Edge)
- Git

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/repota.git
cd repota

# Install dependencies
npm install

# Copy environment template (optional)
cp .env.example .env

# Start development server
npm run dev
```

### Project Structure

```
repota/
├── src/
│   ├── api/              # API layer (local + future backend)
│   ├── components/       # React components
│   ├── context/          # React Context providers
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Route pages
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── constants/        # App constants
├── public/               # Static assets
└── docs/                 # Documentation
```

### Code Style

- **TypeScript**: All new code must be TypeScript
- **React 19**: Use modern React patterns (hooks, suspense, etc.)
- **Functional Components**: No class components
- **ESLint**: Run `npm run lint` before committing
- **Prettier**: Run `npm run format` before committing

### Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Key Principles

### 1. **Offline-First**

All features must work offline. IndexedDB is our primary storage.

### 2. **Privacy-First**

No user data leaves their device. No tracking, no analytics (except anonymous Vercel analytics).

### 3. **Ghana-Focused**

Features should align with GES curriculum and Ghanaian educational standards.

### 4. **Performance**

Keep bundle size small. Lazy load when possible. App must be fast on low-end devices.

### 5. **Accessibility**

Follow WCAG 2.1 guidelines. Support keyboard navigation and screen readers.

### 6. **Mobile-First**

Design for mobile, enhance for desktop. PWA features are critical.

## Areas for Contribution

### High Priority 🔥

- **Accessibility improvements** (ARIA labels, keyboard navigation)
- **Test coverage** (currently low, needs improvement)
- **Documentation** (code comments, guides for teachers)
- **Performance optimization** (bundle size, lazy loading)
- **Bug fixes** (check GitHub issues)

### Medium Priority ⭐

- **New grading systems** (different regional requirements)
- **Report card templates** (additional designs)
- **Localization** (Twi, Ga, Ewe, etc.)
- **Analytics features** (more insights for teachers)
- **Export formats** (PDF, Excel, etc.)

### Future Features 🚀

- Supabase backend integration
- Multi-device sync
- Teacher collaboration
- Bulk SMS/WhatsApp delivery

## Questions?

- **Email**: repota.team@proton.me
- **WhatsApp**: [+233 24 814 0806](https://wa.me/233248140806)
- **GitHub Issues**: For technical questions

## Recognition

Contributors will be recognized in our README.md and release notes. Significant contributions may earn you a spot in our CONTRIBUTORS.md file.

---

**Thank you for helping make education better in Ghana! 🇬🇭 📚**

# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Repota, please send a report privately to:

- **Email**: repota.team@proton.me
- **Subject**: [SECURITY] Brief description of the issue

### What to Include

Please include as much of the following information as possible:

- **Type of vulnerability** (e.g., XSS, data exposure, authentication bypass)
- **Full path** of the affected source file(s)
- **Location** of the affected code (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the issue and how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - **Critical**: 1-7 days
  - **High**: 7-14 days
  - **Medium**: 14-30 days
  - **Low**: 30-90 days

### What to Expect

1. **Acknowledgment**: We'll confirm receipt of your report
2. **Investigation**: We'll investigate and validate the issue
3. **Fix Development**: We'll develop and test a fix
4. **Disclosure**: We'll coordinate public disclosure with you
5. **Recognition**: We'll credit you (unless you prefer to remain anonymous)

## Security Considerations

### Data Privacy

Repota is designed with **privacy-first** principles:

- ✅ **No backend** - All data stays on user's device
- ✅ **No authentication** - No user accounts or passwords to compromise
- ✅ **No tracking** - Zero telemetry or analytics (except anonymous Vercel stats)
- ✅ **Local storage** - IndexedDB with optional PIN protection
- ✅ **No network requests** - Works 100% offline

### Known Limitations

1. **Client-Side Storage**: Data is stored in browser IndexedDB
   - Vulnerable to physical device access
   - Protected by optional PIN (4-digit + biometric)
   - Users should enable device-level encryption

2. **No End-to-End Encryption**: Local data is not encrypted at rest
   - PIN provides access control, not encryption
   - Users with sensitive data should use device encryption

3. **XSS Risks**: As a web app, standard XSS risks apply
   - We use React's built-in XSS protection
   - All user inputs are sanitized
   - CSP headers are implemented

### Best Practices for Users

- Enable device lock screen (PIN/password/biometric)
- Don't use Repota on shared/public devices
- Enable Repota's PIN protection feature
- Regularly backup data using the export feature
- Keep browser updated to latest version

### Scope

**In Scope**:

- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Data exposure through browser APIs
- Authentication bypass (PIN security)
- Service Worker vulnerabilities
- Dependency vulnerabilities

**Out of Scope**:

- Physical device access (use device encryption)
- Browser vulnerabilities (report to browser vendors)
- Social engineering attacks
- Denial of Service (DoS)

## Security Updates

Security updates will be released as:

- **Patch versions** (1.0.x) for minor fixes
- **Minor versions** (1.x.0) for moderate vulnerabilities
- **Major versions** (x.0.0) for critical breaking changes

Updates will be announced via:

- GitHub Security Advisories
- Release notes
- README.md

## Hall of Fame 🏆

We recognize security researchers who help keep Repota secure:

_No reports yet - be the first!_

---

**Thank you for helping keep Repota and its users safe! 🇬🇭 🔒**

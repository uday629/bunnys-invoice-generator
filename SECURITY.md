# Security Policy

Bunnys Invoice Generator is an **offline desktop app**. It has no server, no accounts, no telemetry and makes no network requests.

## Reporting a vulnerability
Please **do not open a public issue**. Use GitHub's *Security → Report a vulnerability* (private advisory) on this repository, or message [@bunnysframelab on Instagram](https://www.instagram.com/bunnysframelab/). Include steps to reproduce. We aim to respond within 7 days.

## Security design
| Area | Control |
|---|---|
| Renderer isolation | `contextIsolation`, `sandbox`, `nodeIntegration: false`, no `webview`, DevTools disabled in production |
| IPC | Only the app's own `file://` frame can call IPC (sender check); every payload is schema-validated in the main process; unknown fields are dropped (no mass assignment); IDs are strictly `[A-Za-z0-9_-]` |
| XSS | UI built with DOM text nodes (no `innerHTML` with data); invoice HTML is fully escaped and shown in a script-less `sandbox` iframe; strict CSP (`script-src 'self'`, `connect-src 'none'`) |
| Network | All `http(s)/ws/ftp` requests are cancelled at the session level; permission requests denied |
| External links | Only two allowlisted URLs (Bunnys Framelab website & Instagram) can be opened |
| Data at rest | Encrypted with the OS keychain via Electron `safeStorage` (DPAPI / macOS Keychain), `0600` permissions, atomic writes, rolling `.bak` |
| Uploads | Logo must be PNG/JPEG/WebP data URL, size-limited; SVG rejected |
| Backup import | Re-validated record by record; size-limited; never executed |
| CSV export | Formula-injection neutralised (`=`, `+`, `-`, `@`) |
| Secrets | None required or stored. `.env`, keys and certificates are git-ignored; CI runs secret scanning |
| Supply chain | Zero runtime dependencies; dev tooling only; `npm audit` + CodeQL + Gitleaks in CI |

## Known limitations
- Installers are **not code-signed** (see README). Verify downloads come from this repo's Releases page.
- If the OS keychain is unavailable (some minimal Linux setups) data falls back to unencrypted local storage; the app shows a warning in Settings.

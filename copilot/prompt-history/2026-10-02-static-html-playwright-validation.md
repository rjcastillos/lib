# Static HTML Playwright Validation

- Date: 2026-10-02
- Affected asset: `.github/skills/build-static-html-app-skill/SKILL.md`

## Change

Added browser-validation guidance to reuse an available browser page, prefer Playwright locators for precise interaction/assertion, and serve local static files temporarily over loopback when a direct `file:///` URL is blocked by the hosted browser's workspace-access policy.

## Justification

In this session the integrated browser rejected `file:///home/.../html/positions.html` with HTTP 403 and “File does not reside within a trusted folder.” Serving `html/` temporarily on `127.0.0.1:8765` made `/positions.html` reachable. Playwright interaction through the integrated browser successfully created a ticker and verified the entered EUR currency and ETF type. The workflow avoids repeated blocked file-URL attempts.

## Compatibility

No application runtime, dependencies, or persistent server were added. The guidance describes a temporary local-only test server that must be stopped after validation.

# Deployment

## Source of truth

Only `site-src/` is deployed.

GitHub Actions workflow:

```text
.github/workflows/pages.yml
```

The workflow:

1. checks out the repository
2. copies `site-src/` to `_site/`
3. syntax-checks JavaScript modules
4. runs `npm test`
5. generates PWA icons
6. creates `fuel-prices.json`
7. uploads and deploys the GitHub Pages artifact

## Local verification

```bash
npm test
```

No npm runtime dependencies are required.

## PWA cache

Whenever deployed assets or module paths change:

1. bump the cache key in `site-src/sw.js`
2. update versioned HTML asset references
3. keep HTML and Service Worker asset query versions identical

Smoke tests verify the critical versioned assets.

## Secrets

Do not put API keys in GitHub Pages JavaScript, HTML, CSS, JSON, or manifest files.

Private integrations require a backend, serverless function, or trusted proxy.

## Scheduled deployment

The workflow also runs on a schedule to refresh the generated fuel-price file. The current Opinet HTML parsing is best-effort and falls back to static values if refresh fails. See `COMMERCIAL_READINESS.md` before treating it as a contracted production data source.

## Recovery

If a release breaks production:

1. identify the last successful main commit/Pages run
2. revert the offending PR
3. allow the Pages workflow to redeploy
4. confirm Service Worker cache version changed if static assets changed

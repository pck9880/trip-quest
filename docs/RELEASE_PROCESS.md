# Release Process

The v1.0.0 sale-ready baseline should be preserved as a release branch. Ongoing development can continue normally on `main`.

## Feature update

```text
main
  ↓
feature/<name>
  ↓
npm test
  ↓
Pull Request / CI
  ↓
main
  ↓
GitHub Pages deployment
```

## Rules

1. Do not develop directly in the sale-ready release branch.
2. Keep one concern per PR where practical.
3. Run the full test suite before merge.
4. Update documentation when architecture, providers, assets, or commercial dependencies change.
5. Bump Service Worker cache/versioned assets whenever static asset paths or behavior require a forced refresh.
6. New private APIs must go behind a backend; never put secrets in the static PWA.

This allows the project to remain sellable while new product features continue on `main`.

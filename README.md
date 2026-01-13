# Help Thy Self

Live site (after Pages is enabled): **https://cpg20183.github.io/Help-Thy-Self/**

## Deploy (GitHub Pages via GitHub Actions)
1. Upload these files to the **root** of your repo `cpg20183/Help-Thy-Self` (so `index.html` is visible at the top level).
2. Repo → **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Commit/push to `main` and check the **Actions** tab for a green deploy.

## Repo must contain (root)
- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `manifest.webmanifest`
- `assets/`
- `.github/workflows/pages.yml`

## Optional: Analytics (privacy-friendly)
Analytics is disabled by default. If you want Plausible or Umami, add their single `<script>` tag just before `</head>` in `index.html`.

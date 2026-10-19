# Contributing

Thanks for helping improve Cursorly!

## Setup

```bash
npm install
npx playwright install chromium   # browser for the end-to-end tests
npm run dev                        # rebuild dist/ and demo/demo.css on change
```

Open `demo/index.html` in a browser to try your change.

## Before opening a pull request

- `npm run build` and commit the updated `dist/` files, so the demo and CDN builds stay in sync.
- `npm test` passes (unit tests run in Node, end-to-end tests in Chromium).
- New options, effects, methods or events are documented in `README.md` and `types/index.d.ts`.
- New effect options are listed in the effect's `defaults` (the unit tests check that presets only use known options).
- User-facing changes get a line under **Unreleased** in `CHANGELOG.md`.

## Writing an effect

See **Custom effects** in `README.md`. Built-in effects live in `src/effects/`, one file each, and are registered in `src/effects/index.js`. Keep them cheap per frame: write styles only on the effect's own elements, return `false` from `update()` once nothing moves, and honour `ctx.reducedMotion`.

## Reporting bugs

Please include the browser and OS, the input device (mouse, trackpad, pen), your options object, and a minimal HTML example if you can.

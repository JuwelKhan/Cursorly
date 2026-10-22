# Releasing

Checklist for moving Cursorly into its own public repository and publishing a release.

## 1. Create the public repository

1. On GitHub create **`JuwelKhan/cursorly`** (public, *without* a README or licence, because they already exist here).
2. Copy the contents of this folder into it, keeping the history of this folder if you want:

   ```bash
   # Option A: with history (run inside the TemplateDesigning repo)
   git subtree split --prefix=libraries/cursorly -b cursorly-export
   git push https://github.com/JuwelKhan/Cursorly.git cursorly-export:main

   # Option B: fresh start
   cp -r libraries/cursorly ~/cursorly && cd ~/cursorly
   git init -b main && git add . && git commit -m "Cursorly 0.9.0"
   git remote add origin https://github.com/JuwelKhan/Cursorly.git && git push -u origin main
   ```

3. If you use a different repository or package name, update `name`, `repository`, `bugs` and `homepage` in `package.json`, the banner in `build.js`, and the links in `README.md`, `CHANGELOG.md` and `demo/index.html`.

## 2. Turn on the automation

- **Actions:** the `CI` workflow runs build + tests on every push and pull request.
- **Pages:** *Settings → Pages → Build and deployment → Source: GitHub Actions*. The `Deploy demo` workflow then publishes the demo at `https://juwelkhan.github.io/Cursorly/`.

## 3. Manual testing before the first release

The automated tests only run in Chromium with simulated input. Check by hand:

- [ ] Safari (macOS): every preset, especially `blend`, `orbit` and `spotlight`
- [ ] Firefox: every preset
- [ ] A real mouse and a trackpad (scrolling while hovering sticky/magnetic elements)
- [ ] A touch-screen laptop: touch hides the cursor, the mouse brings it back
- [ ] An iPad with a trackpad or Apple Pencil
- [ ] A phone: nothing is drawn and the page behaves normally
- [ ] OS "reduce motion" setting on
- [ ] High-refresh (120 Hz+) display: smoothing feels the same as at 60 Hz

## 4. Publish

```bash
npm ci
npm run build && npm test
# First release: package.json is already 0.9.0, so just tag it.
# Later releases: npm version patch|minor|major --no-git-tag-version,
# move the Unreleased notes in CHANGELOG.md under the new version, then npm run build.
git commit -am "Release v0.9.0" --allow-empty && git tag v0.9.0 && git push --follow-tags
npm login
npm publish            # runs build + tests again via prepublishOnly
```

Then create a GitHub Release from the `v0.9.0` tag and paste the changelog entry.

The CDN links in the README (`cdn.jsdelivr.net/npm/cursorly@0.9/…`) work as soon as the npm package is published.

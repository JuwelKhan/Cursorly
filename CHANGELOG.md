# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.9.0] — first public beta

### Added

- Twelve composable effects: `dot`, `ring`, `blob`, `trail`, `particles`, `ripple`, `spotlight`, `glow`, `snake`, `orbit`, `crosshair`, `image`.
- Sixteen presets: `classic`, `minimal`, `blend`, `ripple`, `neon`, `rainbow`, `comet`, `sparkle`, `confetti`, `bubbles`, `emoji`, `spotlight`, `glow`, `snake`, `orbit`, `crosshair`.
- HTML attributes: `data-cursor`, `data-cursor-text`, `data-cursor-color`, `data-cursor-magnetic`, `data-cursor-stick`, `data-cursor-hide`.
- Automatic `pointer` and `text` states, per-effect `states` styling and custom states.
- Ring morphing around sticky elements, labels, squash & stretch, magnetic elements.
- Custom effects (`registerEffect`) and presets (`registerPreset`), with DOM and canvas helpers.
- Shared frame loop that sleeps when nothing moves; frame-rate independent smoothing.
- Touch-only devices left alone by default, `prefers-reduced-motion` support, native I-beam in text fields.
- Chainable API, instance events, `data-cursorly` auto-initialisation, ES module and IIFE builds with inlined CSS, TypeScript definitions.

[Unreleased]: https://github.com/JuwelKhan/Cursorly/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/JuwelKhan/Cursorly/releases/tag/v0.9.0

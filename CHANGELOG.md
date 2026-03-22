# Changelog

## [0.2.4] - 2026-03-22

### Changed
- Increased CLI subprocess timeout to 10 minutes for longer-running AI generations

### Documentation
- Added related projects section to README
- Added npm downloads badge to README

## [0.2.3] - 2026-03-15

### Added
- `export` command: convert Lottie JSON and dotLottie files to MP4, WebM, or GIF video
- Frame-by-frame capture via headless Chrome (puppeteer-core) + FFmpeg encoding
- Support for configurable resolution (480p to 4K), framerate, and background color
- Two-pass palette generation for high-quality GIF output
- WebM export with alpha channel transparency

## [0.2.2] - 2026-03-15

### Added
- FAQ section on landing page with accordion UI (why kin3o, pricing, providers, output quality, customization)

## [0.2.1] - 2026-03-15

### Added
- Full SEO metadata: Open Graph, Twitter Cards, JSON-LD structured data
- OG image (1200x630) for social sharing previews
- Favicon (inline SVG)
- `robots.txt` and `sitemap.xml`

### Changed
- Landing page title updated for better search visibility

## [0.2.0] - 2026-03-15

### Added
- LottieFiles marketplace integration: search, download, and publish animations
- Auth flow for LottieFiles (login/logout with token persistence)
- `refine` command for iterative animation improvement
- `view` command with live preview server, hot reload via SSE + fs.watch
- Interactive stick figure demo on landing page (standing/walking/running)
- Interactive mascot in nav — appears on hover, bursts on press
- Brand tokens and design token system
- npm publish workflow on tag push

### Changed
- Landing page: show generating prompts above interactive demos
- Landing page: reframe competitive sections to be generous and constructive
- Deploy workflow triggers on tags only

### Fixed
- Install commands updated to `@afromero/kin3o` scoped package

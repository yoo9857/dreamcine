# ilog OG typography

`ilog-og-sans.ttf` is a subset of Noto Sans KR, renamed **ilog OG Sans**. The original copyright and the SIL Open Font License are preserved in `OFL.txt` and the font metadata.

- Source: https://github.com/google/fonts/tree/main/ofl/notosanskr
- Original file: `NotoSansKR[wght].ttf`
- Subset SHA-256: `a2e06e5e1e90658af2e9e0b607e84d7e2733482b0b4041d15f2e0428f77034e5`
- Contains ASCII and Korean glyphs used in the current social card. If Korean copy changes, extend the subset before regenerating.
- The CLI loads this local font directly. No OS font installation or external font request is needed to serve the card.

Regenerate from the repository root:

```powershell
corepack pnpm --filter @aidream/web og:generate
```

The script uses approved ImageGen artwork in `ilog-keyart.png`: a luminous cinema portal and a scarlet film ribbon on black water. The exact generation prompt is saved in `keyart-prompt.md`. The existing ilog logo is resized in full without cropping its letters or light trails. The final slogan is **창작은 자유롭게. 감상은 즐겁게.**

The script renders at 2400×1260, downsamples with Lanczos3 and writes the production 1200×630 PNG to `apps/web/app/opengraph-image.png`. The only exported previews are a 2× master and a 320px preview under `output/og/`. Rejected designs and copy variants have been removed.

`src/lib/seo/og-image.json` records the PNG's SHA-256, dimensions, byte size, alt text and a content-derived URL revision. Metadata uses that revision in the image URL so a newly approved design can refresh social previews. The CLI writes file-based alt text and the manifest with the image; a regression test checks that all three agree. Text safe areas and a 600 KB transfer budget are validated before publication.

The generated image is checked into the app. Deployments serve it as a static asset and do not require Sharp rendering, font downloads or an AI image API during a link preview request. `/opengraph-image` redirects permanently to `/opengraph-image.png` for existing preview links.

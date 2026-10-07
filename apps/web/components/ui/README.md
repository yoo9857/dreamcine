# UI components

This app already uses Next.js, TypeScript and Tailwind CSS 4. Its established
feature components live in `src/components`, global styles in `app/globals.css`
and `src/styles`, and shared primitives in `packages/ui`.

Reusable imported UI lives here so `@/components/ui/prisma-hero` resolves as in
the supplied example and shadcn installs can use a consistent destination.
`components.json` configures that destination without replacing the existing
theme or feature components. `@/lib/utils` reuses the project's `cn` helper.

No new context provider is required. `PrismaHero` accepts the brand slot,
navigation items, title, description, video/poster URLs and application action.
Its word animation helpers are exported separately. Reduced motion shows the
poster, and the background video can be paused.
The hero fills its parent; give standalone previews a `h-dvh` wrapper as in
`demo.tsx`. The application page supplies its own responsive viewport frame.

For an additional shadcn component, run from `apps/web`:

```powershell
corepack pnpm dlx shadcn@latest add button
```

Review generated theme changes against the existing `packages/ui` tokens.

`coverflow-carousel.tsx` contains the supplied 3D carousel geometry, drag inertia,
keyboard navigation, captions and pagination. `coverflow-carousel-demo.tsx`
keeps the supplied stock-image demo separate from the application's creator data.
The existing content security policy permits the application's creator images;
the stock demo is intended for an isolated component preview.

`/creators` passes up to five real creators and uses `renderSlide` for its portrait,
biography and profile link. `cardHeight` keeps the existing compact card size.
Autoplay pauses on hover, focus and a hidden document, with a pause button and
reduced-motion support. No additional packages or providers are required.
Installation documentation: https://ui.shadcn.com/docs/installation/manual
Motion documentation: https://motion.dev/docs/react-installation

`demo.tsx` is the supplied usage example; `/creator-apply` is the working
integration with real navigation and the existing application endpoint.

`liquid-metal-button.tsx` adapts the supplied Paper Shaders button into a native
button with typed shader lifecycle, submit support, keyboard focus, reduced
motion, timer cleanup and a static metal fallback. `DiscoveryTopbar` uses it
inside the existing search form. Styles live in
`src/styles/liquid-metal-button.css`; `liquid-metal-button-demo.tsx` contains
the text/icon example. The user-requested packages are pinned in `apps/web`;
no additional provider or image asset is needed.

Season artwork is generated with
`node scripts/design/generate-creator-season-tag.mjs YYYY MM|all`.
Published selections live in `src/content/creator-season-editions.ts`.
Append a new month without deleting past selections: the profile header and
existing user badge components read the same history. This is an editorial
selection registry; generating artwork does not grant an award to a user.

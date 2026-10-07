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
Installation documentation: https://ui.shadcn.com/docs/installation/manual
Motion documentation: https://motion.dev/docs/react-installation

`demo.tsx` is the supplied usage example; `/creator-apply` is the working
integration with real navigation and the existing application endpoint.

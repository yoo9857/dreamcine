# Web style ownership

The root layout imports global CSS in this order:

1. `app/globals.css` — Tailwind, design tokens, and document-level defaults only.
2. `app-shell.css` — persistent desktop/mobile navigation and route transitions.
3. `discovery-home.css` — the authenticated discovery home and its feed presentation.
4. `guest-landing.css` — the signed-out marketing landing page.

Keep selectors in the file owned by the screen or shell that renders them. Shared colors and
spacing belong in `@aidream/ui` tokens rather than another page stylesheet. Component-local
styles should use Tailwind utilities or a colocated CSS Module; do not add unrelated page rules
back to `app/globals.css`.

The landing page intentionally uses `body:has(.guest-landing)` to suppress application chrome.
The navigation remains mounted by the shared server layout, while CSS removes it from both the
visual and accessibility trees for signed-out home visits.

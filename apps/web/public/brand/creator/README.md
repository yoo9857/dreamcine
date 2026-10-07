# Creator hero assets

- `prisma-hero.mp4`: background video URL supplied by the user with the Prisma
  component. Stored locally to use the existing same-origin media policy.
- `prisma-poster.jpg`: first frame of the original reference, retained with it.
- `ilog-cinematic-loop.mp4`: current creator-page background, combining the
  four accepted clips in traveler, silk, noir, dragon order. Each transition
  uses a 0.75-second dissolve, including dragon back to traveler. The circular
  edit is 21 seconds, 1280x720, 24 fps, silent H.264 with fast-start MP4.
  The optimized desktop encode is 2,580,831 bytes (50% less than the initial
  edit), with measured mean SSIM 0.982792 over all 504 frames against that edit.
- `ilog-cinematic-mobile.mp4`: the same 21-second edit at 960x540 and 24 fps,
  1,337,082 bytes. A media-qualified source selects it for screens up to 760px
  wide, avoiding the larger desktop download. Playback pauses in hidden tabs
  and resumes when visible, unless the visitor manually paused it.
- `ilog-cinematic-poster.jpg`: the actual first frame of that circular edit,
  used while loading and for playback errors or reduced-motion preferences.
  Only one media surface is rendered at a time.

The creator application keeps the same hero/media instance mounted across
screens. `backgroundOnly` hides its landing-page copy and navigation on the
information screens, while retaining the ambient video under a dark navy
overlay. This prevents the video from disappearing after `#about` is resolved.
The header and media bounds stay fixed when switching between the landing and
information screens. Content waits until the initial hash is resolved so a
direct `#about` visit does not briefly display the landing copy. Panel entrance
and overlay transitions respect reduced-motion preferences.
The application form remains on an opaque surface. The information screens
use a 48% navy veil over the existing gradient to keep copy readable while
allowing the new cinematic imagery to remain visible.

## Generated cinematic candidates

`preview.html` presents four generated 6-second, 1280x720, 24 fps clips:

- `cinematic-threshold.mp4`: traveler entering a sandstone doorway. Its final
  position was staged from the opening reference before animation.
- `cinematic-silk.mp4`: crimson fabric moving in warm light inside a stone hall.
- `cinematic-noir.mp4`: detective beside a rain-covered office window.
- `cinematic-dragon.mp4`: ancient dragon above a ruined mountain citadel.

The web files retain the generated H.264 stream without re-encoding, remove
audio and attached artwork, and use fast-start MP4. Each matching `*-poster.jpg`
comes from the delivered video's first frame. These are continuous takes;
the preview does not force a loop or claim a seamless end-to-start transition.
Motion was reviewed through sampled sequential frames; browser checks verify
decoding and playback, not the absence of every generative visual defect.

The projection-room video was rejected by the user and removed from both the
preview and the workspace's public/native video files. Do not reuse that clip.
The moon and city concepts were also rejected and are excluded from the preview.
Prompts and provenance for the current candidates are kept under
`tmp/creator-video/v3` and `tmp/creator-video/v4`.

Word animation starts with a native CSS fallback. The small
`framer-motion/dom/mini` enhancement loads asynchronously only when the words
enter the viewport, and continues from their current visual state. Text stays
readable when loading that enhancement fails. Reduced-motion visitors skip it.
The React animation runtime is excluded from the initial page bundle.

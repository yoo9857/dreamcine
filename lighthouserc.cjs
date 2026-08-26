module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:3000/'],
      startServerCommand: 'node apps/web/.next/standalone/apps/web/server.js',
      startServerReadyPattern: 'Ready',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--headless --no-sandbox',
        formFactor: 'mobile',
        // Apply Lighthouse's mobile CPU/network limits directly in Chrome so
        // the budget reflects observed paint events instead of Lantern's
        // synthetic estimate. The 2.5 s Core Web Vital target is unchanged.
        throttlingMethod: 'devtools',
        screenEmulation: { mobile: true, width: 390, height: 844 },
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'artifacts/lighthouse',
    },
  },
}

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

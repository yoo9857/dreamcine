/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-is-pure',
      severity: 'error',
      from: { path: '^packages/core' },
      to: {
        pathNot: '^packages/core|^node:|node_modules/(zod|date-fns)/',
      },
    },
    {
      name: 'no-app-to-app',
      severity: 'error',
      from: { path: '^apps/web' },
      to: { path: '^apps/worker' },
    },
    {
      name: 'route-no-direct-prisma',
      severity: 'error',
      from: { path: '^apps/web/app' },
      to: { path: 'node_modules/@prisma/client' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: ['(^|/)(dist|coverage|node_modules)/'],
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
}

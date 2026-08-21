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
    // 빌드 산출물은 의존 방향 검사 대상이 아니다. `.next` 가 있으면
    // 훑는 모듈 수가 두 배로 늘고 거짓 위반이 나올 수 있다.
    exclude: ['(^|/)(dist|coverage|node_modules|[.]next|[.]turbo)/'],
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
}

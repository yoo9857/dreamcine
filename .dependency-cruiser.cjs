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
      /*
        미들웨어는 **Edge 런타임**에서 돈다. Node 코어 모듈에 닿으면
        `next build` 가 깨지는데, 그 실패는 CI 빌드 단계에서야 6분 뒤에
        나타난다. 실제로 한 번 겪었다 — `@aidream/storage` 배럴이
        `get-object.ts` 를 통해 `node:stream` 을 끌어왔다.

        **한계를 알고 쓴다.** `reachable: true` 로 전이 의존을 보려 했으나
        동작하지 않는다: `doNotFollow: node_modules` 때문에 워크스페이스
        패키지가 베어 스펙파이어(`@aidream/storage`)에서 그래프가 끊긴다.
        전역 해석 설정을 바꾸면 기존 규칙들의 동작까지 흔들리므로, 여기서는
        **Node 전용 배럴을 이름으로 금지**한다. 규칙이 좁은 대신 실제로
        발동한다 — 발동하지 않는 가드는 없는 것보다 나쁘다. 전이 검출은
        CI 의 `Build web app` 이 최종 방어선이다.

        CDN URL 만 필요하면 `@aidream/storage/cdn` 서브패스를 쓴다.
      */
      name: 'middleware-must-be-edge-safe',
      severity: 'error',
      comment:
        '미들웨어는 Edge 런타임이다. Node 전용 패키지 배럴을 가져오면 빌드가 깨진다. 서브패스(@aidream/storage/cdn)를 쓰라.',
      from: { path: '^apps/web/middleware[.]ts$' },
      to: { path: '^@aidream/(storage|db|queue|media)$' },
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

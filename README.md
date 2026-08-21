# AIDREAM — AI 드라마 소셜 네트워크

AI로 제작된 드라마(시리즈/에피소드)를 업로드하고, 팔로우·피드·플레이어로 유통하는
크로스플랫폼 SNS 서비스.

- **1차 타깃**: Next.js 15 웹 (PWA, 모바일 웹 포함)
- **2차 타깃**: Expo(React Native) 네이티브 앱 — Phase 2
- **인프라**: Akamai(Linode) VPS + Object Storage(S3 호환) + Akamai CDN
- **설계 규율**: SSS 하네스 (Spec → Skeleton → Stub)

---

## 이 저장소는 "코드"가 아니라 "작업지시서"에서 시작한다

이 저장소의 `docs/`는 CODEX(코딩 에이전트)에게 주는 **실행 계약서**다.
코드는 문서에서 파생되며, 문서와 코드가 어긋나면 **문서가 옳다**.

```
docs/
├─ INDEX.md          ← 전체 문서 맵 + 실행 순서 (여기서 시작)
├─ HARNESS.md        ← SSS 하네스 규율 (CODEX 최상위 규칙, 절대 위반 금지)
├─ GLOSSARY.md       ← 용어/명명 규칙 사전
├─ 00_SPEC/          ← 불변 계약 (무엇을 만드는가)
├─ 10_TASKS/         ← 단위 작업지시서 (어떻게 만드는가, T00→T12 순서)
└─ 20_OPS/           ← 운영·예외처리·유지보수 (어떻게 살려두는가)
```

## CODEX 실행 프로토콜

CODEX 세션을 시작할 때 **아래 프롬프트를 그대로 붙여넣는다**:

```
너는 이 저장소의 구현 담당이다. 다음 순서로만 움직여라.

1. docs/HARNESS.md 를 읽고 SSS 하네스 규율을 그대로 따른다.
1b. docs/00_SPEC/11_CAPACITY_TIERS.md 를 읽는다. 현재 티어는 T0 이며,
    업로드 상한·래더·동시성 같은 사양 의존 숫자는 코드에 박지 않고
    Capacity 객체에서 읽는다.
2. docs/INDEX.md 에서 다음에 해야 할 태스크 번호를 확인한다.
3. 해당 docs/10_TASKS/T{NN}_*.md 를 읽고, 그 문서가 참조하는
   docs/00_SPEC/*.md 만 추가로 읽는다. (그 외 파일 임의 참조 금지)
4. S1(Spec 확인) → S2(Skeleton) → S3(Stub/구현) 순서로만 진행한다.
   각 단계 끝에서 `pnpm gate` 를 실행해 통과해야 다음 단계로 간다.
5. 게이트 실패 시 다음 단계로 넘어가지 말고, 실패 원인을 고친다.
   2회 연속 실패하면 작업을 멈추고 사람에게 보고한다.
6. 스펙과 코드가 충돌하면 코드를 바꾼다. 스펙을 절대 임의 수정하지 않는다.
   스펙이 틀렸다고 판단되면 docs/_ISSUES.md 에 기록하고 멈춘다.
```

## 개발 시작

```bash
pnpm install
cp .env.example .env.local     # 값 채우기 → docs/00_SPEC/03_TECH_STACK.md 참조
docker compose up -d           # postgres, redis, minio
pnpm db:migrate
pnpm dev
```

## 게이트 명령 (하네스의 핵심)

```bash
pnpm gate        # lint + typecheck + test + build — 전부 통과해야 커밋 가능
pnpm gate:s2     # Skeleton 단계 게이트 (typecheck + lint 만)
pnpm gate:s3     # Stub/구현 단계 게이트 (전체 + 계약 테스트)
```

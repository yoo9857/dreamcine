# _ISSUES — 스펙 결함 신고함

> **CODEX가 `00_SPEC/` 을 수정하는 것은 금지다.** 스펙이 틀렸다고 판단되면
> 여기에 기록하고 **그 태스크를 멈춘다.** 다른 태스크로 넘어가지 않는다.
> 사람이 판단해 스펙을 고치고 상태를 `RESOLVED` 로 바꾸면 재개한다.

---

## 작성 서식

### 스펙 결함

```md
## [ISS-###] 한 줄 제목
- 발견 단계: T{NN}/S{n}
- 스펙 위치: 00_SPEC/{파일}.md §{절}
- 문제: 무엇이 왜 불가능/모순인가 (사실만)
- 재현/근거: 명령 출력, 에러 메시지, 계산 결과
- 제안: 어떻게 바꾸면 되는가 (선택지가 여럿이면 전부)
- 영향: 이 결정이 바뀌면 함께 바뀌는 것들
- 상태: OPEN | RESOLVED | REJECTED
```

### 라이브러리 추가 요청

```md
## [DEP-###] 패키지명@버전
- 요청 단계: T{NN}/S{n}
- 용도: 어디에 무엇을 위해
- 대안 검토: 03_TECH_STACK 의 허용 목록으로 안 되는 이유
- 위험: 번들 크기 / 마지막 릴리스 / 라이선스 / 의존성 수
- 상태: OPEN | APPROVED | REJECTED
```

### 성능·용량 관측 보고

```md
## [OBS-###] 한 줄 제목
- 발견 단계: T{NN}/S{n}
- 관측값: 목표 대비 실측 (10_NFR 의 어느 지표인가)
- 측정 방법: 재현 가능한 형태로
- 상태: OPEN | RESOLVED
```

---

## 처리 규칙

| 상태 | 의미 | 누가 바꾸는가 |
|---|---|---|
| `OPEN` | 사람 판단 대기. **해당 태스크 정지 중.** | CODEX 가 생성 |
| `RESOLVED` | 스펙이 수정됨. 태스크 재개 가능. | 사람 |
| `REJECTED` | 스펙이 맞음. CODEX 의 이해가 틀렸음. 이유가 함께 적힌다. | 사람 |
| `APPROVED` | 라이브러리 승인. `03_TECH_STACK.md` 에 등재 완료. | 사람 |

`OPEN` 항목이 하나라도 있으면, 그 항목이 가리키는 태스크는 진행하지 않는다.
다른 태스크는 의존관계상 무관하다면 진행 가능하다 (`INDEX.md` §2 참조).

---

## 항목

<!-- 여기 아래에 추가. 최신 항목을 위로. -->

## [ISS-001] 루트 project references와 `tsc -b --noEmit`이 양립하지 않음
- 발견 단계: T00/S2
- 스펙 위치: `HARNESS.md` §3 `typecheck`, `T00_BOOTSTRAP.md` §3 루트 `tsconfig.json`
- 문제: 루트 `tsconfig.json`이 전 패키지를 `references`로 연결한 상태에서 명시된 `tsc -b --noEmit`을 실행하면 모든 참조 프로젝트에 `TS6310: Referenced project may not disable emit`이 발생한다.
- 재현/근거: TypeScript 5.9.2에서 `pnpm typecheck` 실행 시 `packages/core`, `db`, `storage`, `media`, `queue`, `ui`, `api-client` 7개 참조 모두 TS6310 발생.
- 제안: 다음 중 하나를 계약으로 선택한다. (A) project references를 유지하고 typecheck를 `tsc -b`로 변경, (B) `--noEmit`을 유지하고 루트 references 대신 패키지별 `tsc --noEmit -p`를 실행.
- 영향: 결정 전에는 `gate:s2`가 구조적으로 통과할 수 없으며 T00 이후 모든 태스크의 정적 게이트도 실행 불가.
- 결정: A안 승인 — project references를 유지하고 typecheck를 `tsc -b`로 변경 (2026-08-21, 사용자 승인)
- 상태: RESOLVED

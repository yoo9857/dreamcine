# T18 — 독자·작가 1:1 메시지

## 진행 상태

- [x] S1 Spec — 2026-10-06 / ISS-023 사용자 결정 반영
- [ ] S2 Skeleton
- [ ] S3 구현

## 1. 목적

독자가 작가 페이지에서 바로 말을 걸고, 작가가 받은 대화에 답할 수 있게 한다.
상시 연결 없이 짧은 주기 갱신으로 대화가 흐르고, 어느 화면에서든 읽지 않은 메시지
수가 보인다. 작가는 받는 범위를 직접 정한다.

## 2. 참조 스펙

- `_ISSUES.md` ISS-023
- `00_SPEC/04_DOMAIN_MODEL.md` (`DmPolicy`, `Conversation`, `DirectMessage`)
- `00_SPEC/05_API_CONTRACT.md` §7-1, §10
- `00_SPEC/07_AUTH_SECURITY.md` §2 (`message.send`, `message.read`)
- `00_SPEC/08_UIUX_SPEC.md` (`/messages`, `/messages/[conversationId]`)
- `00_SPEC/09_ERROR_CATALOG.md` (`E_DM_*`)
- `00_SPEC/10_NFR.md` §4 (`DM_*`)

## 3. 규칙

| 규칙 | 내용 |
|---|---|
| 대화 시작 | 보내는 사람: `message.send` (이메일 인증 회원). 받는 사람: 제작 역할(CREATOR·PARTNER·ADMIN). 자기 자신·차단 관계 불가 |
| 같은 두 사람 | 대화는 하나다. 어느 쪽이 열었든 기존 대화를 이어 쓴다 |
| 받는 범위 | 대화를 연 쪽(독자)의 메시지는 매번 받는 쪽의 `dmPolicy`를 다시 확인한다. `NOBODY` → `E_DM_CLOSED`, `FOLLOWERS` 이면서 팔로우하지 않음 → `E_DM_FOLLOWERS_ONLY` |
| 답장 | 대화를 받은 쪽(작가)의 답장은 범위 설정과 무관하다. 차단만 막는다 |
| 읽지 않음 | 대화마다 참여자별 `unread` 카운터. 보내면 상대 쪽 +1, 읽으면 내 쪽 0 |
| 존재 숨김 | 참여자가 아니면 대화가 있어도 `E_DM_CONVERSATION_NOT_FOUND` |
| 본문 | `sanitizeUserText` 후 1~`DM_MAX_LEN`자 |
| 갱신 | 열린 대화 `DM_THREAD_POLL_SEC`, 배지 `DM_UNREAD_POLL_SEC`. 탭이 숨겨지면 멈춘다 |

## 4. 산출물 파일 (S1)

| 경로 | 책임 |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/*_t18_direct_messages/` | 모델·열거형·마이그레이션 |
| `packages/core/src/enums.ts` | `DmPolicy` |
| `packages/core/src/limits.ts` | `DM_*` 한도 |
| `packages/core/src/errors/codes.ts` | `E_DM_*` |
| `packages/core/src/rules/permission.ts` | `message.send`, `message.read` |
| `packages/core/src/rules/direct-message.ts` | 대화 시작·전송 허용 판정(순수 함수) |
| `packages/core/src/schemas/message.schema.ts` | 요청·응답 스키마 |
| `packages/core/src/entities.ts` | `UserProfile.dmPolicy` |
| `packages/db/src/repositories/message.repo.ts` | 대화·메시지·읽음·안 읽은 수 |
| `packages/db/tests/message.integration.test.ts` | 카운터·페이지·양방향 재사용 |
| `apps/web/src/services/message/*.ts` | 시작·전송·목록·읽음·설정 |
| `apps/web/app/api/conversations/**/route.ts` | 대화 API |
| `apps/web/app/api/messages/unread/route.ts` | 배지 수 |
| `apps/web/app/api/account/messaging/route.ts` | 받는 범위 조회·변경 |
| `apps/web/app/(main)/messages/**/page.tsx` | 받은 메시지함·대화 화면 |
| `apps/web/src/components/messages/*.tsx` | 목록·대화·입력창·배지 |
| `apps/web/src/components/account/MessagingPreference.tsx` | 받는 범위 설정 |
| `apps/web/app/(main)/u/[handle]/page.tsx` | 작가 페이지 "메시지" 버튼 |
| `apps/web/src/components/layout/NavigationLinks.tsx` | 메시지 메뉴·배지 |

## 5. S2 Skeleton

```ts
// core
canStartConversation(input): DirectMessageGate
canSendInConversation(input): DirectMessageGate
// db
findConversationBetween(a, b): Promise<ConversationRow | null>
createConversationWithMessage(input): Promise<{ conversation, message }>
appendMessage(input): Promise<MessageRow>
listConversations(userId, cursor, limit): Promise<Page<ConversationRow>>
listMessages(conversationId, query): Promise<Page<MessageRow>>
markConversationRead(conversationId, userId): Promise<void>
countUnreadMessages(userId): Promise<number>
getDmPolicy(userId) / setDmPolicy(userId, policy)
// web services
startConversation(session, input): Promise<StartConversationResult>
sendMessage(session, conversationId, input): Promise<MessageResponse>
listMyConversations(session, query): Promise<ConversationPage>
getConversation(session, id): Promise<ConversationDetail>
listConversationMessages(session, id, query): Promise<MessagePage>
markConversationRead(session, id): Promise<void>
getUnreadMessageCount(session): Promise<{ count }>
getMessagingPreference / updateMessagingPreference
```

## 6. S3 구현 순서

1. 순수 판정 함수와 테스트(허용·거부 사유 전부).
2. 저장소: 대화 생성과 첫 메시지·카운터를 한 트랜잭션으로. 통합 테스트.
3. 서비스: 권한(`can`) → 대상 → 차단 → 범위 → 저장. 실패마다 오류 코드 테스트.
4. 라우트와 레이트리밋, `openapi.json`.
5. 화면: 메시지함, 대화, 입력창, 배지, 작가 페이지 버튼, 계정 설정.
6. 정적·단위 검사 후 CI 통합 테스트(Linux)로 마이그레이션 검증, 배포 전 DB 백업.

## 7. 예외처리

| 상황 | 결과 |
|---|---|
| 비로그인 | `E_AUTH_REQUIRED` |
| 이메일 미인증 | `E_PERM_DENIED` |
| 받는 사람 없음 | `E_USER_NOT_FOUND` |
| 자기 자신 | `E_USER_SELF_ACTION` |
| 받는 사람이 제작 역할 아님 | `E_DM_NOT_CREATOR` |
| 받지 않음 / 팔로워만 | `E_DM_CLOSED` / `E_DM_FOLLOWERS_ONLY` |
| 차단 관계 | `E_SOCIAL_BLOCKED` |
| 참여자 아님·없는 대화 | `E_DM_CONVERSATION_NOT_FOUND` |
| 본문 초과 | `E_DM_TOO_LONG` |
| 전송·시작 과다 | `E_RATE_LIMITED` |

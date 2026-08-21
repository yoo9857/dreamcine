# O05 — 장애 대응 절차 · 런북

> 알럿을 받았을 때 **이 문서만 보고** 대응할 수 있어야 한다.
> `T11_OBSERVABILITY.md` 의 모든 알럿은 이 문서의 앵커를 가리킨다.

---

## 1. 심각도 등급

| 등급 | 정의 | 대응 시간 | 예시 |
|---|---|---|---|
| **S1 전면 장애** | 서비스 전체 이용 불가 | 즉시 | 웹 응답 없음, DB 다운 |
| **S2 주요 기능 장애** | 핵심 기능 불가, 나머지 정상 | 30분 내 | 재생 불가, 업로드 불가, 로그인 불가 |
| **S3 부분 장애** | 일부 사용자/기능 영향 | 4시간 내 | 트랜스코드 지연, 알림 미발송 |
| **S4 경미** | 사용자 영향 미미 | 다음 영업일 | 카운터 불일치, 로그 노이즈 |

## 2. 대응 5단계 (순서를 지킨다)

```
1. 인지    알럿 수신 / 사용자 제보
2. 진정    ★ 먼저 증거를 확보한다. 재시작을 서두르지 않는다.
             - 대시보드 스크린샷
             - 로그 스냅샷: docker logs --since 30m {서비스} > /tmp/incident-{시각}.log
             - docker compose ps / docker stats
             (재시작하면 증거가 사라진다. 원인을 못 찾으면 다시 터진다.)
3. 완화    사용자 영향을 먼저 줄인다. 근본 원인 해결은 나중.
             - 최근 배포 후라면 → 즉시 롤백
             - 특정 기능이 원인이면 → 그 기능만 차단
4. 복구    §4 런북 실행
5. 기록    포스트모템 (§5). S1/S2 는 필수.
```

**2번(진정)이 가장 자주 생략되고, 가장 비싸다.**
증거 없이 재시작해서 나은 장애는 반드시 재발한다.

## 3. 최초 진단 명령 (30초 안에 실행)

```bash
# 한 번에 실행하는 진단 스크립트
scripts/ops/triage.sh
```

```bash
# triage.sh 내용
echo "=== 컨테이너 상태 ==="; docker compose -f infra/compose/docker-compose.prod.yml ps
echo "=== 헬스 ==="; curl -fsS -m 5 https://$DOMAIN/api/health; echo
echo "=== 레디니스 ==="; curl -sS -m 5 https://$DOMAIN/api/ready | jq
echo "=== 리소스 ==="; docker stats --no-stream
echo "=== 디스크 ==="; df -h
echo "=== 메모리 ==="; free -h
echo "=== 큐 ==="; scripts/ops/queue-status.sh
echo "=== 최근 에러 (web) ==="; docker logs --since 10m web 2>&1 | grep '"level":50' | tail -20
echo "=== 최근 에러 (worker) ==="; docker logs --since 10m worker 2>&1 | grep '"level":50' | tail -20
echo "=== DB 연결 수 ==="; docker exec postgres psql -U $PGUSER -d $PGDATABASE -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

`/api/ready` 의 응답이 **어느 의존성이 죽었는지** 바로 알려준다.
여기서 시작하면 진단이 크게 빨라진다.

---

## 4. 런북 (알럿별 대응)

### 고에러율

**알럿**: `HighErrorRate` — 5xx 비율 5% 초과 5분

```
1. 어느 라우트인가?
   대시보드 → route 라벨별 5xx 분포
2. 어느 에러코드인가?
   docker logs --since 15m web | jq -r 'select(.level>=50) | .err.code' | sort | uniq -c
3. 분기:
   E_DB_UNAVAILABLE      → §DB 장애
   E_STORAGE_UNAVAILABLE → §스토리지 장애
   E_QUEUE_UNAVAILABLE   → §Redis 장애
   E_INTERNAL            → 코드 버그. 스택 확인 → 최근 배포 후라면 즉시 롤백
4. 최근 30분 내 배포가 있었는가?
   → 있으면 즉시 롤백 (원인 분석보다 롤백이 먼저)
5. 롤백 후에도 계속되면 외부 요인 (DB/스토리지/네트워크)
```

### DB 장애

**알럿**: `/api/ready` 의 `db: fail`, `E_DB_UNAVAILABLE` 급증

```
1. 컨테이너 살아있는가?
   docker compose ps postgres
   죽었으면 → docker compose up -d postgres → 로그 확인 (왜 죽었나)
2. 커넥션 고갈인가?
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   → active 가 풀 크기에 도달했으면:
     a. 장기 실행 쿼리 찾기:
        SELECT pid, now()-query_start AS dur, state, query FROM pg_stat_activity
        WHERE state != 'idle' ORDER BY dur DESC LIMIT 10;
     b. 5분 넘는 쿼리는 종료: SELECT pg_terminate_backend({pid});
     c. idle in transaction 이 많으면 → 코드에 트랜잭션 누수 있음 (버그)
3. 디스크 가득인가? → df -h. 로그/WAL 정리
4. 메모리 부족(OOM kill)인가? → dmesg | tail
5. 데이터 손상 의심 → O04 §5 복구
```

**`idle in transaction` 이 쌓이면 트랜잭션을 닫지 않는 버그다.**
재시작으로 넘기지 말고 어느 코드인지 찾는다 (로그의 requestId 로 추적).

### 스토리지 장애

**알럿**: `/api/ready` 의 `storage: fail`, `E_STORAGE_UNAVAILABLE`

```
1. 자격증명 문제인가? (403)
   → .env 의 S3 키 확인. 최근 회전했는가?
   → aws s3 ls s3://aidream-hls --endpoint-url $S3_ENDPOINT 로 직접 확인
2. 공급자 장애인가? (5xx / 타임아웃)
   → Linode 상태 페이지 확인
   → 대기. 앱은 재생 외 기능은 동작해야 함
3. 재생만 안 되는가?
   → CDN 문제일 수 있음 → §CDN 장애
4. 업로드만 안 되는가?
   → 서명 URL 생성 실패 → 자격증명 확인
5. 사용자 공지: "일시적으로 영상 재생이 불안정합니다"
```

### CDN 장애

```
1. 오리진은 정상인가?
   curl -I {S3_ENDPOINT}/aidream-hls/hls/{assetId}/master.m3u8
   → 정상이면 CDN 문제 확정
2. Akamai 상태 확인
3. 임시 조치: CDN_BASE_URL 을 Object Storage 직접 URL 로 변경 → 재시작
   ★ 비용이 크게 증가한다. 장애 복구 후 반드시 되돌린다.
   ★ 되돌리는 것을 잊으면 다음 달 요금 청구서에서 발견한다. 알림을 걸어둔다.
4. 복구 후 CDN_BASE_URL 원복 + 캐시 예열 불필요 (immutable)
```

### Redis 장애

**알럿**: `/api/ready` 의 `redis: fail`

```
1. 컨테이너 확인 → 재시작
2. 메모리 초과인가?
   docker exec redis redis-cli INFO memory | grep used_memory_human
   maxmemory 설정 확인. 초과 시 eviction 정책(allkeys-lru) 동작 확인
3. 영향 범위:
   - 레이트리밋: fail-open 이므로 서비스 계속 (07 §8)
   - 캐시: DB 직접 조회로 계속 (성능 저하)
   - 큐: ★ 잡 유실. 복구 후 recover-stuck 이 PENDING 자산 재발행
   - 조회수 버퍼: 유실 수용
4. 복구 후 확인:
   scripts/ops/queue-status.sh   # 큐가 다시 소비되는가
   # recover-stuck 잡이 방치된 자산을 찾았는지 로그 확인
```

### 큐 적체

**알럿**: `TranscodeQueueBacklog` — 대기 시간 30분 초과

```
1. 워커가 살아있는가?
   docker compose ps worker
   docker logs --since 10m worker | tail -50
2. 워커가 잡을 받고 있는가?
   → 로그에 job started 가 있는가
   → 없으면 Redis 연결 문제 → §Redis 장애
3. 처리가 느린가?
   docker stats worker    # CPU 100% 인가?
   → 정상 (ffmpeg 는 CPU 를 다 쓴다)
   → 동시 처리량 확인: WORKER_CONCURRENCY
4. 조치 (즉시):
   WORKER_CONCURRENCY 증가 → 재시작
   또는 워커 컨테이너 추가: docker compose up -d --scale worker=3
   ★ vCPU / 4 를 초과하면 오히려 느려진다 (06 §7)
5. 조치 (구조적):
   워커 노드 추가 (infra/compose/docker-compose.worker.yml)
6. 특정 잡이 막고 있는가?
   → 매우 긴 영상 하나가 오래 처리 중일 수 있음. 정상.
   → 같은 잡이 계속 재시도 중이면 → §DLQ
```

### DLQ

**알럿**: `DlqNotEmpty`

```
1. 어떤 잡이 실패했는가?
   scripts/ops/dlq-list.sh
2. 실패 원인 확인 (각 잡의 failedReason)
3. 분류:
   E_MEDIA_* (✗ 코드)  → 사용자 파일 문제. 정상 동작.
                          크리에이터에게 알림이 갔는지 확인. DLQ 에서 제거.
   E_STORAGE_/E_DB_    → 인프라 문제였다면 원인 해결 후 재시도
   E_INTERNAL          → ★ 코드 버그. 스택 확인 → 이슈 등록 → 수정 배포 후 재시도
4. 재시도:
   scripts/ops/dlq-retry.sh {jobId}       # 개별
   scripts/ops/dlq-retry.sh --all         # 전체 (원인 해결 후에만)
5. DLQ 를 그냥 비우지 않는다. 원인을 분류한 뒤 처리한다.
```

### 디스크 가득

**알럿**: 디스크 사용률 90% 초과

```
1. 무엇이 차지하는가?
   du -sh /var/lib/docker/* | sort -h | tail
   du -sh $TMP_DIR/* | sort -h | tail
2. 흔한 원인 순서:
   a. Docker 이미지 누적 → docker image prune -a --filter until=168h
   b. 워커 임시 파일 잔존 → ls $TMP_DIR (withWorkspace 가 실패했다는 신호)
      → 수동 삭제 + 왜 남았는지 로그 확인 ★
   c. 로그 누적 → logrotate 확인
   d. DB WAL → 체크포인트 확인
3. 긴급 확보 후 근본 원인 조치
4. 워커 임시 파일이 남았다면 버그다. 이슈 등록.
```

### 재생 불가 (사용자 제보)

```
1. 특정 영상인가, 전체인가?
2. 전체 → §CDN 장애 또는 §스토리지 장애
3. 특정 영상:
   a. 자산 상태 확인: SELECT status, error_code FROM video_asset WHERE id=...
      READY 아니면 → 정상 (변환 중/실패). UI 가 올바르게 표시하는지 확인
   b. READY 인데 재생 불가:
      curl -I {CDN}/hls/{assetId}/master.m3u8
      404 → ★ DB 와 스토리지 불일치. 심각.
            → 재트랜스코드: 자산을 PENDING 으로 되돌리고 재발행
      200 → 세그먼트 확인 → 브라우저 콘솔 에러 확인 (CSP? CORS?)
4. 특정 브라우저만? → 코덱/HLS 호환 문제. 콘솔 로그 수집
```

### 로그인 불가

```
1. 전체인가? → DB 세션이므로 §DB 장애 확인
2. AUTH_SECRET 을 최근 바꿨는가? → 전 사용자 로그아웃 (의도된 동작). 공지
3. 특정 사용자만?
   SELECT status, email_verified FROM "user" WHERE email=...
   SUSPENDED → 정지된 계정 (정상)
   email_verified NULL → 미인증 (정상). 인증메일 재발송 확인
4. Google 로그인만 불가 → OAuth 자격증명/리다이렉트 URI 확인
5. 레이트리밋에 걸렸는가? → Redis 키 확인
```

### 대량 어뷰징 / CDN 트래픽 급증

```
1. 트래픽 출처 확인 (Caddy 로그 / CDN 통계)
   docker logs caddy | jq -r '.request.remote_ip' | sort | uniq -c | sort -rn | head
2. 단일 IP 집중 → 방화벽 차단 (임시)
3. 핫링킹 (외부 사이트가 영상 직접 삽입)
   → Akamai Referer 차단 규칙 적용 (infra/akamai/cache-rules.md)
4. 스크래핑 (피드 API 대량 호출)
   → 레이트리밋 강화. IP 차단
5. 특정 콘텐츠 폭주 (정상 인기)
   → 조치 불필요. 비용만 모니터링
6. 비용 급증 알럿 → 청구액 확인 → 한도 설정 검토
```

### 트랜스코드 성공률 하락

```
1. 실패 에러코드 분포
   대시보드 → aidream_transcode_total{status="failed"} by code
2. E_MEDIA_* (사용자 파일 문제) 가 늘었나?
   → 특정 도구로 만든 파일이 몰려 들어왔을 가능성
   → 정책 검토 필요 (허용 코덱 확대?) → _ISSUES.md
3. E_MEDIA_TRANSCODE_FAILED 가 늘었나?
   → ffmpeg 버전이 바뀌었나? (최근 이미지 갱신)
   → 디스크/메모리 부족인가?
   → 특정 해상도에서만 실패하는가? (buildLadder 버그 의심)
4. 재현: 실패한 원본 하나를 로컬에서 수동 변환
```

---

## 5. 포스트모템 (S1/S2 필수, 24시간 내 작성)

```md
<!-- docs/20_OPS/postmortems/YYYY-MM-DD-{요약}.md -->
# {날짜} {한 줄 요약}

## 심각도 / 영향
- 등급: S?
- 영향 시간: HH:MM ~ HH:MM (총 N분)
- 영향 범위: 어떤 사용자가 무엇을 못 했는가 (추정 인원)

## 타임라인 (UTC)
| 시각 | 사건 |
|---|---|
| 14:02 | 배포 (sha abc123) |
| 14:07 | HighErrorRate 알럿 발화 |
| 14:09 | 대응 시작, 로그 스냅샷 확보 |
| 14:12 | 롤백 실행 |
| 14:15 | 에러율 정상화 |

## 근본 원인
무엇이 왜 일어났는가. **사람을 지목하지 않는다.** 시스템이 그것을 허용한 이유를 쓴다.

## 왜 하네스가 막지 못했는가  ★ 이 항목이 핵심
- 게이트에 이 케이스를 검증하는 테스트가 없었다 → 어떤 테스트를 추가할 것인가
- 또는: 테스트는 있었는데 통과했다 → 왜 통과했는가

## 왜 더 빨리 알지 못했는가
- 알럿이 있었는가? 임계값이 적절했는가?
- 없었다면 어떤 알럿을 추가할 것인가

## 조치 항목
| # | 조치 | 담당 | 기한 | 상태 |
|---|---|---|---|---|
| 1 | {구체적 조치} | | | |

## 잘 된 것
(재현하고 싶은 것을 기록한다 — 롤백이 빨랐다, 알럿이 정확했다 등)
```

### 포스트모템 원칙

| 원칙 | 내용 |
|---|---|
| 비난 없음 | 사람이 실수할 수 있는 시스템이 문제다 |
| 하네스 관점 필수 | "왜 게이트가 못 막았나" 를 반드시 답한다 |
| 조치는 구체적으로 | "주의한다" 는 조치가 아니다. 테스트/알럿/문서가 조치다 |
| 조치 항목을 추적 | 완료될 때까지 `_ISSUES.md` 에도 등재 |
| 24시간 내 작성 | 기억이 사라지기 전에 |

## 6. 사용자 공지 기준

| 등급 | 공지 | 채널 |
|---|---|---|
| S1 | **필수** — 즉시 + 복구 후 | 앱 내 배너 + 공지 페이지 |
| S2 | 30분 이상 지속 시 | 앱 내 배너 |
| S3 | 영향받은 사용자에게 개별 | 알림 (예: 트랜스코드 실패) |
| S4 | 불필요 | — |

### 공지 문구 원칙

```
✓ 무엇이 안 되는지 명확히
✓ 언제 복구 예정인지 (모르면 "확인 중" 이라고 정직하게)
✓ 사용자가 할 수 있는 것 (다시 시도? 기다림?)
✗ 기술 용어 ("Redis 장애" 대신 "일시적인 시스템 문제")
✗ 근거 없는 낙관 ("곧 복구됩니다")
✗ 책임 전가

예:
"현재 영상 업로드가 일시적으로 불가능합니다. 원인을 확인하고 있으며,
 진행 상황은 이 페이지에서 알려드리겠습니다. 이미 업로드된 영상의
 재생과 시청은 정상입니다. (14:30 기준)"
```

## 7. 연락 · 에스컬레이션

| 상황 | 조치 |
|---|---|
| 알럿 수신 | Alertmanager → 이메일 + (선택) 웹훅 |
| S1 인지 후 30분 내 미해결 | 2차 담당자 호출 |
| 공급자 장애 (Linode/Akamai) | 공급자 지원 티켓 + 상태 페이지 모니터링 |
| 보안 사고 | O04 §9 절차 + 법적 검토 필요 여부 판단 |
| 데이터 손실 확정 | 영향 범위 산정 → 사용자 공지 → 재발 방지책 |

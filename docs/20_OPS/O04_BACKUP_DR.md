# O04 — 백업 · 복구 · 재해대책

> **복구를 성공시킨 적 없는 백업은 백업이 아니다.**
> 이 문서의 핵심은 §5 복구 훈련이며, 분기마다 반드시 실행한다.

---

## 1. 목표 (RPO / RTO)

| 지표 | 목표 | 의미 |
|---|---|---|
| **RPO** (허용 데이터 손실) | 24시간 | 일간 백업. 최악의 경우 하루치 손실 |
| **RTO** (복구 목표 시간) | 4시간 | 장애 인지 → 서비스 재개 |
| 미디어 파일 RPO | 0 | Object Storage 자체 내구성에 의존 |
| 미디어 파일 RTO | 즉시 | 별도 복구 불필요 |

**RPO 24시간을 수용하는 근거**: 무료 서비스이며, 하루치 손실은
"업로드/댓글 재작성" 으로 복구 가능한 수준이다. WAL 아카이빙(PITR)은
운영 복잡도가 크게 늘어나므로 Phase 3 유료화 시 도입한다.
— **이 결정을 나중에 뒤집지 않도록 여기 기록한다.**

## 2. 백업 대상

| 대상 | 방법 | 주기 | 보존 | 저장 위치 |
|---|---|---|---|---|
| **PostgreSQL** | `pg_dump -Fc` (custom format) | 일간 03:00 | 일간 30 + 월간 12 | Object Storage 별도 버킷 |
| **`.env`** | 암호화 후 복사 | 변경 시 | 최근 10개 | 오프라인 (담당자 관리) |
| **Object Storage (미디어)** | 백업하지 않음 | — | — | 공급자 내구성 의존 |
| **Redis** | 백업하지 않음 | — | — | 휘발성 데이터만 |
| **Docker 이미지** | 레지스트리 | 배포 시 | 최근 20개 태그 | 레지스트리 |
| **소스코드** | Git 원격 | 커밋 시 | 영구 | Git 호스팅 |
| **로그** | 백업하지 않음 | — | 30일 로테이션 | 로컬 |
| **Prometheus 메트릭** | 백업하지 않음 | — | 15일 | 로컬 |

### 백업하지 않는 것의 근거

| 대상 | 근거 |
|---|---|
| 미디어 파일 | 수 TB. 자체 백업은 비용이 서비스 비용을 초과. Object Storage 는 다중 복제. **단, 실수 삭제는 방어 못 함 → §7** |
| Redis | 큐 잡은 유실 시 `recover-stuck` 이 복구, 캐시는 재생성, 카운터 버퍼는 소량 |
| 로그/메트릭 | 장애 분석용. 과거 데이터의 가치가 낮음 |

## 3. 백업 스크립트

```bash
# scripts/ops/backup-db.sh
set -euo pipefail

TS=$(date -u +%Y%m%dT%H%M%SZ)
FILE="aidream-db-${TS}.dump"
TMP="/tmp/${FILE}"

# 1. 덤프 (custom format — 병렬 복구 가능, 압축 내장)
docker exec aidream-postgres pg_dump -Fc -U "$PGUSER" "$PGDATABASE" > "$TMP"

# 2. 크기 검증 — 이전 백업의 50% 미만이면 실패 처리 ★
SIZE=$(stat -c%s "$TMP")
LAST=$(cat /var/lib/aidream/last-backup-size 2>/dev/null || echo 0)
if [ "$LAST" -gt 0 ] && [ "$SIZE" -lt $((LAST / 2)) ]; then
  echo "FATAL: backup size $SIZE is less than half of previous $LAST" >&2
  exit 1
fi

# 3. 무결성 검증 — 실제로 읽을 수 있는가
pg_restore --list "$TMP" > /dev/null

# 4. 암호화 (age 또는 gpg)
age -r "$BACKUP_PUBKEY" -o "${TMP}.age" "$TMP"

# 5. 업로드
aws s3 cp "${TMP}.age" "s3://aidream-backups/db/${FILE}.age" \
  --endpoint-url "$S3_ENDPOINT"

# 6. 정리 + 기록
rm -f "$TMP" "${TMP}.age"
echo "$SIZE" > /var/lib/aidream/last-backup-size

# 7. 성공 메트릭 (Pushgateway 또는 파일)
echo "aidream_backup_success 1" > /var/lib/node_exporter/backup.prom
echo "aidream_backup_size_bytes $SIZE" >> /var/lib/node_exporter/backup.prom
echo "aidream_backup_timestamp $(date +%s)" >> /var/lib/node_exporter/backup.prom
```

### 크기 검증(2단계)이 중요한 이유

백업 실패의 가장 흔한 형태는 **에러 없이 빈 파일이 만들어지는 것**이다
(예: 권한 문제로 일부 테이블만 덤프). 크기 비교가 이것을 잡는다.

### 무결성 검증(3단계)

`pg_restore --list` 는 실제 복구 없이 덤프의 목차를 읽는다.
손상된 파일이면 여기서 실패한다. **비용 거의 0, 효과 큼.**

## 4. 백업 감시 (알럿)

```yaml
# infra/monitoring/alerts.yml
- alert: BackupMissing
  expr: time() - aidream_backup_timestamp > 108000    # 30시간
  labels: { severity: critical }
  annotations:
    summary: "DB 백업이 30시간 이상 없음"
    runbook: "docs/20_OPS/O04_BACKUP_DR.md#백업-실패-대응"

- alert: BackupShrank
  expr: aidream_backup_size_bytes < 0.7 * avg_over_time(aidream_backup_size_bytes[7d])
  labels: { severity: warning }
```

**백업 실패를 모르는 것이 백업이 없는 것보다 나쁘다** (거짓 안심).
알럿이 반드시 있어야 한다.

## 5. 복구 절차

```bash
# scripts/ops/restore-db.sh {백업파일} {대상DB}
```

```
[준비]
1. 대상 확인 — 프로덕션인가 스테이징인가? ★ 두 번 확인
2. 현재 DB 를 별도 이름으로 보존 (덮어쓰기 전)
   pg_dump -Fc 로 현재 상태를 먼저 백업 (복구가 잘못될 경우 대비)

[복구]
3. 백업 파일 다운로드 + 복호화
   aws s3 cp s3://aidream-backups/db/{파일}.age . && age -d -i key -o restore.dump
4. 앱 정지 (쓰기 차단)
   docker compose stop web worker scheduler
5. 데이터베이스 재생성
   dropdb --if-exists aidream_restore && createdb aidream_restore
6. 복구 (병렬)
   pg_restore -d aidream_restore -j 4 --no-owner --no-acl restore.dump
7. 검증 (§6)
8. 전환
   - 스테이징: DATABASE_URL 을 aidream_restore 로
   - 프로덕션: 구 DB 이름 변경 → restore 를 원래 이름으로
9. 앱 기동
   docker compose up -d
10. 스모크 테스트
```

**2번(현재 상태 백업)을 절대 건너뛰지 않는다.** 복구 작업 자체가
실수일 수 있다. 되돌릴 길을 항상 남긴다.

## 6. 복구 후 검증 체크리스트

- [ ] 테이블 개수가 스키마와 일치 (`\dt` 로 확인)
- [ ] `_prisma_migrations` 테이블의 마지막 마이그레이션이 코드와 일치
- [ ] 사용자 수 / 시리즈 수 / 에피소드 수가 상식적인 값
- [ ] 최신 에피소드의 `created_at` 이 백업 시각 이전
- [ ] 로그인 성공
- [ ] 피드에 에피소드 표시
- [ ] 영상 재생 (미디어는 Object Storage 에 그대로 있음)
- [ ] 댓글/좋아요 데이터 존재
- [ ] 시퀀스/인덱스 정상 (`REINDEX` 불필요 확인)
- [ ] 새 데이터 쓰기 성공 (INSERT 테스트)

```sql
-- 빠른 정합성 확인
SELECT 'users' t, count(*) FROM "user"
UNION ALL SELECT 'series', count(*) FROM series
UNION ALL SELECT 'episodes', count(*) FROM episode
UNION ALL SELECT 'assets', count(*) FROM video_asset
UNION ALL SELECT 'comments', count(*) FROM comment;

-- 마이그레이션 상태
SELECT migration_name, finished_at FROM _prisma_migrations
ORDER BY finished_at DESC LIMIT 5;

-- 자산은 있는데 HLS 경로가 없는 것 (복구 후 이상 신호)
SELECT count(*) FROM video_asset WHERE status='READY' AND master_path IS NULL;
```

## 7. 미디어 파일 재해 대책

미디어는 백업하지 않으므로, **실수 삭제를 구조적으로 막는다.**

| 방어 | 내용 |
|---|---|
| 버킷 버저닝 | Object Storage 버저닝 활성화 → 삭제도 되돌릴 수 있음 |
| 라이프사이클 | 삭제 마커를 30일 후 정리 (그 사이 복구 가능) |
| 삭제 권한 분리 | 앱 자격증명은 `hls`/`thumbs` 삭제만. `originals` 삭제는 별도 자격증명 |
| 정리 잡 안전장치 | 한 번에 1000건 제한, 시간 조건 필수 (`O03` §6) |
| `DRY_RUN` | 정리 잡 첫 실행은 건수만 출력 |

**원본이 살아있으면 HLS 는 재생성 가능하다.** 따라서 `originals` 버킷을
가장 강하게 보호한다. `aidream-originals` 삭제 권한은 앱에서 제거한다.

```
재트랜스코드 복구 시나리오:
  hls 버킷 전체 소실 → originals 는 살아있음
  → 모든 자산을 status=PENDING 으로 되돌리고 큐에 재발행
  → 시간은 걸리지만 완전 복구 가능
  → scripts/ops/requeue-all-transcode.ts (DRY_RUN 필수)
```

## 8. 재해 시나리오별 대응

| 시나리오 | 영향 | 대응 | 예상 RTO |
|---|---|---|---|
| **앱 컨테이너 크래시** | 서비스 중단 | `restart: unless-stopped` 자동 복구 | 1분 |
| **DB 컨테이너 크래시** | 서비스 중단 | 자동 재시작. 데이터는 볼륨에 보존 | 2분 |
| **DB 데이터 손상** | 서비스 중단 | 백업 복구 (§5) | 2~4시간 |
| **실수로 데이터 삭제 (SQL)** | 부분 손실 | 백업 복구 또는 부분 복구 | 2~4시간 |
| **VPS 디스크 장애** | 전면 중단 | 새 VPS + 이미지 pull + 백업 복구 | 4시간 |
| **VPS 완전 소실** | 전면 중단 | 위와 동일 + 도메인 DNS 변경 | 4~6시간 |
| **Object Storage 리전 장애** | 재생 불가 | 공급자 복구 대기. 앱은 동작 (재생만 실패) | 공급자 의존 |
| **HLS 파일 소실** | 재생 불가 | 원본에서 재트랜스코드 (§7) | 수 시간~일 |
| **원본 파일 소실** | 재생 불가 (HLS 남아있으면 재생 가능) | HLS 로 서비스 계속. 원본 복구 불가 |  — |
| **CDN 장애** | 재생 지연/불가 | 오리진 직접 서빙으로 임시 전환 (비용 증가) | 30분 |
| **Redis 소실** | 큐/캐시 유실 | 자동 재시작. `recover-stuck` 이 잡 복구 | 10분 |
| **도메인 만료** | 전면 중단 | 갱신. **자동 갱신 설정 필수** | — |
| **인증서 만료** | HTTPS 불가 | Caddy 자동 갱신. 실패 시 수동 | 30분 |
| **자격증명 유출** | 보안 사고 | 즉시 회전 + 세션 무효화 + 로그 감사 | 1시간 |

## 9. 자격증명 유출 대응 (긴급)

```
1. 즉시 해당 자격증명 무효화 (Object Storage 키 삭제, AUTH_SECRET 회전)
2. 새 자격증명 발급 → .env 갱신 → 재시작
3. AUTH_SECRET 을 바꿨으면 전 세션 무효화됨 (의도된 것)
4. 감사: 유출 시점 이후 접근 로그 확인
   - Object Storage 접근 로그
   - Caddy 접근 로그의 이상 패턴
   - 비정상 데이터 변경 (대량 삭제/생성)
5. 영향 평가 후 사용자 공지 여부 판단
6. 포스트모템 (O05 §5)
```

## 10. 복구 훈련 기록

**분기마다 §5 를 실제로 수행하고 아래에 기록한다.**
기록이 없으면 훈련하지 않은 것으로 간주한다.

| 날짜 | 수행자 | 백업 시점 | 소요 시간 | RTO 달성 | 발견 문제 | 조치 |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

훈련 시 반드시 측정할 것:

- 백업 다운로드 시간
- `pg_restore` 시간 (병렬 `-j 4` 기준)
- 검증 시간
- **전체 소요 시간이 RTO 4시간 이내인가**

DB 가 커지면 복구 시간도 늘어난다. 훈련 결과가 RTO 를 초과하기 시작하면
백업 전략을 재검토한다 (테이블 분리, PITR 도입 등).

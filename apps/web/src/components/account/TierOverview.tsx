import { TIER_LABELS } from '@aidream/core'
import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  TIER_CATEGORY_COPY,
  TIER_LADDER_ROWS,
  TIER_TAGLINES,
  categoryRule,
  formatBytes,
  formatPoints,
  type TierBenefits,
} from '@/src/content/member-tier-guide'
import type { MyTier } from '@/src/services/user/get-my-tier'

import '@/src/styles/account-tier.css'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(iso))
}

/** `/account/tier` 와 개발용 `/tier-preview` 가 같은 화면을 그린다. */
export function TierOverview({
  tier,
  benefits,
}: {
  readonly tier: MyTier
  readonly benefits: TierBenefits
}): ReactNode {
  const progressPercent = Math.round(tier.progress * 1000) / 10
  const pending = tier.computedTier !== tier.appliedTier
  const benefitByTier = new Map(benefits.rows.map((row) => [row.tier, row]))

  return (
    <main className="account-page tier-page">
      <header className="account-hero">
        <div>
          <span>ILOG MEMBERSHIP</span>
          <h1>나의 크리에이터 등급</h1>
          <p>활동 점수로 정해지는 등급과 혜택을 확인하세요.</p>
        </div>
        <Link href="/account">
          계정 관리로 <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section
        className="tier-summary"
        data-tier={tier.appliedTier}
        aria-labelledby="tier-current-title"
      >
        <div className="tier-emblem" aria-hidden="true">
          <span>{TIER_LABELS[tier.appliedTier].slice(0, 1)}</span>
        </div>
        <div className="tier-summary-copy">
          <small>현재 적용 중인 등급</small>
          <h2 id="tier-current-title">{TIER_LABELS[tier.appliedTier]}</h2>
          <p>{TIER_TAGLINES[tier.appliedTier]}</p>
          {pending ? (
            <p className="tier-changed">
              지금 활동 점수는 {TIER_LABELS[tier.computedTier]} 기준입니다. 다음
              정기 평가에서 반영됩니다.
            </p>
          ) : null}
        </div>
        <dl className="tier-summary-score">
          <div>
            <dt>현재 활동 점수</dt>
            <dd>{formatPoints(tier.points)}점</dd>
          </div>
          <div>
            <dt>다음 등급까지</dt>
            <dd>
              {tier.nextTier === null || tier.pointsToNext === null
                ? '최고 등급'
                : `${TIER_LABELS[tier.nextTier]}까지 ${formatPoints(tier.pointsToNext)}점`}
            </dd>
          </div>
        </dl>
        <div className="tier-progress">
          <div
            role="progressbar"
            aria-label={
              tier.nextTier === null
                ? '최고 등급 달성'
                : `${TIER_LABELS[tier.nextTier]} 등급까지 진행률`
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <i style={{ width: `${String(progressPercent)}%` }} />
          </div>
          <small>
            점수는 {formatDate(tier.computedAt)} 기준 실시간 계산입니다. 등급은{' '}
            {tier.evaluatedAt === null
              ? '가입 시 초기 산정'
              : `${formatDate(tier.evaluatedAt)} 평가`}{' '}
            결과이며, 정기 평가로 갱신됩니다.
          </small>
        </div>
      </section>

      <section
        className="account-panel tier-panel"
        aria-labelledby="tier-breakdown-title"
      >
        <div className="account-section-heading">
          <span>01 / SCORE</span>
          <h2 id="tier-breakdown-title">점수 내역</h2>
          <p>
            항목마다 상한이 있어, 한 가지 활동만으로는 최상위 등급에 오를 수
            없습니다. 작품 시청은 다른 크리에이터의 작품만 셉니다.
          </p>
        </div>
        <ul className="tier-breakdown">
          {tier.breakdown.map((entry) => {
            const copy = TIER_CATEGORY_COPY[entry.category]
            const share = Math.min(100, (entry.points / entry.maxPoints) * 100)
            return (
              <li key={entry.category}>
                <div>
                  <strong>{copy.label}</strong>
                  <small>{categoryRule(entry.category)}</small>
                </div>
                <span className="tier-breakdown-units">
                  {formatPoints(entry.units)}
                  {copy.unit}
                </span>
                <b>
                  {formatPoints(entry.points)}
                  <small> / {formatPoints(entry.maxPoints)}점</small>
                </b>
                <i aria-hidden="true">
                  <em style={{ width: `${String(share)}%` }} />
                </i>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        className="account-panel tier-panel"
        aria-labelledby="tier-ladder-title"
      >
        <div className="account-section-heading">
          <span>02 / LADDER</span>
          <h2 id="tier-ladder-title">등급 기준과 혜택</h2>
          <p>
            등급은 서버 용량을 나눠 쓰는 기준입니다. 활동이 줄면 정기 평가에서
            등급이 내려갈 수 있습니다.
          </p>
        </div>
        <div className="tier-ladder-wrap">
          <table className="tier-ladder">
            <thead>
              <tr>
                <th scope="col">등급</th>
                <th scope="col">필요 점수</th>
                <th scope="col">시간당 업로드</th>
                <th scope="col">일일 업로드 용량</th>
                <th scope="col">보유 시리즈</th>
              </tr>
            </thead>
            <tbody>
              {TIER_LADDER_ROWS.map((row) => {
                const benefit = benefitByTier.get(row.tier)
                return (
                  <tr
                    key={row.tier}
                    data-tier={row.tier}
                    aria-current={
                      row.tier === tier.appliedTier ? 'true' : undefined
                    }
                  >
                    <th scope="row">
                      <span className="tier-dot" aria-hidden="true" />
                      {TIER_LABELS[row.tier]}
                      {row.tier === tier.appliedTier ? (
                        <em className="tier-you">내 등급</em>
                      ) : null}
                      <small>{row.tagline}</small>
                    </th>
                    <td>{formatPoints(row.minPoints)}점 이상</td>
                    <td>
                      {benefit === undefined
                        ? '-'
                        : `${String(benefit.hourlyUploads)}건`}
                    </td>
                    <td>
                      {benefit === undefined
                        ? '-'
                        : formatBytes(benefit.dailyUploadBytes)}
                    </td>
                    <td>
                      {benefit === undefined
                        ? '-'
                        : `${formatPoints(benefit.seriesMax)}개`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="tier-note">
          {benefits.note === null ? null : (
            <>
              {benefits.note}
              <br />
            </>
          )}
          궁금한 점은 오른쪽 아래 상담 캐릭터에게 물어보세요.
        </p>
      </section>
    </main>
  )
}

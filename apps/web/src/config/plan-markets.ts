export type PlanLanguage = 'ko' | 'en'
export type PlanRegion = 'KR' | 'US'
export type PlanVariantKey = 'ko-KR' | 'en-KR' | 'en-US'
export type TaxDisplayMode = 'included' | 'added-at-checkout'

export interface PlanRegionConfig {
  readonly region: PlanRegion
  readonly billingCountry: string
  readonly currency: 'KRW' | 'USD'
  readonly monthlyPrice: number
  readonly taxDisplay: TaxDisplayMode
}

export interface PlanVariantConfig {
  readonly key: PlanVariantKey
  readonly language: PlanLanguage
  readonly region: PlanRegion
  readonly route: string
  readonly hrefLang: string
  readonly label: string
  readonly shortLabel: string
}

/**
 * 국가별 가격은 환율로 자동 변환하지 않는다. 각 시장의 구매력·세금·수수료와
 * 실험 결과를 검토한 뒤 이 카탈로그에서 명시적으로 승인한다.
 */
export const PLAN_REGIONS: Record<PlanRegion, PlanRegionConfig> = {
  KR: {
    region: 'KR',
    billingCountry: 'KR',
    currency: 'KRW',
    monthlyPrice: 6900,
    taxDisplay: 'included',
  },
  US: {
    region: 'US',
    billingCountry: 'US',
    currency: 'USD',
    monthlyPrice: 4.99,
    taxDisplay: 'added-at-checkout',
  },
}

const PRIMARY_PLAN_VARIANT: PlanVariantConfig = {
  key: 'ko-KR',
  language: 'ko',
  region: 'KR',
  route: '/ads-plan',
  hrefLang: 'ko-KR',
  label: '대한민국 · 한국어',
  shortLabel: 'KR · 한국어',
}

/** 실제로 QA가 완료되어 사용자에게 노출하는 언어·시장 조합만 등록한다. */
export const PLAN_VARIANTS: readonly PlanVariantConfig[] = [
  PRIMARY_PLAN_VARIANT,
  {
    key: 'en-KR',
    language: 'en',
    region: 'KR',
    route: '/kr-en/ads-plan',
    hrefLang: 'en-KR',
    label: 'South Korea · English',
    shortLabel: 'KR · English',
  },
  {
    key: 'en-US',
    language: 'en',
    region: 'US',
    route: '/en-us/ads-plan',
    hrefLang: 'en-US',
    label: 'United States · English',
    shortLabel: 'US · English',
  },
]

export function getPlanRegion(region: PlanRegion): PlanRegionConfig {
  return PLAN_REGIONS[region]
}

export function getPlanVariant(
  language: PlanLanguage,
  region: PlanRegion,
): PlanVariantConfig {
  return (
    PLAN_VARIANTS.find(
      (variant) => variant.language === language && variant.region === region,
    ) ?? PRIMARY_PLAN_VARIANT
  )
}

export function getPlanVariantByRoute(
  pathname: string,
): PlanVariantConfig | null {
  return PLAN_VARIANTS.find((variant) => variant.route === pathname) ?? null
}

export function formatPlanPrice(
  region: PlanRegion,
  language: PlanLanguage,
): string {
  const config = getPlanRegion(region)
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: config.currency,
    currencyDisplay:
      language === 'ko'
        ? 'narrowSymbol'
        : config.currency === 'KRW'
          ? 'code'
          : 'symbol',
    minimumFractionDigits: config.currency === 'USD' ? 2 : 0,
    maximumFractionDigits: config.currency === 'USD' ? 2 : 0,
  }).format(config.monthlyPrice)
}

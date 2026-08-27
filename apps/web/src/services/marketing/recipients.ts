import { listMarketingRecipients } from '@aidream/db'

import { MARKETING_CONSENT_VERSION } from '@/src/lib/policies'

/** 현재 고지 버전에 명시적으로 동의한 인증 회원만 캠페인 후보가 된다. */
export function getMarketingRecipients(limit: number) {
  return listMarketingRecipients(limit, MARKETING_CONSENT_VERSION)
}

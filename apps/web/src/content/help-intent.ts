import { HELP_ENTRIES, HELP_CONFIDENT_SCORE, type HelpMatch } from './help-qa'

/** Resolve service actions before looking for a work or creator name. */
export function matchServiceHelpEntry(message: string): HelpMatch | null {
  const text = message
    .normalize('NFKC')
    .toLowerCase()
    .replace(/["“‘'][^"”’']*["”’']/g, '')
    .replace(/\s+/g, '')
  let id: string | null = null
  if (/고객센터|고객지원|상담원|문의메일/.test(text)) id = 'support'
  else if (/비번|비밀번호/.test(text) && /잊|까먹|찾|재설정|초기화/.test(text))
    id = 'password-reset'
  else if (
    /(영상|재생|플레이어|화면).*(안나|안돼|안되|멈|오류|에러|버퍼링|검은)/.test(
      text,
    )
  )
    id = 'playback-error'
  else {
    const creator = /크리에이터|크리에디터|크리에터|지원서|포트폴리오/.test(
      text,
    )
    const action = /지원|신청|모집|접수/.test(text)
    const role = /작가|감독|프로듀서|아티스트/.test(text)
    const applicationAction =
      /(?:지원|신청|접수)(?:은|는|을|를)?(?:해|하|할|하려|하고|가능|어디|방법|절차|분야|조건|결과|내용|확인|현황|상태|됐|되었)|(?:어디|어떻게).*(?:지원|신청|접수)|^(?:지원|신청|접수)[?!.]*$|(?:작가|감독|프로듀서|아티스트)(?:로|으로)?(?:지원|신청)[?!.]*$/.test(
        text,
      )
    const serviceTopic = creator || applicationAction
    if (
      serviceTopic &&
      /지원서수정|지원내용수정|지원서변경|다시제출|다시지원|고치/.test(text)
    )
      id = 'creator-edit'
    else if (serviceTopic && /경력|학력|국적|초보|자격|지원조건/.test(text))
      id = 'creator-eligibility'
    else if (text.includes('포트폴리오')) id = 'creator-portfolio'
    else if (
      serviceTopic &&
      /접수현황|접수확인|접수됐|접수되었|지원결과|선정결과|접수상태|언제연락/.test(
        text,
      )
    )
      id = 'creator-status'
    else if (serviceTopic && /분야|직군|역할|모집대상/.test(text))
      id = 'creator-tracks'
    else if (serviceTopic && /작성|항목|기입|준비물|무엇을적|뭘적/.test(text))
      id = 'creator-form'
    else if ((action && serviceTopic) || (role && /되는법|되려면/.test(text)))
      id = 'creator-apply'
    else if (
      /^(?:영상|작품|영화|드라마|숏폼|롱폼)(?:은|는)?어디(?:서|에서)?(?:봐|보|볼|감상)/.test(
        text,
      )
    )
      id = 'works'
  }
  if (id === null) return null
  const entry = HELP_ENTRIES.find((item) => item.id === id)
  return entry === undefined ? null : { entry, score: HELP_CONFIDENT_SCORE }
}

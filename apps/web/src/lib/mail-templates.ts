export type MailLocale = 'ko' | 'en'

export interface RenderedMail {
  readonly subject: string
  readonly text: string
  readonly html: string
}

export interface VerificationTemplateInput {
  readonly brandDomain?: string
  readonly href: string
  readonly locale: MailLocale
}

export interface PasswordResetTemplateInput {
  readonly brandDomain?: string
  readonly href: string
  readonly locale?: MailLocale
}

export interface AccountDeletionCancelTemplateInput {
  readonly brandDomain?: string
  readonly href: string
  readonly locale?: MailLocale
  readonly purgeDate: string
}

export interface WelcomeTemplateInput {
  readonly brandDomain?: string
  readonly handle: string
  readonly href: string
  readonly locale?: MailLocale
}

export interface RefundTemplateInput {
  readonly brandDomain?: string
  readonly amount: string
  readonly locale?: MailLocale
  readonly processedAt: string
  readonly reference: string
  readonly status: 'requested' | 'completed'
}

export interface EventTemplateInput {
  readonly brandDomain?: string
  readonly href: string
  readonly locale?: MailLocale
  readonly startsAt?: string
  readonly summary: string
  readonly title: string
  readonly unsubscribeHref: string
}

interface DetailRow {
  readonly label: string
  readonly value: string
}

interface MailFrameInput {
  readonly brandDomain: string
  readonly action?: {
    readonly href: string
    readonly label: string
  }
  readonly details?: readonly DetailRow[]
  readonly eyebrow: string
  readonly footerLink?: {
    readonly href: string
    readonly label: string
  }
  readonly intro: string
  readonly locale: MailLocale
  readonly notice: string
  readonly preheader: string
  readonly title: string
}

const FONT_STACK =
  "Arial, 'Apple SD Gothic Neo', 'Noto Sans KR', Helvetica, sans-serif"

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function actionButton(label: string, href: string): string {
  const safeLabel = escapeHtml(label)
  const safeHref = escapeHtml(href)
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 24px">
    <tr><td style="border-radius:12px;background:#ff4055">
      <a href="${safeHref}" style="display:inline-block;padding:15px 24px;color:#ffffff;font-family:${FONT_STACK};font-size:14px;font-weight:800;line-height:20px;text-decoration:none">${safeLabel}</a>
    </td></tr>
  </table>`
}

function detailTable(rows: readonly DetailRow[]): string {
  if (rows.length === 0) return ''
  const body = rows
    .map(
      ({ label, value }) => `<tr>
        <td style="padding:10px 0;color:#71808a;font-family:${FONT_STACK};font-size:12px;line-height:18px">${escapeHtml(label)}</td>
        <td align="right" style="padding:10px 0;color:#f4f7f8;font-family:${FONT_STACK};font-size:13px;font-weight:700;line-height:18px">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 4px;border-top:1px solid #24333b;border-bottom:1px solid #24333b">${body}</table>`
}

function mailFrame(input: MailFrameInput): string {
  const copyrightYear = String(new Date().getUTCFullYear())
  const safePreheader = escapeHtml(input.preheader)
  const safeEyebrow = escapeHtml(input.eyebrow)
  const safeTitle = escapeHtml(input.title)
  const safeIntro = escapeHtml(input.intro)
  const safeNotice = escapeHtml(input.notice)
  const safeBrandDomain = escapeHtml(input.brandDomain)
  const action =
    input.action === undefined
      ? ''
      : actionButton(input.action.label, input.action.href)
  const fallbackLink =
    input.action === undefined
      ? ''
      : `<p style="margin:0 0 24px;color:#71808a;font-family:${FONT_STACK};font-size:11px;line-height:18px">${
          input.locale === 'en'
            ? 'If the button does not work, copy this address into your browser:'
            : '버튼이 작동하지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.'
        }<br><a href="${escapeHtml(input.action.href)}" style="color:#9eabb2;text-decoration:underline;word-break:break-all">${escapeHtml(input.action.href)}</a></p>`
  const footerLink =
    input.footerLink === undefined
      ? ''
      : `<br><a href="${escapeHtml(input.footerLink.href)}" style="color:#7e8b93;text-decoration:underline">${escapeHtml(input.footerLink.label)}</a>`

  return `<!doctype html>
<html lang="${input.locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>${safeTitle}</title>
    <style>@media only screen and (max-width:620px){.ilog-card{border-radius:0!important}.ilog-pad{padding-left:24px!important;padding-right:24px!important}.ilog-title{font-size:28px!important;line-height:34px!important}}</style>
  </head>
  <body style="margin:0;padding:0;background:#071015;color:#f4f7f8;font-family:${FONT_STACK}">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent">${safePreheader}&#847;&zwnj;&nbsp;&#8199;&#65279;</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#071015">
      <tr><td align="center" style="padding:42px 14px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="ilog-card" style="width:100%;max-width:600px;border:1px solid #25343c;border-radius:24px;background:#0d171d;overflow:hidden">
          <tr><td style="height:4px;background:#ff4055;font-size:0;line-height:0">&nbsp;</td></tr>
          <tr><td class="ilog-pad" style="padding:30px 38px 20px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color:#ffffff;font-family:${FONT_STACK};font-size:26px;font-weight:900;letter-spacing:-1.2px">ILOG<span style="color:#ff4055">.</span></td>
                <td align="right"><span style="display:inline-block;border:1px solid #33434b;border-radius:999px;padding:6px 10px;color:#91a0a8;font-family:${FONT_STACK};font-size:10px;font-weight:800;letter-spacing:1px">${safeEyebrow}</span></td>
              </tr>
            </table>
          </td></tr>
          <tr><td class="ilog-pad" style="padding:16px 38px 38px">
            <p style="margin:0 0 12px;color:#ff6b7b;font-family:${FONT_STACK};font-size:11px;font-weight:900;letter-spacing:1.6px">STORIES BEGIN HERE</p>
            <h1 class="ilog-title" style="margin:0 0 16px;color:#ffffff;font-family:${FONT_STACK};font-size:34px;font-weight:900;line-height:41px;letter-spacing:-1.6px">${safeTitle}</h1>
            <p style="margin:0;color:#a9b4ba;font-family:${FONT_STACK};font-size:15px;line-height:25px">${safeIntro}</p>
            ${action}
            ${fallbackLink}
            ${detailTable(input.details ?? [])}
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-radius:14px;background:#101f26">
              <tr><td style="padding:16px 18px;color:#80909a;font-family:${FONT_STACK};font-size:11px;line-height:18px">${safeNotice}</td></tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;color:#65747c;font-family:${FONT_STACK};font-size:11px;line-height:18px">© ${copyrightYear} ILOG · ${safeBrandDomain}<br>${
          input.locale === 'en'
            ? 'This service email was sent based on your activity on ILOG.'
            : '본 메일은 ILOG 서비스 이용 내역에 따라 발송된 안내 메일입니다.'
        }${footerLink}</p>
      </td></tr>
    </table>
  </body>
</html>`
}

export function verificationTemplate(
  input: VerificationTemplateInput,
): RenderedMail {
  const english = input.locale === 'en'
  const title = english ? 'Verify your email' : '이메일 인증을 완료해 주세요'
  const intro = english
    ? 'Complete this final step to protect your account and start discovering stories on ILOG.'
    : '계정을 안전하게 보호하고 ILOG의 이야기를 만나기 위한 마지막 단계입니다.'
  const expiry = english
    ? 'This secure link expires in 24 hours and can only be used once.'
    : '이 보안 링크는 24시간 동안 한 번만 사용할 수 있습니다.'
  const ignore = english
    ? 'If you did not create an ILOG account, you can safely ignore this email.'
    : '직접 가입하지 않았다면 이 메일을 안전하게 무시하셔도 됩니다.'
  return {
    subject: english
      ? '[ILOG] Verify your email'
      : '[ILOG] 이메일 인증을 완료해 주세요',
    text: [title, '', intro, input.href, '', expiry, ignore].join('\n'),
    html: mailFrame({
      brandDomain: input.brandDomain ?? 'ilog.info',
      action: {
        href: input.href,
        label: english ? 'Verify email' : '이메일 인증하기',
      },
      details: [
        {
          label: english ? 'Link validity' : '링크 유효시간',
          value: english ? '24 hours' : '24시간',
        },
        {
          label: english ? 'Usage' : '사용 횟수',
          value: english ? 'One time' : '1회',
        },
      ],
      eyebrow: 'ACCOUNT VERIFY',
      intro,
      locale: input.locale,
      notice: ignore,
      preheader: intro,
      title,
    }),
  }
}

export function passwordResetTemplate(
  input: PasswordResetTemplateInput,
): RenderedMail {
  const locale = input.locale ?? 'ko'
  const english = locale === 'en'
  const title = english
    ? 'Create a new password'
    : '새 비밀번호를 설정해 주세요'
  const intro = english
    ? 'Use the secure link below to update your ILOG password.'
    : '아래 보안 링크를 통해 ILOG 계정의 비밀번호를 새로 설정할 수 있습니다.'
  const ignore = english
    ? 'If you did not request this change, ignore this email. Your password will remain unchanged.'
    : '직접 요청하지 않았다면 이 메일을 무시해 주세요. 기존 비밀번호는 변경되지 않습니다.'
  return {
    subject: english
      ? '[ILOG] Reset your password'
      : '[ILOG] 비밀번호를 재설정해 주세요',
    text: [title, '', intro, input.href, '', ignore].join('\n'),
    html: mailFrame({
      brandDomain: input.brandDomain ?? 'ilog.info',
      action: {
        href: input.href,
        label: english ? 'Reset password' : '비밀번호 재설정',
      },
      details: [
        {
          label: english ? 'Link validity' : '링크 유효시간',
          value: english ? '1 hour' : '1시간',
        },
        {
          label: english ? 'Security' : '보안 정책',
          value: english ? 'One-time link' : '일회용 링크',
        },
      ],
      eyebrow: 'ACCOUNT SECURITY',
      intro,
      locale,
      notice: ignore,
      preheader: intro,
      title,
    }),
  }
}

export function accountDeletionCancelTemplate(
  input: AccountDeletionCancelTemplateInput,
): RenderedMail {
  const locale = input.locale ?? 'ko'
  const english = locale === 'en'
  const title = english
    ? 'Your account deletion is scheduled'
    : '계정 탈퇴가 예약되었습니다'
  const intro = english
    ? 'Your profile and works are now private. You can restore the account using the secure link below before permanent deletion.'
    : '프로필과 작품은 지금부터 비공개 상태입니다. 영구 삭제 전까지 아래 보안 링크로 계정을 복구할 수 있습니다.'
  const notice = english
    ? 'If you requested deletion, no action is needed. This one-time recovery link expires when permanent deletion begins.'
    : '직접 탈퇴를 요청했다면 별도 조치는 필요하지 않습니다. 이 일회용 복구 링크는 영구 삭제가 시작되면 만료됩니다.'
  return {
    subject: english
      ? '[ILOG] Account deletion scheduled'
      : '[ILOG] 계정 탈퇴 예약 및 복구 안내',
    text: [
      title,
      '',
      intro,
      input.href,
      '',
      `${english ? 'Permanent deletion' : '영구 삭제 예정'}: ${input.purgeDate}`,
      notice,
    ].join('\n'),
    html: mailFrame({
      brandDomain: input.brandDomain ?? 'ilog.info',
      action: {
        href: input.href,
        label: english ? 'Restore my account' : '계정 복구하기',
      },
      details: [
        {
          label: english ? 'Permanent deletion' : '영구 삭제 예정',
          value: input.purgeDate,
        },
        {
          label: english ? 'Recovery link' : '복구 링크',
          value: english ? 'One time' : '1회 사용',
        },
      ],
      eyebrow: 'ACCOUNT RECOVERY',
      intro,
      locale,
      notice,
      preheader: intro,
      title,
    }),
  }
}

export function welcomeTemplate(input: WelcomeTemplateInput): RenderedMail {
  const locale = input.locale ?? 'ko'
  const english = locale === 'en'
  const title = english ? 'Welcome to ILOG' : 'ILOG에 오신 것을 환영합니다'
  const intro = english
    ? `Your account @${input.handle} is ready. Find a story worth remembering and begin your own journey.`
    : `@${input.handle} 계정이 준비되었습니다. 오래 기억할 이야기를 발견하고 나만의 여정을 시작해 보세요.`
  const notice = english
    ? 'You can update your profile and notification preferences at any time in Account settings.'
    : '계정 설정에서 프로필과 알림 수신 정보를 언제든 변경할 수 있습니다.'
  return {
    subject: english
      ? '[ILOG] Your story starts here'
      : '[ILOG] 이제 당신의 이야기를 시작하세요',
    text: [title, '', intro, '', input.href, '', notice].join('\n'),
    html: mailFrame({
      brandDomain: input.brandDomain ?? 'ilog.info',
      action: {
        href: input.href,
        label: english ? 'Explore ILOG' : 'ILOG 둘러보기',
      },
      details: [
        {
          label: english ? 'Account' : '계정',
          value: `@${input.handle}`,
        },
        {
          label: english ? 'Status' : '상태',
          value: english ? 'Verified' : '인증 완료',
        },
      ],
      eyebrow: 'WELCOME',
      intro,
      locale,
      notice,
      preheader: intro,
      title,
    }),
  }
}

export function refundTemplate(input: RefundTemplateInput): RenderedMail {
  const locale = input.locale ?? 'ko'
  const english = locale === 'en'
  const completed = input.status === 'completed'
  const title = completed
    ? english
      ? 'Your refund is complete'
      : '환불 처리가 완료되었습니다'
    : english
      ? 'We received your refund request'
      : '환불 요청을 접수했습니다'
  const intro = completed
    ? english
      ? 'The refund has been returned to your original payment method.'
      : '결제에 사용한 수단으로 환불 처리를 완료했습니다.'
    : english
      ? 'We are reviewing your request and will notify you when processing is complete.'
      : '요청 내용을 확인하고 있으며 처리가 완료되면 다시 안내해 드리겠습니다.'
  const notice = english
    ? 'The time until the amount appears may vary depending on your card issuer or payment provider.'
    : '실제 환급 금액이 표시되는 시점은 카드사 또는 결제수단에 따라 달라질 수 있습니다.'
  return {
    subject: english ? `[ILOG] ${title}` : `[ILOG] ${title}`,
    text: [
      title,
      '',
      intro,
      '',
      `${english ? 'Reference' : '환불번호'}: ${input.reference}`,
      `${english ? 'Amount' : '환불금액'}: ${input.amount}`,
      `${english ? 'Processed at' : '처리일시'}: ${input.processedAt}`,
      '',
      notice,
    ].join('\n'),
    html: mailFrame({
      brandDomain: input.brandDomain ?? 'ilog.info',
      details: [
        {
          label: english ? 'Reference' : '환불번호',
          value: input.reference,
        },
        { label: english ? 'Amount' : '환불금액', value: input.amount },
        {
          label: english ? 'Processed at' : '처리일시',
          value: input.processedAt,
        },
      ],
      eyebrow: 'PAYMENT UPDATE',
      intro,
      locale,
      notice,
      preheader: intro,
      title,
    }),
  }
}

export function eventTemplate(input: EventTemplateInput): RenderedMail {
  const locale = input.locale ?? 'ko'
  const english = locale === 'en'
  const intro = input.summary
  const notice = english
    ? 'This announcement was sent because you opted in to ILOG event updates.'
    : 'ILOG 이벤트 정보 수신에 동의한 회원에게 발송된 안내입니다.'
  const details =
    input.startsAt === undefined
      ? []
      : [
          {
            label: english ? 'Starts at' : '이벤트 시작',
            value: input.startsAt,
          },
        ]
  return {
    subject: `[ILOG] ${input.title}`,
    text: [
      input.title,
      '',
      intro,
      ...(input.startsAt === undefined
        ? []
        : ['', `${english ? 'Starts at' : '이벤트 시작'}: ${input.startsAt}`]),
      '',
      input.href,
      '',
      notice,
      input.unsubscribeHref,
    ].join('\n'),
    html: mailFrame({
      brandDomain: input.brandDomain ?? 'ilog.info',
      action: {
        href: input.href,
        label: english ? 'View event' : '이벤트 확인하기',
      },
      details,
      eyebrow: 'ILOG EVENT',
      footerLink: {
        href: input.unsubscribeHref,
        label: english
          ? 'Unsubscribe from event emails'
          : '이벤트 메일 수신 해제',
      },
      intro,
      locale,
      notice,
      preheader: intro,
      title: input.title,
    }),
  }
}

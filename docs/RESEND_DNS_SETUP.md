# Resend DNS 설정 — ilog.info

## Resend 도메인 설정

```text
Domain: ilog.info
Region: Tokyo (ap-northeast-1)
Custom Return-Path: send
Click Tracking: Disabled
Open Tracking: Disabled
Receiving: Disabled
```

## 1. DKIM

Linode의 `Domains` → `ilog.info` → `TXT Record`에서 추가합니다.

```text
Hostname: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDknwqpHkil8V0Vkyn2tyy3YSPH737ekfBr9X/rJIzvqGxZB+YU5+yFBrl+0Sl4NzHcV7QP/PYnE7jRVkvpkLq7mh6u02tze2QwH3akSBsppCW5wP4yCP3Exm6aCkmuwkVAM13RZvct94xSPYrScbizc3K1OcYvoJMinNqqwp0iWwIDAQAB
TTL: Default
```

## 2. 발송용 MX

Linode의 `MX Record`에서 추가합니다.

```text
Mail Server: feedback-smtp.ap-northeast-1.amazonses.com
Preference: 10
Subdomain: send
TTL: Default
```

## 3. SPF

Linode의 `TXT Record`에서 추가합니다.

```text
Hostname: send
Value: v=spf1 include:amazonses.com ~all
TTL: Default
```

## 4. DMARC

Linode의 `TXT Record`에서 추가합니다.

```text
Hostname: _dmarc
Value: v=DMARC1; p=none;
TTL: Default
```

## 주의사항

- 기존 `mx.zoho.com`, `mx2.zoho.com`, `mx3.zoho.com` MX 레코드는 삭제하지 않습니다.
- Resend의 `Enable Receiving`은 활성화하지 않습니다.
- DNS 레코드를 모두 추가한 후 Resend에서 `Verify DNS Records` 또는 `Enable Sending`을 실행합니다.
- DNS 인증이 완료되면 Resend 상태가 `Verified`로 표시됩니다.

## 애플리케이션 환경변수

Resend에서 `Sending access` 권한의 API 키를 생성한 뒤 `apps/web/.env.local`에 설정합니다.

```env
APP_URL=http://localhost:3000
SMTP_URL=smtps://resend:RESEND_API_KEY@smtp.resend.com:465
MAIL_FROM=noreply@ilog.info
```

운영 서버에서는 실제 서비스 주소를 사용합니다.

```env
APP_URL=https://ilog.info
```

API 키는 문서나 Git에 저장하지 않습니다.

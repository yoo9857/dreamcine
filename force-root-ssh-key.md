# Root SSH 키 로그인 강제 설정

LISH에서 root로 로그인한 뒤 아래 한 줄을 실행하세요.

```bash
sed -i -E '/^[#[:space:]]*PermitRootLogin[[:space:]]/d' /etc/ssh/sshd_config; for f in /etc/ssh/sshd_config.d/*.conf; do [ -f "$f" ] && sed -i -E '/^[#[:space:]]*PermitRootLogin[[:space:]]/d' "$f"; done; printf '%s\n' 'PermitRootLogin prohibit-password' > /etc/ssh/sshd_config.d/00-root-login.conf; sshd -t && systemctl reload ssh
```

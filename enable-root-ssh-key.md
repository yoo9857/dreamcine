# Root SSH 키 로그인 허용

LISH에서 root로 로그인한 뒤 아래 한 줄을 그대로 실행하세요.

```bash
sed -i -E 's/^[#[:space:]]*PermitRootLogin[[:space:]].*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config; grep -q '^PermitRootLogin prohibit-password' /etc/ssh/sshd_config || echo 'PermitRootLogin prohibit-password' >> /etc/ssh/sshd_config; sshd -t && systemctl reload ssh
```

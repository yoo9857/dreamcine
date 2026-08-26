# Administrator bootstrap

The administrator signs in with the local email identifier `admin@admin`.
The username `admin` remains supported as a fallback. `admin@admin` is not a
routable mailbox and therefore cannot be used for password recovery.

Run the bootstrap command once in the server environment after `DATABASE_URL`
has been configured. Supply the password through the shell or the deployment
secret manager. Do not save it in source control or a permanent `.env` file.

```powershell
$env:ADMIN_BOOTSTRAP_CONFIRM = 'CREATE_ADMIN'
$env:ADMIN_BOOTSTRAP_PASSWORD = '<password from the secret manager>'
corepack pnpm admin:bootstrap
Remove-Item Env:ADMIN_BOOTSTRAP_PASSWORD, Env:ADMIN_BOOTSTRAP_CONFIRM
```

The command creates the account when it does not exist. Re-running it rotates
the password, activates the administrator, and revokes all existing sessions.
It refuses to promote a non-admin account that already owns the reserved
`admin` handle.

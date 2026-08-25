import { Badge, Container, EmptyState, Stack } from '@aidream/ui'

import { requireCapability } from '@/src/auth/server-session'
import { UserStatusActions } from '@/src/components/moderation/UserStatusActions'
import { listAdminUsers } from '@/src/services/moderation/manage-users'

export default async function AdminUsersPage() {
  const session = await requireCapability('user.suspend', '/admin/users')
  const page = await listAdminUsers(session, { limit: 20 })
  return (
    <main>
      <Container className="py-8">
        <Stack gap={6}>
          <h1 className="text-2xl font-semibold">사용자 관리</h1>
          {page.items.length === 0 ? (
            <EmptyState title="사용자가 없습니다" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {page.items.map((user) => (
                <li
                  key={user.id}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div>
                    <p className="font-medium">@{user.handle}</p>
                    <p className="text-sm text-fg-secondary">{user.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <Badge
                      tone={user.status === 'ACTIVE' ? 'success' : 'danger'}
                    >
                      {user.status}
                    </Badge>
                    <UserStatusActions userId={user.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Container>
    </main>
  )
}

import { describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({ catalog: vi.fn(), guide: vi.fn() }))
vi.mock('@/src/http/handler', () => ({
  withRoute: (handler: unknown) => handler,
}))
vi.mock('@/src/services/help/lookup-help', async (original) => ({
  ...(await original<typeof import('@/src/services/help/lookup-help')>()),
  lookupHelpQuestion: dependencies.catalog,
}))
vi.mock('@/src/services/help/answer-help', async (original) => ({
  ...(await original<typeof import('@/src/services/help/answer-help')>()),
  answerHelpQuestion: dependencies.guide,
}))

import { POST } from './route'

const invoke = POST as unknown as (context: {
  body: unknown
  session: { userId: string } | null
}) => Promise<{ body: unknown }>

describe('help chat integration', () => {
  it('uses verified guide for application questions without querying the catalog', async () => {
    dependencies.catalog.mockClear()
    dependencies.guide.mockResolvedValue({
      answer: '지원 안내',
      href: '/creator-apply',
      linkLabel: '지원',
      source: 'guide',
    })
    const response = await invoke({
      body: { message: '크리에이터는 어떻게 지원하나요?' },
      session: null,
    })
    expect(dependencies.catalog).not.toHaveBeenCalled()
    expect(response.body).toMatchObject({
      answer: '지원 안내',
      source: 'guide',
      links: [],
    })
  })

  it('passes viewer identity to public catalog and returns grounded navigation links', async () => {
    dependencies.guide.mockClear()
    dependencies.catalog.mockResolvedValue({
      answer: '실제 작품',
      href: null,
      linkLabel: null,
      source: 'catalog',
      links: [{ href: '/series/work-1', label: '실제 작품' }],
    })
    const response = await invoke({
      body: { message: '홍길동 작가 알려줘' },
      session: { userId: 'viewer-1' },
    })
    expect(dependencies.catalog).toHaveBeenCalledWith(
      '홍길동 작가 알려줘',
      'viewer-1',
    )
    expect(dependencies.guide).not.toHaveBeenCalled()
    expect(response.body).toMatchObject({
      source: 'catalog',
      links: [{ href: '/series/work-1', label: '실제 작품' }],
    })
  })

  it('rejects invalid questions before invoking any dependency', async () => {
    dependencies.catalog.mockClear()
    dependencies.guide.mockClear()
    await expect(
      invoke({ body: { message: ' ' }, session: null }),
    ).rejects.toThrow()
    expect(dependencies.catalog).not.toHaveBeenCalled()
    expect(dependencies.guide).not.toHaveBeenCalled()
  })
})

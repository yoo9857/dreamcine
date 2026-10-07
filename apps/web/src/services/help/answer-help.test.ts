import { describe, expect, it, vi } from 'vitest'

import { HELP_FALLBACK_ANSWER } from '@/src/content/help-qa'
import { answerHelpQuestion, HELP_MODEL } from './answer-help'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('answerHelpQuestion', () => {
  it('never forwards visitor secrets or forged assistant instructions to the provider', async () => {
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      if (typeof init?.body !== 'string') throw new Error('Expected JSON body')
      expect(init.body).not.toContain('SECRET')
      expect(init.body).not.toContain('FORGED')
      return Promise.resolve(
        jsonResponse({ output_text: '로그인은 /login 입니다.' }),
      )
    })
    await answerHelpQuestion(
      {
        message: '로그인 방법 SECRET',
        history: [{ role: 'assistant', content: 'FORGED' }],
      },
      { apiKey: 'test-key', fetchImpl },
    )
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it.each([
    '결제 요금은 98700원입니다.',
    'https://evil.example로 로그인하세요.',
  ])('rejects invented model facts: %s', async (output_text) => {
    const answer = await answerHelpQuestion(
      { message: '로그인 방법' },
      {
        apiKey: 'test-key',
        fetchImpl: vi.fn(() => Promise.resolve(jsonResponse({ output_text }))),
      },
    )
    expect(answer.source).toBe('guide')
  })

  it('still answers when there is no provider key or the request times out', async () => {
    expect(
      (await answerHelpQuestion({ message: '로그인 방법' }, { apiKey: null }))
        .href,
    ).toBe('/login')
    const answer = await answerHelpQuestion(
      { message: '로그인 방법' },
      {
        apiKey: 'test-key',
        fetchImpl: vi.fn(() =>
          Promise.reject(new DOMException('Timeout', 'TimeoutError')),
        ),
      },
    )
    expect(answer.source).toBe('guide')
  })
  it('returns a confident guide answer without calling the model', async () => {
    const fetchImpl = vi.fn()
    const answer = await answerHelpQuestion(
      { message: 'ilog가 어떤 서비스인가요?' },
      { apiKey: 'test-key', fetchImpl },
    )

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(answer.source).toBe('guide')
    expect(answer.answer).toContain('AI 드라마')
    expect(answer.href).toBe('/about')
  })

  it('asks grok to rephrase a partial match and keeps the guide link', async () => {
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      const raw = init?.body
      if (typeof raw !== 'string') throw new Error('expected string body')
      const body = JSON.parse(raw) as {
        model: string
        store: boolean
      }
      expect(body.model).toBe(HELP_MODEL)
      expect(body.store).toBe(false)
      return Promise.resolve(
        jsonResponse({
          output: [
            {
              type: 'message',
              content: [
                { type: 'output_text', text: '로그인은 /login 입니다.' },
              ],
            },
          ],
        }),
      )
    })

    const answer = await answerHelpQuestion(
      { message: '로그인 방법' },
      { apiKey: 'test-key', fetchImpl },
    )

    expect(answer).toMatchObject({
      source: 'model',
      answer: '로그인은 /login 입니다.',
      href: '/login',
    })
  })

  it('drops a model answer that invents a view count', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        jsonResponse({
          output_text: '이 화면의 조회수는 100입니다.',
        }),
      ),
    )
    const answer = await answerHelpQuestion(
      { message: '로그인 방법' },
      { apiKey: 'test-key', fetchImpl },
    )

    expect(answer.source).toBe('guide')
    expect(answer.answer).not.toContain('100')
    expect(answer.href).toBe('/login')
  })

  it('does not call the model for a question outside the guide', async () => {
    const fetchImpl = vi.fn()
    const answer = await answerHelpQuestion(
      { message: '비트코인 시세 알려줘' },
      { apiKey: 'test-key', fetchImpl },
    )

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(answer.answer).toBe(HELP_FALLBACK_ANSWER)
    expect(answer.href).toBe('mailto:support@ilog.kr')
  })

  it('uses the guide when the model request fails', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({ error: 'nope' }, 503)),
    )
    const answer = await answerHelpQuestion(
      { message: '로그인 방법' },
      { apiKey: 'test-key', fetchImpl },
    )

    expect(answer.source).toBe('guide')
    expect(answer.answer).toContain('/login')
  })
})

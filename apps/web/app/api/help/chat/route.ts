import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import {
  lookupHelpQuestion,
  answerPartnerQuestion,
  catalogLookupMessage,
} from '@/src/services/help/lookup-help'
import { HELP_CONFIDENT_SCORE, matchHelpEntry } from '@/src/content/help-qa'
import { matchServiceHelpEntry } from '@/src/content/help-intent'
import {
  answerHelpQuestion,
  HelpChatSchema,
} from '@/src/services/help/answer-help'

export const POST = withRoute(
  async ({ body, session }) => {
    const input = parseBody(HelpChatSchema, body)
    const serviceIntent = matchServiceHelpEntry(input.message)
    const match = serviceIntent ?? matchHelpEntry(input.message)
    const catalogMessage = catalogLookupMessage(input)
    const catalog =
      match.entry === null ||
      (match.score < HELP_CONFIDENT_SCORE &&
        ['creators', 'works'].includes(match.entry.id))
        ? await lookupHelpQuestion(catalogMessage, session?.userId)
        : null
    const answer =
      (serviceIntent === null ? answerPartnerQuestion(catalogMessage) : null) ??
      catalog ??
      (await answerHelpQuestion(input))
    return ok({
      answer: answer.answer,
      href: answer.href,
      linkLabel: answer.linkLabel,
      source: answer.source,
      links: answer.links ?? [],
    })
  },
  {
    auth: 'optional',
    rateLimit: { bucket: 'help-chat', limit: 30, windowSec: 600, by: 'ip' },
  },
)

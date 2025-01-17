import type { InternalError } from '@lokalise/node-core'

import type { Dependencies } from '../../infrastructure/diConfig'
import type { ErrorInfoWithPerLocaleErrors } from '../../infrastructure/errors/MultiStatusErrorResponse'
import { AuthFailedError, AuthInvalidDataError } from '../../infrastructure/errors/publicErrors'
import type { APIDitto } from '../../integrations/ditto/client/APIDitto'
import type { VariantUpdateData } from '../../integrations/ditto/client/types'
import { buildPerLocaleErrors, buildTranslatePublishError } from '../../integrations/ditto/mapper'
import type { AuthConfig, ContentItem, IntegrationConfig } from '../../types'
import { isRejected } from '../../types'

export class PublishService {
  private readonly dittoApiClient: APIDitto
  constructor({ dittoApiClient }: Dependencies) {
    this.dittoApiClient = dittoApiClient
  }

  async publishContent(
    config: IntegrationConfig,
    auth: AuthConfig,
    items: ContentItem[],
    // Default locale might not be needed for integration logic
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defaultLocale: string,
  ): Promise<{
    errors: ErrorInfoWithPerLocaleErrors[]
  }> {
    const publishErrors: ErrorInfoWithPerLocaleErrors[] = []
    const { apiKey } = auth

    if (!apiKey) {
      throw new AuthInvalidDataError()
    }
    if (typeof apiKey !== 'string') {
      throw new AuthFailedError()
    }

    const locales = Object.keys(items[0].translations)
    const toUpdate: VariantUpdateData = {}

    for (const locale of locales) {
      toUpdate[locale] = {}
      for (const item of items) {
        toUpdate[locale][item.uniqueId] = { text: item.translations[locale] }
      }
    }
    const toUpdateDataEntries = Object.entries(toUpdate)

    const updatePromises: Array<Promise<unknown>> = toUpdateDataEntries.map(
      async ([variant, data]) => this.dittoApiClient.updateVariant(apiKey, variant, { data }),
    )

    const updateSettledResult = await Promise.allSettled(updatePromises)

    updateSettledResult.forEach((result, index) => {
      const [variant, data] = toUpdateDataEntries[index]

      if (isRejected(result) && variant) {
        const uniqueIdsWithError = Object.keys(data)

        uniqueIdsWithError.forEach((uniqueId) => {
          const existingError = publishErrors.find((error) => error.uniqueId === uniqueId)
          if (existingError) {
            existingError.perLocaleErrors = {
              ...existingError.perLocaleErrors,
              ...buildPerLocaleErrors(result.reason as InternalError, variant),
            }
          } else {
            publishErrors.push(
              buildTranslatePublishError(result.reason as InternalError, uniqueId, variant),
            )
          }
        })
      }
    })

    return { errors: publishErrors }
  }
}

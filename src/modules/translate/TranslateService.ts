import type { Dependencies } from '../../infrastructure/diConfig'
import { AuthFailedError, AuthInvalidDataError } from '../../infrastructure/errors/publicErrors'
import type { APIDitto } from '../../integrations/ditto/client/APIDitto'
import { parseName } from '../../integrations/ditto/mapper'
import type { AuthConfig, ContentItem, IntegrationConfig, ItemIdentifiers } from '../../types'
import { OTHER_COMPONENTS_GROUP } from '../../utils/constants'

export class TranslateService {
  private readonly dittoApiClient: APIDitto
  constructor({ dittoApiClient }: Dependencies) {
    this.dittoApiClient = dittoApiClient
  }

  async getContent(
    config: IntegrationConfig,
    auth: AuthConfig,
    locales: string[],
    ids: ItemIdentifiers[],
    // Default locale might not be needed for integration logic
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defaultLocale: string,
  ): Promise<[ContentItem[], ItemIdentifiers[]]> {
    const { apiKey } = auth

    if (!apiKey) {
      throw new AuthInvalidDataError()
    }
    if (typeof apiKey !== 'string') {
      throw new AuthFailedError()
    }

    const componentsByName = await this.dittoApiClient.getWorkspaceComponents(apiKey)

    const desiredIds = ids.map((id) => id.uniqueId)
    const filteredWorkspaceComponentEntries = Object.entries(componentsByName).filter(
      ([wsCompId]) => desiredIds.includes(wsCompId),
    )

    const items = filteredWorkspaceComponentEntries.map(([id, data]) => {
      const localTexts = locales.reduce((acc, local) => {
        if (data.variants?.[local]) {
          acc[local] = data.variants[local].text
        } else {
          acc[local] = ''
        }

        return acc
      }, {} as Record<string, string>)
      const parsedName = parseName(data.name)

      return {
        uniqueId: id,
        groupId: id,
        metadata: {},
        translations: {
          ...localTexts,
          [defaultLocale]: data.text,
        },
      }
    })

    return [items, []]
  }
}

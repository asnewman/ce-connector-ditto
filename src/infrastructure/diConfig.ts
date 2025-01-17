import type { AwilixContainer, Resolver } from 'awilix'
import { asClass, asFunction, Lifetime } from 'awilix'
import type { FastifyInstance } from 'fastify'
import type P from 'pino'

// import type { FakeIntegrationApiClient } from '../integrations/fakeIntegration/client/FakeIntegrationApiClient'
import { APIDitto } from '../integrations/ditto/client/APIDitto'
import { AuthService } from '../modules/auth/AuthService'
import { CacheService } from '../modules/cache/CacheService'
import { EnvService } from '../modules/env/EnvService'
import { PublishService } from '../modules/publish/PublishService'
import { TranslateService } from '../modules/translate/TranslateService'

import { getConfig } from './config'
import type { Config } from './config'

export type ExternalDependencies = {
  app?: FastifyInstance
  logger?: P.Logger
}
export const SINGLETON_CONFIG = { lifetime: Lifetime.SINGLETON }

export type DependencyOverrides = Partial<DiConfig>

export function registerDependencies(
  diContainer: AwilixContainer,
  dependencies: ExternalDependencies = {},
  dependencyOverrides: DependencyOverrides = {},
): void {
  const diConfig: DiConfig = {
    config: asFunction(() => {
      return getConfig()
    }, SINGLETON_CONFIG),
    dittoApiClient: asClass(APIDitto, SINGLETON_CONFIG),
    cacheService: asClass(CacheService, SINGLETON_CONFIG),
    authService: asClass(AuthService, SINGLETON_CONFIG),
    envService: asClass(EnvService, SINGLETON_CONFIG),
    translateService: asClass(TranslateService, SINGLETON_CONFIG),
    publishService: asClass(PublishService, SINGLETON_CONFIG),
  }
  diContainer.register(diConfig)

  for (const [dependencyKey, dependencyValue] of Object.entries(dependencyOverrides)) {
    diContainer.register(dependencyKey, dependencyValue)
  }
}

type DiConfig = Record<keyof Dependencies, Resolver<unknown>>

export interface Dependencies {
  config: Config
  dittoApiClient: APIDitto
  cacheService: CacheService
  authService: AuthService
  envService: EnvService
  publishService: PublishService
  translateService: TranslateService
}

declare module '@fastify/awilix' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Cradle extends Dependencies {}

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface RequestCradle extends Dependencies {}
}

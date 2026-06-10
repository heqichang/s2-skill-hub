import { app } from 'electron'
import { PingResponse, AppVersionResponse } from '@shared/types/ipc'
import { SkillRepositoryService } from './skillRepository'
import { CategoryService } from './category'
import { GitService } from './git'
import { SyncService } from './syncService'
import { ConfigService } from './config'
import { serviceManager, ServiceManager } from './serviceManager'

export class AppService {
  ping(): PingResponse {
    return {
      message: 'pong from main process',
      timestamp: Date.now()
    }
  }

  getAppVersion(): AppVersionResponse {
    return {
      version: app.getVersion()
    }
  }
}

export const appService = new AppService()

export {
  SkillRepositoryService,
  CategoryService,
  GitService,
  SyncService,
  ConfigService,
  ServiceManager,
  serviceManager
}

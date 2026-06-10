import { registerRepoHandlers } from './handlers/repo'
import { registerGitHandlers } from './handlers/git'
import { registerSyncHandlers } from './handlers/sync'
import { registerConfigHandlers } from './handlers/config'

export function registerAllIpcHandlers(): void {
  registerRepoHandlers()
  registerGitHandlers()
  registerSyncHandlers()
  registerConfigHandlers()
}

export { registerRepoHandlers, registerGitHandlers, registerSyncHandlers, registerConfigHandlers }

export { openDatabase, execute, select, closeDatabase, closeAll } from './databaseService';
export { migrateProjectDatabase, migrateAppDatabase } from './migrations';
export { PROJECT_TABLES, APP_TABLES, CURRENT_SCHEMA_VERSION } from './schema';
export {
  initAppDatabase,
  registerProject,
  listProjects,
  listDeletedProjects,
  touchProject,
  renameProject,
  unregisterProject,
  softDeleteProject,
  restoreProject,
  hardDeleteProject,
  autoDeleteOldProjects,
  getProject,
} from './appDatabase';
export {
  openProjectDatabase,
  closeProjectDatabase,
  initializeProjectDatabase,
} from './projectDatabase';

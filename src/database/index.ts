export { openDatabase, execute, select, closeDatabase, closeAll } from './databaseService';
export { migrateProjectDatabase, migrateAppDatabase } from './migrations';
export { PROJECT_TABLES, APP_TABLES, CURRENT_SCHEMA_VERSION } from './schema';
export {
  initAppDatabase,
  registerProject,
  listProjects,
  listDeletedProjects,
  touchProject,
  editProject,
  unregisterProject,
  softDeleteProject,
  restoreProject,
  hardDeleteProject,
  getProject,
  setProjectCover,
  autoDeleteOldProjects,
} from './appDatabase';
export {
  openProjectDatabase,
  closeProjectDatabase,
  initializeProjectDatabase,
} from './projectDatabase';

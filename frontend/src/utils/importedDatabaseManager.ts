import { importedRuntimeSqliteBase64 } from './importedRuntimeSqlite'
import { runtimeSqlite, ensureClientRuntimeDatabase } from './clientRuntimeDatabase'

export type ImportStats = {
  announcements: number
  reactions: number
  substances: number
  configs: number
  leaderboard: number
  total: number
}

type ImportResult = {
  status: 'success' | 'error' | 'skipped'
  message: string
  stats?: ImportStats
  error?: string
}

const IMPORTED_MARK_KEY = 'imported-database-mark-v1'

/**
 * Check if the imported database has already been loaded
 */
function isImportedDatabaseLoaded(): boolean {
  try {
    const mark = localStorage.getItem(IMPORTED_MARK_KEY)
    return mark === 'true'
  } catch {
    return false
  }
}

/**
 * Mark that the imported database has been loaded
 */
function markImportedDatabaseLoaded(): void {
  try {
    localStorage.setItem(IMPORTED_MARK_KEY, 'true')
  } catch {
    // Ignore storage errors
  }
}

/**
 * Import the bundled SQLite database from importedRuntimeSqlite.ts
 * This loads all tables: announcements, reactions, substances, configs, leaderboard
 */
export async function importBundledDatabase(): Promise<ImportResult> {
  try {
    // Check if already imported
    if (isImportedDatabaseLoaded()) {
      return {
        status: 'skipped',
        message: 'Bundled database already imported',
      }
    }

    // Ensure database is initialized
    await ensureClientRuntimeDatabase()

    // Import the base64-encoded database
    await runtimeSqlite.importImage(importedRuntimeSqliteBase64)

    // Get statistics
    const stats: ImportStats = {
      announcements: runtimeSqlite.listAnnouncements().length,
      reactions: runtimeSqlite.listReactions().length,
      substances: runtimeSqlite.listSubstances().length,
      configs: Object.keys(runtimeSqlite.readConfigs()).length,
      leaderboard: runtimeSqlite.listLeaderboard().length,
      total: 0,
    }

    stats.total =
      stats.announcements +
      stats.reactions +
      stats.substances +
      stats.configs +
      stats.leaderboard

    markImportedDatabaseLoaded()

    return {
      status: 'success',
      message: `Successfully imported bundled database with ${stats.total} total records`,
      stats,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      status: 'error',
      message: 'Failed to import bundled database',
      error: errorMessage,
    }
  }
}

/**
 * Force re-import of the bundled database (resets the import mark)
 */
export async function reimportBundledDatabase(): Promise<ImportResult> {
  try {
    localStorage.removeItem(IMPORTED_MARK_KEY)
  } catch {
    // Ignore storage errors
  }

  return importBundledDatabase()
}

/**
 * Check if bundled database is available
 */
export function hasBundledDatabase(): boolean {
  return importedRuntimeSqliteBase64.length > 0
}

/**
 * Get the size of the bundled database in bytes (approximate)
 */
export function getBundledDatabaseSize(): number {
  try {
    // Base64 encoding is roughly 4/3 the size of binary data
    return Math.floor((importedRuntimeSqliteBase64.length * 3) / 4)
  } catch {
    return 0
  }
}

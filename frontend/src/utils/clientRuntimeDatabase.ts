import initSqlJs, { type Database } from 'sql.js'
import sqliteWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { CLIENT_RUNTIME_STORAGE_KEYS, clientRuntimeStorage } from './clientRuntimeStorage'
import { CHEMICAL_EQUATIONS } from './chemicalEquations'

type RuntimeRecord = Record<string, any>
type TableName = 'announcements' | 'reactions' | 'substances' | 'configs' | 'leaderboard'

const SQLITE_STORAGE_KEY = 'chemistry-uno-runtime-sqlite-v1'
const SQLITE_SCHEMA_VERSION_KEY = 'chemistry-uno-runtime-sqlite-schema-v1'
const SQLITE_EQUATIONS_VERSION_KEY = 'chemistry-uno-equations-v1'

const TABLES: TableName[] = ['announcements', 'reactions', 'substances', 'configs', 'leaderboard']

const LEGACY_STORAGE_BY_TABLE: Record<TableName, string> = {
  announcements: CLIENT_RUNTIME_STORAGE_KEYS.announcements,
  reactions: CLIENT_RUNTIME_STORAGE_KEYS.reactions,
  substances: CLIENT_RUNTIME_STORAGE_KEYS.substances,
  configs: CLIENT_RUNTIME_STORAGE_KEYS.configs,
  leaderboard: CLIENT_RUNTIME_STORAGE_KEYS.leaderboard,
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

let dbPromise: Promise<Database> | null = null
let dbInstance: Database | null = null
let saveTimer: number | null = null

const encodeBytes = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }
  return btoa(binary)
}

const decodeBytes = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const serializeValue = (value: unknown) => JSON.stringify(value ?? null)

const deserializeValue = (value: unknown) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const normalizeId = (record: RuntimeRecord, index: number) => {
  const numericId = Number(record.id)
  if (Number.isFinite(numericId) && numericId > 0) return numericId
  return index + 1
}

const normalizeFormula = (value: unknown) => String(value || '').replace(/\s+/g, '')

const orderedRecord = (record: RuntimeRecord) => ({ ...record })

const getWasmPath = (file: string) => file.endsWith('.wasm') ? sqliteWasmUrl : file

const loadPersistedDatabase = () => {
  const encoded = clientRuntimeStorage.getItem(SQLITE_STORAGE_KEY)
  return encoded ? decodeBytes(encoded) : null
}

const persistDatabase = (db: Database) => {
  clientRuntimeStorage.setItem(SQLITE_STORAGE_KEY, encodeBytes(db.export()))
  clientRuntimeStorage.setItem(SQLITE_SCHEMA_VERSION_KEY, '1')
}

const schedulePersist = () => {
  if (!dbInstance || typeof window === 'undefined') return
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer)
  }
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    if (dbInstance) persistDatabase(dbInstance)
  }, 80)
}

const runMigrations = (db: Database) => {
  db.run(`
    PRAGMA journal_mode = MEMORY;
    PRAGMA synchronous = OFF;
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY,
      r1 TEXT NOT NULL,
      r2 TEXT NOT NULL,
      pair_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      display TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reactions_pair_key ON reactions(pair_key);
    CREATE INDEX IF NOT EXISTS idx_reactions_r1 ON reactions(r1);
    CREATE INDEX IF NOT EXISTS idx_reactions_r2 ON reactions(r2);
    CREATE INDEX IF NOT EXISTS idx_reactions_status ON reactions(status);
    CREATE INDEX IF NOT EXISTS idx_reactions_display ON reactions(display);
    CREATE TABLE IF NOT EXISTS substances (
      id INTEGER PRIMARY KEY,
      formula TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      group_id INTEGER,
      creator_uid INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_substances_status ON substances(status);
    CREATE INDEX IF NOT EXISTS idx_substances_creator_uid ON substances(creator_uid);
    CREATE INDEX IF NOT EXISTS idx_substances_group_id ON substances(group_id);
    CREATE TABLE IF NOT EXISTS configs (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL
    );
  `)
}

const scalar = (db: Database, sql: string, params: any[] = []) => {
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    if (!stmt.step()) return null
    return stmt.get()[0]
  } finally {
    stmt.free()
  }
}

const tableCount = (db: Database, table: TableName) => Number(scalar(db, `SELECT COUNT(*) FROM ${table}`) || 0)

const insertAnnouncement = (db: Database, record: RuntimeRecord, index: number) => {
  db.run('INSERT OR REPLACE INTO announcements (id, data) VALUES (?, ?)', [
    normalizeId(record, index),
    serializeValue(orderedRecord(record)),
  ])
}

const pairKey = (left: unknown, right: unknown) => [normalizeFormula(left), normalizeFormula(right)].sort().join('|')

const insertReaction = (db: Database, record: RuntimeRecord, index: number) => {
  const r1 = normalizeFormula(record.r1)
  const r2 = normalizeFormula(record.r2)
  if (!r1 || !r2) return
  const nextRecord = orderedRecord({ ...record, id: normalizeId(record, index), r1, r2 })
  db.run(
    `INSERT OR REPLACE INTO reactions (id, r1, r2, pair_key, status, display, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      nextRecord.id,
      r1,
      r2,
      pairKey(r1, r2),
      String(nextRecord.status || 'approved'),
      String(nextRecord.display || ''),
      serializeValue(nextRecord),
    ],
  )
}

const insertSubstance = (db: Database, record: RuntimeRecord, index: number) => {
  const formula = normalizeFormula(record.formula)
  if (!formula) return
  const nextRecord = orderedRecord({ ...record, id: normalizeId(record, index), formula })
  db.run(
    `INSERT OR REPLACE INTO substances (id, formula, name, status, group_id, creator_uid, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      nextRecord.id,
      formula,
      String(nextRecord.name || formula),
      String(nextRecord.status || 'approved'),
      nextRecord.group_id == null ? null : Number(nextRecord.group_id),
      Number(nextRecord.creator_uid || 0),
      serializeValue(nextRecord),
    ],
  )
}

const insertConfig = (db: Database, key: string, value: unknown) => {
  db.run('INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)', [key, serializeValue(value)])
}

const insertLeaderboard = (db: Database, record: RuntimeRecord, index: number) => {
  db.run('INSERT OR REPLACE INTO leaderboard (id, data) VALUES (?, ?)', [
    normalizeId(record, index),
    serializeValue(orderedRecord(record)),
  ])
}

const seedFromStorage = (db: Database) => {
  TABLES.forEach((table) => {
    if (tableCount(db, table) > 0) return
    const raw = clientRuntimeStorage.getItem(LEGACY_STORAGE_BY_TABLE[table])
    if (!raw) return

    if (table === 'configs') {
      const config = parseJson<RuntimeRecord>(raw, {})
      Object.entries(config).forEach(([key, value]) => insertConfig(db, key, value))
      return
    }

    const records = parseJson<RuntimeRecord[]>(raw, [])
    records.forEach((record, index) => {
      if (table === 'announcements') insertAnnouncement(db, record, index)
      if (table === 'reactions') insertReaction(db, record, index)
      if (table === 'substances') insertSubstance(db, record, index)
      if (table === 'leaderboard') insertLeaderboard(db, record, index)
    })
  })
}

const extractChemicalFormula = (substance: string): string => {
  const trimmed = substance.trim()
  let result = ''
  let i = 0
  let foundLetterOrParen = false

  while (i < trimmed.length) {
    const char = trimmed[i]

    if (char === '↑' || char === '↓') {
      break
    }

    if (/[A-Za-z([\]]/.test(char)) {
      foundLetterOrParen = true
      result += char
    } else if (foundLetterOrParen && /[\d()[\]]/.test(char)) {
      result += char
    } else if (!foundLetterOrParen && /\d/.test(char)) {
      i++
      continue
    }

    i++
  }

  return result
}

const seedHardcodedEquations = (db: Database) => {
  const equationsLoaded = clientRuntimeStorage.getItem(SQLITE_EQUATIONS_VERSION_KEY)
  if (equationsLoaded === '1') return

  const currentCount = tableCount(db, 'reactions')
  if (currentCount > 0 && currentCount >= 168) return

  db.run('DELETE FROM reactions')

  CHEMICAL_EQUATIONS.forEach((equation, index) => {
    const parts = equation.split('=')
    if (parts.length !== 2) return

    const reactants = parts[0].trim().split('+').map(s => s.trim())
    if (reactants.length < 2) return

    const r1 = extractChemicalFormula(reactants[0])
    const r2 = extractChemicalFormula(reactants[1])
    if (!r1 || !r2) return

    const record = {
      id: index + 1,
      r1,
      r2,
      status: 'approved',
      display: equation,
    }
    insertReaction(db, record, index)
  })

  clientRuntimeStorage.setItem(SQLITE_EQUATIONS_VERSION_KEY, '1')
}

const createDatabase = async () => {
  const SQL = await initSqlJs({ locateFile: getWasmPath })
  const persisted = loadPersistedDatabase()
  const db = persisted ? new SQL.Database(persisted) : new SQL.Database()
  runMigrations(db)
  seedFromStorage(db)
  seedHardcodedEquations(db)
  dbInstance = db
  persistDatabase(db)
  return db
}

export const ensureClientRuntimeDatabase = () => {
  if (!dbPromise) {
    dbPromise = createDatabase()
  }
  return dbPromise
}

export const getClientRuntimeDatabase = () => {
  if (!dbInstance) {
    throw new Error('SQLite runtime database has not been initialized')
  }
  return dbInstance
}

const rowsFromStatement = (stmt: ReturnType<Database['prepare']>) => {
  const rows: RuntimeRecord[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  return rows
}

const rows = (sql: string, params: any[] = []) => {
  const db = getClientRuntimeDatabase()
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    return rowsFromStatement(stmt)
  } finally {
    stmt.free()
  }
}

const jsonRows = (sql: string, params: any[] = []) => rows(sql, params).map((row) => deserializeValue(row.data) as RuntimeRecord)

export const runtimeSqlite = {
  listAnnouncements() {
    return jsonRows('SELECT data FROM announcements ORDER BY id DESC')
  },
  replaceAnnouncements(records: RuntimeRecord[]) {
    const db = getClientRuntimeDatabase()
    db.run('BEGIN')
    try {
      db.run('DELETE FROM announcements')
      records.forEach((record, index) => insertAnnouncement(db, record, index))
      db.run('COMMIT')
      schedulePersist()
      return records
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  },
  listReactions() {
    return jsonRows('SELECT data FROM reactions ORDER BY id DESC')
  },
  replaceReactions(records: RuntimeRecord[]) {
    const db = getClientRuntimeDatabase()
    db.run('BEGIN')
    try {
      db.run('DELETE FROM reactions')
      records.forEach((record, index) => insertReaction(db, record, index))
      db.run('COMMIT')
      schedulePersist()
      return records
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  },
  findReactionEquation(left: string, right: string) {
    const result = rows('SELECT display FROM reactions WHERE pair_key = ? AND status = ? ORDER BY id ASC LIMIT 1', [pairKey(left, right), 'approved'])
    return result[0]?.display ? String(result[0].display) : null
  },
  listReactionPairs() {
    return rows('SELECT r1, r2, display FROM reactions WHERE status = ? ORDER BY id ASC', ['approved'])
      .map((row) => ({ r1: String(row.r1 || ''), r2: String(row.r2 || ''), display: String(row.display || '') }))
      .filter((row) => row.r1 && row.r2)
  },
  listSubstances() {
    return jsonRows('SELECT data FROM substances ORDER BY id ASC')
  },
  replaceSubstances(records: RuntimeRecord[]) {
    const db = getClientRuntimeDatabase()
    db.run('BEGIN')
    try {
      db.run('DELETE FROM substances')
      records.forEach((record, index) => insertSubstance(db, record, index))
      db.run('COMMIT')
      schedulePersist()
      return records
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  },
  listSubstanceNames() {
    return rows('SELECT formula, name FROM substances WHERE status = ? ORDER BY id ASC', ['approved'])
      .reduce<Record<string, string>>((acc, row) => {
        const formula = String(row.formula || '')
        if (formula) acc[formula] = String(row.name || formula)
        return acc
      }, {})
  },
  listApprovedSubstanceFormulas() {
    return rows('SELECT formula FROM substances WHERE status = ? ORDER BY id ASC', ['approved'])
      .map((row) => String(row.formula || ''))
      .filter(Boolean)
  },
  readConfigs(fallback: RuntimeRecord = {}) {
    const config = rows('SELECT key, value FROM configs ORDER BY key ASC').reduce<RuntimeRecord>((acc, row) => {
      acc[String(row.key)] = deserializeValue(row.value)
      return acc
    }, {})
    return Object.keys(config).length ? config : fallback
  },
  replaceConfigs(config: RuntimeRecord) {
    const db = getClientRuntimeDatabase()
    db.run('BEGIN')
    try {
      db.run('DELETE FROM configs')
      Object.entries(config).forEach(([key, value]) => insertConfig(db, key, value))
      db.run('COMMIT')
      schedulePersist()
      return config
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  },
  listLeaderboard() {
    return jsonRows('SELECT data FROM leaderboard ORDER BY id ASC')
  },
  replaceLeaderboard(records: RuntimeRecord[]) {
    const db = getClientRuntimeDatabase()
    db.run('BEGIN')
    try {
      db.run('DELETE FROM leaderboard')
      records.forEach((record, index) => insertLeaderboard(db, record, index))
      db.run('COMMIT')
      schedulePersist()
      return records
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  },
  exportImage() {
    const db = getClientRuntimeDatabase()
    const encoded = encodeBytes(db.export())
    clientRuntimeStorage.setItem(SQLITE_STORAGE_KEY, encoded)
    return encoded
  },
  importImage(encoded: string) {
    clientRuntimeStorage.setItem(SQLITE_STORAGE_KEY, encoded)
    dbPromise = null
    dbInstance = null
    return ensureClientRuntimeDatabase()
  },
  reload() {
    dbPromise = null
    dbInstance = null
    return ensureClientRuntimeDatabase()
  },
  clear() {
    clientRuntimeStorage.removeItem(SQLITE_STORAGE_KEY)
    clientRuntimeStorage.removeItem(SQLITE_SCHEMA_VERSION_KEY)
    dbPromise = null
    dbInstance = null
  },
  flush() {
    if (dbInstance) persistDatabase(dbInstance)
  },
  textEncoder,
  textDecoder,
}

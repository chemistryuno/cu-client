export type PubChemSubstanceRecord = {
  id: number
  formula: string
  name: string
  elements: string
  status: string
  group_id: number | null
  needs_improvement: boolean
  has_invalid_elements: boolean
  creator_name: string
  created_at: string
}

type PubChemPropertyItem = {
  CID?: number
  MolecularFormula?: string
  IUPACName?: string
  Title?: string
}

type PubChemPropertyResponse = {
  PropertyTable?: {
    Properties?: PubChemPropertyItem[]
  }
}

type PubChemCidResponse = {
  IdentifierList?: {
    CID?: number[]
  }
}

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PUBCHEM_REQUEST_TIMEOUT_MS = 6000
const PUBCHEM_NAME_CACHE_KEY = 'chemistry-uno-pubchem-names-v1'
const PUBCHEM_SEARCH_CACHE_KEY = 'chemistry-uno-pubchem-search-v1'
const pubChemNameCache = new Map<string, string>()
const pubChemSearchCache = new Map<string, PubChemSubstanceRecord[]>()

const normalizeFormula = (value: string) => String(value || '').replace(/\s+/g, '')
const nowISO = () => new Date().toISOString()
const normalizeQuery = (value: string) => String(value || '').trim().toLowerCase()

const safeReadStorage = <T>(key: string, fallback: T) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

const safeWriteStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage write failures
  }
}

const hydrateCaches = () => {
  if (pubChemNameCache.size === 0) {
    const storedNames = safeReadStorage<Record<string, string>>(PUBCHEM_NAME_CACHE_KEY, {})
    Object.entries(storedNames).forEach(([formula, name]) => {
      if (formula && name) pubChemNameCache.set(formula, name)
    })
  }

  if (pubChemSearchCache.size === 0) {
    const storedSearch = safeReadStorage<Record<string, PubChemSubstanceRecord[]>>(PUBCHEM_SEARCH_CACHE_KEY, {})
    Object.entries(storedSearch).forEach(([query, records]) => {
      if (query && Array.isArray(records)) pubChemSearchCache.set(query, records)
    })
  }
}

const persistNameCache = () => {
  safeWriteStorage(PUBCHEM_NAME_CACHE_KEY, Object.fromEntries(pubChemNameCache.entries()))
}

const persistSearchCache = () => {
  safeWriteStorage(PUBCHEM_SEARCH_CACHE_KEY, Object.fromEntries(pubChemSearchCache.entries()))
}

const buildTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timer),
  }
}

const fetchPubChemJson = async <T>(path: string): Promise<T | null> => {
  const { signal, clear } = buildTimeoutSignal(PUBCHEM_REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${PUBCHEM_BASE_URL}${path}`, {
      method: 'GET',
      signal,
      headers: {
        Accept: 'application/json',
      },
    })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  } finally {
    clear()
  }
}

const buildElementsString = (formula: string) => {
  const normalized = normalizeFormula(formula)
  const matches = normalized.match(/[A-Z][a-z]?/g) || []
  return Array.from(new Set(matches)).join(',')
}

const mapPubChemRecord = (item: PubChemPropertyItem, index: number): PubChemSubstanceRecord => {
  const formula = normalizeFormula(item.MolecularFormula || '')
  const fallbackName = item.Title || formula || `Compound ${index + 1}`
  return {
    id: Number(item.CID || index + 1),
    formula,
    name: String(item.IUPACName || fallbackName),
    elements: buildElementsString(formula),
    status: 'approved',
    group_id: null,
    needs_improvement: false,
    has_invalid_elements: false,
    creator_name: 'PubChem',
    created_at: nowISO(),
  }
}

export const fetchPubChemSubstanceNames = async (formulas: string[]) => {
  hydrateCaches()
  const normalizedFormulas = Array.from(new Set(formulas.map((formula) => normalizeFormula(formula)).filter(Boolean)))
  const result: Record<string, string> = {}
  const pending = normalizedFormulas.filter((formula) => !pubChemNameCache.has(formula))

  normalizedFormulas.forEach((formula) => {
    const cached = pubChemNameCache.get(formula)
    if (cached) result[formula] = cached
  })

  await Promise.all(pending.map(async (formula) => {
    const cidPayload = await fetchPubChemJson<PubChemCidResponse>(`/compound/fastformula/${encodeURIComponent(formula)}/cids/JSON`)
    const cid = cidPayload?.IdentifierList?.CID?.[0]
    if (!cid) return
    const propertyPayload = await fetchPubChemJson<PubChemPropertyResponse>(`/compound/cid/${cid}/property/Title,IUPACName,MolecularFormula/JSON`)
    const record = propertyPayload?.PropertyTable?.Properties?.[0]
    if (!record) return
    const name = String(record.IUPACName || record.Title || formula)
    pubChemNameCache.set(formula, name)
    result[formula] = name
  }))

  if (pending.length > 0) {
    persistNameCache()
  }
  return result
}

export const searchPubChemSubstances = async (query: string) => {
  hydrateCaches()
  const keyword = String(query || '').trim()
  if (!keyword) return [] as PubChemSubstanceRecord[]
  const normalizedQuery = normalizeQuery(keyword)
  const cached = pubChemSearchCache.get(normalizedQuery)
  if (cached) return cached
  const path = `/compound/name/${encodeURIComponent(keyword)}/property/Title,IUPACName,MolecularFormula/JSON`
  const payload = await fetchPubChemJson<PubChemPropertyResponse>(path)
  const records = payload?.PropertyTable?.Properties || []
  const mapped = records
    .map((item, index) => mapPubChemRecord(item, index))
    .filter((item) => item.formula)
  pubChemSearchCache.set(normalizedQuery, mapped)
  persistSearchCache()
  return mapped
}

export {}

declare global {
  interface Window {
    __CHEM_RUNTIME_CONFIG?: {
      offlineMode?: boolean
    }
  }
}

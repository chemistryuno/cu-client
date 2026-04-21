import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
import { getClientRuntimeModule } from './clientRuntimeRoutes'
import type { RuntimeRequest, RuntimeResult } from './clientRuntimeTypes'
import { dispatchOfflineRequest, resetOfflineTestState, seedOfflineTestState } from './offlineBackend'

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const toAxiosConfig = (request: RuntimeRequest): AxiosRequestConfig => ({
  url: request.url,
  method: request.method,
  data: request.data,
})

const toAxiosResponse = (config: AxiosRequestConfig, result: RuntimeResult): AxiosResponse => ({
  data: result.data,
  status: result.status,
  statusText: 'OK',
  headers: result.module ? { 'x-client-runtime-module': result.module } : {},
  config: config as any,
})

const throwAxiosError = (config: AxiosRequestConfig, result: RuntimeResult): never => {
  const payload = (result.data ?? {}) as Record<string, any>
  const error: any = new Error(String(payload.error || 'Client runtime request failed'))
  error.response = toAxiosResponse(config, result)
  throw error
}

export const dispatchClientRuntimeRequest = (request: RuntimeRequest): RuntimeResult => {
  const config = toAxiosConfig(request)
  const result = dispatchOfflineRequest(config)
  return {
    ...result,
    module: getClientRuntimeModule(request.url, request.method),
  }
}

export const clientRuntimeAxiosAdapter: AxiosAdapter = async (config) => {
  await sleep(30)
  const result = dispatchClientRuntimeRequest({
    url: config.url || '/',
    method: config.method || 'GET',
    data: config.data,
  })
  if (result.status >= 400) {
    throwAxiosError(config, result)
  }
  return toAxiosResponse(config, result)
}

export const clientRuntimeTestHooks = {
  resetState: resetOfflineTestState,
  seedState: seedOfflineTestState,
}

export const installClientRuntimeFetchInterceptor = () => {
  const g = window as Window & typeof globalThis & {
    __offlineFetchInstalled?: boolean
    __offlineOriginalFetch?: typeof fetch
  }
  if (g.__offlineFetchInstalled) return
  g.__offlineFetchInstalled = true
  g.__offlineOriginalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const url = new URL(requestUrl, window.location.origin)
    if (!url.pathname.startsWith('/api/')) {
      return g.__offlineOriginalFetch!(input as any, init)
    }

    const result = dispatchClientRuntimeRequest({
      url: url.pathname + url.search,
      method: init?.method || 'GET',
      data: init?.body,
    })

    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json',
        ...(result.module ? { 'X-Client-Runtime-Module': result.module } : {}),
      },
    })
  }
}

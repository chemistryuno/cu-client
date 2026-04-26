declare module 'sql.js' {
  export interface SqlJsConfig {
    locateFile?: (file: string) => string
  }

  export interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  export interface Statement {
    bind(values?: any[] | Record<string, any>): boolean
    step(): boolean
    get(params?: any[] | Record<string, any>): any[]
    getAsObject(params?: any[] | Record<string, any>): Record<string, any>
    free(): boolean
  }

  export interface Database {
    run(sql: string, params?: any[] | Record<string, any>): Database
    exec(sql: string, params?: any[] | Record<string, any>): QueryExecResult[]
    prepare(sql: string, params?: any[] | Record<string, any>): Statement
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}

declare module 'cloudflare:node' {
  import type { Server } from 'http'

  export function httpServerHandler(server: Server): unknown
}

declare module 'cors' {
  import { RequestHandler } from 'express'
  function cors(options?: any): RequestHandler
  export = cors
}

declare module 'cloudflare:node' {
  import type { Server } from 'http'

  export function httpServerHandler(server: Server): unknown
}

import { httpServerHandler } from 'cloudflare:node'
import app from './api/server'
export default httpServerHandler(app.listen(3001))

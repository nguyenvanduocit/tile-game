import { io } from 'socket.io-client'
import msgPack from 'socket.io-msgpack-parser'

const URL = import.meta.env.VITE_WS_ENDPOINT ?? 'wss://ws.aiocean.dev'

export const socket = io(URL, {
  autoConnect: false,
  parser: msgPack,
  protocols: ['websocket'],
})

export function connect(idToken: string) {
  if (socket.connected)
    socket.disconnect()

  socket.auth = { token: idToken }
  socket.connect()
}

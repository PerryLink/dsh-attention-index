/**
 * Sandbox-side TCP-to-Unix relay. DSH uses HTTPS_PROXY=http://127.0.0.1:3128;
 * this process forwards that TCP stream to the host proxy's Unix socket.
 */
import { createServer, connect } from 'node:net'
const socketPath = process.argv[2]
if (socketPath === undefined) throw new Error('socket path required')
createServer(client => {
  const upstream = connect(socketPath)
  client.pipe(upstream)
  upstream.pipe(client)
  client.on('error', () => upstream.destroy())
  upstream.on('error', () => client.destroy())
}).listen(3128, '127.0.0.1')

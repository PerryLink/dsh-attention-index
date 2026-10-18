/**
 * Host-side egress proxy for the bwrap sandbox.
 *
 * Listens on a Unix socket, accepts only HTTP CONNECT to DeepSeek model hosts,
 * and pipes bytes. The sandbox has its own network namespace with loopback only;
 * the Unix socket is the sole route out.
 */
import { createServer, connect } from 'node:net'
import { unlinkSync, existsSync } from 'node:fs'

const socketPath = process.argv[2]
if (socketPath === undefined) throw new Error('socket path required')
if (existsSync(socketPath)) unlinkSync(socketPath)
const allowed = /(^|\.)deepseek\.com$/i

createServer(client => {
  let buffer = ''
  const onData = chunk => {
    buffer += chunk.toString('latin1')
    const end = buffer.indexOf('\r\n\r\n')
    if (end < 0) return
    client.removeListener('data', onData)
    const [requestLine] = buffer.split('\r\n')
    const [method, target] = requestLine.split(' ')
    const [host, portText] = String(target ?? '').split(':')
    const port = Number(portText ?? 443)
    if (method !== 'CONNECT' || !allowed.test(host) || port !== 443) {
      client.end('HTTP/1.1 403 Forbidden\r\n\r\n')
      return
    }
    const upstream = connect(443, host, () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      client.pipe(upstream)
      upstream.pipe(client)
    })
    upstream.on('error', () => client.destroy())
    client.on('error', () => upstream.destroy())
  }
  client.on('data', onData)
}).listen(socketPath, () => {
  console.log(`egress proxy listening on ${socketPath}`)
})

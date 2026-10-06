/**
 * Production server — serves the Vite build + the /api backend on one port.
 * Used for Docker / Hugging Face deployment.
 *
 * PORT defaults to 7860 (the HF Spaces convention).
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())
app.use(cors({ origin: '*' }))

const sellerAddress = process.env.VITE_AGENT_SELLER_ADDRESS
if (!sellerAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
  console.warn(
    '[server] VITE_AGENT_SELLER_ADDRESS is not set or invalid. ' +
    'Set it as a Space secret before payments will settle.',
  )
}

const gateway = createGatewayMiddleware({
  sellerAddress: (sellerAddress ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
})

// --- API routes ---

app.post('/api/summarize', gateway.require('$0.01'), (req, res) => {
  const prompt: string = ((req.body as Record<string, unknown>)?.prompt ?? '').toString().slice(0, 512)
  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' })
    return
  }
  res.json({
    summary: `Paid summary for: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}"`,
    model: 'stub-v1',
    cost: '$0.01 USDC',
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', sellerAddress: sellerAddress ?? null })
})

// --- Static frontend ---

const distDir = path.join(__dirname, 'dist')
app.use(express.static(distDir))

// SPA fallback — all non-API routes return index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'not found' })
    return
  }
  res.sendFile(path.join(distDir, 'index.html'))
})

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 7860
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] listening on http://0.0.0.0:${PORT}`)
  console.log(`[server] sellerAddress: ${sellerAddress ?? '(not set)'}`)
})

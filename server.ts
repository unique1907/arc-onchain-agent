/**
 * Onchain Agent — paid Express server
 *
 * Exposes one paid endpoint: POST /summarize
 * Gate: Circle Gateway Nanopayments via @circle-fin/x402-batching
 *
 * SELLER_ADDRESS — EVM address that receives USDC nanopayments.
 * Must be set in .env before starting. Gas is USDC on Arc Testnet.
 */

import express from 'express'
import cors from 'cors'
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server'

const app = express()
app.use(express.json())
app.use(cors({ origin: '*' }))

const sellerAddress = process.env.VITE_AGENT_SELLER_ADDRESS

if (!sellerAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
  console.warn(
    '[server] VITE_AGENT_SELLER_ADDRESS is not set or invalid. ' +
    'Payments will not settle. Set it in .env before starting.',
  )
}

// Circle Gateway Nanopayments middleware
const gateway = createGatewayMiddleware({
  sellerAddress: (sellerAddress ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
})

/**
 * POST /summarize  — paid endpoint
 * Accepts { prompt: string }, returns { summary: string }
 * Price: $0.01 USDC per call
 */
app.post('/summarize', gateway.require('$0.01'), (req, res) => {
  const prompt: string = ((req.body as Record<string, unknown>)?.prompt ?? '').toString().slice(0, 512)
  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' })
    return
  }
  // Stub response — replace with real model / data call
  res.json({
    summary: `Paid summary for: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}"`,
    model: 'stub-v1',
    cost: '$0.01 USDC',
  })
})

/** Health check — free */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sellerAddress: sellerAddress ?? null })
})

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
  console.log(`[server] paid endpoint: POST http://localhost:${PORT}/summarize ($0.01 USDC/call)`)
  console.log(`[server] sellerAddress: ${sellerAddress ?? '(not set)'}`)
})

/**
 * Netlify Function: POST /api/summarize
 * Paid endpoint — gated by Circle Gateway Nanopayments (x402).
 *
 * Uses serverless-http to wrap the Express app (with createGatewayMiddleware)
 * so the x402 middleware runs without any behaviour changes.
 *
 * VITE_AGENT_SELLER_ADDRESS must be set in Netlify environment variables
 * for payments to settle.
 */

import express from 'express'
import serverless from 'serverless-http'
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server'
import type { Handler } from '@netlify/functions'

const sellerAddress = process.env.VITE_AGENT_SELLER_ADDRESS

if (!sellerAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
  console.warn(
    '[summarize] VITE_AGENT_SELLER_ADDRESS is not set or invalid — ' +
    'payments will not settle. Set it in Netlify environment variables.',
  )
}

const gateway = createGatewayMiddleware({
  sellerAddress: (sellerAddress ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
})

const app = express()
app.use(express.json())

// CORS preflight
app.options('/api/summarize', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT, X-402-Recipient')
  res.status(204).send('')
})

/**
 * POST /api/summarize — paid at $0.01 USDC per call.
 * Without a valid x402 payment header the middleware returns HTTP 402
 * with the Circle Gateway payment requirements JSON.
 */
app.post('/api/summarize', gateway.require('$0.01'), (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
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

// serverless-http wraps the Express app into a Netlify-compatible handler
const serverlessHandler = serverless(app)

export const handler: Handler = (event, context) => {
  // serverless-http returns a promise that resolves to a Netlify HandlerResponse
  return serverlessHandler(event, context) as ReturnType<Handler>
}

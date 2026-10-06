/**
 * Netlify Function: GET /api/health
 * Free endpoint — no payment required.
 * Returns server status and seller address (if configured).
 */

import type { Handler } from '@netlify/functions'

export const handler: Handler = async () => {
  const sellerAddress = process.env.VITE_AGENT_SELLER_ADDRESS ?? null

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      status: 'ok',
      sellerAddress:
        sellerAddress && /^0x[a-fA-F0-9]{40}$/.test(sellerAddress)
          ? sellerAddress
          : null,
    }),
  }
}

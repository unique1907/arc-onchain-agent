/**
 * AgentPayments — x402 Gateway Nanopayments panel.
 *
 * Shows the paid endpoint config, lets the user probe the 402 response,
 * and displays live health-check status from the local Express server.
 */

import { useReducer, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Zap,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  DollarSign,
  Terminal,
} from 'lucide-react'

const API_BASE = '/api'

interface HealthData {
  status: string
  sellerAddress: string | null
}

interface HealthState {
  data: HealthData | null
  error: string | null
  loading: boolean
  tick: number
}

type HealthAction =
  | { type: 'refresh' }
  | { type: 'ok'; data: HealthData }
  | { type: 'err'; msg: string }
  | { type: 'done' }

function healthReducer(state: HealthState, action: HealthAction): HealthState {
  switch (action.type) {
    case 'refresh': return { ...state, loading: true, error: null, tick: state.tick + 1 }
    case 'ok':      return { ...state, data: action.data }
    case 'err':     return { ...state, data: null, error: action.msg }
    case 'done':    return { ...state, loading: false }
  }
}

interface EndpointSpec {
  method: string
  path: string
  price: string
  description: string
  requestSchema: string
  responseSchema: string
}

const ENDPOINTS: EndpointSpec[] = [
  {
    method: 'POST',
    path: '/summarize',
    price: '$0.01 USDC',
    description: 'Summarize any prompt. Paid per call via Circle Gateway Nanopayments (x402).',
    requestSchema: '{ "prompt": "string (max 512 chars)" }',
    responseSchema: '{ "summary": "string", "model": "string", "cost": "string" }',
  },
]

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function AgentPayments() {
  const { address } = useAccount()

  const [hs, dispatch] = useReducer(healthReducer, {
    data: null, error: null, loading: true, tick: 0,
  })

  const [testPrompt, setTestPrompt] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/health`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<HealthData>
      })
      .then(d => { if (!cancelled) dispatch({ type: 'ok', data: d }) })
      .catch((e: unknown) => {
        if (!cancelled) dispatch({ type: 'err', msg: e instanceof Error ? e.message : String(e) })
      })
      .finally(() => { if (!cancelled) dispatch({ type: 'done' }) })
    return () => { cancelled = true }
  }, [hs.tick])

  const triggerRefresh = useCallback(() => dispatch({ type: 'refresh' }), [])

  const probe402 = useCallback(async () => {
    setTestLoading(true)
    setTestResult(null)
    setTestStatus(null)
    try {
      const r = await fetch(`${API_BASE}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testPrompt || '(no prompt)' }),
      })
      setTestStatus(r.status)
      const body = await r.text()
      try {
        setTestResult(JSON.stringify(JSON.parse(body) as unknown, null, 2))
      } catch {
        setTestResult(body)
      }
      if (r.status === 402) {
        toast.success('Server correctly returned 402 Payment Required')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setTestResult(msg)
      setTestStatus(null)
    } finally {
      setTestLoading(false)
    }
  }, [testPrompt])

  const sellerAddr = hs.data?.sellerAddress ?? address ?? null
  const curlExample = `curl -X POST https://your-agent.example.com/summarize \\
  -H "Content-Type: application/json" \\
  -H "X-402-Recipient: ${sellerAddr ?? '<SELLER_ADDRESS>'}" \\
  -d '{"prompt": "Summarize governance proposals"}'`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <Zap size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 className="display text-lg font-semibold" style={{ color: 'var(--ink)' }}>x402 Nanopayments</h2>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Circle Gateway · pay-per-call USDC</p>
        </div>
        <a
          href="https://developers.circle.com/gateway/nanopayments"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs"
          style={{ color: 'var(--subtle)' }}
        >
          Docs <ExternalLink size={11} />
        </a>
      </div>

      {/* Server health */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--subtle)' }}>Server status</p>
          <button
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--surface-muted)', color: 'var(--accent)' }}
            onClick={triggerRefresh}
            disabled={hs.loading}
          >
            <RefreshCw size={11} className={hs.loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {hs.loading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
            <Loader2 size={12} className="animate-spin" /> Checking…
          </div>
        )}

        {!hs.loading && hs.data && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--success)' }}>Online</span>
            </div>
            {hs.data.sellerAddress ? (
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--subtle)' }}>Seller address</span>
                <span className="mono text-xs" style={{ color: 'var(--ink-2)' }}>
                  {hs.data.sellerAddress.slice(0, 6)}…{hs.data.sellerAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs rounded-lg p-2" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
                <AlertCircle size={12} />
                <span>VITE_AGENT_SELLER_ADDRESS not set. Add it to .env and restart the server.</span>
              </div>
            )}
          </div>
        )}

        {!hs.loading && hs.error && (
          <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <div>
              <p>Server unreachable: {hs.error}</p>
              <p className="mt-1" style={{ color: 'var(--subtle)' }}>
                Run: <span className="mono bg-slate-800 px-1 py-0.5 rounded">bun run server</span> to start the payment server.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Endpoints */}
      {ENDPOINTS.map(ep => (
        <div key={ep.path} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="mono text-xs px-2 py-0.5 rounded font-semibold" style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)' }}>{ep.method}</span>
            <span className="mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>{ep.path}</span>
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold tabular-nums" style={{ color: 'var(--success)' }}>
              <DollarSign size={11} />{ep.price}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{ep.description}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl p-2" style={{ background: 'var(--surface-muted)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--subtle)' }}>Request</p>
              <pre className="mono" style={{ color: 'var(--ink-2)' }}>{ep.requestSchema}</pre>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'var(--surface-muted)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--subtle)' }}>Response</p>
              <pre className="mono" style={{ color: 'var(--ink-2)' }}>{ep.responseSchema}</pre>
            </div>
          </div>
        </div>
      ))}

      {/* 402 probe */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Terminal size={14} style={{ color: 'var(--accent)' }} />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--subtle)' }}>Probe 402 response</p>
        </div>
        <input
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          placeholder="Enter prompt (optional)"
          value={testPrompt}
          onChange={e => setTestPrompt(e.target.value)}
        />
        <button
          className="w-full rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            background: testLoading ? 'var(--surface-muted)' : 'var(--surface-strong)',
            color: testLoading ? 'var(--subtle)' : 'var(--accent)',
            border: '1px solid var(--border)',
          }}
          onClick={() => { void probe402() }}
          disabled={testLoading}
        >
          {testLoading ? <Loader2 size={13} className="animate-spin" /> : null}
          {testLoading ? 'Probing…' : 'Send unpaid request'}
        </button>
        {testResult && (
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold mono" style={{
                color: testStatus === 402 ? 'var(--accent)' : testStatus === 200 ? 'var(--success)' : 'var(--danger)',
              }}>
                HTTP {testStatus ?? '?'}
              </span>
              {testStatus === 402 && <span className="text-xs" style={{ color: 'var(--subtle)' }}>Payment Required</span>}
              {testStatus === 200 && <span className="text-xs" style={{ color: 'var(--success)' }}>Paid response</span>}
            </div>
            <pre className="mono text-xs rounded-xl p-3 overflow-x-auto" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
              {testResult}
            </pre>
          </div>
        )}
      </div>

      {/* curl example */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--subtle)' }}>curl example</p>
          <button
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--surface-muted)', color: 'var(--accent)' }}
            onClick={() => { copyToClipboard(curlExample); toast.success('Copied') }}
          >
            <Copy size={10} /> Copy
          </button>
        </div>
        <pre className="mono text-xs rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
          {curlExample}
        </pre>
      </div>
    </div>
  )
}

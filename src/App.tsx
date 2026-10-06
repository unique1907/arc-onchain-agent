/**
 * Onchain Agent — ERC-8004 identity + x402 nanopayments
 * Arc Testnet · Arc Studio
 */

import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Bot, Zap } from 'lucide-react'
import AgentIdentity from './components/AgentIdentity'
import AgentPayments from './components/AgentPayments'

type Tab = 'identity' | 'payments'

export default function App() {
  const [tab, setTab] = useState<Tab>('identity')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(13,27,47,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border-strong)' }}
          >
            <Bot size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
            Onchain Agent
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)' }}
          >
            Arc Testnet
          </span>
        </div>
        <div className="ml-auto">
          <ConnectKitButton />
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-lg mx-auto px-4 pt-8 pb-4 text-center">
        <h1
          className="display text-3xl font-bold mb-2"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          Your agent,<br />onchain &amp; paid.
        </h1>
        <p className="text-sm" style={{ color: 'var(--subtle)', maxWidth: '38ch', margin: '0 auto' }}>
          Register a portable ERC-8004 identity on Arc, then accept USDC nanopayments via x402 — no API keys, no subscriptions.
        </p>
      </div>

      {/* Tab bar */}
      <div className="max-w-lg mx-auto px-4 pb-4">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {(
            [
              { id: 'identity' as Tab, label: 'Identity', icon: <Bot size={14} /> },
              { id: 'payments' as Tab, label: 'Payments', icon: <Zap size={14} /> },
            ] as const
          ).map(t => (
            <button
              key={t.id}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: tab === t.id ? 'var(--surface-strong)' : 'transparent',
                color: tab === t.id ? 'var(--ink)' : 'var(--subtle)',
                border: tab === t.id ? '1px solid var(--border-strong)' : '1px solid transparent',
              }}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <main className="max-w-lg mx-auto px-4 pb-24">
        {tab === 'identity' && <AgentIdentity />}
        {tab === 'payments' && <AgentPayments />}
      </main>
    </div>
  )
}

/**
 * AgentIdentity — ERC-8004 identity registration on Arc Testnet.
 *
 * Lets the connected wallet register an agent URI and view its agent ID.
 * The agent registration file JSON is constructed from user input and
 * shown inline; the user publishes it (IPFS / HTTPS) before registering.
 */

import { useState } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from 'wagmi'
import { toast } from 'sonner'
import { parseEventLogs } from 'viem'
import { ExternalLink, Copy, CheckCircle2, AlertCircle, Loader2, Bot, ShieldCheck } from 'lucide-react'
import { buildTxExplorerUrl, buildAddressExplorerUrl } from '@/onchain-facts'

const ARC_TESTNET_ID = 5042002

const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const

const identityAbi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
  {
    type: 'function',
    name: 'getAgentWallet',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface AgentForm {
  name: string
  description: string
  endpoint: string
  agentURI: string
}

export default function AgentIdentity() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const [form, setForm] = useState<AgentForm>({
    name: '',
    description: '',
    endpoint: '',
    agentURI: '',
  })

  const [registeredId, setRegisteredId] = useState<bigint | null>(null)
  const [lookupId, setLookupId] = useState('')

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash })

  // Lookup read
  const parsedLookupId = lookupId !== '' && !isNaN(Number(lookupId)) ? BigInt(lookupId) : undefined
  const { data: lookupOwner, isLoading: isLookingUp } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: identityAbi,
    functionName: 'ownerOf',
    args: parsedLookupId !== undefined ? [parsedLookupId] : undefined,
    chainId: ARC_TESTNET_ID,
    query: { enabled: parsedLookupId !== undefined },
  })
  const { data: lookupWallet } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: identityAbi,
    functionName: 'getAgentWallet',
    args: parsedLookupId !== undefined ? [parsedLookupId] : undefined,
    chainId: ARC_TESTNET_ID,
    query: { enabled: parsedLookupId !== undefined },
  })

  // Parse agent ID from receipt
  if (isSuccess && receipt && !registeredId) {
    try {
      const logs = parseEventLogs({ abi: identityAbi, eventName: 'Registered', logs: receipt.logs })
      if (logs.length > 0) {
        const id = logs[0].args.agentId
        setRegisteredId(id)
        toast.success(`Agent registered — ID: ${id}`)
      }
    } catch {
      // ignore parse errors
    }
  }

  const isWrongChain = isConnected && chainId !== ARC_TESTNET_ID

  const registrationJson = form.name
    ? JSON.stringify(
        {
          type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
          name: form.name,
          description: form.description,
          services: form.endpoint
            ? [{ name: 'A2A', endpoint: form.endpoint, version: '1.0.0' }]
            : [],
          x402Support: true,
          active: true,
          registrations: [],
          supportedTrust: ['reputation'],
        },
        null,
        2,
      )
    : null

  function handleRegister() {
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_ID })
      return
    }
    if (!form.agentURI.trim()) {
      toast.error('Paste the HTTPS/IPFS URL of your registration file first.')
      return
    }
    reset()
    setRegisteredId(null)
    writeContract({
      address: IDENTITY_REGISTRY,
      abi: identityAbi,
      functionName: 'register',
      args: [form.agentURI.trim()],
      chainId: ARC_TESTNET_ID,
    })
  }

  const busy = isPending || isConfirming || isSwitching

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <Bot size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 className="display text-lg font-semibold" style={{ color: 'var(--ink)' }}>ERC-8004 Identity</h2>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Arc Testnet · Identity Registry</p>
        </div>
        <a
          href={buildAddressExplorerUrl(ARC_TESTNET_ID, IDENTITY_REGISTRY)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs"
          style={{ color: 'var(--subtle)' }}
        >
          Registry <ExternalLink size={11} />
        </a>
      </div>

      {!isConnected && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--subtle)' }}>Connect your wallet to register an agent.</p>
      )}

      {isConnected && (
        <>
          {/* Step 1: Build JSON */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--subtle)' }}>Step 1 — Build registration file</p>
            <input
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              placeholder="Agent name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              placeholder="Short description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <input
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              placeholder="Service endpoint URL (https://…)"
              value={form.endpoint}
              onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
            />
            {registrationJson && (
              <div className="relative">
                <pre className="mono text-xs rounded-xl p-3 overflow-x-auto" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
                  {registrationJson}
                </pre>
                <button
                  className="absolute top-2 right-2 p-1 rounded-lg"
                  style={{ background: 'var(--surface-strong)' }}
                  onClick={() => { copyToClipboard(registrationJson); toast.success('Copied JSON') }}
                  title="Copy JSON"
                >
                  <Copy size={13} style={{ color: 'var(--accent)' }} />
                </button>
              </div>
            )}
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Upload this JSON to IPFS or HTTPS, then paste the URL below.
            </p>
          </div>

          {/* Step 2: Register */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--subtle)' }}>Step 2 — Register onchain</p>
            <input
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              placeholder="ipfs://Qm… or https://…/registration.json"
              value={form.agentURI}
              onChange={e => setForm(f => ({ ...f, agentURI: e.target.value }))}
            />

            {isWrongChain && (
              <button
                className="w-full rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
                disabled={isSwitching}
              >
                {isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}
              </button>
            )}

            {!isWrongChain && (
              <button
                className="w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: busy ? 'var(--surface-muted)' : 'var(--accent)',
                  color: busy ? 'var(--subtle)' : '#0d1b2f',
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
                onClick={handleRegister}
                disabled={busy || !form.agentURI.trim()}
              >
                {(isPending || isSwitching) && <Loader2 size={14} className="animate-spin" />}
                {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : 'Register Agent'}
              </button>
            )}

            {writeError && (
              <div className="flex items-start gap-2 text-xs rounded-xl p-3" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{writeError.message.split('\n')[0].slice(0, 160)}</span>
              </div>
            )}

            {txHash && (
              <a
                href={buildTxExplorerUrl(ARC_TESTNET_ID, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink size={11} /> View transaction
              </a>
            )}

            {registeredId !== null && (
              <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(141,216,159,0.1)', border: '1px solid rgba(141,216,159,0.25)' }}>
                <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
                  Agent ID: <span className="mono">{registeredId.toString()}</span>
                </span>
                <button className="ml-auto" onClick={() => copyToClipboard(registeredId.toString())}>
                  <Copy size={12} style={{ color: 'var(--subtle)' }} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lookup */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--subtle)' }}>Lookup agent by ID</p>
        </div>
        <input
          className="w-full rounded-xl px-3 py-2 text-sm mono outline-none"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          placeholder="Agent ID (e.g. 22)"
          value={lookupId}
          onChange={e => setLookupId(e.target.value.replace(/[^0-9]/g, ''))}
        />
        {parsedLookupId !== undefined && (
          isLookingUp ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
              <Loader2 size={12} className="animate-spin" /> Looking up…
            </div>
          ) : lookupOwner ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--subtle)' }}>Owner</span>
                <a
                  href={buildAddressExplorerUrl(ARC_TESTNET_ID, lookupOwner)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono flex items-center gap-1"
                  style={{ color: 'var(--accent)' }}
                >
                  {shortAddr(lookupOwner)} <ExternalLink size={10} />
                </a>
              </div>
              {lookupWallet && lookupWallet !== '0x0000000000000000000000000000000000000000' && (
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--subtle)' }}>Agent wallet</span>
                  <span className="mono" style={{ color: 'var(--ink-2)' }}>{shortAddr(lookupWallet)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>No agent found for this ID.</p>
          )
        )}
      </div>
    </div>
  )
}

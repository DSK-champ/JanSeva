import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ClipboardList, Building2, CheckCircle2,
  XCircle, Clock, AlertTriangle, RefreshCw, Filter,
} from 'lucide-react'

const API = 'http://localhost:5000/api'

const STATUS_META = {
  Pending:     { color: '#F4A261', bg: 'rgba(244,162,97,0.12)',  label: 'Pending'     },
  'In Progress':{ color: '#4CC9F0', bg: 'rgba(76,201,240,0.12)', label: 'In Progress' },
  Resolved:    { color: '#40916C', bg: 'rgba(64,145,108,0.12)',  label: 'Resolved'    },
  Cancelled:   { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', label: 'Cancelled'   },
}

const PRIORITY_META = {
  High:   { color: '#DC2626' },
  Medium: { color: '#F4A261' },
  Low:    { color: '#40916C' },
}

const CATEGORY_COLORS = {
  Food: '#40916C', Medical: '#4CC9F0', Shelter: '#9D4EDD',
  Education: '#F4A261', Emergency: '#DC2626', Other: '#5F7F72',
}

// ─── Tab IDs ─────────────────────────────────────────────────────────────────
const TABS = ['requests', 'ngos']

export default function AdminDashboard({ user }) {
  const token   = localStorage.getItem('janseva_token')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const [tab, setTab] = useState('requests')

  // ── Requests state ──
  const [requests,        setRequests]        = useState([])
  const [reqTotal,        setReqTotal]        = useState(0)
  const [reqPage,         setReqPage]         = useState(1)
  const [reqLoading,      setReqLoading]      = useState(true)
  const [reqFilter,       setReqFilter]       = useState({ status: '', priority: '', category: '' })
  const [updatingId,      setUpdatingId]      = useState(null)

  // ── NGOs state ──
  const [pendingNGOs, setPendingNGOs] = useState([])
  const [allNGOs,     setAllNGOs]     = useState([])
  const [ngoLoading,  setNgoLoading]  = useState(true)

  // ─── Fetch requests ──────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async (page = 1, filters = reqFilter) => {
    setReqLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10, sort: 'createdAt', order: 'desc' })
      if (filters.status)   params.set('status',   filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.category) params.set('category', filters.category)

      const res  = await fetch(`${API}/requests?${params}`, { headers })
      const data = await res.json()
      if (data.success) {
        setRequests(data.data)
        setReqTotal(data.meta?.total || 0)
        setReqPage(page)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setReqLoading(false)
    }
  }, [reqFilter])  // eslint-disable-line

  // ─── Fetch NGOs ──────────────────────────────────────────────────────────────
  const fetchNGOs = useCallback(async () => {
    setNgoLoading(true)
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch(`${API}/ngos/admin/pending`, { headers }).then(r => r.json()),
        fetch(`${API}/ngos`, { headers }).then(r => r.json()),
      ])
      if (pendingRes.success) setPendingNGOs(pendingRes.data)
      if (allRes.success)     setAllNGOs(allRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setNgoLoading(false)
    }
  }, [])  // eslint-disable-line

  useEffect(() => { fetchRequests(1, reqFilter) }, [reqFilter])
  useEffect(() => { fetchNGOs() }, [])

  // ─── Update request status ───────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`${API}/requests/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  // ─── NGO approval ────────────────────────────────────────────────────────────
  const handleApproval = async (id, action) => {
    try {
      const res = await fetch(`${API}/ngos/admin/${id}/${action}`, { method: 'PATCH', headers })
      if (res.ok) fetchNGOs()
    } catch (err) { console.error(err) }
  }

  const totalPages = Math.ceil(reqTotal / 10)

  // ─── Summary counts from current list ────────────────────────────────────────
  const summary = {
    total:   reqTotal,
    pending: requests.filter(r => r.status === 'Pending').length,
    high:    requests.filter(r => r.priority === 'High').length,
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Admin</span>
              <h1 className="page-title">Platform Administration</h1>
              <p className="page-subtitle">
                Review incoming service requests, manage NGO approvals, and keep the platform running smoothly.
              </p>
            </div>
            <div className="page-hero-panel">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: ClipboardList, label: 'Total Requests', value: reqTotal,         color: 'var(--green-6)'    },
                  { icon: Clock,         label: 'Pending',         value: summary.pending,  color: '#F4A261'           },
                  { icon: AlertTriangle, label: 'High Priority',   value: summary.high,     color: '#DC2626'           },
                ].map(card => (
                  <div key={card.label} className="glass-card p-5">
                    <div className="icon-shell h-9 w-9" style={{ color: card.color }}><card.icon size={18} strokeWidth={1.8} /></div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>{card.label}</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em]" style={{ color: card.color, fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tabs ── */}
      <section className="section">
        <div className="container">
          <div className="app-tabs">
            <button onClick={() => setTab('requests')} className={`app-tab ${tab === 'requests' ? 'is-active' : ''}`}>
              <ClipboardList size={15} /> Service Requests {reqTotal > 0 && <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>{reqTotal}</span>}
            </button>
            <button onClick={() => setTab('ngos')} className={`app-tab ${tab === 'ngos' ? 'is-active' : ''}`}>
              <Building2 size={15} /> NGO Management {pendingNGOs.length > 0 && <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(244,162,97,0.15)', color: '#F4A261' }}>{pendingNGOs.length}</span>}
            </button>
          </div>

          {/* ════════════ SERVICE REQUESTS TAB ════════════ */}
          {tab === 'requests' && (
            <div className="mt-6 space-y-5">
              {/* Filters */}
              <div className="glass-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="icon-shell h-8 w-8"><Filter size={14} strokeWidth={1.8} /></div>
                  <p className="text-sm font-bold" style={{ color: 'var(--green-8)' }}>Filter</p>

                  {[
                    { key: 'status',   label: 'Status',   opts: ['', 'Pending', 'In Progress', 'Resolved', 'Cancelled'] },
                    { key: 'priority', label: 'Priority', opts: ['', 'High', 'Medium', 'Low'] },
                    { key: 'category', label: 'Category', opts: ['', 'Food', 'Medical', 'Shelter', 'Education', 'Emergency', 'Other'] },
                  ].map(f => (
                    <select
                      key={f.key}
                      className="select-field no-icon text-sm py-2"
                      style={{ minWidth: 140 }}
                      value={reqFilter[f.key]}
                      onChange={e => setReqFilter(prev => ({ ...prev, [f.key]: e.target.value }))}
                    >
                      <option value="">All {f.label}s</option>
                      {f.opts.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}

                  <button
                    onClick={() => fetchRequests(reqPage, reqFilter)}
                    className="ml-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(82,183,136,0.12)', color: 'var(--green-8)' }}
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
              </div>

              {/* Requests list */}
              {reqLoading ? (
                <div className="glass-card p-12 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(82,183,136,0.18)', borderTopColor: 'var(--green-6)' }} />
                  <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>Loading requests…</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <ClipboardList size={40} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No service requests found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(req => {
                    const sm = STATUS_META[req.status]   || STATUS_META.Pending
                    const pm = PRIORITY_META[req.priority] || PRIORITY_META.Medium
                    const cc = CATEGORY_COLORS[req.category] || '#5F7F72'
                    const isUpdating = updatingId === req._id

                    return (
                      <div
                        key={req._id}
                        className="glass-card p-5 transition-all hover:-translate-y-0.5"
                        style={{ borderLeft: `4px solid ${pm.color}` }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          {/* Left: details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {/* Category badge */}
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: `${cc}14`, color: cc }}>
                                {req.category}
                              </span>
                              {/* Priority badge */}
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: `${pm.color}14`, color: pm.color }}>
                                {req.priority} Priority
                              </span>
                              {/* Status badge */}
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: sm.bg, color: sm.color }}>
                                {sm.label}
                              </span>
                            </div>

                            <h3 className="text-base font-extrabold tracking-[-0.03em] truncate" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                              {req.title}
                            </h3>
                            <p className="mt-1 text-sm leading-6 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{req.description}</p>

                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                                📍 {req.location?.city}{req.location?.state ? `, ${req.location.state}` : ''}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                                👤 {req.createdBy?.name || 'Anonymous'} ({req.createdBy?.email || '-'})
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                                🗓 {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </p>
                              {req.beneficiaryCount > 1 && (
                                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>👥 {req.beneficiaryCount} people</p>
                              )}
                            </div>
                            {req.tags?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {req.tags.map(tag => (
                                  <span key={tag} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(45,106,79,0.08)', color: 'var(--green-8)' }}>#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Right: status actions */}
                          <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:items-end sm:ml-4 sm:shrink-0">
                            <p className="w-full text-xs font-bold mb-1" style={{ color: 'var(--text-soft)' }}>Update Status</p>
                            {['Pending', 'In Progress', 'Resolved', 'Cancelled'].map(s => {
                              const m  = STATUS_META[s]
                              const active = req.status === s
                              return (
                                <button
                                  key={s}
                                  disabled={isUpdating || active}
                                  onClick={() => updateStatus(req._id, s)}
                                  className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5"
                                  style={{
                                    background: active ? m.bg : 'rgba(255,255,255,0.7)',
                                    color:      active ? m.color : 'var(--text-muted)',
                                    border:     `1.5px solid ${active ? m.color : 'var(--border)'}`,
                                    opacity:    isUpdating ? 0.5 : 1,
                                  }}
                                >
                                  {isUpdating && active ? '…' : s}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    disabled={reqPage <= 1}
                    onClick={() => fetchRequests(reqPage - 1)}
                    className="rounded-xl px-4 py-2 text-sm font-bold transition-all"
                    style={{ background: reqPage <= 1 ? 'rgba(0,0,0,0.04)' : 'rgba(82,183,136,0.12)', color: reqPage <= 1 ? 'var(--text-soft)' : 'var(--green-8)' }}
                  >
                    ← Prev
                  </button>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {reqPage} of {totalPages}</p>
                  <button
                    disabled={reqPage >= totalPages}
                    onClick={() => fetchRequests(reqPage + 1)}
                    className="rounded-xl px-4 py-2 text-sm font-bold transition-all"
                    style={{ background: reqPage >= totalPages ? 'rgba(0,0,0,0.04)' : 'rgba(82,183,136,0.12)', color: reqPage >= totalPages ? 'var(--text-soft)' : 'var(--green-8)' }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════ NGO MANAGEMENT TAB ════════════ */}
          {tab === 'ngos' && (
            <div className="mt-6">
              {ngoLoading ? (
                <div className="glass-card p-12 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(82,183,136,0.18)', borderTopColor: 'var(--green-6)' }} />
                </div>
              ) : (
                <div className="content-grid">
                  {/* Pending Approvals */}
                  <div className="glass-card p-6">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="icon-shell h-9 w-9" style={{ color: '#F4A261' }}><Clock size={17} strokeWidth={1.8} /></div>
                      <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                        Pending Approvals
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {pendingNGOs.length === 0 ? (
                        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(216,243,220,0.34)', border: '1px dashed rgba(45,106,79,0.18)' }}>
                          <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: 'var(--green-6)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No NGOs waiting for approval.</p>
                        </div>
                      ) : (
                        pendingNGOs.map(ngo => (
                          <div key={ngo._id} className="glass-card p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-extrabold" style={{ color: 'var(--green-8)' }}>{ngo.name}</h3>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{ngo.city}, {ngo.state}</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleApproval(ngo._id, 'approve')} className="btn-primary py-1.5 px-3 min-h-0 text-xs flex items-center gap-1">
                                  <CheckCircle2 size={13} /> Approve
                                </button>
                                <button onClick={() => handleApproval(ngo._id, 'reject')} className="btn-danger py-1.5 px-3 min-h-0 text-xs flex items-center gap-1">
                                  <XCircle size={13} /> Reject
                                </button>
                              </div>
                            </div>
                            <p className="text-xs leading-6 rounded-xl p-3" style={{ color: 'var(--text-muted)', background: 'rgba(216,243,220,0.34)' }}>
                              {ngo.organizationDetails?.slice(0, 200)}{ngo.organizationDetails?.length > 200 ? '…' : ''}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* All approved NGOs */}
                  <div className="glass-card p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="icon-shell h-9 w-9"><Building2 size={17} strokeWidth={1.8} /></div>
                        <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                          Approved NGOs
                        </h2>
                      </div>
                      <Link to="/explore" className="text-xs font-bold" style={{ color: 'var(--green-6)' }}>View Map →</Link>
                    </div>
                    <div className="space-y-2">
                      {allNGOs.map(ngo => (
                        <div key={ngo._id} className="flex items-center justify-between rounded-2xl px-4 py-3 transition-all hover:-translate-y-0.5" style={{ background: 'rgba(216,243,220,0.34)' }}>
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--green-8)' }}>{ngo.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ngo.city}, {ngo.state}</p>
                          </div>
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(64,145,108,0.12)', color: 'var(--green-6)' }}>Active</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

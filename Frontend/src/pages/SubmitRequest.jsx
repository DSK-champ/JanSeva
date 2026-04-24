import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList, MapPin, AlertTriangle, Users, CheckCircle2, ArrowRight, Info,
} from 'lucide-react'
import confetti from 'canvas-confetti'

const API = 'http://localhost:5000/api'

const CATEGORIES = ['Food', 'Medical', 'Shelter', 'Education', 'Emergency', 'Other']
const PRIORITIES  = ['Low', 'Medium', 'High']
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir',
]

const CATEGORY_META = {
  Food:      { color: '#40916C', bg: 'rgba(64,145,108,0.10)' },
  Medical:   { color: '#4CC9F0', bg: 'rgba(76,201,240,0.10)' },
  Shelter:   { color: '#9D4EDD', bg: 'rgba(157,78,221,0.10)' },
  Education: { color: '#F4A261', bg: 'rgba(244,162,97,0.10)'  },
  Emergency: { color: '#DC2626', bg: 'rgba(220,38,38,0.10)'  },
  Other:     { color: '#5F7F72', bg: 'rgba(95,127,114,0.10)' },
}

const PRIORITY_META = {
  Low:    { color: '#40916C', label: 'Low — Not urgent' },
  Medium: { color: '#F4A261', label: 'Medium — Should be addressed soon' },
  High:   { color: '#DC2626', label: 'High — Urgent situation' },
}

export default function SubmitRequest() {
  const navigate  = useNavigate()
  const token     = localStorage.getItem('janseva_token')

  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
    locationCity: '', locationState: '', beneficiaryCount: 1, tags: '',
  })
  const [status, setStatus]     = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) { navigate('/login'); return }

    setStatus('loading')
    setErrorMsg('')

    const payload = {
      title:          form.title.trim(),
      description:    form.description.trim(),
      category:       form.category,
      priority:       form.priority,
      location: {
        city:  form.locationCity.trim(),
        state: form.locationState,
      },
      beneficiaryCount: Number(form.beneficiaryCount) || 1,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }

    try {
      const res = await fetch(`${API}/requests`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.message || 'Failed to submit request.')
        setStatus('error')
        return
      }

      setStatus('success')
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#40916C', '#52B788', '#4CC9F0'] })
      setTimeout(() => navigate('/dashboard'), 3000)
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  // ─── Not logged in ───────────────────────────────────────────────────────────
  if (!token) {
    return (
      <section className="section">
        <div className="container max-w-lg">
          <div className="glass-card p-10 text-center">
            <div className="icon-shell mx-auto mb-5 h-14 w-14">
              <ClipboardList size={26} strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
              Login required
            </h2>
            <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
              You need to be logged in to submit a service request so we can keep you updated on its status.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row justify-center">
              <Link to="/login" className="btn-primary justify-center">Login <ArrowRight size={16} /></Link>
              <Link to="/signup" className="btn-outline justify-center">Create account</Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ─── Success state ───────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <section className="section">
        <div className="container max-w-lg">
          <div className="glass-card p-12 text-center">
            <CheckCircle2 size={56} className="mx-auto mb-5" style={{ color: 'var(--green-6)' }} />
            <h2 className="text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
              Request Submitted!
            </h2>
            <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
              Your service request has been added to the database and is now visible to NGOs in your area. Redirecting you to your dashboard…
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div>
      {/* ── Page Hero ── */}
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Community</span>
              <h1 className="page-title">Submit a Service Request</h1>
              <p className="page-subtitle">
                Describe what your community needs and our verified NGOs and volunteers will coordinate a response.
                Every request you submit goes directly into our live database.
              </p>
            </div>
            <div className="page-hero-panel">
              <div className="glass-card p-6 space-y-4">
                {[
                  { icon: ClipboardList, label: 'Structured intake', desc: 'Your request is saved with category, priority and location for quick triage.' },
                  { icon: MapPin,        label: 'Location-aware',   desc: 'Nearby NGOs and volunteers are matched to your request automatically.' },
                  { icon: AlertTriangle, label: 'Priority scoring', desc: 'High-priority requests surface to the top of the responder queue.' },
                  { icon: Users,         label: 'Tracked response', desc: 'Watch the status of your request update in real time.' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="icon-shell h-9 w-9 shrink-0">
                      <item.icon size={16} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--green-8)' }}>{item.label}</p>
                      <p className="text-xs leading-6" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Form ── */}
      <section className="section">
        <div className="container max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Error banner */}
            {status === 'error' && (
              <div className="flex items-start gap-3 rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}>
                <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                <p className="text-sm font-medium" style={{ color: '#DC2626' }}>{errorMsg}</p>
              </div>
            )}

            {/* ─ Section 1: Basic Details ─ */}
            <div className="glass-card p-6" style={{ border: '2px solid rgba(82,183,136,0.15)' }}>
              <div className="mb-5 flex items-center gap-3">
                <div className="icon-shell h-9 w-9"><ClipboardList size={17} strokeWidth={1.8} /></div>
                <h2 className="text-lg font-extrabold tracking-[-0.03em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                  Request Details
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>
                    Request Title <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    required
                    minLength={5}
                    maxLength={120}
                    className="input-field no-icon"
                    placeholder="e.g. Need food supplies for 50 families in Andheri"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{form.title.length}/120 characters (min. 5)</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>
                    Description <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    required
                    maxLength={2000}
                    rows={4}
                    className="input-field no-icon resize-none"
                    placeholder="Describe the situation in detail — what is needed, how many people are affected, any time constraints, etc."
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{form.description.length}/2000 characters</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>
                    Number of people affected
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input-field no-icon"
                    placeholder="e.g. 50"
                    value={form.beneficiaryCount}
                    onChange={e => set('beneficiaryCount', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>
                    Tags <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(optional, comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    className="input-field no-icon"
                    placeholder="e.g. flood, monsoon, urgent"
                    value={form.tags}
                    onChange={e => set('tags', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ─ Section 2: Category ─ */}
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-extrabold tracking-[-0.03em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                Category <span style={{ color: '#DC2626' }}>*</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CATEGORIES.map(cat => {
                  const meta    = CATEGORY_META[cat]
                  const isActive = form.category === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => set('category', cat)}
                      className="rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5"
                      style={{
                        background:   isActive ? meta.bg  : 'rgba(255,255,255,0.55)',
                        border:       `2px solid ${isActive ? meta.color : 'var(--border)'}`,
                        boxShadow:    isActive ? `0 0 0 3px ${meta.color}22` : 'none',
                      }}
                    >
                      <p className="text-sm font-bold" style={{ color: isActive ? meta.color : 'var(--green-8)' }}>{cat}</p>
                    </button>
                  )
                })}
              </div>
              {!form.category && (
                <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Info size={12} /> Please select a category.
                </p>
              )}
            </div>

            {/* ─ Section 3: Priority ─ */}
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-extrabold tracking-[-0.03em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                Priority Level
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {PRIORITIES.map(p => {
                  const meta    = PRIORITY_META[p]
                  const isActive = form.priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set('priority', p)}
                      className="rounded-2xl p-4 text-center transition-all hover:-translate-y-0.5"
                      style={{
                        background: isActive ? `${meta.color}14` : 'rgba(255,255,255,0.55)',
                        border:     `2px solid ${isActive ? meta.color : 'var(--border)'}`,
                      }}
                    >
                      <p className="text-sm font-extrabold" style={{ color: meta.color }}>{p}</p>
                      <p className="mt-1 text-[10px] leading-4" style={{ color: 'var(--text-muted)' }}>{meta.label.split('—')[1]?.trim()}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ─ Section 4: Location ─ */}
            <div className="glass-card p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="icon-shell blue h-9 w-9"><MapPin size={17} strokeWidth={1.8} /></div>
                <h2 className="text-lg font-extrabold tracking-[-0.03em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                  Location
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>
                    City <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    required
                    className="input-field no-icon"
                    placeholder="e.g. Mumbai"
                    value={form.locationCity}
                    onChange={e => set('locationCity', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>State</label>
                  <select
                    className="select-field no-icon"
                    value={form.locationState}
                    onChange={e => set('locationState', e.target.value)}
                  >
                    <option value="">-- Select State --</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ─ Submit ─ */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                * Required fields. Your request will be saved to the database immediately.
              </p>
              <button
                type="submit"
                disabled={status === 'loading' || !form.category}
                className="btn-primary justify-center sm:min-w-[200px]"
                style={{ opacity: (!form.category || status === 'loading') ? 0.6 : 1 }}
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  <>Submit Request <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

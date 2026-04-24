import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Heart, DollarSign, Clock, QrCode, ArrowRight, CheckCircle2 } from 'lucide-react'

const API = 'http://localhost:5000/api'

export default function Contributions() {
  const [data, setData] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [ngos, setNgos] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('janseva_token')

  const [form, setForm] = useState({ ngoId: '', amount: '', note: '' })
  const [donateStatus, setDonateStatus] = useState('idle') // idle, qr, success

  useEffect(() => {
    const fetchPromises = [
      fetch(`${API}/contributions/leaderboard`).then((r) => r.json()),
      fetch(`${API}/ngos?limit=50`).then((r) => r.json()),
    ];

    if (token) {
      fetchPromises.push(
        fetch(`${API}/contributions/my`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
      )
    }

    Promise.all(fetchPromises)
      .then((results) => {
        setLeaderboard(results[0]?.data || [])
        setNgos(results[1]?.data || [])
        if (token && results[2]) {
          setData(results[2]?.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const handleDonate = async (e) => {
    e.preventDefault()
    if (!form.ngoId || !form.amount) return
    setDonateStatus('qr')
  }

  const confirmPayment = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/contributions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ngoId: form.ngoId,
          type: 'monetary',
          amount: Number(form.amount),
          note: form.note || 'Online Donation',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to record contribution');
      }

      setDonateStatus('success')
      setForm({ ngoId: '', amount: '', note: '' })

      // Party popper confetti effect
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4CC9F0', '#40916C', '#9D4EDD', '#DC2626'],
      })

      setTimeout(() => {
        setDonateStatus('idle')
        // Option to reload or refetch, but a simple state reset is fine
        window.location.reload()
      }, 3000)
    } catch {
      alert("Failed to process donation")
      setDonateStatus('idle')
    }
  }

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(82,183,136,0.18)', borderTopColor: 'var(--green-6)' }} />
            <p>Loading contributions...</p>
          </div>
        </div>
      </section>
    )
  }

  const summaryCards = [
    { icon: DollarSign, label: 'Total Donated', value: `Rs. ${(data?.totalMonetary || 0).toLocaleString('en-IN')}`, color: 'var(--green-6)' },
    { icon: Clock, label: 'Hours Volunteered', value: `${data?.totalHours || 0}h`, color: 'var(--blue-accent)' },
    { icon: Heart, label: 'Activities', value: data?.count || 0, color: 'var(--purple-accent)' },
  ]

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Impact</span>
              <h1 className="page-title">Make a difference today</h1>
              <p className="page-subtitle">
                Support verified NGOs securely. Track your history if you're logged in, or donate quickly without logging in.
              </p>
            </div>
            {token ? (
              <div className="page-hero-panel">
                <div className="grid gap-4 md:grid-cols-3">
                  {summaryCards.map((card) => (
                    <div key={card.label} className="glass-card p-5">
                      <div className="icon-shell" style={{ color: card.color }}>
                        <card.icon size={20} strokeWidth={1.8} />
                      </div>
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>{card.label}</p>
                      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: card.color, fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 flex flex-col justify-center text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Log in to track your complete donation history, volunteered hours, and direct impact.
                </p>
                <div className="mt-4">
                  <Link to="/login" className="btn-primary w-full max-w-[200px] justify-center mx-auto">Log In</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="content-grid">
            <div className="flex flex-col gap-6">
              
              {/* Donate Now Form */}
              <div className="glass-card p-6" style={{ border: '2px solid rgba(82, 183, 136, 0.2)' }}>
                <div className="border-b pb-4 mb-4" style={{ borderColor: 'rgba(45, 106, 79, 0.08)' }}>
                  <h2 className="text-xl font-extrabold tracking-[-0.04em] flex items-center gap-2" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                    <Heart size={20} style={{ color: 'var(--red-accent)' }} /> 
                    Donate Now
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Quick securely support our verified NGOs</p>
                </div>
                
                {donateStatus === 'idle' && (
                  <form onSubmit={handleDonate} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Select NGO</label>
                      <select required className="select-field no-icon" value={form.ngoId} onChange={(e) => setForm({...form, ngoId: e.target.value})}>
                        <option value="">-- Choose an organization --</option>
                        {ngos.map(n => <option key={n._id} value={n._id}>{n.name} ({n.city})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Amount (Rs.)</label>
                      <input required type="number" min="1" className="input-field no-icon" placeholder="e.g. 500" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Note (Optional)</label>
                      <input type="text" className="input-field no-icon" placeholder="A brief message of support" value={form.note} onChange={(e) => setForm({...form, note: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-primary w-full justify-center">
                      Donate via UPI
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}

                {donateStatus === 'qr' && (
                  <div className="flex flex-col items-center py-6">
                    <p className="text-lg font-bold mb-4" style={{ color: 'var(--green-8)' }}>Scan to Pay Rs. {form.amount}</p>
                    <div className="bg-white p-4 rounded-xl border mb-6 flex justify-center items-center shadow-sm" style={{ width: 180, height: 180, borderColor: 'var(--border)' }}>
                      <QrCode size={120} strokeWidth={1} style={{ color: 'var(--green-9)' }} />
                    </div>
                    <p className="text-sm mb-6 max-w-xs text-center" style={{ color: 'var(--text-muted)' }}>
                      Open your UPI app (GPay, PhonePe, Paytm) and scan this QR code.
                    </p>
                    <div className="flex w-full gap-3">
                      <button onClick={() => setDonateStatus('idle')} className="btn-outline flex-1 justify-center">Cancel</button>
                      <button onClick={confirmPayment} className="btn-primary flex-1 justify-center">I have paid</button>
                    </div>
                  </div>
                )}

                {donateStatus === 'success' && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle2 size={48} className="mb-4" style={{ color: 'var(--green-6)' }} />
                    <p className="text-xl font-bold" style={{ color: 'var(--green-8)' }}>Payment Successful!</p>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Thank you for your generous contribution.</p>
                  </div>
                )}
              </div>

              {token && (
                <div className="glass-card overflow-hidden">
                  <div className="border-b p-5" style={{ borderColor: 'rgba(45, 106, 79, 0.08)' }}>
                    <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>My Contribution History</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>NGO</th>
                          <th>Amount / Hours</th>
                          <th>Note</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.contributions?.length ? (
                          data.contributions.map((contribution) => (
                            <tr key={contribution._id}>
                              <td>{contribution.type}</td>
                              <td>{contribution.ngo?.name || '-'}</td>
                              <td>
                                {contribution.type === 'monetary'
                                  ? `Rs. ${contribution.amount?.toLocaleString('en-IN')}`
                                  : contribution.type === 'hours'
                                    ? `${contribution.hours}h`
                                    : 'Supplies'}
                              </td>
                              <td>{contribution.note || '-'}</td>
                              <td>{contribution.date ? new Date(contribution.date).toLocaleDateString('en-IN') : '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center">No contributions yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card p-6 h-fit">
              <div className="mb-5 flex items-center gap-3">
                <div className="icon-shell purple">
                  <Heart size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="eyebrow-note">Leaderboard</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                    Top NGOs by donations
                  </h2>
                </div>
              </div>
              <div className="space-y-3">
                {leaderboard.slice(0, 8).map((item, index) => (
                  <div key={item._id} className="glass-card flex items-center gap-4 p-4">
                    <div className={`rank-badge ${index < 3 ? `rank-${index + 1}` : 'rank-n'}`}>{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold" style={{ color: 'var(--green-8)' }}>{item.ngo?.name}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{item.donors} donors</p>
                    </div>
                    <p className="text-sm font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-6)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                      Rs. {(item.totalRaised || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Trophy, MapPin } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || `${API}`

export default function TopNGOs() {
  const [ngos, setNgos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/ngos/ranked`)
      .then((r) => r.json())
      .then((d) => setNgos(d.data || []))
      .catch(() => setNgos([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Rankings</span>
              <h1 className="page-title">Top-performing NGOs with stronger hierarchy</h1>
              <p className="page-subtitle">
                The leaderboard now uses a cleaner ranking layout with lighter surfaces, better spacing, and easier comparison of impact signals.
              </p>
            </div>
            <div className="page-hero-panel">
              <div className="grid gap-4 md:grid-cols-3">
                {ngos.slice(0, 3).map((ngo, index) => (
                  <div key={ngo._id} className="glass-card p-5 text-center">
                    <div className={`rank-badge mx-auto mb-4 rank-${index + 1}`}>{index + 1}</div>
                    <p className="line-clamp-1 text-sm font-bold" style={{ color: 'var(--green-8)' }}>{ngo.name}</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-6)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{ngo.score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div className="empty-state">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(82,183,136,0.18)', borderTopColor: 'var(--green-6)' }} />
              <p>Loading rankings...</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 border-b p-5" style={{ borderColor: 'rgba(45, 106, 79, 0.08)' }}>
                <div className="icon-shell">
                  <Trophy size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="eyebrow-note">Leaderboard</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                    Full NGO rankings
                  </h2>
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: 'rgba(45, 106, 79, 0.08)' }}>
                {ngos.map((ngo, index) => (
                  <div key={ngo._id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                    <div className={`rank-badge ${index < 3 ? `rank-${index + 1}` : 'rank-n'}`}>{index + 1}</div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white" style={{ background: 'linear-gradient(135deg, var(--green-6), var(--green-7))' }}>
                      {ngo.name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold" style={{ color: 'var(--green-8)' }}>{ngo.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <MapPin size={12} />
                        {ngo.city}, {ngo.state}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ngo.focusAreas?.slice(0, 2).map((focus) => (
                          <span key={focus} className="tag-chip">{focus}</span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center md:min-w-[280px]">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Volunteers</p>
                        <p className="mt-1 text-lg font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-6)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{ngo.volunteerCount}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Impact</p>
                        <p className="mt-1 text-lg font-extrabold tracking-[-0.04em]" style={{ color: 'var(--blue-accent)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{ngo.impactScore}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Score</p>
                        <p className="mt-1 text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--purple-accent)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{ngo.score}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

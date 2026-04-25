import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL || `${API}`
const STATUSES = ['Active', 'Upcoming', 'Completed']
const CATEGORIES = ['All', 'Food', 'Medical', 'Shelter', 'Education', 'Emergency', 'Other']

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('Active')
  const [activeCategory, setActiveCategory] = useState('All')
  const token = localStorage.getItem('janseva_token')

  const fetchCampaigns = async (status, category) => {
    setLoading(true)
    try {
      let url = `${API}/campaigns?status=${status}`
      if (category !== 'All') url += `&category=${category}`
      const res = await fetch(url)
      const data = await res.json()
      setCampaigns(data.data || [])
    } catch {
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns('Active', 'All')
    fetch(`${API}/campaigns/stats`).then((r) => r.json()).then((d) => setStats(d.data)).catch(() => {})
  }, [])

  const handleFilter = (status, category) => {
    setActiveStatus(status)
    setActiveCategory(category)
    fetchCampaigns(status, category)
  }

  const joinCampaign = async (id) => {
    if (!token) {
      alert('Please log in to join campaigns.')
      return
    }
    await fetch(`${API}/campaigns/${id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    fetchCampaigns(activeStatus, activeCategory)
  }

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Campaigns</span>
              <h1 className="page-title">Social campaigns in a cleaner, lighter grid</h1>
              <p className="page-subtitle">
                Browse active, upcoming, and completed drives with stronger card alignment, improved spacing, and a more modern presentation.
              </p>
            </div>
            <div className="page-hero-panel">
              <div className="grid gap-4 md:grid-cols-3">
                {(stats?.byStatus || []).slice(0, 3).map((item) => (
                  <div key={item._id} className="glass-card p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>{item._id}</p>
                    <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="glass-card p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((status) => (
                  <button key={status} onClick={() => handleFilter(status, activeCategory)} className={activeStatus === status ? 'btn-primary min-h-0 px-4 py-2 text-sm' : 'btn-outline min-h-0 px-4 py-2 text-sm'}>
                    {status}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button key={category} onClick={() => handleFilter(activeStatus, category)} className={activeCategory === category ? 'btn-mustard min-h-0 px-4 py-2 text-xs' : 'btn-outline min-h-0 px-4 py-2 text-xs'}>
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="empty-state mt-6">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(82,183,136,0.18)', borderTopColor: 'var(--green-6)' }} />
              <p>Loading campaigns...</p>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="cards-grid-3 mt-6">
              {campaigns.map((campaign) => {
                const progress = campaign.targetAmount > 0 ? Math.min(Math.round((campaign.raisedAmount / campaign.targetAmount) * 100), 100) : 0
                return (
                  <div key={campaign._id} className="glass-card flex h-full flex-col p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="tag-chip">{campaign.status}</span>
                      <span className="tag-chip">{campaign.category}</span>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-bold" style={{ color: 'var(--green-8)' }}>{campaign.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color: 'var(--text-muted)' }}>{campaign.description}</p>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>Raised Rs. {(campaign.raisedAmount || 0).toLocaleString('en-IN')}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--green-6), var(--purple-accent))' }} />
                      </div>
                      <p className="mt-2 text-xs" style={{ color: 'var(--text-soft)' }}>Goal: Rs. {(campaign.targetAmount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs" style={{ borderColor: 'rgba(45, 106, 79, 0.08)', color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <Users size={13} />
                        {campaign.volunteers?.length || 0}/{campaign.volunteerTarget}
                      </span>
                      {campaign.status === 'Active' && (
                        <button onClick={() => joinCampaign(campaign._id)} className="btn-primary min-h-0 px-4 py-2 text-xs">
                          Join
                        </button>
                      )}
                    </div>
                    <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--green-6)' }}>{campaign.ngoSummary?.name}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state mt-6">
              <p>No {activeStatus.toLowerCase()} campaigns matched the selected filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ClipboardList, ArrowRight } from 'lucide-react'
import VolunteerDashboard from './VolunteerDashboard'
import NGODashboard from './NGODashboard'
import AdminDashboard from './AdminDashboard'

const API = 'http://localhost:5000/api'

const STATUS_COLORS = {
  Pending:      { color: '#F4A261', bg: 'rgba(244,162,97,0.12)'   },
  'In Progress':{ color: '#4CC9F0', bg: 'rgba(76,201,240,0.12)'  },
  Resolved:     { color: '#40916C', bg: 'rgba(64,145,108,0.12)'  },
  Cancelled:    { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
}

function CitizenDashboard({ user }) {
  const [requests,  setRequests]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const token   = localStorage.getItem('janseva_token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch(`${API}/requests/my?limit=20&sort=createdAt&order=desc`, { headers })
      .then(r => r.json())
      .then(data => { if (data.success) setRequests(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getTimeOfDay = () => {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 18) return 'afternoon'
    return 'evening'
  }

  return (
    <div>
      {/* Hero */}
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Dashboard</span>
              <h1 className="page-title">Good {getTimeOfDay()}, {user.name.split(' ')[0]} 👋</h1>
              <p className="page-subtitle">
                Submit service requests on behalf of your community and track their status right here as our NGOs and volunteers respond.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/submit-request" className="btn-primary">
                  <ClipboardList size={16} /> Submit a Request
                </Link>
                <Link to="/explore" className="btn-outline">
                  Explore NGOs <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="page-hero-panel">
              <div className="glass-card p-6 text-center">
                <ClipboardList size={36} className="mx-auto mb-3" style={{ color: 'var(--green-6)' }} />
                <p className="text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                  {loading ? '—' : requests.length}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Total requests submitted</p>
                <div className="mt-4 space-y-2">
                  {['Pending', 'In Progress', 'Resolved'].map(s => {
                    const count = requests.filter(r => r.status === s).length
                    const sm    = STATUS_COLORS[s]
                    return (
                      <div key={s} className="flex items-center justify-between rounded-xl px-4 py-2" style={{ background: sm.bg }}>
                        <span className="text-xs font-bold" style={{ color: sm.color }}>{s}</span>
                        <span className="text-xs font-extrabold" style={{ color: sm.color }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* My Requests */}
      <section className="section">
        <div className="container">
          <div className="glass-card overflow-hidden">
            <div className="border-b p-5 flex items-center justify-between" style={{ borderColor: 'rgba(45,106,79,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="icon-shell h-9 w-9"><ClipboardList size={17} strokeWidth={1.8} /></div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>My Service Requests</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>The status updates automatically as the admin or NGO responds</p>
                </div>
              </div>
              <Link to="/submit-request" className="btn-primary text-sm py-2">+ New Request</Link>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(82,183,136,0.18)', borderTopColor: 'var(--green-6)' }} />
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList size={40} className="mx-auto mb-4 opacity-25" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No requests submitted yet.</p>
                <Link to="/submit-request" className="btn-primary mt-5 inline-flex">Submit your first request</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => {
                      const s  = STATUS_COLORS[req.status] || STATUS_COLORS.Pending
                      const pc = { High: '#DC2626', Medium: '#F4A261', Low: '#40916C' }[req.priority] || '#5F7F72'
                      return (
                        <tr key={req._id}>
                          <td className="font-semibold" style={{ color: 'var(--green-8)', maxWidth: 240 }}>
                            <span className="line-clamp-1">{req.title}</span>
                          </td>
                          <td>
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(45,106,79,0.08)', color: 'var(--green-8)' }}>
                              {req.category}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs font-bold" style={{ color: pc }}>{req.priority}</span>
                          </td>
                          <td>
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: s.bg, color: s.color }}>
                              {req.status}
                            </span>
                          </td>
                          <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {req.location?.city}{req.location?.state ? `, ${req.location.state}` : ''}
                          </td>
                          <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('janseva_user')
    const token    = localStorage.getItem('janseva_token')
    if (!userData || !token) { navigate('/login'); return }
    setUser(JSON.parse(userData))
    setLoading(false)
  }, [navigate])

  if (loading) return <div className="p-12 text-center text-gray-500">Loading your workspace…</div>

  switch (user?.role) {
    case 'volunteer': return <VolunteerDashboard user={user} />
    case 'ngo':       return <NGODashboard       user={user} />
    case 'admin':     return <AdminDashboard     user={user} />
    default:          return <CitizenDashboard   user={user} />
  }
}

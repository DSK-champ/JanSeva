import { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle, AlertTriangle, Building2, MapPin, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

const API = 'http://localhost:5000/api'

export default function VolunteerDashboard({ user }) {
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [myEvents, setMyEvents] = useState([])
  const [myNGOs, setMyNGOs] = useState([])
  const [allNGOs, setAllNGOs] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddNGO, setShowAddNGO] = useState(false)
  const [searchNGO, setSearchNGO] = useState('')

  const token = localStorage.getItem('janseva_token')
  const headers = { Authorization: `Bearer ${token}` }

  const loadData = async () => {
    try {
      const [profileRes, eventsRes, myEventsRes, ngosRes, allNgosRes, requestsRes] = await Promise.all([
        fetch(`${API}/volunteer/profile`, { headers }).then(res => res.json()),
        fetch(`${API}/campaigns`, { headers }).then(res => res.json()),
        fetch(`${API}/campaigns/my`, { headers }).then(res => res.json()),
        fetch(`${API}/volunteer-ngo/my-ngos`, { headers }).then(res => res.json()),
        fetch(`${API}/ngos`, { headers }).then(res => res.json()),
        fetch(`${API}/requests/my?limit=20&sort=createdAt&order=desc`, { headers }).then(res => res.json()),
      ])

      if (profileRes.success) setProfile(profileRes.data)
      if (eventsRes.success) setEvents(eventsRes.data)
      if (myEventsRes.success) setMyEvents(myEventsRes.data.map(e => e._id))
      if (ngosRes.success) setMyNGOs(ngosRes.data)
      if (allNgosRes.success) setAllNGOs(allNgosRes.data)
      if (requestsRes.success) setMyRequests(requestsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const registerEvent = async (id) => {
    try {
      const res = await fetch(`${API}/campaigns/${id}/join`, { method: 'POST', headers })
      if (res.ok) {
        setMyEvents(prev => [...prev, id])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const unregisterEvent = async (id) => {
    try {
      const res = await fetch(`${API}/campaigns/${id}/leave`, { method: 'POST', headers })
      const data = await res.json()
      if (res.ok) {
        setMyEvents(prev => prev.filter(eId => eId !== id))
      } else {
        alert(data.message)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const requestJoinNGO = async (ngoId) => {
    try {
      const res = await fetch(`${API}/volunteer-ngo/request`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngoId })
      })
      if (res.ok) {
        loadData()
        setShowAddNGO(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  const canUnregister = (startDate) => {
    const timeUntilStart = new Date(startDate).getTime() - Date.now()
    return timeUntilStart > 24 * 60 * 60 * 1000
  }

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>

  const approvedNgoIds = myNGOs
    .filter(req => req.status === 'approved')
    .map(req => typeof req.ngoId === 'object' ? req.ngoId._id : req.ngoId)

  const filteredEvents = events.filter(event => {
    const timeUntilStart = new Date(event.startDate).getTime() - Date.now()
    const isFuture24h = timeUntilStart >= 24 * 60 * 60 * 1000
    const isApprovedNgo = approvedNgoIds.includes(event.ngoId)
    return isFuture24h && isApprovedNgo
  })

  const filteredAllNGOs = allNGOs.filter(ngo => 
    ngo.name.toLowerCase().includes(searchNGO.toLowerCase())
  )

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Good {getTimeOfDay()}, {user.name.split(' ')[0]}</h1>
              <p className="page-subtitle">Track your volunteering impact and upcoming events.</p>
            </div>
            <Link to="/volunteer-profile" className="btn-outline">My Profile</Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">Volunteering Hours</p>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--green-8)' }}>{profile?.volunteeringHours || 0}</p>
              </div>
              <div className="icon-shell"><Clock size={24} /></div>
            </div>
            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">Surveys Conducted</p>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--blue-accent)' }}>{profile?.surveysConducted || 0}</p>
              </div>
              <div className="icon-shell blue"><CheckCircle size={24} /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container dashboard-grid">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Upcoming Events</h2>
            </div>
            
            <div className="space-y-4">
              {filteredEvents.length === 0 ? (
                <p className="text-gray-500">No upcoming events available for your approved NGOs at this time.</p>
              ) : (
                filteredEvents.map(event => {
                const isRegistered = myEvents.includes(event._id)
                const _canUnregister = canUnregister(event.startDate)

                return (
                  <div key={event._id} className={`glass-card p-5 ${event.isEmergency ? 'border-red-400 bg-red-50' : ''}`}>
                    {event.isEmergency && (
                      <div className="mb-2 flex items-center gap-2 text-red-600 font-bold text-sm">
                        <AlertTriangle size={16} /> EMERGENCY DISASTER
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{event.description}</p>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex gap-4 text-sm font-semibold text-gray-500">
                        <span className="flex items-center gap-1"><Calendar size={16}/> {new Date(event.startDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><MapPin size={16}/> {event.city}</span>
                      </div>
                      
                      {isRegistered ? (
                        <button 
                          onClick={() => unregisterEvent(event._id)}
                          disabled={!_canUnregister}
                          className={`btn-outline ${!_canUnregister ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={!_canUnregister ? "Cannot unregister within 24 hours" : ""}
                        >
                          Unregister
                        </button>
                      ) : (
                        <button onClick={() => registerEvent(event._id)} className="btn-primary">
                          Register
                        </button>
                      )}
                    </div>
                  </div>
                )
              }))}
            </div>
          </div>

          <div>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">NGOs You Volunteer For</h2>
                <button onClick={() => setShowAddNGO(!showAddNGO)} className="text-sm font-bold text-blue-600">
                  {showAddNGO ? 'Cancel' : '+ ADD NGO'}
                </button>
              </div>

              {showAddNGO && (
                <div className="mb-6 p-4 rounded-xl bg-gray-50 border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">Select an NGO to join:</h3>
                    <input 
                      type="text" 
                      placeholder="Search NGOs..." 
                      className="text-xs p-2 rounded border border-gray-300 w-48 focus:outline-none focus:border-green-500"
                      value={searchNGO}
                      onChange={(e) => setSearchNGO(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredAllNGOs.length === 0 ? (
                      <p className="text-xs text-gray-500">No NGOs match your search.</p>
                    ) : (
                      filteredAllNGOs.map(ngo => (
                        <div key={ngo._id} className="flex items-center justify-between p-2 hover:bg-white rounded border">
                          <span className="text-sm font-semibold">{ngo.name}</span>
                          <button onClick={() => requestJoinNGO(ngo._id)} className="btn-primary py-1 min-h-0 text-xs">Join</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {myNGOs.length === 0 ? (
                  <p className="text-sm text-gray-500">You haven't joined any NGOs yet.</p>
                ) : (
                  myNGOs.map(rel => (
                    <div key={rel._id} className="flex items-center p-3 rounded-lg border bg-white">
                      <div className="icon-shell w-10 h-10 mr-3"><Building2 size={18}/></div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{rel.ngoId.name}</p>
                        <p className="text-xs text-gray-500">{rel.ngoId.city}</p>
                      </div>
                      <div>
                        {rel.status === 'pending' ? (
                          <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Waiting for approval</span>
                        ) : rel.status === 'approved' ? (
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Approved</span>
                        ) : (
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">Rejected</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── My Service Requests ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="glass-card overflow-hidden">
            <div className="border-b p-5 flex items-center justify-between" style={{ borderColor: 'rgba(45,106,79,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="icon-shell h-9 w-9"><ClipboardList size={17} strokeWidth={1.8} /></div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>My Service Requests</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Track the status of every request you have submitted</p>
                </div>
              </div>
              <Link to="/submit-request" className="btn-primary text-sm py-2">
                + New Request
              </Link>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList size={36} className="mx-auto mb-4 opacity-25" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You haven't submitted any service requests yet.</p>
                <Link to="/submit-request" className="btn-primary mt-4 inline-flex">Submit a Request</Link>
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
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map(req => {
                      const statusColors = {
                        Pending:      { color: '#F4A261', bg: 'rgba(244,162,97,0.12)'   },
                        'In Progress':{ color: '#4CC9F0', bg: 'rgba(76,201,240,0.12)'  },
                        Resolved:     { color: '#40916C', bg: 'rgba(64,145,108,0.12)'  },
                        Cancelled:    { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
                      }
                      const s = statusColors[req.status] || statusColors.Pending
                      const priorityColor = { High: '#DC2626', Medium: '#F4A261', Low: '#40916C' }[req.priority] || '#5F7F72'
                      return (
                        <tr key={req._id}>
                          <td className="font-semibold" style={{ color: 'var(--green-8)', maxWidth: 220 }}>
                            <span className="line-clamp-1">{req.title}</span>
                          </td>
                          <td>
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(45,106,79,0.08)', color: 'var(--green-8)' }}>
                              {req.category}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs font-bold" style={{ color: priorityColor }}>{req.priority}</span>
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

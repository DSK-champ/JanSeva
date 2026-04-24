import { useState, useEffect } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { Building2, Users, CheckCircle, XCircle, AlertTriangle, Plus, FileSpreadsheet, Map, Download, ChevronDown, Brain, Search, ClipboardList } from 'lucide-react'

const API = 'http://localhost:5000/api'

export default function NGODashboard({ user }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [approvedVolunteers, setApprovedVolunteers] = useState([])
  const [assignHoursInput, setAssignHoursInput] = useState({})
  const [campaigns, setCampaigns] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchVolunteer, setSearchVolunteer] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', startDate: '', endDate: '', targetAmount: 0, isEmergency: false })
  const [domainTargets, setDomainTargets] = useState({
    medical: { selected: true, villages: 2, volunteers: 10 },
    food: { selected: false, villages: 2, volunteers: 10 },
    education: { selected: false, villages: 2, volunteers: 10 },
    shelter: { selected: false, villages: 2, volunteers: 10 }
  })
  const [surveyFile, setSurveyFile] = useState(null)
  const [creating, setCreating] = useState(false)

  const token = localStorage.getItem('janseva_token')
  const headers = { Authorization: `Bearer ${token}` }

  const loadData = async () => {
    try {
      const [ngoRes, pendingRes, approvedRes, campRes, requestsRes] = await Promise.all([
        fetch(`${API}/ngos/profile`, { headers }).then(res => res.json()),
        fetch(`${API}/volunteer-ngo/pending`, { headers }).then(res => res.json()),
        fetch(`${API}/volunteer-ngo/approved`, { headers }).then(res => res.json()),
        fetch(`${API}/campaigns/ngo/my`, { headers }).then(res => res.json()),
        fetch(`${API}/requests/my?limit=20&sort=createdAt&order=desc`, { headers }).then(res => res.json()),
      ])
      
      if (ngoRes.success) setProfile(ngoRes.data)
      if (pendingRes.success) setPendingRequests(pendingRes.data)
      if (approvedRes.success) setApprovedVolunteers(approvedRes.data)
      if (campRes.success) setCampaigns(campRes.data)
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

  const handleRequest = async (id, action) => {
    try {
      const res = await fetch(`${API}/volunteer-ngo/${id}/${action}`, { method: 'PATCH', headers })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(req => req._id !== id))
        loadData() // Refresh to fetch approved list immediately
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveVolunteer = async (id) => {
    if (!window.confirm('Are you sure you want to remove this volunteer from your NGO?')) return;
    try {
      const res = await fetch(`${API}/volunteer-ngo/${id}`, { method: 'DELETE', headers })
      if (res.ok) {
        loadData()
      } else {
        const data = await res.json()
        alert(data.message || 'Failed to remove volunteer')
      }
    } catch (err) {
      console.error(err)
      alert('Error removing volunteer')
    }
  }

  const handleAssignHours = async (volunteerUserId) => {
    const hours = parseInt(assignHoursInput[volunteerUserId]);
    if (!hours || hours <= 0) return alert('Please enter valid hours');

    try {
      const res = await fetch(`${API}/volunteer-ngo/${volunteerUserId}/assign-hours`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setAssignHoursInput(prev => ({ ...prev, [volunteerUserId]: '' }));
        loadData(); // Reload to update displayed hours
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to assign hours');
    }
  }

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    setCreating(true)

    const form = new FormData()
    form.append('title', formData.title)
    form.append('description', formData.description)
    form.append('category', 'Multi-Domain Aid') // generic category
    form.append('startDate', formData.startDate)
    form.append('endDate', formData.endDate)
    form.append('targetAmount', formData.targetAmount)
    form.append('isEmergency', formData.isEmergency)
    
    const activeTargets = {};
    Object.keys(domainTargets).forEach(k => {
      if (domainTargets[k].selected) {
        activeTargets[k] = { villages: domainTargets[k].villages, volunteers: domainTargets[k].volunteers };
      }
    });
    form.append('domainTargets', JSON.stringify(activeTargets));

    if (surveyFile) {
      form.append('survey', surveyFile)
    }

    try {
      const res = await fetch(`${API}/campaigns/with-survey`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // Do not set Content-Type, fetch does it for FormData
        body: form
      })
      const data = await res.json()
      if (res.ok) {
        setShowModal(false)
        setSurveyFile(null)
        setFormData({ title: '', description: '', startDate: '', endDate: '', targetAmount: 0, isEmergency: false })
        alert(`Campaign created! Processed ${data.data.villagesProcessed || 0} villages and created ${data.data.assignmentsCreated || 0} volunteer assignments.`)
        loadData()
      } else {
        alert(data.message)
      }
    } catch (err) {
      console.error(err)
      alert('Error creating campaign')
    } finally {
      setCreating(false)
    }
  }
 
  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This will permanently remove all village scores and volunteer assignments associated with it.')) return;
    try {
      const res = await fetch(`${API}/campaigns/${id}`, { method: 'DELETE', headers })
      if (res.ok) {
        alert('Campaign deleted successfully')
        loadData()
      } else {
        const data = await res.json()
        alert(data.message || 'Failed to delete campaign')
      }
    } catch (err) {
      console.error(err)
      alert('Error deleting campaign')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>

  // 1. Block: NGO must complete profile first before doing anything
  if (profile && !profile.isProfileComplete) {
    return <Navigate to="/ngo-profile" replace />
  }

  // 2. Block: NGO is pending admin approval
  if (profile?.approvalStatus === 'pending') {
    return (
      <section className="section text-center">
        <div className="container max-w-lg">
          <div className="glass-card p-12">
            <div className="icon-shell mx-auto w-16 h-16 mb-6 bg-yellow-100 text-yellow-600">
              <Building2 size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Pending</h2>
            <p className="text-gray-600 mb-6">
              Your NGO account is currently waiting for admin approval. You will gain access to the dashboard once verified.
            </p>
            <Link to="/" className="btn-outline">Return Home</Link>
          </div>
        </div>
      </section>
    )
  }

  const filteredVolunteers = approvedVolunteers.filter(vol => 
    vol.volunteerId?.name?.toLowerCase().includes(searchVolunteer.toLowerCase()) ||
    vol.volunteerId?.email?.toLowerCase().includes(searchVolunteer.toLowerCase())
  )

  // 3. Normal Dashboard View (Approved & Profile Complete)
  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <span className="section-label mb-4">NGO Dashboard</span>
              <h1 className="page-title">{profile?.name || 'NGO Dashboard'}</h1>
              <div className="flex gap-4 text-sm font-semibold text-gray-500 mt-2">
                <span>📍 {profile?.city}, {profile?.state}</span>
                <span>✉️ {user.email}</span>
                {profile?.focusAreas?.length > 0 && <span>🎯 {profile.focusAreas.join(', ')}</span>}
              </div>
            </div>
            <Link to="/ngo-profile" className="btn-outline">Manage Profile</Link>
          </div>
        </div>
      </section>

      <section className="section pb-8">
        <div className="container">
          <div className="glass-card p-6 border-purple-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Users className="text-purple-600" /> Pending Volunteer Requests
            </h2>
            
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  No pending volunteer requests at the moment.
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div key={req._id} className="flex items-center justify-between p-4 border rounded-xl hover:shadow-sm transition">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                        {req.volunteerId.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{req.volunteerId.name}</p>
                        <p className="text-sm text-gray-500">{req.volunteerId.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(req._id, 'approve')} className="btn-primary py-2 min-h-0 text-sm flex items-center gap-1">
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button onClick={() => handleRequest(req._id, 'reject')} className="btn-danger py-2 min-h-0 text-sm flex items-center gap-1">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between mt-10 mb-6 gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="text-green-600" /> Approved Volunteers
              </h2>
              <div className="relative w-full md:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search volunteers..." 
                  className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  value={searchVolunteer}
                  onChange={e => setSearchVolunteer(e.target.value)}
                />
              </div>
            </div>
            
            <div className={`space-y-4 ${filteredVolunteers.length > 10 ? 'max-h-[600px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
              {approvedVolunteers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  No approved volunteers yet.
                </div>
              ) : filteredVolunteers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  No volunteers match your search.
                </div>
              ) : (
                filteredVolunteers.map(vol => (
                  <div key={vol._id} className="flex items-center justify-between p-4 border rounded-xl hover:shadow-sm transition">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                        {vol.volunteerId.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{vol.volunteerId.name}</p>
                        <p className="text-sm text-gray-500">{vol.volunteerId.email}</p>
                        <p className="text-xs font-bold text-green-600 mt-1">Total Hours: {vol.volunteeringHours}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number" 
                        placeholder="Hrs" 
                        min="1"
                        className="w-16 p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                        value={assignHoursInput[vol.volunteerId._id] || ''}
                        onChange={e => setAssignHoursInput({...assignHoursInput, [vol.volunteerId._id]: e.target.value})}
                      />
                      <button onClick={() => handleAssignHours(vol.volunteerId._id)} className="btn-primary py-2 min-h-0 text-sm">
                        Assign
                      </button>
                      <button onClick={() => handleRemoveVolunteer(vol._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Remove Volunteer">
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Map className="text-green-600" /> Active Campaigns & Aid Missions
              </h2>
              <div className="flex items-center gap-2">

                <div className="relative">
                  <button onClick={() => setShowTemplatesMenu(s => !s)} className="btn-outline flex items-center gap-2 text-sm">
                    <Download size={16} /> Templates <ChevronDown size={14} />
                  </button>
                  {showTemplatesMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border shadow-lg rounded-xl z-20 min-w-44 overflow-hidden">
                      {['food','health','education','shelter','emergency'].map(type => (
                        <a key={type} href={`http://localhost:5000/api/surveys/templates/${type}`} download className="block px-4 py-2 text-sm capitalize hover:bg-gray-50 font-medium">
                          📄 {type} survey
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                  <Plus size={16} /> Create New Campaign
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="font-bold text-gray-700">No campaigns created yet.</p>
                  <p className="text-sm mt-1">Upload a survey CSV to map village aid requirements automatically.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {campaigns.map(camp => (
                    <Link to={`/ngo-campaign/${camp._id}`} key={camp._id} className="p-5 border rounded-xl hover:shadow-md transition bg-white relative overflow-hidden block">
                      {camp.isEmergency && <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">EMERGENCY</div>}
                      <h3 className="font-bold text-lg mb-1 hover:text-blue-600 transition">{camp.title}</h3>
                      <p className="text-sm text-gray-500 mb-4">{camp.category} • Ends {new Date(camp.endDate).toLocaleDateString()}</p>
                      
                      <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border text-sm">
                        <div className="text-center">
                          <p className="font-bold text-blue-600">{camp.villagesAided || 0}</p>
                          <p className="text-xs text-gray-500">Villages Aided</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">{camp.registeredVolunteers || 0}</p>
                          <p className="text-xs text-gray-500">Registered</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <p className="font-bold text-purple-600">₹{camp.raisedAmount || 0}</p>
                          <p className="text-xs text-gray-500">Funds Raised</p>
                        </div>
                      </div>
 
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCampaign(camp._id); }} 
                        className="absolute bottom-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete Campaign"
                      >
                        <XCircle size={18} />
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CREATE CAMPAIGN MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur z-10">
              <h2 className="text-xl font-bold">Create Aid Campaign</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2">Campaign Title</label>
                <input type="text" required className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea required rows="3" className="input-field" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-2">Target Domains & Village Allocations</label>
                  <div className="space-y-3">
                    {Object.keys(domainTargets).map(domain => (
                      <div key={domain} className="p-3 border rounded-lg bg-gray-50 flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-2 font-bold w-32 capitalize cursor-pointer">
                          <input type="checkbox" checked={domainTargets[domain].selected} onChange={e => setDomainTargets({...domainTargets, [domain]: {...domainTargets[domain], selected: e.target.checked}})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                          {domain}
                        </label>
                        {domainTargets[domain].selected && (
                          <>
                            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 border rounded shadow-sm">
                              <span className="text-gray-600">Villages:</span>
                              <input type="number" min="1" className="w-16 p-1 border-b focus:outline-none focus:border-blue-500 font-bold" value={domainTargets[domain].villages} onChange={e => setDomainTargets({...domainTargets, [domain]: {...domainTargets[domain], villages: e.target.value}})} />
                            </div>
                            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 border rounded shadow-sm">
                              <span className="text-gray-600">Volunteers:</span>
                              <input type="number" min="1" className="w-16 p-1 border-b focus:outline-none focus:border-blue-500 font-bold" value={domainTargets[domain].volunteers} onChange={e => setDomainTargets({...domainTargets, [domain]: {...domainTargets[domain], volunteers: e.target.value}})} />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Funding Target (₹)</label>
                  <input type="number" className="input-field" value={formData.targetAmount} onChange={e => setFormData({...formData, targetAmount: e.target.value})} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold mb-2">Start Date</label>
                  <input type="date" required className="input-field" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">End Date</label>
                  <input type="date" required className="input-field" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>

              <div className="p-4 border border-blue-200 bg-blue-50 rounded-xl">
                <label className="flex items-center gap-2 font-bold text-blue-900 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded" checked={formData.isEmergency} onChange={e => setFormData({...formData, isEmergency: e.target.checked})} />
                  Mark as Emergency Disaster Response
                </label>
              </div>

              <div className="p-5 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
                <FileSpreadsheet className="mx-auto text-gray-400 mb-3 h-10 w-10" />
                <h3 className="font-bold mb-2">Village Survey Data (Optional)</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload a CSV file containing survey data. Our algorithm will prioritize villages based on the domain score and automatically assign volunteers in diverse teams.
                </p>
                <input type="file" accept=".csv" onChange={e => setSurveyFile(e.target.files[0])} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary min-w-[120px]">
                  {creating ? 'Processing...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── My Submitted Service Requests ── */}
      <section className="section pt-0">
        <div className="container">
          <div className="glass-card overflow-hidden">
            <div className="border-b p-5 flex items-center justify-between" style={{ borderColor: 'rgba(45,106,79,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="icon-shell h-9 w-9"><ClipboardList size={17} strokeWidth={1.8} /></div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>Service Requests Submitted</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Track the status of requests your NGO has submitted — updated by admin in real time</p>
                </div>
              </div>
              <Link to="/submit-request" className="btn-primary text-sm py-2">+ Submit Request</Link>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList size={36} className="mx-auto mb-4 opacity-25" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No service requests submitted yet.</p>
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
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map(req => {
                      const statusColors = {
                        Pending:       { color: '#F4A261', bg: 'rgba(244,162,97,0.12)'   },
                        'In Progress': { color: '#4CC9F0', bg: 'rgba(76,201,240,0.12)'  },
                        Resolved:      { color: '#40916C', bg: 'rgba(64,145,108,0.12)'  },
                        Cancelled:     { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
                      }
                      const s  = statusColors[req.status] || statusColors.Pending
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
                          <td><span className="text-xs font-bold" style={{ color: pc }}>{req.priority}</span></td>
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

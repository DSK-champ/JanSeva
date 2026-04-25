import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export default function VolunteerDashboard({ token, user }) {
  const [data, setData] = useState(null)
  const [showNgoModal, setShowNgoModal] = useState(false)
  const [availableNgos, setAvailableNgos] = useState([])
  const [loadingNgos, setLoadingNgos] = useState(false)
  
  useEffect(() => {
    fetch(`${API}/dashboard/volunteer`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => { if (res.success) setData(res.data) })
  }, [token])

  const toggleCampaign = async (id) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || `${API}`}/dashboard/campaign-toggle/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    const body = await res.json()
    if (res.ok) {
      window.location.reload()
    } else {
      alert(body.message || 'Error occurred')
    }
  }

  const openAddNgoModal = async () => {
    setShowNgoModal(true)
    setLoadingNgos(true)
    try {
      const res = await fetch(`${API}/ngos`)
      const body = await res.json()
      if (body.success) {
        setAvailableNgos(body.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingNgos(false)
    }
  }

  const requestJoinNgo = async (ngoId) => {
    const res = await fetch(`${API}/dashboard/request-ngo`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ ngoId })
    })
    const body = await res.json()
    if (res.ok) {
      setShowNgoModal(false)
      window.location.reload()
    } else {
      alert(body.message || 'Error sending request')
    }
  }

  if (!data) return <p className="p-8 text-center">Loading Volunteer Dashboard...</p>

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="container py-8 relative">
      
      {/* ADD NGO MODAL */}
      {showNgoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-20 shadow-2xl backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg" style={{ color: 'var(--green-8)' }}>NGOs You Volunteer For</h3>
              <button onClick={() => setShowNgoModal(false)} className="text-blue-600 text-sm font-semibold hover:text-blue-800">
                Cancel
              </button>
            </div>
            
            <div className="border rounded-2xl p-4" style={{ borderColor: 'var(--green-4)', background: 'var(--green-1)' }}>
              <p className="font-bold text-sm mb-4" style={{ color: 'var(--green-8)' }}>Select an NGO to join:</p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {loadingNgos ? (
                  <p className="text-sm text-center text-gray-500 py-4">Loading NGOs...</p>
                ) : availableNgos.length === 0 ? (
                  <p className="text-sm text-center text-gray-500 py-4">No NGOs available.</p>
                ) : (
                  availableNgos.map(ngo => (
                    <div key={ngo._id} className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                      <span className="font-semibold text-sm max-w-[150px] truncate" title={ngo.name}>{ngo.name}</span>
                      <button 
                        onClick={() => requestJoinNgo(ngo._id)} 
                        className="text-white text-sm font-bold px-4 py-1.5 rounded-xl transition hover:opacity-90"
                        style={{ backgroundColor: '#5f8e6c' }}
                      >
                        Join
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-extrabold mb-2 tracking-tight" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
        {getGreeting()}, {user.name}
      </h1>
      <p className="text-gray-500 mb-8 max-w-xl">Track your volunteering impact and upcoming events.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border rounded-[1.25rem] p-6 shadow-sm flex items-center justify-between" style={{ borderColor: 'rgba(82,183,136,0.15)' }}>
          <div>
            <p className="text-xs font-bold text-gray-800 mb-2">Volunteering Hours</p>
            <p className="text-4xl font-medium tracking-tight text-gray-800">{data.metrics.hours}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-green-50 text-green-700">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </div>
        <div className="bg-white border rounded-[1.25rem] p-6 shadow-sm flex items-center justify-between" style={{ borderColor: 'rgba(82,183,136,0.15)' }}>
          <div>
            <p className="text-xs font-bold text-gray-800 mb-2">Surveys Conducted</p>
            <p className="text-4xl font-medium tracking-tight text-blue-600">{data.metrics.surveys}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: EVENTS */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--green-9)' }}>Upcoming Events</h2>
          {data.events.length === 0 ? (
            <p className="text-sm text-gray-500">No events currently.</p>
          ) : (
            data.events.map(event => {
              const isRedAlert = event.isEmergency
              return (
                <div key={event._id} className={`p-6 rounded-[1.25rem] border ${isRedAlert ? 'border-red-400 bg-red-50 shadow-sm' : 'border-gray-100 bg-white shadow-sm'}`}>
                  {isRedAlert && <span className="inline-block bg-red-600 text-white text-[10px] uppercase font-extrabold px-2 py-1 rounded mb-3 tracking-wider">Emergency Alert</span>}
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-gray-900 mb-2">{event.title}</p>
                      <p className="text-[13px] text-gray-600 mb-4 leading-relaxed max-w-prose line-clamp-2">{event.description || 'A coordinated effort by JanSeva to provide assistance to underserved communities.'}</p>
                      
                      <div className="flex items-center gap-4 text-[13px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          {new Date(event.startDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          {event.location || 'Local Community'}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => toggleCampaign(event._id)}
                      className={`md:w-auto w-full py-2.5 px-6 rounded-xl text-sm font-bold transition whitespace-nowrap ${event.isRegistered ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-[#5f8e6c] text-white hover:bg-[#4f785a]'}`}
                    >
                      {event.isRegistered ? 'Unregister' : 'Register'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* RIGHT COLUMN: NGOs */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[1.25rem] border shadow-sm" style={{ borderColor: 'rgba(82,183,136,0.15)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--green-9)' }}>NGOs You Volunteer For</h2>
              <button onClick={openAddNgoModal} className="text-blue-600 text-[13px] font-semibold hover:text-blue-800">
                + ADD NGO
              </button>
            </div>

            {data.affiliations.length === 0 ? (
              <p className="text-sm text-gray-500">You haven't joined any NGOs yet. Click Add NGO above.</p>
            ) : (
              <div className="space-y-3">
                {data.affiliations.map(aff => (
                  <div key={aff._id} className="flex flex-col p-3.5 border rounded-2xl bg-white shadow-sm" style={{ borderColor: 'rgba(82,183,136,0.5)' }}>
                    <div className="flex items-start justify-between w-full">
                      <div className="flex gap-3">
                         <div className="h-10 w-10 flex-shrink-0 bg-green-50 rounded-xl flex items-center justify-center text-green-700">
                           <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="15" y2="22"></line><line x1="12" y1="6" x2="12" y2="6.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line></svg>
                         </div>
                         <div>
                           <p className="font-extrabold text-sm text-gray-900 leading-tight">{aff.ngoId?.name}</p>
                           <p className="text-xs text-gray-500 mt-1">{aff.ngoId?.city || 'Local Area'}</p>
                         </div>
                      </div>
                      
                      <div className={`mt-1 px-2.5 py-1 text-[10px] font-bold rounded shadow-sm whitespace-nowrap ${aff.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {aff.status === 'Pending' ? 'Waiting for approval' : aff.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

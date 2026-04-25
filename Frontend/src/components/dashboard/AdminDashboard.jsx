import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export default function AdminDashboard({ token }) {
  const [data, setData] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  
  useEffect(() => {
    fetch(`${API}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => { 
        if (res.success) {
          setData(res.data)
          if (res.data.unverifiedNGOs?.length > 0) {
            setShowPopup(true)
          }
        } 
      })
  }, [token])

  const verifyNgo = async (id) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || `${API}`}/dashboard/verify-ngo/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      window.location.reload()
    }
  }

  if (!data) return <p className="p-8 text-center">Loading Admin Dashboard...</p>

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="container py-8 relative">
      {/* ACTION POPUP FOR ADMIN */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--red-accent)' }}>Action Required</h2>
            <p className="text-gray-600 mb-6">
              There {data.unverifiedNGOs.length === 1 ? 'is' : 'are'} currently <b>{data.unverifiedNGOs.length}</b> new NGO{data.unverifiedNGOs.length === 1 ? '' : 's'} waiting for administrative approval to join JanSeva.
            </p>
            <button 
              onClick={() => setShowPopup(false)} 
              className="btn-primary w-full py-3"
            >
              Review Pending Organizations
            </button>
          </div>
        </div>
      )}

      <h1 className="page-title mb-8">{getGreeting()}, Admin</h1>

      <div className="glass-card mb-8 p-6 relative z-10">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--red-accent)' }}>Pending NGO Approvals</h2>
        {data.unverifiedNGOs.length === 0 ? (
          <p className="text-sm text-gray-500">No NGOs awaiting approval.</p>
        ) : (
          <div className="space-y-4">
            {data.unverifiedNGOs.map(ngo => (
              <div key={ngo._id} className="flex justify-between items-center p-4 border rounded-xl" style={{ borderColor: 'rgba(82,183,136,0.2)' }}>
                <div>
                  <p className="font-bold">{ngo.name}</p>
                  <p className="text-sm text-gray-500">{ngo.city}, {ngo.state}</p>
                </div>
                <button onClick={() => verifyNgo(ngo._id)} className="btn-primary py-1 px-3 text-sm">Approve</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--green-8)' }}>Verified NGOs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.verifiedNGOs.map(ngo => (
            <div key={ngo._id} className="p-4 rounded-xl" style={{ background: 'rgba(216,243,220,0.3)' }}>
              <p className="font-bold">{ngo.name}</p>
              <p className="text-sm text-gray-600">{ngo.city}, {ngo.state}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export default function Profile() {
  const navigate = useNavigate()
  const token = localStorage.getItem('janseva_token')
  const user = JSON.parse(localStorage.getItem('janseva_user') || 'null')

  const [formData, setFormData] = useState({ name: '', email: '', bio: '' })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!token || !user) {
      navigate('/login')
      return
    }
    setFormData({ name: user.name || '', email: user.email || '', bio: user.bio || '' })
  }, [navigate, token, user])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`${API}/dashboard/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    })
    const body = await res.json()
    setLoading(false)
    if (res.ok) {
      localStorage.setItem('janseva_user', JSON.stringify(body.data))
      alert('Profile updated successfully!')
      window.location.reload()
    } else {
      alert(body.message || 'Error occurred')
    }
  }

  const handleDeleteNgo = async () => {
    if (!window.confirm('Are you absolutely sure? This will delete your organization and unregister all volunteers permanently.')) return;
    
    setDeleting(true)
    const res = await fetch(`${API}/dashboard/profile/ngo`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    setDeleting(false)
    if (res.ok) {
      localStorage.removeItem('janseva_token')
      localStorage.removeItem('janseva_user')
      navigate('/')
    } else {
      const body = await res.json()
      alert(body.message || 'Error deleting account')
    }
  }

  if (!user) return null

  return (
    <div className="container py-12 max-w-2xl">
      <h1 className="page-title mb-8">Profile Settings</h1>
      
      <div className="glass-card p-6 mb-8">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--green-8)' }}>Full Name</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border bg-white"
              style={{ borderColor: 'rgba(82,183,136,0.3)' }}
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--green-8)' }}>Email Address</label>
            <input 
              type="email" 
              className="w-full p-3 rounded-xl border bg-white"
              style={{ borderColor: 'rgba(82,183,136,0.3)' }}
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              required 
              pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
              title="Please enter a valid email address"
            />
          </div>
          
          {user.role === 'volunteer' && (
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--green-8)' }}>Bio / Description</label>
              <textarea 
                className="w-full p-3 rounded-xl border bg-white"
                style={{ borderColor: 'rgba(82,183,136,0.3)' }}
                rows="4"
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})} 
              ></textarea>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-4">
            {loading ? 'Updating...' : 'Update Settings'}
          </button>
        </form>
      </div>

      {user.role === 'ngo' && (
        <div className="glass-card p-6 border-red-500 border-2">
          <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Deleting your NGO account will instantly and irreparably remove your organization, active campaigns, and un-assign any volunteers from your roster.
          </p>
          <button onClick={handleDeleteNgo} disabled={deleting} className="btn-outline border-red-500 text-red-600 hover:bg-red-50 w-full py-3">
            {deleting ? 'Deleting...' : 'Delete NGO Account Permanently'}
          </button>
        </div>
      )}
    </div>
  )
}

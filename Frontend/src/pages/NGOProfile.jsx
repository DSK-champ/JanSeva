import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, MapPin, Phone, Mail, Trash2, AlertTriangle, Save, ArrowLeft, BadgeCheck, Clock, Edit2, X } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export default function NGOProfile() {
  const navigate = useNavigate()
  const [user] = useState(JSON.parse(localStorage.getItem('janseva_user') || '{}'))
  const [profile, setProfile] = useState(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    organizationDetails: '',
    city: '',
    state: '',
    'contactInfo.phone': '',
    'contactInfo.email': user.email || '',
    focusAreas: []
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const token = localStorage.getItem('janseva_token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API}/ngos/profile`, { headers })
        const data = await res.json()
        if (data.success) {
          const myNGO = data.data
          setProfile(myNGO)
          setFormData({
            name: myNGO.name || '',
            organizationDetails: myNGO.organizationDetails === 'Pending details' ? '' : myNGO.organizationDetails,
            city: myNGO.city || '',
            state: myNGO.state || '',
            'contactInfo.phone': myNGO.contactInfo?.phone || '',
            'contactInfo.email': user.email,
            focusAreas: myNGO.focusAreas || []
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [navigate, token, user._id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    
    const submitData = {
      name: formData.name,
      organizationDetails: formData.organizationDetails,
      city: formData.city,
      state: formData.state,
      contactInfo: {
        phone: formData['contactInfo.phone']
      },
      focusAreas: formData.focusAreas
    }

    try {
      const res = await fetch(`${API}/ngos/profile`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      
      const data = await res.json()
      if (res.ok) {
        setMessage('Profile updated successfully! You can now access your dashboard.')
        setProfile(data.data) // Updates local profile which has isProfileComplete = true
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      } else {
        setMessage(data.message || 'Failed to update profile.')
      }
    } catch (err) {
      setMessage('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleBackToDashboard = () => {
    if (profile && profile.approvalStatus !== 'approved') {
      alert("Your NGO is not verified yet. Please contact admin.");
    } else {
      navigate('/dashboard');
    }
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        const data = await res.json()
        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.county || ''
          const state = data.address.state || ''
          setFormData(prev => ({ ...prev, city, state }))
        } else {
          alert("Could not determine city and state from coordinates.")
        }
      } catch (err) {
        alert("Failed to fetch location details.")
      } finally {
        setDetectingLocation(false)
      }
    }, (error) => {
      alert("Unable to retrieve your location. " + error.message)
      setDetectingLocation(false)
    })
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/ngos/profile`, { method: 'DELETE', headers })
      if (res.ok) {
        localStorage.removeItem('janseva_token')
        localStorage.removeItem('janseva_user')
        navigate('/')
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFocusAreaChange = (e) => {
    const value = e.target.value
    if (e.target.checked) {
      setFormData(prev => ({ ...prev, focusAreas: [...prev.focusAreas, value] }))
    } else {
      setFormData(prev => ({ ...prev, focusAreas: prev.focusAreas.filter(f => f !== value) }))
    }
  }

  if (loading) return <div className="p-8 text-center">Loading profile...</div>

  const isFirstTimeOnboarding = profile && !profile.isProfileComplete
  const formEnabled = isFirstTimeOnboarding || isEditing

  return (
    <section className="section">
      <div className="container max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="section-label mb-4">Settings</span>
            <div className="flex items-center gap-4 mt-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {isFirstTimeOnboarding ? 'Complete Your NGO Profile' : 'NGO Profile'}
              </h1>
              {!isFirstTimeOnboarding && profile && (
                profile.approvalStatus === 'approved' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full border border-green-200">
                    <BadgeCheck size={16} /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-bold rounded-full border border-yellow-200">
                    <Clock size={16} /> Pending Verification
                  </span>
                )
              )}
            </div>
            {isFirstTimeOnboarding && (
              <p className="text-gray-600 mt-2">Please fill the details and save and apply for verification from admin.</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isFirstTimeOnboarding && !isEditing && (
              <button onClick={() => { setIsEditing(true); setMessage(''); }} className="btn-outline flex items-center gap-2">
                <Edit2 size={16} /> Edit Profile
              </button>
            )}
            <button onClick={handleBackToDashboard} className="btn-outline flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        </div>

        <div className="glass-card p-8 mb-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">NGO Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="text" required disabled={!formEnabled} className="input-field input-field-icon disabled:opacity-60 disabled:cursor-not-allowed" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">Organization Details</label>
                <textarea required disabled={!formEnabled} className="input-field disabled:opacity-60 disabled:cursor-not-allowed" rows="4" placeholder="Tell us about your organization's mission and operations..." value={formData.organizationDetails} onChange={e => setFormData({...formData, organizationDetails: e.target.value})} />
              </div>

              <div className="md:col-span-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">Location</label>
                  {formEnabled && (
                    <button 
                      type="button" 
                      onClick={detectLocation} 
                      disabled={detectingLocation}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {detectingLocation ? 'Detecting...' : 'Auto Detect from Map'}
                    </button>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input type="text" placeholder="City" required disabled={!formEnabled} className="input-field input-field-icon disabled:opacity-60 disabled:cursor-not-allowed" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <input type="text" placeholder="State" required disabled={!formEnabled} className="input-field disabled:opacity-60 disabled:cursor-not-allowed" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Contact Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="tel" required disabled={!formEnabled} pattern="^[0-9]{10}$" title="Phone number must be exactly 10 digits" className="input-field input-field-icon disabled:opacity-60 disabled:cursor-not-allowed" value={formData['contactInfo.phone']} onChange={e => setFormData({...formData, 'contactInfo.phone': e.target.value})} />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="email" disabled className="input-field input-field-icon opacity-60 cursor-not-allowed" value={formData['contactInfo.email']} />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-3 block text-sm font-semibold">Focus Areas</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Food', 'Medical', 'Shelter', 'Education', 'Emergency', 'Other'].map(area => (
                    <label key={area} className="flex items-center gap-2 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition">
                      <input 
                        type="checkbox" 
                        value={area}
                        checked={formData.focusAreas.includes(area)}
                        onChange={handleFocusAreaChange}
                        disabled={!formEnabled}
                        className="w-4 h-4 text-green-600 rounded disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm font-medium">{area}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {formEnabled && (
              <div className="pt-6 border-t border-gray-100 flex items-center gap-4">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? 'Saving...' : <><Save size={18} /> {isFirstTimeOnboarding ? 'Save & Apply for Verification' : 'Save Profile'}</>}
                </button>
                {!isFirstTimeOnboarding && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditing(false);
                      if (profile) {
                        setFormData({
                          name: profile.name || '',
                          organizationDetails: profile.organizationDetails === 'Pending details' ? '' : profile.organizationDetails,
                          city: profile.city || '',
                          state: profile.state || '',
                          'contactInfo.phone': profile.contactInfo?.phone || '',
                          'contactInfo.email': user.email,
                          focusAreas: profile.focusAreas || []
                        });
                      }
                    }} 
                    className="btn-outline flex items-center gap-2"
                  >
                    <X size={18} /> Cancel
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {!isFirstTimeOnboarding && (
          <div className="glass-card p-8 border-red-200">
            <h3 className="text-xl font-bold text-red-600 flex items-center gap-2 mb-2">
              <AlertTriangle /> Danger Zone
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Deleting your account is permanent. This will remove your NGO profile, delete all associated campaigns, and remove all volunteers assigned to you.
            </p>
            
            {showDeleteConfirm ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="font-bold text-red-800 mb-4">Are you absolutely sure?</p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} className="btn-danger py-2">Yes, delete my account</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline py-2">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="btn-outline text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 size={18} /> Delete Account
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

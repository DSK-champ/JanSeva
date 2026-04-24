import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Save, Clock, CheckCircle, MapPin, Briefcase, Calendar, Users, Edit2, X, Trash2, AlertTriangle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const DOMAINS = [
  'Education & Mentorship',
  'Healthcare & Wellness',
  'Food Security & Distribution',
  'Emergency & Disaster Response',
  'Shelter & Caregiving'
];

const SKILL_MAP = {
  'Education & Mentorship': ['Teaching', 'Tutoring', 'Mentoring', 'Communication', 'Patience', 'Leadership', 'Guidance', 'Public Speaking', 'Counseling', 'Teamwork', 'Content Creation', 'Workshop Handling'],
  'Healthcare & Wellness': ['Communication', 'Empathy', 'Teamwork', 'First Aid', 'Counseling', 'Patient Care', 'Time Management', 'Leadership', 'Problem Solving', 'Active Listening', 'Community Outreach', 'Event Coordination', 'Record Keeping', 'Public Speaking', 'Crisis Support'],
  'Food Security & Distribution': ['Cooking', 'Food Serving', 'Distribution', 'Meal Planning', 'Nutrition Awareness', 'Teamwork', 'Coordination', 'Hygiene Management', 'Inventory Handling', 'Event Support', 'Time Management', 'Community Service'],
  'Emergency & Disaster Response': ['First Aid', 'Crisis Management', 'Quick Response', 'Disaster Relief', 'CPR', 'Rescue Support', 'Emergency Care', 'Teamwork', 'Decision Making', 'Stress Handling', 'Coordination', 'Safety Awareness'],
  'Shelter & Caregiving': ['Shelter Management', 'Caregiving', 'Coordination', 'Resource Handling', 'Community Support', 'Teamwork', 'Crisis Support', 'Hygiene Maintenance', 'Inventory Management', 'Problem Solving', 'Event Support', 'Compassion']
};

export default function VolunteerProfile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('janseva_user') || '{}'))
  const [profile, setProfile] = useState(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    gender: '',
    age: '',
    domains: [],
    skills: [],
    location: { city: '', state: '' }
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [detectingLocation, setDetectingLocation] = useState(false)

  const token = localStorage.getItem('janseva_token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API}/volunteer/profile`, { headers })
        const data = await res.json()
        if (data.success) {
          setProfile(data.data)
          setFormData({
            name: user.name || '',
            email: user.email || '',
            gender: data.data.gender || '',
            age: data.data.age || '',
            domains: data.data.domains || [],
            skills: data.data.skills || [],
            location: {
              city: data.data.location?.city || '',
              state: data.data.location?.state || ''
            }
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [navigate, token])

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
          setFormData(prev => ({ ...prev, location: { city, state } }))
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

  const toggleDomain = (domain) => {
    if (!isEditing) return
    setFormData(prev => {
      const domains = [...prev.domains]
      if (domains.includes(domain)) {
        const newDomains = domains.filter(d => d !== domain)
        const validSkills = new Set(newDomains.flatMap(d => SKILL_MAP[d] || []))
        const newSkills = prev.skills.filter(s => validSkills.has(s))
        return { ...prev, domains: newDomains, skills: newSkills }
      } else {
        return { ...prev, domains: [...domains, domain] }
      }
    })
  }

  const toggleSkill = (skill) => {
    if (!isEditing) return
    setFormData(prev => {
      const currentSkills = [...prev.skills]
      if (currentSkills.includes(skill)) {
        return { ...prev, skills: currentSkills.filter(s => s !== skill) }
      } else {
        if (currentSkills.length >= 20) {
          alert('Maximum 20 skills allowed')
          return prev
        }
        return { ...prev, skills: [...currentSkills, skill] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isEditing) return
    
    setSaving(true)
    setMessage('')
    try {
      const payload = {
        gender: formData.gender,
        age: formData.age ? Number(formData.age) : undefined,
        domains: formData.domains,
        skills: formData.skills,
        location: formData.location
      }
      
      const res = await fetch(`${API}/volunteer/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage('Profile updated successfully!')
        setProfile(data.data)
        setIsEditing(false)
        
        // Also update local storage if name/email changed (even though not sent to backend)
        const updatedUser = { ...user, name: formData.name, email: formData.email }
        localStorage.setItem('janseva_user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      } else {
        setMessage(data.message || 'Failed to update profile.')
      }
    } catch (err) {
      setMessage('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading profile...</div>

  return (
    <section className="section bg-gray-50/50 min-h-screen">
      <div className="container max-w-4xl py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="section-label mb-4">Settings</span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2" style={{ color: 'var(--green-9)' }}>Volunteer Profile</h1>
            <p className="text-sm text-gray-500 mt-2">Manage your personal details, domain, and skills.</p>
          </div>
          {!isEditing && (
            <button 
              onClick={() => { setIsEditing(true); setMessage(''); }} 
              className="btn-outline flex items-center gap-2"
            >
              <Edit2 size={16} /> Edit Profile
            </button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="bg-white border rounded-[1.25rem] p-6 shadow-sm flex items-center justify-between" style={{ borderColor: 'rgba(82,183,136,0.15)' }}>
            <div>
              <p className="text-xs font-bold text-gray-800 mb-2">Volunteering Hours</p>
              <p className="text-4xl font-medium tracking-tight text-gray-800">{profile?.volunteeringHours || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-green-50 text-green-700">
              <Clock size={24} />
            </div>
          </div>
          <div className="bg-white border rounded-[1.25rem] p-6 shadow-sm flex items-center justify-between" style={{ borderColor: 'rgba(82,183,136,0.15)' }}>
            <div>
              <p className="text-xs font-bold text-gray-800 mb-2">Surveys Conducted</p>
              <p className="text-4xl font-medium tracking-tight text-blue-600">{profile?.surveysConducted || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] p-8 border shadow-sm" style={{ borderColor: 'rgba(82,183,136,0.15)' }}>
          {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold ${message.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                    disabled={!isEditing}
                    pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Gender</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <select 
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    disabled={!isEditing}
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Age</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="number" 
                    min="16"
                    max="100"
                    placeholder="Enter your age"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                    value={formData.age} 
                    onChange={e => setFormData({...formData, age: e.target.value})} 
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-gray-700">Location</label>
                {isEditing && (
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
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="City"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                    value={formData.location.city} 
                    onChange={e => setFormData({...formData, location: { ...formData.location, city: e.target.value }})} 
                    disabled={!isEditing}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="State"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                    value={formData.location.state} 
                    onChange={e => setFormData({...formData, location: { ...formData.location, state: e.target.value }})} 
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Domains & Skills */}
            <div className="pt-4 border-t border-gray-100">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Domains</label>
              <p className="text-xs text-gray-500 mb-3">Select the areas where you wish to volunteer. This will display relevant skills.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {DOMAINS.map(d => {
                  const isSelected = formData.domains.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDomain(d)}
                      disabled={!isEditing}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-[#5f8e6c] text-white border-[#5f8e6c] shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'} disabled:opacity-70 ${!isEditing && !isSelected && 'hidden'}`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>

              {formData.domains.length > 0 && (
                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-700">Skills ({formData.skills.length})</label>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(formData.domains.flatMap(d => SKILL_MAP[d] || []))].map(skill => {
                      const isSelected = formData.skills.includes(skill)
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          disabled={!isEditing}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${isSelected ? 'bg-[#5f8e6c] text-white border-[#5f8e6c] shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'} disabled:opacity-70 ${!isEditing && !isSelected && 'hidden'}`}
                        >
                          {skill}
                        </button>
                      )
                    })}
                  </div>
                  {!isEditing && formData.skills.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No skills selected.</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="pt-6 border-t border-gray-100 flex items-center gap-4">
                <button type="submit" disabled={saving} className="bg-[#5f8e6c] hover:bg-[#4f785a] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 disabled:opacity-70">
                  {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form to last saved profile
                    if (profile) {
                      setFormData({
                        name: user.name || '',
                        email: user.email || '',
                        gender: profile.gender || '',
                        age: profile.age || '',
                        domains: profile.domains || [],
                        skills: profile.skills || [],
                        location: {
                          city: profile.location?.city || '',
                          state: profile.location?.state || ''
                        }
                      });
                    }
                  }} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2"
                >
                  <X size={18} /> Cancel
                </button>
              </div>
            )}
          </form>
        </div>

      </div>
    </section>
  )
}

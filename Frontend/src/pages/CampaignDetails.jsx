import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Activity, Brain, Calendar, DollarSign, Target, ChevronDown, ChevronUp, Table } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || `${API}`

export default function CampaignDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [targetAmount, setTargetAmount] = useState(0)
  const [volunteerTarget, setVolunteerTarget] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showSurveyData, setShowSurveyData] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = localStorage.getItem('janseva_token')
        const res = await fetch(`${API}/campaigns/ngo/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        if (json.success) {
          setData(json.data)
          setTargetAmount(json.data.campaign.targetAmount || 0)
          setVolunteerTarget(json.data.campaign.volunteerTarget || 0)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('janseva_token')
      const res = await fetch(`${API}/campaigns/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ targetAmount, volunteerTarget })
      })
      const json = await res.json()
      if (json.success) {
        setData(prev => ({
          ...prev,
          campaign: { ...prev.campaign, targetAmount, volunteerTarget }
        }))
        setIsEditing(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold">Loading Campaign Data...</div>
  if (!data) return <div className="p-12 text-center text-red-500 font-bold">Campaign not found</div>

  const { campaign } = data;
  
  // Check if start date is in the future
  const isFuture = new Date(campaign.startDate) > new Date();

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="container py-8">
        <Link to="/dashboard" className="text-blue-600 font-bold text-sm mb-6 inline-flex items-center gap-1 hover:underline">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="bg-white rounded-2xl p-8 border shadow-sm mb-8 relative overflow-hidden">
          {campaign.isEmergency && <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-bl-xl">EMERGENCY MISSION</div>}
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex gap-4 items-start">
              <div className="bg-blue-100 p-4 rounded-xl text-blue-700">
                <Activity size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold mb-2">{campaign.title}</h1>
                <p className="text-gray-600 max-w-3xl leading-relaxed">{campaign.description}</p>
                <div className="flex items-center gap-4 mt-4">
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{campaign.category}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${campaign.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{campaign.status}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => navigate(`/ngo-campaign/${id}/ml-hub`)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 transition transform hover:scale-105 whitespace-nowrap"
            >
              <Brain size={20} /> Enter ML Intelligence Hub
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50 rounded-xl border">
            {/* Target Funds */}
            <div className="p-2">
              <p className="text-sm text-gray-500 font-bold mb-2 flex items-center gap-1"><DollarSign size={16}/> Target Funds</p>
              {isEditing ? (
                <input 
                  type="number" 
                  value={targetAmount} 
                  onChange={e => setTargetAmount(Number(e.target.value))}
                  className="input-field text-xl font-black text-purple-600 py-1"
                />
              ) : (
                <p className="text-2xl font-black text-purple-600">₹{campaign.targetAmount?.toLocaleString() || 0}</p>
              )}
            </div>
            
            {/* Target Volunteers */}
            <div className="p-2">
              <p className="text-sm text-gray-500 font-bold mb-2 flex items-center gap-1"><Users size={16}/> Volunteer Target</p>
              {isEditing ? (
                <input 
                  type="number" 
                  value={volunteerTarget} 
                  onChange={e => setVolunteerTarget(Number(e.target.value))}
                  className="input-field text-xl font-black text-blue-600 py-1"
                />
              ) : (
                <p className="text-2xl font-black text-blue-600">{campaign.volunteerTarget || 0}</p>
              )}
            </div>
            
            {/* Start Date */}
            <div className="p-2 border-t md:border-t-0 md:border-l border-gray-200">
              <p className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-1"><Calendar size={16}/> Start Date</p>
              <p className="text-xl font-bold text-gray-700">{new Date(campaign.startDate).toLocaleDateString()}</p>
              {isFuture && <span className="text-xs text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">Future Date</span>}
            </div>
            
            {/* End Date */}
            <div className="p-2">
              <p className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-1"><Target size={16}/> End Date</p>
              <p className="text-xl font-bold text-gray-700">{new Date(campaign.endDate).toLocaleDateString()}</p>
            </div>
          </div>
          
          {/* Edit Actions */}
          {isFuture && (
            <div className="mt-4 flex justify-end">
              {isEditing ? (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="btn-outline">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn-outline">Edit Targets</button>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Brain className="text-blue-500 mx-auto mb-3" size={48} />
          <h2 className="text-xl font-black text-blue-900 mb-2">Campaign Intelligence & Allocation</h2>
          <p className="text-blue-800 mb-4 max-w-2xl mx-auto">
            All village assignments, volunteer matching, priority scoring, and data analysis are handled securely within the JanSeva ML Hub. 
            Click the button above to view your data or run the algorithms.
          </p>
          <button 
            onClick={() => navigate(`/ngo-campaign/${id}/ml-hub`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            Go to ML Hub
          </button>
        </div>

        {/* Raw Survey Data */}
        {data.rawSurvey && data.rawSurvey.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border shadow-sm">
            <button
              onClick={() => setShowSurveyData(s => !s)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Table size={20} className="text-blue-500" />
                <h2 className="text-lg font-black text-gray-800">Village Survey Data</h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{data.rawSurvey.length} villages</span>
              </div>
              {showSurveyData ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {showSurveyData && (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 border font-bold text-gray-600">Village</th>
                      <th className="text-left px-3 py-2 border font-bold text-gray-600">State</th>
                      <th className="text-left px-3 py-2 border font-bold text-gray-600">District</th>
                      <th className="text-right px-3 py-2 border font-bold text-gray-600">Population</th>
                      <th className="text-right px-3 py-2 border font-bold text-red-600">Medical</th>
                      <th className="text-right px-3 py-2 border font-bold text-green-600">Food</th>
                      <th className="text-right px-3 py-2 border font-bold text-blue-600">Education</th>
                      <th className="text-right px-3 py-2 border font-bold text-yellow-600">Shelter</th>
                      <th className="text-right px-3 py-2 border font-bold text-purple-600">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rawSurvey.map((row, i) => (
                      <tr key={row._id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 border font-bold text-gray-800">{row.village_name}</td>
                        <td className="px-3 py-2 border text-gray-600">{row.state}</td>
                        <td className="px-3 py-2 border text-gray-600">{row.district}</td>
                        <td className="px-3 py-2 border text-right text-gray-600">{row.population?.toLocaleString()}</td>
                        <td className="px-3 py-2 border text-right font-bold text-red-600">{row.medical?.score?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-2 border text-right font-bold text-green-600">{row.food?.score?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-2 border text-right font-bold text-blue-600">{row.education?.score?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-2 border text-right font-bold text-yellow-600">{row.shelter?.score?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-2 border text-right font-bold text-purple-700">{row.overall_priority_score?.toFixed(1) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell } from 'recharts'
import { ArrowLeft, Loader2, Play, CheckCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL || `${API}`

const TIER_COLORS = { A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-yellow-100 text-yellow-800', D: 'bg-gray-100 text-gray-800' }
const CLASS_COLORS = { CRITICAL: 'bg-red-100 text-red-700 border-red-200', HIGH: 'bg-orange-100 text-orange-700 border-orange-200', MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200', LOW: 'bg-green-100 text-green-700 border-green-200' }
const CLASS_BORDER = { CRITICAL: 'border-red-400', HIGH: 'border-orange-400', MEDIUM: 'border-yellow-400', LOW: 'border-green-400' }
const CLASS_BG = { CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-green-500' }

const SECTOR_COLORS = {
  Education: '#3b82f6', // blue
  Food: '#10b981',      // green
  Medical: '#ef4444',   // red
  Shelter: '#f59e0b'    // yellow
}

export default function MLHub() {
  const { id: campaignId } = useParams()
  const [tab, setTab] = useState('rankings')
  const [stats, setStats] = useState(null)
  const [villages, setVillages] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [deployment, setDeployment] = useState([])
  const [selectedVillage, setSelectedVillage] = useState(null)
  const [smartMatch, setSmartMatch] = useState(null)
  const [maxVillages, setMaxVillages] = useState(3)
  
  const [loading, setLoading] = useState(true)
  const [runningMatch, setRunningMatch] = useState(false)
  const [matchSuccess, setMatchSuccess] = useState(false)
  const [domainFilter, setDomainFilter] = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('janseva_token')
    const headers = { Authorization: `Bearer ${token}` }
    
    try {
      const [sRes, vRes] = await Promise.all([
        fetch(`${API}/ml/stats?campaignId=${campaignId}`, { headers }),
        fetch(`${API}/ml/village-rankings?campaignId=${campaignId}&limit=50`, { headers })
      ])
      
      const sData = await sRes.json()
      const vData = await vRes.json()
      
      if (sData.success) setStats(sData.data)
      if (vData.success) setVillages(vData.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const token = localStorage.getItem('janseva_token')
    const headers = { Authorization: `Bearer ${token}` }
    
    if (tab === 'volunteers' && volunteers.length === 0) {
      setLoading(true)
      fetch(`${API}/ml/volunteers/ranked?campaignId=${campaignId}&limit=100`, { headers })
        .then(r => r.json())
        .then(d => { if (d.success) setVolunteers(d.data) })
        .finally(() => setLoading(false))
    }
    if (tab === 'deployment' && deployment.length === 0) {
      setLoading(true)
      fetch(`${API}/ml/deployment-plan?campaignId=${campaignId}`, { headers })
        .then(r => r.json())
        .then(d => { if (d.success) setDeployment(d.data) })
        .finally(() => setLoading(false))
    }
  }, [tab, campaignId, volunteers.length, deployment.length])

  const fetchSmartMatch = useCallback((village) => {
    setSelectedVillage(village)
    setTab('smartmatch')
    setSmartMatch(null)
    const token = localStorage.getItem('janseva_token')
    fetch(`${API}/ml/smart-match/${village.villageId}`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json())
      .then(d => { if (d.success) setSmartMatch(d.data) })
  }, [])

  const handleRunMatch = async () => {
    setRunningMatch(true)
    const token = localStorage.getItem('janseva_token')
    try {
      const res = await fetch(`${API}/ml/campaign/${campaignId}/run-matching?maxVillages=${maxVillages}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setMatchSuccess(true)
        setDeployment([]) // force re-fetch
        const depRes = await fetch(`${API}/ml/deployment-plan?campaignId=${campaignId}`, { headers: { Authorization: `Bearer ${token}` } })
        const depData = await depRes.json()
        if (depData.success) setDeployment(depData.data)
        setTimeout(() => setMatchSuccess(false), 3000)
      } else {
        alert(data.message || 'Failed to run matching')
      }
    } catch (e) {
      console.error(e)
      alert('Error running matching algorithm')
    } finally {
      setRunningMatch(false)
    }
  }

  const filteredVillages = villages.filter(v => {
    if (domainFilter !== 'all' && v.primaryDomain?.toLowerCase().includes(domainFilter)) return true
    if (domainFilter === 'all') return true
    return false
  }).sort((a, b) => (b.overallVulnerabilityScore || 0) - (a.overallVulnerabilityScore || 0))

  const sectorBarData = stats?.sectorAverages ? [
    { name: 'Education', score: Math.round(stats.sectorAverages.avgEducation || 0), color: SECTOR_COLORS.Education },
    { name: 'Food', score: Math.round(stats.sectorAverages.avgFood || 0), color: SECTOR_COLORS.Food },
    { name: 'Medical', score: Math.round(stats.sectorAverages.avgHealth || 0), color: SECTOR_COLORS.Medical },
    { name: 'Shelter', score: Math.round(stats.sectorAverages.avgShelter || 0), color: SECTOR_COLORS.Shelter },
  ] : []

  if (loading && !stats) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-green-600" size={48}/></div>

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container py-4">
          <Link to={`/ngo-campaign/${campaignId}`} className="text-blue-600 font-bold text-sm mb-4 inline-flex items-center gap-1 hover:underline">
            <ArrowLeft size={16} /> Back to Campaign
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">ML Intelligence Hub</h1>
              <p className="text-sm text-gray-500 font-medium">Smart resource allocation powered by JanSeva ML</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">ML Service Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container pt-8">
        {/* Stats Cards exactly as in screenshot */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-1">Total Villages</p>
              <p className="text-3xl font-black text-gray-800">{stats.totalVillages}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-1">Critical Villages</p>
              <p className="text-3xl font-black text-red-500">{stats.criticalVillages}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Need urgent help</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-1">Volunteers</p>
              <p className="text-3xl font-black text-blue-500">{stats.totalVolunteers}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-1">Avg Vol Score</p>
              <p className="text-3xl font-black text-green-500">{stats.avgVolunteerScore.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">out of 100</p>
            </div>
          </div>
        )}

        {/* Pill Tabs exactly as in screenshot */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {[
            ['rankings','🏡 Village Rankings'],
            ['volunteers','🙋 Volunteers'],
            ['smartmatch','🎯 Smart Match'],
            ['deployment','🗺️ Deployment Plan']
          ].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-bold px-5 py-2.5 rounded-full whitespace-nowrap transition text-sm flex items-center gap-2 border ${tab === t ? 'bg-white text-gray-900 border-gray-200 shadow-sm' : 'bg-transparent text-gray-500 border-transparent hover:bg-white hover:border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Action Button for Deployment Plan */}
        {tab === 'deployment' && (
          <div className="mb-6 flex items-center justify-end gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Villages</span>
              <input
                type="number" min="1" max="20"
                value={maxVillages}
                onChange={e => setMaxVillages(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-center font-black text-gray-900 text-sm border-b border-gray-300 focus:outline-none focus:border-blue-500 bg-transparent"
              />
            </div>
            <button 
              onClick={handleRunMatch}
              disabled={runningMatch}
              className={`font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg transition transform hover:scale-105 ${matchSuccess ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}
            >
              {runningMatch ? <Loader2 className="animate-spin" size={20} /> : matchSuccess ? <CheckCircle size={20} /> : <Play size={20} />}
              {runningMatch ? 'Running Pipeline...' : matchSuccess ? 'Matching Complete!' : 'Run Smart Match Pipeline'}
            </button>
          </div>
        )}

        {/* Village Rankings Tab */}
        {tab === 'rankings' && (
          <div className="bg-white rounded-2xl border shadow-sm p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div className="flex-1">
                <h3 className="font-extrabold text-xl text-gray-800 mb-6">Village Need Rankings</h3>
                {sectorBarData.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">Average Need Score by Sector (across all villages)</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={sectorBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500}} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{fontSize: 12, fontWeight: 500}} axisLine={true} tickLine={true} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {sectorBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              
              {/* Domain Filters exactly as in screenshot */}
              <div className="flex gap-2 flex-wrap pb-4">
                {[
                  ['all','🌐 All', 'bg-green-600 text-white border-green-600', 'bg-white text-gray-600 border-gray-200'],
                  ['health','🏥 Medical', 'bg-red-50 text-red-600 border-red-200', 'bg-white text-gray-600 border-gray-200'],
                  ['education','🎓 Education', 'bg-blue-50 text-blue-600 border-blue-200', 'bg-white text-gray-600 border-gray-200'],
                  ['shelter','🏠 Shelter', 'bg-yellow-50 text-yellow-600 border-yellow-200', 'bg-white text-gray-600 border-gray-200'],
                  ['food','🍱 Food', 'bg-green-50 text-green-600 border-green-200', 'bg-white text-gray-600 border-gray-200']
                ].map(([d, label, activeClass, inactiveClass]) => (
                  <button key={d} onClick={() => setDomainFilter(d)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold border transition ${domainFilter === d ? activeClass : inactiveClass}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4 font-medium italic">Click any village card to find matching volunteers →</p>

            {filteredVillages.length === 0 ? (
              <div className="p-16 text-center text-gray-400 border border-dashed rounded-xl">
                <p className="font-bold">No village data found for this campaign.</p>
                <p className="text-sm mt-1">Upload survey CSVs from the Dashboard to populate this page.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredVillages.map((v, idx) => (
                  <div key={v.villageId} onClick={() => fetchSmartMatch(v)} 
                       className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-lg transition ${selectedVillage?.villageId === v.villageId ? 'border-green-400 shadow-md ring-1 ring-green-400' : 'border-gray-200'}`}>
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${CLASS_BG[v.vulnerabilityClass] || 'bg-gray-400'}`}></span>
                        <div>
                          <h3 className="font-extrabold text-sm text-gray-900 truncate max-w-[120px]">{v.villageName}</h3>
                          <p className="text-[10px] text-gray-400 font-medium">{v.state}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CLASS_COLORS[v.vulnerabilityClass] || 'bg-gray-100 text-gray-600'}`}>{v.vulnerabilityClass || 'N/A'}</span>
                        <span className="text-[10px] font-black text-gray-400 mt-1">#{idx + 1}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Vulnerability Index</span>
                        <span className="font-black text-gray-900 text-sm">{v.overallVulnerabilityScore?.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${CLASS_BG[v.vulnerabilityClass] || 'bg-gray-400'}`} style={{ width: `${Math.min(v.overallVulnerabilityScore || 0, 100)}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-4 border-t pt-3">
                      {[
                        ['🏥', v.healthScore, 'Medical'], 
                        ['🎓', v.educationScore, 'Education'], 
                        ['🍱', v.foodScore, 'Food'], 
                        ['🏠', v.shelterScore, 'Shelter']
                      ].map(([icon, score, type]) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <span className="text-xs">{icon}</span>
                          <div className="flex-1">
                            <div className="h-1 bg-gray-100 rounded-full">
                              <div className="h-1 rounded-full" style={{ width: `${score || 0}%`, backgroundColor: SECTOR_COLORS[type] }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-gray-700 w-4 text-right">{score?.toFixed(0) || 0}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold flex-wrap gap-1">
                      <div className="flex gap-1 flex-wrap">
                        {v.foodScore > 15 && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-0.5">🍱 Food</span>}
                        {v.healthScore > 15 && <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-0.5">🏥 Medical</span>}
                        {v.educationScore > 15 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-0.5">🎓 Education</span>}
                        {v.shelterScore > 15 && <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-0.5">🏠 Shelter</span>}
                        {!(v.foodScore > 15 || v.healthScore > 15 || v.educationScore > 15 || v.shelterScore > 15) && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">{v.primaryDomain || 'General'}</span>
                        )}
                      </div>
                      <span className="text-gray-400">Pop: {v.population?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Smart Match Tab */}
        {tab === 'smartmatch' && (
          <div className="bg-white rounded-2xl border shadow-sm p-8">
            {!selectedVillage ? (
              <div className="p-16 text-center text-gray-400">
                <p className="font-bold text-lg mb-1">Select a village from the Rankings tab</p>
                <p className="text-sm">Click on any village card to see the top matched volunteers</p>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between flex-wrap gap-6 border-b pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-3 h-3 rounded-full ${CLASS_BG[selectedVillage.vulnerabilityClass] || 'bg-gray-400'}`}></span>
                      <h2 className="text-3xl font-black text-gray-900">{selectedVillage.villageName}</h2>
                    </div>
                    <p className="text-gray-500 font-medium ml-5">{selectedVillage.state}</p>
                    <div className="flex gap-2 mt-3 ml-5">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${CLASS_COLORS[selectedVillage.vulnerabilityClass] || ''}`}>{selectedVillage.vulnerabilityClass}</span>
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{selectedVillage.primaryDomain}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-black text-gray-900 tracking-tighter">{selectedVillage.overallVulnerabilityScore?.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Vulnerability Index</p>
                  </div>
                </div>

                {/* Radar Chart & Matches */}
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 border-r pr-8">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">Sector Breakdown</h4>
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart outerRadius={80} data={[
                        { domain: 'Medical', value: selectedVillage.healthScore || 0 },
                        { domain: 'Food', value: selectedVillage.foodScore || 0 },
                        { domain: 'Education', value: selectedVillage.educationScore || 0 },
                        { domain: 'Shelter', value: selectedVillage.shelterScore || 0 },
                      ]}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="value" stroke={SECTOR_COLORS[selectedVillage.primaryDomain?.split(' ')[0]] || '#3b82f6'} fill={SECTOR_COLORS[selectedVillage.primaryDomain?.split(' ')[0]] || '#3b82f6'} fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-extrabold text-xl mb-4 text-gray-900 flex items-center justify-between">
                      <span>Top {smartMatch?.matched?.length || '...'} Matched Volunteers</span>
                      {smartMatch && <span className="text-xs text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded-lg">From {smartMatch.consideredCount} considered in DB</span>}
                    </h3>

                    {!smartMatch ? (
                      <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-500" size={32}/></div>
                    ) : smartMatch.matched.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 border border-dashed rounded-xl">No volunteers scored for this village yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {smartMatch.matched.map((v, idx) => (
                          <div key={v._id} className="border border-gray-100 rounded-xl p-3 flex items-center gap-4 transition hover:border-blue-200 hover:shadow-sm bg-white">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-black text-sm shadow-inner">{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-extrabold text-gray-900">{v.name}</p>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${TIER_COLORS[v.tier] || TIER_COLORS.D}`}>Tier {v.tier}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 font-medium">{v.location?.city}, {v.location?.state} • {v.availability}</p>
                            </div>
                            <div className="flex-1 hidden md:flex flex-wrap gap-1">
                              {(v.matchingSkills || []).map(s => <span key={s} className="bg-green-50 border border-green-200 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">{s}</span>)}
                              {(v.skills || []).filter(s => !v.matchingSkills?.includes(s)).slice(0, 2).map(s => <span key={s} className="bg-gray-50 border border-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded">{s}</span>)}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-gray-900">{v.matchScore?.toFixed(1)}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Match</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deployment Plan Tab */}
        {tab === 'deployment' && (
          <div className="bg-white rounded-2xl border shadow-sm p-8">
            <h3 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center gap-2">
              🗺️ Automated Deployment Roster
            </h3>
            
            {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={32}/></div> :
              deployment.length === 0 ? (
                <div className="p-16 text-center text-gray-400 border border-dashed rounded-xl">
                  <p className="font-bold mb-1">No volunteers assigned yet.</p>
                  <p className="text-sm">Click the "Run Smart Match Pipeline" button above to auto-assign teams based on survey data.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {deployment.map((v, i) => (
                    <div key={v.villageId || i} className="border border-gray-100 rounded-2xl p-5 bg-gray-50">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${CLASS_BG[v.vulnerabilityClass] || 'bg-gray-400'}`}></span>
                          <div>
                            <h3 className="font-black text-lg text-gray-900">{v.villageName}</h3>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{v.primaryDomain}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Vulnerability</p>
                            <p className="text-lg font-black text-gray-900 leading-none mt-1">{v.overallVulnerabilityScore?.toFixed(1)}</p>
                          </div>
                          <div className="h-8 w-px bg-gray-200"></div>
                          <div className="text-left">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Priority</p>
                            <span className={`text-xs font-black px-2 py-0.5 rounded mt-1 inline-block border ${CLASS_COLORS[v.vulnerabilityClass] || ''}`}>{v.vulnerabilityClass}</span>
                          </div>
                          <div className="h-8 w-px bg-gray-200"></div>
                          <div className="text-left">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Funds Assigned</p>
                            <p className="text-lg font-black text-indigo-600 leading-none mt-1">₹{(v.fundsAssigned || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(v.assignedVolunteers || []).map((vol, i) => (
                          <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm p-3 rounded-xl hover:border-blue-200 transition">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm">{(vol.name || '?').charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 truncate leading-tight">{vol.name}</p>
                              <div className="flex gap-1 flex-wrap mt-1">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${TIER_COLORS[vol.tier] || TIER_COLORS.D}`}>Tier {vol.tier}</span>
                                {(vol.skills || []).slice(0, 1).map(s => <span key={s} className="bg-gray-100 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-gray-200 truncate max-w-[60px]">{s}</span>)}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-green-600">{vol.matchScore?.toFixed(1)}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">Match</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Volunteers Tab */}
        {tab === 'volunteers' && (
          <div className="bg-white rounded-2xl border shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-xl text-gray-800">Registered Campaign Volunteers</h3>
              {volunteers.length > 0 && <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{volunteers.length} registered</span>}
            </div>
            
            {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={32}/></div> : 
             volunteers.length === 0 ? (
               <div className="p-16 text-center text-gray-400 border border-dashed rounded-xl">
                  <p className="font-bold mb-1">No volunteers registered yet.</p>
                  <p className="text-sm">Volunteers must register for this specific campaign to appear here.</p>
                </div>
             ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {volunteers.map((v, idx) => (
                  <div key={v._id} className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-gray-900 truncate leading-tight">{v.name || 'Unknown'}</p>
                        <p className="text-[11px] text-gray-500 font-medium truncate">{v.location?.city}, {v.location?.state}</p>
                      </div>
                      <span className={`text-xs font-black px-2 py-1 rounded border ${TIER_COLORS[v.tier] || TIER_COLORS.D}`}>Tier {v.tier}</span>
                    </div>

                    {/* Score bar */}
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Overall Score</p>
                      <span className="text-lg font-black text-gray-900 leading-none">{v.totalScore?.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(v.totalScore || 0, 100)}%` }} />
                    </div>

                    {/* Hours + Rating + Missions row */}
                    <div className="grid grid-cols-3 gap-2 mb-3 bg-white border border-gray-100 rounded-lg p-2">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Hours</p>
                        <p className="text-sm font-black text-blue-600">{v.volunteeringHours || 0}</p>
                      </div>
                      <div className="text-center border-x border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Rating</p>
                        <p className="text-sm font-black text-yellow-500">★ {v.rating?.toFixed(1) || '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Missions</p>
                        <p className="text-sm font-black text-green-600">{v.completedRequests || 0}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(v.skills || []).slice(0, 3).map(s => <span key={s} className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded font-bold">{s}</span>)}
                      {v.isAvailable ? <span className="bg-green-50 border border-green-200 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold ml-auto">Available</span> : <span className="bg-red-50 border border-red-200 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold ml-auto">Busy</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

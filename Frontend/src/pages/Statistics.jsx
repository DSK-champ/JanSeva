import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Filter, Zap } from 'lucide-react'

const API = 'http://localhost:5000/api/stats'
const COLORS = ['#40916C', '#4CC9F0', '#52B788', '#9D4EDD', '#2D6A4F', '#74C69D']
const SKILL_OPTIONS = ['First Aid', 'Cooking', 'Driving', 'Teaching', 'Medical', 'Counselling', 'Construction', 'IT Support', 'Logistics', 'Translation']

export default function Statistics() {
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [catData, setCatData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [stateData, setStateData] = useState([])
  const [insights, setInsights] = useState(null)
  const [allocation, setAllocation] = useState(null)
  const [filters, setFilters] = useState({ state: '', focusArea: '', contributionLevel: '' })
  const [filteredNGOs, setFilteredNGOs] = useState([])
  const [selectedSkills, setSelectedSkills] = useState(['First Aid', 'Medical'])
  const [allocState, setAllocState] = useState('')
  const [loading, setLoading] = useState(false)

  const get = async (url) => {
    try {
      const response = await fetch(url)
      if (response.ok) return (await response.json()).data
      return null
    } catch {
      return null
    }
  }

  useEffect(() => {
    Promise.all([
      get(`${API}/overview`),
      get(`${API}/requests-by-category`),
      get(`${API}/monthly-requests`),
      get(`${API}/ngos-by-state`),
      get(`${API}/data-insights`),
    ]).then(([overviewData, categoryData, monthly, state, insightData]) => {
      if (overviewData) setOverview(overviewData)
      if (categoryData) setCatData(categoryData)
      if (monthly) setMonthlyData(monthly)
      if (state) setStateData(state)
      if (insightData) setInsights(insightData)
    })
  }, [])

  const applyFilters = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.state) params.set('state', filters.state)
    if (filters.focusArea) params.set('focusArea', filters.focusArea)
    if (filters.contributionLevel) params.set('contributionLevel', filters.contributionLevel)
    const data = await get(`${API}/filtered-ngos?${params}`)
    setFilteredNGOs(data || [])
    setLoading(false)
  }

  const runAllocation = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','))
    if (allocState) params.set('state', allocState)
    const data = await get(`${API}/volunteer-allocation?${params}`)
    setAllocation(data)
    setLoading(false)
  }

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((item) => item !== skill)
        : [...prev, skill]
    )
  }

  const tabs = ['overview', 'charts', 'query', 'allocation', 'insights']
  const stateChartData = stateData
    .filter((item) => item?.state)
    .slice(0, 12)
    .map((item) => ({
      ...item,
      label: item.state,
      value: item.totalNGOs ?? 0,
    }))

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <div className="page-hero-grid">
            <div className="page-hero-copy">
              <span className="section-label">Analytics</span>
              <h1 className="page-title">Readable analytics across your NGO data</h1>
              <p className="page-subtitle">
                The statistics workspace now fits the same layout system as the rest of the product while preserving every live query, chart, and filter.
              </p>
            </div>
            <div className="page-hero-panel">
              <div className="grid gap-4 md:grid-cols-2">
                {overview && [
                  { label: 'Requests', value: overview.requests?.total },
                  { label: 'Resolved', value: overview.requests?.resolved },
                  { label: 'Verified NGOs', value: overview.ngos?.verified },
                  { label: 'Volunteers', value: overview.volunteers?.total },
                ].map((item) => (
                  <div key={item.label} className="glass-card p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>{item.label}</p>
                    <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="app-tabs">
            {tabs.map((item) => (
              <button key={item} onClick={() => setTab(item)} className={`app-tab ${tab === item ? 'is-active' : ''}`}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'overview' && overview && (
            <div className="mt-6 space-y-6">
              <div className="cards-grid-4">
                {[
                  { label: 'Total Requests', value: overview.requests?.total },
                  { label: 'Resolved', value: overview.requests?.resolved },
                  { label: 'Pending', value: overview.requests?.pending },
                  { label: 'Resolution Rate', value: `${overview.requests?.resolutionRate}%` },
                ].map((item) => (
                  <div key={item.label} className="glass-card p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>{item.label}</p>
                    <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card p-6">
                <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>NGOs per state</h2>
                {stateChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stateChartData} margin={{ bottom: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(45, 106, 79, 0.08)" />
                      <XAxis dataKey="label" angle={-30} textAnchor="end" tick={{ fontSize: 10, fill: '#5F7F72' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#5F7F72' }} />
                      <Tooltip formatter={(value) => [`${value}`, 'NGOs']} />
                      <Bar dataKey="value" fill="#40916C" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ minHeight: 280 }}>
                    <p>No NGO state data available right now.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'charts' && (
            <div className="cards-grid-2 mt-6">
              <div className="glass-card p-6">
                <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>Requests by category</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={catData} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={88} label={({ category }) => category}>
                      {catData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6">
                <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>Monthly request trend</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(45, 106, 79, 0.08)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5F7F72' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#5F7F72' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#40916C" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="resolved" stroke="#4CC9F0" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'query' && (
            <div className="mt-6 space-y-6">
              <div className="glass-card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="icon-shell">
                    <Filter size={18} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>MongoDB query builder</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Filter NGOs by state, focus area, and contribution level.</p>
                  </div>
                </div>
                <div className="cards-grid-3">
                  {[
                    { label: 'State', key: 'state', options: ['', 'Maharashtra', 'Delhi', 'Bihar', 'Uttar Pradesh', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'West Bengal', 'Telangana', 'Kerala', 'Punjab'] },
                    { label: 'Focus Area', key: 'focusArea', options: ['', 'Food', 'Medical', 'Shelter', 'Education', 'Emergency', 'Other'] },
                    { label: 'Contribution Level', key: 'contributionLevel', options: ['', 'Low', 'Medium', 'High', 'Critical'] },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>{field.label}</label>
                      <select className="select-field" value={filters[field.key]} onChange={(e) => setFilters((prev) => ({ ...prev, [field.key]: e.target.value }))}>
                        {field.options.map((option) => <option key={option} value={option}>{option || `All ${field.label}s`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <button onClick={applyFilters} className="btn-primary mt-5">
                  {loading ? 'Running...' : 'Run Query'}
                </button>
              </div>

              {filteredNGOs.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="border-b p-5" style={{ borderColor: 'rgba(45, 106, 79, 0.08)' }}>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--green-8)' }}>Results: {filteredNGOs.length} NGOs</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>NGO Name</th>
                          <th>State</th>
                          <th>City</th>
                          <th>Focus Areas</th>
                          <th>Contribution</th>
                          <th>Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNGOs.map((ngo) => (
                          <tr key={ngo._id}>
                            <td>{ngo.name}</td>
                            <td>{ngo.state}</td>
                            <td>{ngo.city}</td>
                            <td>{ngo.focusAreas?.join(', ')}</td>
                            <td>{ngo.contributionLevel}</td>
                            <td>{ngo.impactScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'allocation' && (
            <div className="mt-6 space-y-6">
              <div className="glass-card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="icon-shell purple">
                    <Zap size={18} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>Smart volunteer allocation</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Match volunteer skills to NGOs using the existing backend pipeline.</p>
                  </div>
                </div>
                <div className="cards-grid-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Skills</label>
                    <div className="rounded-[24px] border p-4" style={{ borderColor: 'rgba(45, 106, 79, 0.12)', background: 'rgba(255, 255, 255, 0.72)' }}>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_OPTIONS.map((skill) => {
                          const isSelected = selectedSkills.includes(skill)
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => toggleSkill(skill)}
                              className="min-h-0 rounded-full px-4 py-2 text-sm font-semibold transition"
                              style={
                                isSelected
                                  ? {
                                      background: 'linear-gradient(135deg, var(--green-6), var(--green-7))',
                                      color: '#fff',
                                      boxShadow: '0 12px 24px rgba(64, 145, 108, 0.18)',
                                    }
                                  : {
                                      background: 'rgba(216, 243, 220, 0.62)',
                                      color: 'var(--green-8)',
                                      border: '1px solid rgba(45, 106, 79, 0.08)',
                                    }
                              }
                            >
                              {skill}
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-3 text-xs" style={{ color: 'var(--text-soft)' }}>
                        Selected: {selectedSkills.length > 0 ? selectedSkills.join(', ') : 'None'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>State Filter</label>
                    <select className="select-field" value={allocState} onChange={(e) => setAllocState(e.target.value)}>
                      {['', 'Maharashtra', 'Delhi', 'Bihar', 'Uttar Pradesh', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Rajasthan'].map((state) => <option key={state}>{state || 'All States'}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={runAllocation} className="btn-mustard mt-5">
                  {loading ? 'Matching...' : 'Match Volunteers to NGOs'}
                </button>
              </div>

              {allocation?.matches?.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Volunteer</th>
                          <th>Skills</th>
                          <th>State</th>
                          <th>Rating</th>
                          <th>Completed</th>
                          <th>Matched NGOs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocation.matches.map((match, index) => (
                          <tr key={index}>
                            <td>{match.user?.name}</td>
                            <td>{match.skills?.join(', ')}</td>
                            <td>{match.location?.state}</td>
                            <td>{match.rating}</td>
                            <td>{match.completedRequests}</td>
                            <td>{match.matchedNGOs?.map((ngo) => ngo.name).join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'insights' && insights && (
            <div className="mt-6 space-y-6">
              <div className="cards-grid-2">
                {insights.ngo?.byFocusArea?.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>NGOs by focus area</h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={insights.ngo.byFocusArea} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id }) => _id}>
                          {insights.ngo.byFocusArea.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {insights.volunteer?.bySkill?.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="text-xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>Volunteer skills distribution</h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={insights.volunteer.bySkill.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(45, 106, 79, 0.08)" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#5F7F72' }} />
                        <YAxis type="category" dataKey="_id" tick={{ fontSize: 10, fill: '#5F7F72' }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#40916C" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {insights.requests?.underservedStates?.length > 0 && (
                <div className="cards-grid-4">
                  {insights.requests.underservedStates.map((state) => (
                    <div key={state._id} className="glass-card p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>{state._id}</p>
                      <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--purple-accent)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{state.pending}</p>
                      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>pending of {state.total} total</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Activity, Eye, EyeOff } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Something went wrong')
      localStorage.setItem('janseva_token', data.data.token)
      localStorage.setItem('janseva_user', JSON.stringify(data.data.user))
      navigate('/dashboard')
      window.location.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="content-grid">
          <div className="light-panel p-8 md:p-12" style={{ background: 'linear-gradient(135deg, rgba(216,243,220,0.92), rgba(255,255,255,0.96) 58%, rgba(76,201,240,0.12))' }}>
            <span className="section-label">Welcome Back</span>
            <h1 className="page-title mt-5">Sign in to your JanSeva workspace</h1>
            <p className="page-subtitle">
              Access your dashboard, track contributions, and coordinate support through the refreshed, lighter interface.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Volunteer workflows', value: 'Active' },
                { label: 'Live updates', value: '30s sync' },
              ].map((item) => (
                <div key={item.label} className="glass-card p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-soft)' }}>{item.label}</p>
                  <p className="mt-2 text-lg font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: 'linear-gradient(135deg, var(--green-6), var(--green-7))' }}>
                <Activity className="h-8 w-8" style={{ color: '#D8F3DC' }} />
              </div>
              <h2 className="text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                Log in
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Use your account to continue where your team left off.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(157,78,221,0.1)', border: '1px solid rgba(157,78,221,0.16)', color: 'var(--purple-accent)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Email Address</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5" style={{ color: 'var(--text-soft)' }} />
                  </div>
                  <input type="email" required pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" title="Please enter a valid email address" className="input-field input-field-icon" placeholder="you@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Password</label>
                  <a href="#" className="text-xs font-semibold" style={{ color: 'var(--blue-accent)' }}>Forgot password?</a>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5" style={{ color: 'var(--text-soft)' }} />
                  </div>
                  <input type={showPwd ? "text" : "password"} required className="input-field input-field-icon pr-10" placeholder="Enter your password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Logging in...' : 'Sign In'}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </button>
            </form>


            <div className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Do not have an account? <Link to="/signup" className="font-semibold" style={{ color: 'var(--green-6)' }}>Create one</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Login

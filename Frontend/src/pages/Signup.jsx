import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, Shield, Eye, EyeOff, KeyRound, RotateCcw, CheckCircle2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const OTP_LENGTH = 6
const OTP_EXPIRY_SECONDS = 300 // 5 minutes
const RESEND_COOLDOWN = 30 // 30 seconds before allowing resend

const Signup = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'volunteer' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // OTP state
  const [step, setStep] = useState(1) // 1 = form, 2 = otp verification
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [timer, setTimer] = useState(OTP_EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpSending, setOtpSending] = useState(false)
  const inputRefs = useRef([])

  // Password strength
  const getStrength = (pass) => {
    let s = 0;
    if (pass.length > 7) s += 1;
    if (/[A-Z]/.test(pass)) s += 1;
    if (/[a-z]/.test(pass)) s += 1;
    if (/[0-9]/.test(pass)) s += 1;
    if (/[^A-Za-z0-9]/.test(pass)) s += 1;
    return s;
  }
  const strength = getStrength(formData.password)
  const strengthLabels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']

  // OTP expiry timer
  useEffect(() => {
    if (step !== 2 || timer <= 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [step, timer])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const interval = setInterval(() => setResendCooldown((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setOtpSending(true)
    setError(null)
    try {
      const response = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name, role: formData.role }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to send OTP')

      // Move to step 2
      setStep(2)
      setTimer(OTP_EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN)
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      // Focus first OTP input after transition
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setOtpSending(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setOtpSending(true)
    setError(null)
    try {
      const response = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name, role: formData.role }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to resend OTP')

      setTimer(OTP_EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN)
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setError(null)
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err.message)
    } finally {
      setOtpSending(false)
    }
  }

  // Handle OTP digit input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // only digits
    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1) // take last digit
    setOtpDigits(newDigits)

    // Auto-focus next
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const newDigits = [...otpDigits]
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setOtpDigits(newDigits)
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  // Step 2: Verify OTP and create account
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otp = otpDigits.join('')
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp,
          name: formData.name,
          password: formData.password,
          role: formData.role,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Verification failed')

      localStorage.setItem('janseva_token', data.data.token)
      localStorage.setItem('janseva_user', JSON.stringify(data.data.user))

      if (data.data.user.role === 'ngo') {
        window.location.href = '/ngo-profile'
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Render Step 2: OTP Input ──────────────────────────────────────────────
  if (step === 2) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: '520px' }}>
          <div className="glass-card p-8 md:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: 'linear-gradient(135deg, var(--green-6), var(--green-7))' }}>
                <KeyRound className="h-8 w-8" style={{ color: '#d8f3dc' }} />
              </div>
              <h2 className="text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                Verify your email
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                We've sent a 6-digit code to
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: 'var(--green-7)' }}>
                {formData.email}
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.16)', color: 'var(--red-accent)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              {/* OTP Inputs */}
              <div className="flex justify-center gap-3 mb-6" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="text-center text-2xl font-extrabold"
                    style={{
                      width: '52px',
                      height: '60px',
                      borderRadius: '14px',
                      border: digit ? '2px solid var(--green-5)' : '2px solid rgba(45, 106, 79, 0.14)',
                      background: digit ? 'rgba(82, 183, 136, 0.06)' : 'rgba(255,255,255,0.92)',
                      color: 'var(--green-8)',
                      fontFamily: 'Space Grotesk, Manrope, sans-serif',
                      outline: 'none',
                      transition: 'border-color 200ms ease, background 200ms ease',
                      caretColor: 'var(--green-6)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--green-5)'; e.target.style.boxShadow = '0 0 0 4px rgba(82, 183, 136, 0.14)' }}
                    onBlur={(e) => { e.target.style.borderColor = digit ? 'var(--green-5)' : 'rgba(45, 106, 79, 0.14)'; e.target.style.boxShadow = 'none' }}
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="text-center mb-6">
                {timer > 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Code expires in <span className="font-bold" style={{ color: timer < 60 ? 'var(--red-accent)' : 'var(--green-7)' }}>{formatTime(timer)}</span>
                  </p>
                ) : (
                  <p className="text-sm font-semibold" style={{ color: 'var(--red-accent)' }}>
                    Code has expired. Please resend.
                  </p>
                )}
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || timer <= 0 || otpDigits.join('').length !== OTP_LENGTH}
                className="btn-primary w-full"
                style={{ opacity: (loading || timer <= 0 || otpDigits.join('').length !== OTP_LENGTH) ? 0.6 : 1 }}
              >
                {loading ? (
                  'Verifying...'
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Verify & Create Account
                  </>
                )}
              </button>
            </form>

            {/* Resend + Back */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => { setStep(1); setError(null) }}
                className="text-sm font-semibold flex items-center gap-1"
                style={{ color: 'var(--text-muted)', background: 'none', cursor: 'pointer' }}
              >
                ← Back to form
              </button>
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || otpSending}
                className="text-sm font-semibold flex items-center gap-1"
                style={{
                  color: resendCooldown > 0 ? 'var(--text-soft)' : 'var(--green-6)',
                  background: 'none',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw className="h-4 w-4" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ─── Render Step 1: Signup Form ────────────────────────────────────────────
  return (
    <section className="section">
      <div className="container">
        <div className="content-grid">
          <div className="light-panel p-8 md:p-12" style={{ background: 'linear-gradient(135deg, rgba(216,243,220,0.92), rgba(255,255,255,0.96) 58%, rgba(157,78,221,0.1))' }}>
            <span className="section-label">Create Account</span>
            <h1 className="page-title mt-5">Join a platform built to feel calm and capable</h1>
            <p className="page-subtitle">
              Sign up as a citizen, volunteer, or NGO representative and enter the refreshed JanSeva experience without changing the backend workflows behind it.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Roles supported', value: '2' },
                { label: 'Email verified', value: 'OTP' },
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
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: 'linear-gradient(135deg, var(--purple-accent), #7C3AED)' }}>
                <Shield className="h-8 w-8" style={{ color: '#ffffff' }} />
              </div>
              <h2 className="text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                Create your account
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>We'll verify your email with a one-time code.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(157,78,221,0.1)', border: '1px solid rgba(157,78,221,0.16)', color: 'var(--purple-accent)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Full Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5" style={{ color: 'var(--text-soft)' }} />
                  </div>
                  <input type="text" required className="input-field input-field-icon" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Email Address</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5" style={{ color: 'var(--text-soft)' }} />
                  </div>
                  <input type="email" required pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" title="Please enter a valid email address" className="input-field input-field-icon" placeholder="you@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5" style={{ color: 'var(--text-soft)' }} />
                  </div>
                  <input type={showPwd ? "text" : "password"} required className="input-field input-field-icon pr-10" placeholder="Create a password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div className={`h-full ${strengthColors[strength]} transition-all duration-300`} style={{ width: `${(strength / 5) * 100}%` }}></div>
                    </div>
                    <p className={`mt-1 text-xs font-medium ${strength < 3 ? 'text-red-500' : strength < 5 ? 'text-orange-500' : 'text-green-600'}`}>
                      Password strength: {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--green-8)' }}>I want to join as</label>
                <select className="select-field" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="volunteer">Volunteer</option>
                  <option value="ngo">NGO Representative</option>
                </select>
              </div>
              <button type="submit" disabled={otpSending} className="btn-mustard w-full">
                {otpSending ? 'Sending verification code...' : (
                  <>
                    Send Verification Code
                    <Mail className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account? <Link to="/login" className="font-semibold" style={{ color: 'var(--green-6)' }}>Log in here</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Signup

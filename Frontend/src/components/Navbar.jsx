import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, HeartHandshake, ChevronDown, BarChart3, Map, Trophy, Megaphone, Heart, ClipboardList, LogOut, User } from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  {
    label: 'Explore',
    children: [
      { to: '/explore', label: 'Find NGOs', icon: Map },
      { to: '/top-ngos', label: 'Top NGOs', icon: Trophy },
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/contributions', label: 'Contributions', icon: Heart },
      { to: '/statistics', label: 'Analytics', icon: BarChart3 },
      { to: '/submit-request', label: 'Submit Request', icon: ClipboardList },
    ],
  },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('janseva_user')
    if (stored) setUser(JSON.parse(stored))
  }, [location])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setDropOpen(false)
  }, [location])

  const logout = () => {
    localStorage.removeItem('janseva_token')
    localStorage.removeItem('janseva_user')
    setUser(null)
    navigate('/')
  }

  const isActive = (to) => location.pathname === to
  const activeStyles = {
    color: 'var(--green-8)',
    background: 'rgba(82, 183, 136, 0.14)',
  }

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(249, 254, 249, 0.92)' : 'rgba(249, 254, 249, 0.82)',
        backdropFilter: 'blur(18px)',
        boxShadow: scrolled ? '0 18px 40px rgba(27, 67, 50, 0.08)' : '0 10px 24px rgba(27, 67, 50, 0.04)',
        borderBottom: '1px solid rgba(45, 106, 79, 0.1)',
      }}
    >
      <div className="container">
        <div className="flex min-h-[84px] items-center gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, var(--green-6), var(--green-7))', boxShadow: '0 12px 24px rgba(64, 145, 108, 0.18)' }}
            >
              <HeartHandshake size={22} style={{ color: '#d8f3dc' }} />
            </div>
            <div>
              <span className="block text-[1.35rem] font-extrabold tracking-[-0.05em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                Jan<span style={{ color: 'var(--green-6)' }}>Seva</span>
              </span>
              <span className="block text-[0.7rem] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>
                NGO Platform
              </span>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center lg:flex">
            <div
              className="flex items-center gap-1 rounded-full px-2 py-2"
              style={{ background: 'rgba(255, 255, 255, 0.72)', border: '1px solid rgba(45, 106, 79, 0.08)' }}
            >
              {NAV_LINKS.map((link) =>
                link.children ? (
                  <div
                    key={link.label}
                    className="relative"
                    ref={dropdownRef}
                  >
                    <button
                      className="flex items-center gap-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all"
                      style={dropOpen ? activeStyles : { color: 'var(--text-muted)' }}
                      onClick={() => setDropOpen(!dropOpen)}
                    >
                      {link.label}
                      <ChevronDown size={14} className="transition-transform" style={{ transform: dropOpen ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    {dropOpen && (
                      <div
                        className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2 rounded-3xl p-2"
                        style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(45, 106, 79, 0.1)', boxShadow: '0 24px 48px rgba(27, 67, 50, 0.12)' }}
                      >
                        {link.children.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
                            style={isActive(child.to) ? activeStyles : { color: 'var(--text-mid)' }}
                          >
                            <child.icon size={16} style={{ color: 'var(--green-6)' }} />
                            <span>{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-full px-4 py-2.5 text-sm font-semibold transition-all"
                    style={isActive(link.to) ? activeStyles : { color: 'var(--text-muted)' }}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </nav>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <Link
                  to="/submit-request"
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
                  style={{ background: 'rgba(220,38,38,0.10)', color: '#DC2626' }}
                >
                  <ClipboardList size={16} />
                  Submit Request
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
                  style={{ background: 'rgba(82, 183, 136, 0.12)', color: 'var(--green-8)' }}
                >
                  <User size={16} />
                  {user.name?.split(' ')[0]}
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
                  style={{ background: 'rgba(76, 201, 240, 0.12)', color: '#117ea0' }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline text-sm">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-auto grid h-11 w-11 place-items-center rounded-2xl lg:hidden"
            style={{ background: 'rgba(82, 183, 136, 0.12)', color: 'var(--green-8)' }}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{ borderTop: '1px solid rgba(45, 106, 79, 0.1)', background: 'rgba(249, 254, 249, 0.98)' }}>
          <div className="container py-4">
            <div className="glass-card p-4">
              <div className="flex flex-col gap-2">
                {NAV_LINKS.map((link) =>
                  link.children ? (
                    <div key={link.label} className="rounded-2xl p-2" style={{ background: 'rgba(216, 243, 220, 0.34)' }}>
                      <p className="px-2 pb-2 text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>
                        {link.label}
                      </p>
                      {link.children.map((child) => (
                        <Link
                          key={child.to}
                          to={child.to}
                          className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold"
                          style={isActive(child.to) ? activeStyles : { color: 'var(--text-mid)' }}
                        >
                          <child.icon size={16} style={{ color: 'var(--green-6)' }} />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="rounded-2xl px-4 py-3 text-sm font-semibold"
                      style={isActive(link.to) ? activeStyles : { color: 'var(--text-mid)' }}
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 pt-4" style={{ borderTop: '1px solid rgba(45, 106, 79, 0.08)' }}>
                {user ? (
                  <>
                    <Link to="/dashboard" className="btn-outline w-full justify-center">
                      Dashboard
                    </Link>
                    <button onClick={logout} className="btn-primary w-full justify-center">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-outline w-full justify-center">
                      Login
                    </Link>
                    <Link to="/signup" className="btn-primary w-full justify-center">
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

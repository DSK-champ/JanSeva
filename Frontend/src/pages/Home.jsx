import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Building2, ClipboardList, Star, CheckCircle2, Heart } from 'lucide-react'
import AnimatedCounter from '../components/AnimatedCounter'
import TestimonialCard from '../components/TestimonialCard'
import IndiaMap from '../components/IndiaMap'
import ServiceCard from '../components/ServiceCard'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const topServices = [
  { image: '/assets/food_distribution.jpeg', title: 'Food Distribution', desc: 'Coordinate food relief efforts quickly and route support to the neighborhoods that need it most.' },
  { image: '/assets/medical_assistance.jpeg', title: 'Medical Assistance', desc: 'Connect medical camps, volunteer responders, and urgent health needs through one workflow.' },
  { image: '/assets/education_support.jpg', title: 'Education Support', desc: 'Track teaching requests, scholarships, and local education drives without losing field visibility.' },
  { image: '/assets/shelter_assistance.jpeg', title: 'Shelter Assistance', desc: 'Match shelter capacity with on-ground requests and keep delivery teams aligned in real time.' },
  { image: '/assets/emergency_resonse.avif', title: 'Emergency Response', desc: 'Spin up rapid-response coordination during disasters with clear priorities and resource tracking.' },
  { image: '/assets/voluteer_reg.jpeg', title: 'Volunteer Registration', desc: 'Bring new volunteers in fast, capture their skills, and deploy them to the right missions.' },
]

// impactStats is now dynamically generated inside the component

const testimonials = [
  { quote: 'JanSeva transformed how we coordinate our volunteers. Response time dropped dramatically and our teams finally share one clear picture.', name: 'Priya Sharma', role: 'Program Director', org: 'Sewa Foundation', initials: 'PS', color: 'bg-green-600' },
  { quote: 'The analytics helped us identify high-priority zones we were missing. It feels operationally calm instead of chaotic now.', name: 'Rajan Mehta', role: 'Field Coordinator', org: 'Bihar Relief Network', initials: 'RM', color: 'bg-green-500' },
  { quote: 'Volunteer allocation used to take hours. Now it takes minutes, and our field teams stay focused on delivery instead of coordination overhead.', name: 'Anjali Singh', role: 'Executive Director', org: 'Jan Kalyan Trust', initials: 'AS', color: 'bg-green-400' },
  { quote: 'It is simple enough for local coordinators and strong enough for leadership reporting. That balance is hard to get right, and JanSeva does it well.', name: 'Dr. Suresh Yadav', role: 'Chief Impact Officer', org: 'Pragati Sansthan', initials: 'SY', color: 'bg-green-700' },
]

const workflow = [
  { step: '01', icon: ClipboardList, title: 'Capture needs clearly', desc: 'Field workers and citizens submit structured requests so every case starts with consistent information.' },
  { step: '02', icon: Users, title: 'Match volunteers faster', desc: 'Skills, availability, and geography are organized into a cleaner volunteer assignment flow.' },
  { step: '03', icon: Building2, title: 'Track delivery confidently', desc: 'NGOs monitor execution, fulfillment, and outcomes from a single coordinated workspace.' },
]

export default function Home() {
  const [ngoLocations, setNgoLocations] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch(`${API}/stats/ngo-locations`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setNgoLocations(data.data)
      })
      .catch(() => {})

    fetch(`${API}/stats/overview`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setStats(data.data)
      })
      .catch((err) => console.error('Failed to fetch stats:', err))
  }, [])

  const impactStats = stats ? [
    { value: stats.volunteers.total, suffix: '+', label: 'Volunteers Coordinated' },
    { value: stats.ngos.verified, suffix: '+', label: 'NGOs Connected' },
    { value: stats.requests.total, suffix: '+', label: 'Requests Managed' },
    { value: 50, suffix: '+', label: 'Communities Served' },
  ] : [
    { value: 0, suffix: '+', label: 'Volunteers Coordinated' },
    { value: 0, suffix: '+', label: 'NGOs Connected' },
    { value: 0, suffix: '+', label: 'Requests Managed' },
    { value: 0, suffix: '+', label: 'Communities Served' },
  ]

  return (
    <div>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy animate-fade-up">
              <Link to="/contributions" className="inline-flex items-center gap-2 rounded-full mb-5 px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5" style={{ background: 'rgba(157, 78, 221, 0.12)', color: 'var(--purple-accent)', border: '1px solid rgba(157, 78, 221, 0.25)' }}>
                <Heart size={14} fill="currentColor" />
                Support communities in need. Donate Now &rarr;
              </Link>
              <br/>
              <span className="section-label">Smart Resource Allocation</span>
              <h1 className="hero-title">
                Calm, modern coordination for
                <span style={{ color: 'var(--green-6)' }}> NGO impact at scale</span>
              </h1>
              <p className="hero-text">
                JanSeva helps NGOs organize community needs, deploy volunteers faster, and stay aligned through a cleaner, lighter operating platform built for real field work.
              </p>

              <div className="hero-actions mt-8">
                <Link to="/services" className="btn-primary">
                  Explore Services
                  <ArrowRight size={18} />
                </Link>
                <Link to="/about" className="btn-outline">
                  Learn More
                </Link>
              </div>

              <div className="hero-meta mt-10">
                <div className="hero-avatars">
                  {['#40916C', '#52B788', '#4CC9F0', '#9D4EDD'].map((c, i) => (
                    <span key={c} style={{ background: c, marginLeft: i === 0 ? 0 : -8 }}>
                      {['NG', 'VO', 'FI', 'AI'][i]}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} style={{ color: 'var(--green-6)', fill: 'var(--green-6)' }} />
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Trusted by <strong style={{ color: 'var(--green-8)' }}>{stats ? stats.ngos.verified : 0}+ NGOs</strong> coordinating community response across India.
                  </p>
                </div>
              </div>
            </div>

            <div className="hero-visual animate-fade-up">
              <div className="hero-panel">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>
                      Live coordination
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                      One clear command center
                    </p>
                  </div>
                  <div className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: 'rgba(82, 183, 136, 0.12)', color: 'var(--green-7)' }}>
                    Light + readable
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="soft-card p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-soft)' }}>Requests synced</p>
                    <p className="mt-3 text-4xl font-extrabold tracking-[-0.05em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                      {stats ? `${stats.requests.total}+` : '0+'}
                    </p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Structured intake keeps teams aligned from report to resolution.</p>
                  </div>
                  <div className="glass-card p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-soft)' }}>Volunteer matching</p>
                    <div className="mt-4 space-y-3">
                      {['First aid', 'Food relief', 'Teaching'].map((item) => (
                        <div key={item} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: 'rgba(216, 243, 220, 0.46)' }}>
                          <span className="text-sm font-semibold" style={{ color: 'var(--green-8)' }}>{item}</span>
                          <CheckCircle2 size={16} style={{ color: 'var(--green-6)' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Resolution rate', value: stats ? `${stats.requests.resolutionRate}%` : '0%' },
                    { label: 'Average response', value: '< 1hr' },
                    { label: 'District coverage', value: '50+' },
                  ].map((item) => (
                    <div key={item.label} className="glass-card p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-soft)' }}>{item.label}</p>
                      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <span className="section-label">NGO Distribution</span>
            <h2 className="section-title mt-4">A cleaner view of your reach across India</h2>
            <p className="section-subtitle mt-4">
              Explore our network of {ngoLocations.length}+ NGOs, see where activity is concentrated, and surface high-impact organizations without visual clutter.
            </p>
          </div>

          <div className="content-grid">
            <div className="glass-card p-5 md:p-6">
              <IndiaMap ngoLocations={ngoLocations} />
            </div>
            <div className="space-y-4">
              <div className="glass-card p-6">
                <p className="eyebrow-note">Featured NGOs</p>
                <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
                  Strong coverage, clearer prioritization
                </h3>
                <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
                  The layout highlights verified, high-impact organizations without making the section feel cramped or overly dense.
                </p>
              </div>

              {ngoLocations.slice(0, 5).map((ngo) => (
                <div key={ngo._id} className="glass-card flex items-center gap-4 p-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
                    style={{
                      background:
                        ngo.contributionLevel === 'Critical'
                          ? 'linear-gradient(135deg, #9D4EDD, #7C3AED)'
                          : ngo.contributionLevel === 'High'
                            ? 'linear-gradient(135deg, #4CC9F0, #2AACC9)'
                            : 'linear-gradient(135deg, #40916C, #2D6A4F)',
                    }}
                  >
                    {ngo.name?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold" style={{ color: 'var(--green-8)' }}>{ngo.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ngo.city}, {ngo.state}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-soft)' }}>Impact</p>
                    <p className="text-sm font-extrabold" style={{ color: 'var(--green-7)' }}>{ngo.impactScore}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="section-label">What We Offer</span>
            <h2 className="section-title mt-4">Core services built on one consistent card system</h2>
            <p className="section-subtitle mt-4">
              Every service module now sits inside the same aligned, breathable layout so the platform feels modern and easy to scan.
            </p>
          </div>

          <div className="cards-grid-3">
            {topServices.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/services" className="btn-outline">
              View All Services
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Social Work Photo Gallery */}
      <section className="section" style={{ background: 'rgba(255,255,255,0.6)' }}>
        <div className="container">
          <div className="section-head">
            <span className="section-label">On The Ground</span>
            <h2 className="section-title mt-4">Real impact, real communities</h2>
            <p className="section-subtitle mt-4">
              From food distribution to education drives, JanSeva connects the people who care with the communities that need them most.
            </p>
          </div>
          <div className="cards-grid-3" style={{ gap: '16px' }}>
            <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
              <img
                src="/assets/food_distribution2.jpeg"
                alt="Volunteers distributing food in a community"
                style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '18px 20px' }}>
                <span className="badge badge-green">Food Relief</span>
                <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Community Food Distribution</p>
                <p className="mt-1 text-xs leading-6" style={{ color: 'var(--text-muted)' }}>Volunteers coordinate meals for hundreds of families every week.</p>
              </div>
            </div>
            <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
              <img
                src="/assets/medical_assistance2.jpeg"
                alt="Medical camp for rural communities"
                style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '18px 20px' }}>
                <span className="badge" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--blue-accent)' }}>Healthcare</span>
                <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Rural Medical Camps</p>
                <p className="mt-1 text-xs leading-6" style={{ color: 'var(--text-muted)' }}>Free health checkups and medicines reaching underserved villages.</p>
              </div>
            </div>
            <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
              <img
                src="/assets/education_support2.jpeg"
                alt="Education volunteers teaching children"
                style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '18px 20px' }}>
                <span className="badge" style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--red-accent)' }}>Education</span>
                <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--green-8)' }}>Volunteer Teaching Drives</p>
                <p className="mt-1 text-xs leading-6" style={{ color: 'var(--text-muted)' }}>Bringing quality education to children in rural and semi-urban areas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-head">
            <span className="section-label">Impact</span>
            <h2 className="section-title mt-4">Readable metrics with less visual noise</h2>
            <p className="section-subtitle mt-4">
              The new light palette keeps performance data prominent without relying on heavy dark backgrounds.
            </p>
          </div>

          <div className="stats-grid">
            {impactStats.map((stat) => (
              <div key={stat.label} className="glass-card metric-card text-center">
                <div className="metric-value">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="metric-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="section-label">How It Works</span>
            <h2 className="section-title mt-4">A simpler path from report to response</h2>
            <p className="section-subtitle mt-4">
              Structure, matching, and tracking now sit inside a more deliberate three-step flow with stronger spacing and hierarchy.
            </p>
          </div>

          <div className="cards-grid-3">
            {workflow.map((item, index) => (
              <div key={item.step} className="glass-card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className={`icon-shell ${index === 1 ? 'blue' : index === 2 ? 'purple' : ''}`}>
                    <item.icon size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-extrabold tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>{item.step}</span>
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--green-8)' }}>{item.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <span className="section-label">Community Trust</span>
            <h2 className="section-title mt-4">Testimonials that breathe</h2>
            <p className="section-subtitle mt-4">
              Feedback from the field now sits in cleaner, equal-height cards with better spacing and much stronger readability.
            </p>
          </div>

          <div className="cards-grid-4">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            className="light-panel mx-auto max-w-4xl p-8 text-center md:p-12"
            style={{ background: 'linear-gradient(135deg, rgba(216,243,220,0.88), rgba(255,255,255,0.96) 55%, rgba(76,201,240,0.12))' }}
          >
            <span className="section-label">Ready To Start</span>
            <h2 className="section-title mt-5">A modern NGO platform should feel calm, not crowded</h2>
            <p className="section-subtitle mx-auto mt-4 max-w-2xl">
              JanSeva now presents the platform with cleaner alignment, stronger hierarchy, and a fresher visual tone while keeping all underlying functionality intact.
            </p>
            <div className="inline-actions mt-8 justify-center">
              <Link to="/signup" className="btn-mustard">
                Get Started
                <ArrowRight size={18} />
              </Link>
              <Link to="/contact" className="btn-outline">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

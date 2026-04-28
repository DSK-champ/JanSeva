export default function StatCard({ value, label, icon: Icon, trend, color }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-3xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--green-8)', fontFamily: 'Space Grotesk, Manrope, sans-serif' }}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className="icon-shell flex-shrink-0" style={{ background: color ? `${color}15` : 'rgba(82, 183, 136, 0.14)', color: color || 'var(--green-6)' }}>
            <Icon size={20} strokeWidth={1.8} />
          </div>
        )}
      </div>
      {trend && (
        <p className="mt-4 text-xs font-bold" style={{ color: trend.up ? 'var(--green-6)' : 'var(--purple-accent)' }}>
          {trend.up ? 'Up' : 'Down'} {trend.value} {trend.label}
        </p>
      )}
    </div>
  )
}


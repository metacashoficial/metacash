import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

export function Button({ variant = 'primary', size, icon, iconRight, children, className = '', loading, disabled, block, ...props }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ')}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children !== undefined && children !== null && <span>{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={16} />}
    </button>
  )
}

export function IconButton({ icon, label, className = '', size = 18, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={`icon-btn ${className}`} {...props}>
      <Icon name={icon} size={size} />
    </button>
  )
}

export function Card({ title, subtitle, action, children, className = '', padded = true, ...props }) {
  return (
    <section className={`card ${padded ? '' : 'card-flush'} ${className}`} {...props}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Field({ label, hint, error, children, htmlFor, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}

export function Input({ label, hint, error, className = '', icon, right, ...props }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <div className={`input-wrap ${icon ? 'has-icon' : ''} ${right ? 'has-right' : ''}`}>
        {icon && <Icon name={icon} size={18} className="input-icon" />}
        <input id={id} className="input" {...props} />
        {right && <div className="input-right">{right}</div>}
      </div>
    </Field>
  )
}

export function MoneyInput({ label, hint, error, currency = 'MXN', value, onChange, large, className = '', ...props }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <div className={`input-wrap money-input ${large ? 'money-lg' : ''}`}>
        <span className="money-prefix">$</span>
        <input
          id={id}
          className="input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          {...props}
        />
        <span className="money-suffix">{currency}</span>
      </div>
    </Field>
  )
}

export function Select({ label, hint, error, children, className = '', ...props }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <div className="input-wrap select-wrap">
        <select id={id} className="input" {...props}>
          {children}
        </select>
        <Icon name="chevronDown" size={16} className="select-chevron" />
      </div>
    </Field>
  )
}

export function Segmented({ options, value, onChange, size, className = '', ariaLabel }) {
  return (
    <div className={`segmented ${size ? 'segmented-' + size : ''} ${className}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`seg-item ${value === o.value ? 'active' : ''} ${o.tone ? 'tone-' + o.tone : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId()
  return (
    <label className={`toggle-row ${disabled ? 'disabled' : ''}`} htmlFor={id}>
      {(label || description) && (
        <span className="toggle-text">
          {label && <span className="toggle-label">{label}</span>}
          {description && <span className="toggle-desc">{description}</span>}
        </span>
      )}
      <span className="toggle">
        <input id={id} type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </span>
    </label>
  )
}

export function Progress({ value, tone = 'accent', color, height = 8, label }) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0))
  return (
    <div
      className={`progress tone-${tone}`}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      aria-label={label}
    >
      <div className="progress-bar" style={{ width: `${pct * 100}%`, background: color }} />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 6, color = 'var(--accent)', children }) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

export function Empty({ icon = 'info', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function Badge({ tone = 'neutral', children, icon }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <Icon name={icon} size={13} strokeWidth={2} />}
      {children}
    </span>
  )
}

export function Stat({ label, value, icon, tone = 'neutral', foot, onClick, hint }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`stat ${onClick ? 'stat-click' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined} title={hint}>
      <div className="stat-top">
        <span className={`stat-icon tone-${tone}`}>
          <Icon name={icon} size={17} />
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </Tag>
  )
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const el = ref.current?.querySelector('[data-autofocus], input, select, textarea')
      if (el && window.matchMedia('(pointer: fine)').matches) el.focus()
    }, 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      clearTimeout(t)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="modal-root" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-grip" aria-hidden="true" />
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton icon="x" label="Cerrar" onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  )
}

export function ChipGroup({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} type="button" className={`chip ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

export function Skeleton({ height = 16, width = '100%', radius = 8 }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} />
}

// Iconos de línea propios (trazo uniforme, sin emojis).
const P = {
  home: <><path d="M3.5 10.2 12 3.5l8.5 6.7" /><path d="M5.5 8.8V20h13V8.8" /><path d="M10 20v-5.5h4V20" /></>,
  arrows: <><path d="M7 4 3.5 7.5 7 11" /><path d="M3.5 7.5H17" /><path d="m17 13 3.5 3.5L17 20" /><path d="M20.5 16.5H7" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.8" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7.5h7" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" strokeWidth="2.4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  bell: <><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 5.5 2.5 7.5 2.5 7.5H4s2.5-2 2.5-7.5" /><path d="M10.2 20a2 2 0 0 0 3.6 0" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" /><path d="M3.5 3.5v5h5" /><path d="M12 8v4.2l3 1.8" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="17" r="2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trendUp: <><path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5" /><path d="M15 7.5h5.5V13" /></>,
  trendDown: <><path d="m3.5 7.5 5.5 5.5 4-4 7.5 7.5" /><path d="M15 16.5h5.5V11" /></>,
  wallet: <><path d="M4 7.5V18a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3" /><path d="M18 7.5V5.5a1.5 1.5 0 0 0-1.5-1.5H6a2 2 0 0 0 0 4h13a1 1 0 0 1 1 1V12" /><path d="M20.5 12H17a2 2 0 0 0 0 4h3.5z" /></>,
  coins: <><ellipse cx="12" cy="6" rx="7" ry="2.8" /><path d="M5 6v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6" /><path d="M5 12v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6" /></>,
  pencil: <><path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4z" /></>,
  trash: <><path d="M4 7h16" /><path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" /><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" /><path d="M10 11v6M14 11v6" /></>,
  download: <><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevronLeft: <path d="m14.5 18-6-6 6-6" />,
  chevronRight: <path d="m9.5 18 6-6-6-6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M10.6 5.6A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.4-1.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3.5 3.5 17 17" /></>,
  sun: <><circle cx="12" cy="12" r="3.8" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  moon: <path d="M20 14.2A8 8 0 1 1 9.8 4a6.5 6.5 0 0 0 10.2 10.2" />,
  monitor: <><rect x="3" y="4" width="18" height="12.5" rx="2" /><path d="M8.5 20.5h7M12 16.5v4" /></>,
  logout: <><path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5" /><path d="m15.5 16.5 4.5-4.5-4.5-4.5" /><path d="M20 12H9.5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  play: <path d="M8 5.5v13l10-6.5z" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></>,
  arrowUp: <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
  arrowDown: <><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 16v-4.5M12 8h.01" /></>,
  alert: <><path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0" /><path d="M12 9.5v4M12 17h.01" /></>,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M3 12.5h18" /></>,
  receipt: <><path d="M5.5 3.5h13V21l-2.2-1.5L14 21l-2-1.5L10 21l-2.3-1.5L5.5 21z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></>,
  sync: <><path d="M20.5 12a8.5 8.5 0 0 1-14.5 6L3.5 15.5" /><path d="M3.5 20.5v-5h5" /><path d="M3.5 12A8.5 8.5 0 0 1 18 6l2.5 2.5" /><path d="M20.5 3.5v5h-5" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4.5h11.5l-2 4 2 4H5" /></>,
  filter: <path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" />,
  more: <><circle cx="5.5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18.5" cy="12" r="1.3" fill="currentColor" /></>,
  bellOff: <><path d="M8.6 4.4A5.5 5.5 0 0 1 17.5 9c0 2.6.6 4.5 1.2 5.7M17 16.5H4s2.5-2 2.5-7.5c0-.8.2-1.6.5-2.3" /><path d="M10.2 20a2 2 0 0 0 3.6 0" /><path d="m3.5 3.5 17 17" /></>,
}

export default function Icon({ name, size = 20, strokeWidth = 1.7, className = '', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon ${className}`}
      style={style}
    >
      {P[name] || P.info}
    </svg>
  )
}

export function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <rect width="64" height="64" rx="18" fill="var(--logo-bg)" />
      <path d="M16 42 26 29l8 7 13-16" fill="none" stroke="var(--logo-fg)" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="20" r="4.6" fill="var(--logo-dot)" />
    </svg>
  )
}

export function Wordmark({ size = 30 }) {
  return (
    <span className="wordmark">
      <Logo size={size} />
      <span className="wordmark-text">
        Meta<span>Cash</span>
      </span>
    </span>
  )
}

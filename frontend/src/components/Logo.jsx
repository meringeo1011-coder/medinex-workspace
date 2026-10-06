// Medinex brand mark: a rounded tile with a medical cross + pulse line
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mx-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#0f9b8e" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#mx-grad)" />
      <path d="M17 9h6v8h8v6h-8v8h-6v-8H9v-6h8V9z" fill="#fff" fillOpacity=".95" />
      <path d="M6 20h6l2-4 3 9 3-12 2 7h12" stroke="#0b1220" strokeOpacity=".28" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ size = 36, light = false, className = '' }) {
  return (
    <span className={`mx-logo ${light ? 'mx-logo-light' : ''} ${className}`}>
      <LogoMark size={size} />
      <span className="mx-logo-word">Medinex</span>
    </span>
  );
}

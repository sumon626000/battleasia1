/** Android-style APK icon — clean inline SVG, currentColor */
export function ApkIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* antennas */}
      <path d="M7 7.5L5.5 5.5" />
      <path d="M17 7.5L18.5 5.5" />
      {/* head */}
      <path d="M6 10.5a6 6 0 0 1 12 0v.5H6v-.5z" fill="currentColor" fillOpacity="0.15" />
      {/* eyes */}
      <circle cx="9.25" cy="9.25" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="14.75" cy="9.25" r="0.85" fill="currentColor" stroke="none" />
      {/* body */}
      <rect x="6" y="12" width="12" height="7.5" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      {/* arms */}
      <rect x="3.5" y="12.25" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="18.5" y="12.25" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
      {/* legs */}
      <rect x="9" y="19.5" width="2" height="3.5" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="13" y="19.5" width="2" height="3.5" rx="1" fill="currentColor" fillOpacity="0.15" />
      {/* down arrow badge */}
      <path d="M12 14v3.2" />
      <path d="M10.4 16l1.6 1.6 1.6-1.6" />
    </svg>
  );
}

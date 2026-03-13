import React from 'react';

export type SceneIconName =
  | 'brand'
  | 'dashboard'
  | 'robot'
  | 'history'
  | 'service'
  | 'settings'
  | 'user'
  | 'users'
  | 'audit'
  | 'key'
  | 'integration'
  | 'vscode'
  | 'custom'
  | 'synology'
  | 'notification'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'add'
  | 'copy'
  | 'save';

interface SceneIconProps {
  name: SceneIconName;
  size?: number;
  title?: string;
  style?: React.CSSProperties;
}

interface IconIds {
  bg: string;
  glow: string;
}

function SceneFrame({
  ids,
  from,
  to,
  children,
}: {
  ids: IconIds;
  from: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <defs>
        <linearGradient id={ids.bg} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={ids.glow} cx="0" cy="0" r="1" gradientTransform="translate(44 18) rotate(135) scale(28 22)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill={`url(#${ids.bg})`} />
      <rect x="6" y="6" width="52" height="52" rx="16" fill={`url(#${ids.glow})`} />
      <rect x="10" y="10" width="44" height="44" rx="14" fill="rgba(255,255,255,0.08)" />
      {children}
    </>
  );
}

function renderScene(name: SceneIconName, ids: IconIds) {
  switch (name) {
    case 'brand':
      return (
        <SceneFrame ids={ids} from="#0f7bdb" to="#17b897">
          <path d="M24 29C24 22.9 27.6 19 32 19C36.4 19 40 22.9 40 29V37H24V29Z" fill="#ffffff" />
          <path d="M22 37H42" stroke="#d9f4ff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="43.5" r="3.8" fill="#fef3c7" />
          <path d="M32 16V12" stroke="#d9f4ff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="45" cy="19" r="3.4" fill="#ffd166" />
          <path d="M18 22L20 20" stroke="#d9f4ff" strokeWidth="2.5" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'dashboard':
      return (
        <SceneFrame ids={ids} from="#1d4ed8" to="#0ea5e9">
          <rect x="19" y="35" width="6" height="11" rx="3" fill="#dbeafe" />
          <rect x="29" y="27" width="6" height="19" rx="3" fill="#eff6ff" />
          <rect x="39" y="22" width="6" height="24" rx="3" fill="#ffffff" />
          <path d="M18 26C22.5 19.8 29 17 36.5 18.6C41.8 19.8 45.3 22.6 47 27.5" stroke="#bfdbfe" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="46" cy="28" r="3.5" fill="#fef3c7" />
        </SceneFrame>
      );
    case 'robot':
      return (
        <SceneFrame ids={ids} from="#0f766e" to="#22c55e">
          <rect x="18" y="21" width="28" height="22" rx="8" fill="#ffffff" />
          <rect x="22" y="43" width="20" height="4" rx="2" fill="#d1fae5" />
          <circle cx="27" cy="31" r="3.5" fill="#0f172a" />
          <circle cx="37" cy="31" r="3.5" fill="#0f172a" />
          <path d="M26 37C28.1 39 35.9 39 38 37" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 21V15" stroke="#dcfce7" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="13" r="3.2" fill="#fde68a" />
        </SceneFrame>
      );
    case 'history':
      return (
        <SceneFrame ids={ids} from="#6d28d9" to="#ec4899">
          <rect x="18" y="18" width="20" height="26" rx="5" fill="#f5f3ff" />
          <rect x="26" y="22" width="20" height="26" rx="5" fill="#ffffff" opacity="0.9" />
          <path d="M31 29H41" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
          <path d="M31 35H41" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />
          <circle cx="22" cy="22" r="7" fill="#1f2937" />
          <path d="M22 18V22H25" stroke="#f9fafb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </SceneFrame>
      );
    case 'service':
      return (
        <SceneFrame ids={ids} from="#1f2937" to="#0f766e">
          <rect x="18" y="20" width="28" height="8" rx="4" fill="#f8fafc" />
          <rect x="18" y="31" width="28" height="8" rx="4" fill="#e2e8f0" />
          <rect x="18" y="42" width="28" height="6" rx="3" fill="#cbd5e1" />
          <circle cx="23" cy="24" r="2" fill="#22c55e" />
          <circle cx="23" cy="35" r="2" fill="#38bdf8" />
          <circle cx="23" cy="45" r="2" fill="#f59e0b" />
          <path d="M46 24L52 18" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />
          <circle cx="53" cy="17" r="3" fill="#fef3c7" />
        </SceneFrame>
      );
    case 'settings':
      return (
        <SceneFrame ids={ids} from="#0f766e" to="#2563eb">
          <path d="M20 23H44" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M20 32H44" stroke="#dbeafe" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M20 41H44" stroke="#d1fae5" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="28" cy="23" r="4.5" fill="#fde68a" />
          <circle cx="38" cy="32" r="4.5" fill="#ffffff" />
          <circle cx="24" cy="41" r="4.5" fill="#bfdbfe" />
        </SceneFrame>
      );
    case 'user':
      return (
        <SceneFrame ids={ids} from="#0ea5e9" to="#2563eb">
          <circle cx="32" cy="24" r="9" fill="#ffffff" />
          <path d="M18 46C20.7 37.9 25.4 34 32 34C38.6 34 43.3 37.9 46 46" fill="#dbeafe" />
          <path d="M20 46C22.5 39.8 26.5 37 32 37C37.5 37 41.5 39.8 44 46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'users':
      return (
        <SceneFrame ids={ids} from="#2563eb" to="#8b5cf6">
          <circle cx="25" cy="25" r="7" fill="#ffffff" opacity="0.9" />
          <circle cx="40" cy="23" r="6" fill="#dbeafe" />
          <path d="M16 46C17.8 39.6 21.8 36.4 27 36.4C32.2 36.4 36.2 39.6 38 46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 44C35.4 39.7 38.2 37.5 42 37.5C45.8 37.5 48.6 39.7 50 44" stroke="#dbeafe" strokeWidth="3" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'audit':
      return (
        <SceneFrame ids={ids} from="#4338ca" to="#0f766e">
          <path d="M32 16L45 21V31C45 39.4 39.7 45.7 32 48C24.3 45.7 19 39.4 19 31V21L32 16Z" fill="#ffffff" />
          <path d="M27 27H37" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" />
          <path d="M27 33H37" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          <path d="M27 39H34" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'key':
      return (
        <SceneFrame ids={ids} from="#d97706" to="#f59e0b">
          <circle cx="26" cy="30" r="8" fill="#fff7ed" />
          <circle cx="26" cy="30" r="3" fill="#f59e0b" />
          <path d="M31 30H45L48 27" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M39 30V35" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 30V34" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'integration':
      return (
        <SceneFrame ids={ids} from="#0891b2" to="#4f46e5">
          <circle cx="20" cy="22" r="6" fill="#ffffff" />
          <circle cx="44" cy="22" r="6" fill="#dbeafe" />
          <circle cx="32" cy="42" r="7" fill="#fde68a" />
          <path d="M25.5 24.5L28.5 36" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M38.5 24.5L35.5 36" stroke="#dbeafe" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M26 22H38" stroke="#bfdbfe" strokeWidth="3.5" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'vscode':
      return (
        <SceneFrame ids={ids} from="#2563eb" to="#7c3aed">
          <rect x="18" y="18" width="28" height="19" rx="5" fill="#eff6ff" />
          <path d="M25 24L21 28L25 32" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M39 24L43 28L39 32" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26 43H38" stroke="#dbeafe" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 37V43" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 37V43" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'custom':
      return (
        <SceneFrame ids={ids} from="#475569" to="#0f766e">
          <path d="M24 22L30 28" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 34L31 23L41 33L34 40L24 30" fill="#e2e8f0" />
          <path d="M35 18L46 29" stroke="#99f6e4" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 29L42 33" stroke="#99f6e4" strokeWidth="4" strokeLinecap="round" />
          <circle cx="21" cy="41" r="4" fill="#fde68a" />
        </SceneFrame>
      );
    case 'synology':
      return (
        <SceneFrame ids={ids} from="#ea580c" to="#f59e0b">
          <rect x="20" y="16" width="24" height="32" rx="6" fill="#fff7ed" />
          <rect x="24" y="22" width="16" height="3.5" rx="1.75" fill="#fb923c" />
          <rect x="24" y="29" width="16" height="3.5" rx="1.75" fill="#f59e0b" />
          <rect x="24" y="36" width="12" height="3.5" rx="1.75" fill="#fdba74" />
          <path d="M44 24C47 24 49 26 49 29" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 31C48.5 31 52 34 52 38" stroke="#ffedd5" strokeWidth="3" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'notification':
      return (
        <SceneFrame ids={ids} from="#0f766e" to="#14b8a6">
          <path d="M24 29C24 22.9 27.6 19 32 19C36.4 19 40 22.9 40 29V37H24V29Z" fill="#ffffff" />
          <path d="M22 37H42" stroke="#d9f4ff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="43.5" r="3.8" fill="#fde68a" />
        </SceneFrame>
      );
    case 'success':
      return (
        <SceneFrame ids={ids} from="#16a34a" to="#10b981">
          <circle cx="32" cy="32" r="14" fill="#f0fdf4" />
          <path d="M25 32.5L30 37.5L39.5 27.5" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </SceneFrame>
      );
    case 'warning':
      return (
        <SceneFrame ids={ids} from="#f59e0b" to="#f97316">
          <path d="M32 18L45 42H19L32 18Z" fill="#fffbeb" />
          <path d="M32 26V33" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="38" r="2.5" fill="#d97706" />
        </SceneFrame>
      );
    case 'error':
      return (
        <SceneFrame ids={ids} from="#dc2626" to="#ef4444">
          <circle cx="32" cy="32" r="14" fill="#fef2f2" />
          <path d="M27 27L37 37" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
          <path d="M37 27L27 37" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'info':
      return (
        <SceneFrame ids={ids} from="#2563eb" to="#0ea5e9">
          <circle cx="32" cy="32" r="14" fill="#eff6ff" />
          <circle cx="32" cy="24" r="2.5" fill="#2563eb" />
          <path d="M32 29V40" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'add':
      return (
        <SceneFrame ids={ids} from="#2563eb" to="#22c55e">
          <circle cx="32" cy="32" r="14" fill="#f8fafc" />
          <path d="M32 24V40" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
          <path d="M24 32H40" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
          <circle cx="44.5" cy="19.5" r="3" fill="#fde68a" />
        </SceneFrame>
      );
    case 'copy':
      return (
        <SceneFrame ids={ids} from="#1d4ed8" to="#64748b">
          <rect x="19" y="18" width="18" height="22" rx="4" fill="#e2e8f0" />
          <rect x="27" y="24" width="18" height="22" rx="4" fill="#ffffff" />
          <path d="M31 30H41" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
          <path d="M31 36H41" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
        </SceneFrame>
      );
    case 'save':
      return (
        <SceneFrame ids={ids} from="#0f766e" to="#2563eb">
          <path d="M20 18H40L44 22V46H20V18Z" fill="#f8fafc" />
          <rect x="25" y="18" width="10" height="8" rx="2" fill="#60a5fa" />
          <rect x="24" y="33" width="16" height="9" rx="3" fill="#dbeafe" />
        </SceneFrame>
      );
    default:
      return null;
  }
}

export default function SceneIcon({ name, size = 20, title, style }: SceneIconProps) {
  const idBase = React.useId().replace(/:/g, '');
  const ids = {
    bg: `${idBase}-bg`,
    glow: `${idBase}-glow`,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      {renderScene(name, ids)}
    </svg>
  );
}

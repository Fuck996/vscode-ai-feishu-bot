import React from 'react';

import SceneIcon, { type SceneIconName } from './SceneIcon';

type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'active' | 'inactive';

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
}

interface BadgeConfig {
  icon: SceneIconName;
  color: string;
  backgroundColor: string;
}

const BADGE_CONFIG: Record<StatusTone, BadgeConfig> = {
  success: {
    icon: 'success',
    color: '#1a7f37',
    backgroundColor: '#dcfce7',
  },
  error: {
    icon: 'error',
    color: '#cf222e',
    backgroundColor: '#fee2e2',
  },
  warning: {
    icon: 'warning',
    color: '#9a6700',
    backgroundColor: '#fef3c7',
  },
  info: {
    icon: 'info',
    color: '#0969da',
    backgroundColor: '#dbeafe',
  },
  active: {
    icon: 'success',
    color: '#1a7f37',
    backgroundColor: '#dcfce7',
  },
  inactive: {
    icon: 'error',
    color: '#57606a',
    backgroundColor: '#e5e7eb',
  },
};

export default function StatusBadge({ tone, label }: StatusBadgeProps) {
  const config = BADGE_CONFIG[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.7rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.backgroundColor,
        lineHeight: 1,
      }}
    >
      <SceneIcon name={config.icon} size={14} title={label} style={{ color: config.color }} />
      <span>{label}</span>
    </span>
  );
}
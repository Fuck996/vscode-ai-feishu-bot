import React from 'react';
import {
  AlertTriangle,
  Bell,
  Bot,
  BotMessageSquare,
  ChartNoAxesCombined,
  CheckCircle2,
  Cog,
  Copy,
  HardDrive,
  History,
  Info,
  KeyRound,
  PcCase,
  Plus,
  Save,
  ShieldCheck,
  Send,
  TerminalSquare,
  type LucideIcon,
  UserCircle2,
  Users,
  Workflow,
  Wrench,
  XCircle,
} from 'lucide-react';

export type SceneIconName =
  | 'brand'
  | 'dashboard'
  | 'robot'
  | 'robotMessage'
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
  inheritColor?: boolean;
}

interface IconConfig {
  Icon: LucideIcon;
  color?: string;
}

const GITHUB_ICON_COLORS = {
  brand: '#0969da',
  neutral: '#57606a',
  success: '#1a7f37',
  warning: '#9a6700',
  error: '#cf222e',
  info: '#0969da',
};

const ICONS: Record<SceneIconName, IconConfig> = {
  brand: {
    Icon: Send,
    color: GITHUB_ICON_COLORS.brand,
  },
  dashboard: {
    Icon: ChartNoAxesCombined,
  },
  robot: {
    Icon: Bot,
  },
  robotMessage: {
    Icon: BotMessageSquare,
  },
  history: {
    Icon: History,
  },
  service: {
    Icon: PcCase,
  },
  settings: {
    Icon: Cog,
  },
  user: {
    Icon: UserCircle2,
  },
  users: {
    Icon: Users,
  },
  audit: {
    Icon: ShieldCheck,
  },
  key: {
    Icon: KeyRound,
  },
  integration: {
    Icon: Workflow,
  },
  vscode: {
    Icon: TerminalSquare,
  },
  custom: {
    Icon: Wrench,
  },
  synology: {
    Icon: HardDrive,
  },
  notification: {
    Icon: Bell,
  },
  success: {
    Icon: CheckCircle2,
    color: GITHUB_ICON_COLORS.success,
  },
  warning: {
    Icon: AlertTriangle,
    color: GITHUB_ICON_COLORS.warning,
  },
  error: {
    Icon: XCircle,
    color: GITHUB_ICON_COLORS.error,
  },
  info: {
    Icon: Info,
    color: GITHUB_ICON_COLORS.info,
  },
  add: {
    Icon: Plus,
  },
  copy: {
    Icon: Copy,
  },
  save: {
    Icon: Save,
  },
};

export default function SceneIcon({ name, size = 20, title, style, inheritColor = false }: SceneIconProps) {
  const icon = ICONS[name] ?? ICONS.service;
  const iconSize = Math.max(16, size);
  const iconColor = inheritColor ? 'currentColor' : icon.color ?? GITHUB_ICON_COLORS.neutral;

  return (
    <span
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: iconColor,
        lineHeight: 0,
        ...style,
      }}
    >
      <icon.Icon size={iconSize} strokeWidth={1.85} />
    </span>
  );
}

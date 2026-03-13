/**
 * 服务日志内存缓冲区
 *
 * 提供轻量级的环形日志缓冲，记录系统关键事件（Webhook 接收、MCP 调用、飞书推送等）。
 * 日志在内存中保存最近 MAX_ENTRIES 条；服务重启后清空。
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogUserInfo {
  id: string;
  username: string;
  nickname?: string;
  displayName: string;
}

export interface LogRobotInfo {
  id: string;
  name: string;
}

export interface LogIntegrationInfo {
  id: string;
  name: string;
  type: string;
}

export interface LogContext {
  user?: LogUserInfo;
  robot?: LogRobotInfo;
  integration?: LogIntegrationInfo;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  user?: LogUserInfo;
  robot?: LogRobotInfo;
  integration?: LogIntegrationInfo;
}

const MAX_ENTRIES = 200;
const buffer: LogEntry[] = [];
let counter = 0;

function now(): string {
  return new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function addLog(level: LogLevel, service: string, message: string, context?: LogContext): void {
  counter += 1;
  const entry: LogEntry = {
    id: counter,
    timestamp: now(),
    level,
    service,
    message,
    ...(context || {}),
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_ENTRIES);
  }
}

/** 返回最新日志，limit 最多取 MAX_ENTRIES 条，按时间倒序 */
export function getLogs(limit = 50): LogEntry[] {
  const n = Math.min(limit, MAX_ENTRIES);
  return buffer.slice(-n).reverse();
}

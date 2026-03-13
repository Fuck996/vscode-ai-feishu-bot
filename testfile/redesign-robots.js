// Robots.tsx 重设计脚本
// 保留 lines 1-594，重写 return() 主体，保留模态框（595行起）
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/Robots.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// 找到 "return (" 的行（主 return，不是 loading return）
let mainReturnLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'return (' && i > 270) {
    mainReturnLine = i;
    break;
  }
}

// 找到 "  {/* 编辑机器人模态框 */}" 的行
let editModalLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* 编辑机器人模态框 */}')) {
    editModalLine = i;
    break;
  }
}

console.log('主 return 行(0-idx):', mainReturnLine, '=', mainReturnLine + 1);
console.log('编辑模态框行(0-idx):', editModalLine, '=', editModalLine + 1);

// 提取需要保留的部分
const beforeReturn = lines.slice(0, mainReturnLine).join('\n');
const modalsAndAfter = lines.slice(editModalLine - 1).join('\n');

// 新的 imports（替换旧的 import 行）
// 旧: import React, { useEffect, useState } from 'react';
// 新: 增加 CalendarDays, ChevronDown, Clock3, MoreHorizontal, Search

// 构建新的 return 主体
const newMainReturn = `
  // 过滤机器人列表
  const filteredRobots = robots.filter(robot => {
    if (statusFilter !== 'all' && robot.status !== statusFilter) return false;
    if (searchQuery.trim() !== '' && !robot.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // 格式化最后消息时间
  const formatLastMessageDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      };
    } catch {
      return { date: '未知', time: '' };
    }
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

        {/* 搜索框 - 卡片外右上角 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', border: '1px solid #d0d7de', borderRadius: '2rem', backgroundColor: 'white', width: '220px' }}>
            <Search size={14} color="#57606a" />
            <input
              type="text"
              placeholder="搜索机器人名称"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', width: '100%', color: '#24292f', backgroundColor: 'transparent' }}
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* 机器人列表卡片 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* 卡片标头 */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            {/* 左侧：新建按钮 */}
            <button
              onClick={() => setIsAddRobotModalOpen(true)}
              style={{ padding: '0.45rem 0.875rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              ＋ 新建机器人
            </button>
            {/* 右侧：标题 + 数量 + 状态筛选 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>机器人管理</span>
              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {filteredRobots.length} 个</span>
              {/* 状态筛选下拉 */}
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setOpenFilterMenu(!openFilterMenu)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', fontSize: '0.8125rem', fontWeight: 500, color: '#24292f', border: '1px solid #d0d7de', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  状态
                  {statusFilter !== 'all' && <span style={{ backgroundColor: '#0969da', color: 'white', borderRadius: '999px', fontSize: '0.6875rem', padding: '0 5px', marginLeft: '2px' }}>1</span>}
                  <ChevronDown size={14} />
                </button>
                {openFilterMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0, minWidth: '120px', padding: '0.4rem', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 8px 24px rgba(31,35,40,0.12)', zIndex: 20 }}>
                    {[
                      { label: '全部', value: 'all' },
                      { label: '启用', value: 'active' },
                      { label: '禁用', value: 'inactive' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setStatusFilter(opt.value as 'all' | 'active' | 'inactive'); setOpenFilterMenu(false); }}
                        style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: statusFilter === opt.value ? '#f3f4f6' : 'transparent', color: '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: statusFilter === opt.value ? 600 : 400 }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 表格区域 */}
          <div style={{ overflowX: 'auto' }}>
            {filteredRobots.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                {robots.length === 0 ? (
                  <p>暂无机器人，点击"新建机器人"创建第一个</p>
                ) : (
                  <p>没有符合条件的机器人</p>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <tbody>
                  {filteredRobots.map(robot => {
                    const lastMsg = robot.lastMessageAt ? formatLastMessageDate(robot.lastMessageAt) : null;
                    return (
                      <tr key={robot.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {/* 列1：名称 + 消息数 */}
                        <td style={{ padding: '0.875rem 1.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 600, color: '#1f2328', fontSize: '0.875rem' }}>{robot.name}</span>
                            <span style={{ color: '#656d76', fontSize: '0.75rem' }}>{robot.messageCount || 0} 条记录</span>
                          </div>
                        </td>
                        {/* 列2：创建时间 + App ID */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '200px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500 }}>
                              <CalendarDays size={13} color="#57606a" />
                              <span>{getCreateDate(robot.createdAt)}</span>
                            </span>
                            <span style={{ color: '#656d76', fontSize: '0.75rem', paddingLeft: '1.2rem' }}>APP ID: {getAppId(robot.id)}</span>
                          </div>
                        </td>
                        {/* 列3：最后消息时间 */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '160px' }}>
                          {lastMsg ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500 }}>
                                <CalendarDays size={13} color="#57606a" />
                                <span>{lastMsg.date}</span>
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#656d76', fontSize: '0.75rem' }}>
                                <Clock3 size={13} color="#57606a" />
                                <span>{lastMsg.time}</span>
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>未发送</span>
                          )}
                        </td>
                        {/* 列4：快捷开关 */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '90px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleToggleRobotStatus(robot)}
                              style={{ width: '40px', height: '22px', backgroundColor: robot.status === 'active' ? '#10b981' : '#cbd5e1', borderRadius: '11px', position: 'relative', cursor: 'pointer', border: 'none', padding: 0, transition: 'background-color 0.2s', flexShrink: 0 }}
                            >
                              <div style={{ width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '9px', position: 'absolute', top: '2px', left: robot.status === 'active' ? '20px' : '2px', transition: 'left 0.2s' }} />
                            </button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: robot.status === 'active' ? '#10b981' : '#9ca3af', whiteSpace: 'nowrap' }}>
                              {robot.status === 'active' ? '启用' : '禁用'}
                            </span>
                          </div>
                        </td>
                        {/* 列5：操作菜单 */}
                        <td style={{ padding: '0.875rem 1rem', width: '56px', textAlign: 'right', position: 'relative' }}>
                          <div style={{ display: 'inline-flex', position: 'relative' }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === robot.id ? null : robot.id)}
                              style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d0d7de', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#57606a', cursor: 'pointer' }}
                              aria-label="更多操作"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {openMenuId === robot.id && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0, minWidth: '120px', padding: '0.4rem', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 8px 24px rgba(31,35,40,0.12)', zIndex: 20 }}>
                                {([
                                  { label: '测试', color: '#1f2328', action: () => { handleTestRobot(robot.id); setOpenMenuId(null); } },
                                  { label: '集成', color: '#1f2328', action: () => { navigate(\`/robots/\${robot.id}/integrations\`); setOpenMenuId(null); } },
                                  { label: '编辑', color: '#1f2328', action: () => { handleOpenEditModal(robot); setOpenMenuId(null); } },
                                  { label: '删除', color: '#cf222e', action: () => { handleDeleteRobot(robot.id); setOpenMenuId(null); } },
                                ] as const).map(item => (
                                  <button
                                    key={item.label}
                                    type="button"
                                    onClick={item.action}
                                    style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: 'transparent', color: item.color, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f6f8fa')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

`;

// 重建文件内容
// 1. 更新 import 行（添加 CalendarDays, ChevronDown, Clock3, MoreHorizontal, Search）
// 2. 添加新state变量
// 3. 替换主 return() 段落

let newContent = content;

// 更新 imports
newContent = newContent.replace(
  "import React, { useEffect, useState } from 'react';",
  "import React, { useEffect, useState } from 'react';"
);

// 添加 lucide-react import
newContent = newContent.replace(
  "import { useNavigate } from 'react-router-dom';",
  "import { CalendarDays, ChevronDown, Clock3, MoreHorizontal, Search } from 'lucide-react';\nimport { useNavigate } from 'react-router-dom';"
);

// 添加新 state 变量（在 editFormData 声明后添加）
newContent = newContent.replace(
  "  const [editFormData, setEditFormData] = useState({ name: '', description: '', webhookUrl: '' });",
  "  const [editFormData, setEditFormData] = useState({ name: '', description: '', webhookUrl: '' });\n  const [searchQuery, setSearchQuery] = useState('');\n  const [openMenuId, setOpenMenuId] = useState<string | null>(null);\n  const [openFilterMenu, setOpenFilterMenu] = useState(false);\n  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');"
);

// 添加 useEffect 监听窗口点击关闭菜单（在 fetchRobots useEffect 后）
newContent = newContent.replace(
  "  useEffect(() => {\n    fetchRobots();\n  }, []);",
  "  useEffect(() => {\n    fetchRobots();\n  }, []);\n\n  useEffect(() => {\n    if (!openMenuId && !openFilterMenu) return undefined;\n    const handleClick = () => { setOpenMenuId(null); setOpenFilterMenu(false); };\n    window.addEventListener('click', handleClick);\n    return () => window.removeEventListener('click', handleClick);\n  }, [openMenuId, openFilterMenu]);"
);

// 替换主 return() 到 编辑模态框注释 之间的内容
// 找第二个 "  return (" 的位置（第一个是 loading return，第二个才是主 return）
let retSearchStart = 0;
let firstRetIdx = newContent.indexOf('  return (', retSearchStart);
const mainReturnIdx = newContent.indexOf('  return (', firstRetIdx + 1);
const editModalIdx = newContent.indexOf('{/* 编辑机器人模态框 */}');
// 找编辑模态框所在行的行首（包含前面的空白）
const editModalLineStart = newContent.lastIndexOf('\n', editModalIdx);

console.log('主return位置:', mainReturnIdx);
console.log('编辑模态框行首位置:', editModalLineStart);

const before = newContent.substring(0, mainReturnIdx);
const modals = newContent.substring(editModalLineStart);

const finalContent = before + newMainReturn + modals;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('✅ Robots.tsx 重设计完成');

// 统计行数
const totalLines = finalContent.split('\n').length;
console.log('总行数:', totalLines);

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 读取文件，移除 BOM
function readFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

// 写文件（无 BOM，保留原始换行符）
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

// 精确字符串替换（报告未找到情况）
function replaceExact(content, oldStr, newStr, desc) {
  const idx = content.indexOf(oldStr);
  if (idx === -1) {
    console.warn(`  ⚠️  未找到替换目标: ${desc}`);
    return content;
  }
  console.log(`  ✅ 替换: ${desc}`);
  return content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
}

// ===== 修复 Robots.tsx =====
{
  const filePath = path.join(rootDir, 'frontend/src/pages/Robots.tsx');
  console.log('\n=== 修复 Robots.tsx ===');
  let content = readFile(filePath);

  // 1. 检测换行符类型
  const crlf = content.includes('\r\n');
  const NL = crlf ? '\r\n' : '\n';
  console.log(`  换行符: ${crlf ? 'CRLF' : 'LF'}`);

  // 2. 添加 ActionMenuState 接口
  const robotsResponseEnd = `interface RobotsResponse {${NL}  success: boolean;${NL}  data: Robot[];${NL}  error?: string;${NL}}`;
  const actionMenuStateAdd = `interface RobotsResponse {${NL}  success: boolean;${NL}  data: Robot[];${NL}  error?: string;${NL}}${NL}${NL}interface ActionMenuState {${NL}  robotId: string;${NL}  top: number;${NL}  left: number;${NL}}`;
  content = replaceExact(content, robotsResponseEnd, actionMenuStateAdd, '添加 ActionMenuState 接口');

  // 3. 替换 openMenuId 状态
  content = replaceExact(
    content,
    `  const [openMenuId, setOpenMenuId] = useState<string | null>(null);`,
    `  const [openActionMenu, setOpenActionMenu] = useState<ActionMenuState | null>(null);`,
    '替换 openMenuId 状态'
  );

  // 4. 在 fetchRobots useEffect 后添加 window click handler
  const fetchRobotsEffect = `  useEffect(() => {${NL}    fetchRobots();${NL}  }, []);${NL}${NL}  const fetchRobots`;
  const fetchRobotsEffectNew = `  useEffect(() => {${NL}    fetchRobots();${NL}  }, []);${NL}${NL}  useEffect(() => {${NL}    if (!openActionMenu) return undefined;${NL}    const handler = () => setOpenActionMenu(null);${NL}    window.addEventListener('click', handler);${NL}    return () => window.removeEventListener('click', handler);${NL}  }, [openActionMenu]);${NL}${NL}  const fetchRobots`;
  content = replaceExact(content, fetchRobotsEffect, fetchRobotsEffectNew, '添加 window click handler');

  // 5. 在过滤函数前添加 openActionMenuAt 函数
  content = replaceExact(
    content,
    `  // 过滤机器人列表`,
    `  const openActionMenuAt = (event: React.MouseEvent<HTMLButtonElement>, robotId: string) => {${NL}    event.stopPropagation();${NL}    const rect = event.currentTarget.getBoundingClientRect();${NL}    setOpenActionMenu(current => {${NL}      if (current?.robotId === robotId) return null;${NL}      return { robotId, top: rect.bottom + 8, left: rect.right - 132 };${NL}    });${NL}  };${NL}${NL}  // 过滤机器人列表`,
    '添加 openActionMenuAt 函数'
  );

  // 6. 修改按钮 onClick
  content = replaceExact(
    content,
    `                              onClick={() => setOpenMenuId(openMenuId === robot.id ? null : robot.id)}`,
    `                              onClick={(event) => openActionMenuAt(event, robot.id)}`,
    '修改按钮 onClick'
  );

  // 7. 删除嵌套的 absolute 下拉菜单
  // 先找它开始的位置
  const nestedDropdownStart = `${NL}                            {openMenuId === robot.id && (`;
  const startIdx = content.indexOf(nestedDropdownStart);
  if (startIdx !== -1) {
    // 找结束位置：查找对应的 )}
    // 它的结构是 {openMenuId === robot.id && ( <div>...</div> )}
    // 找 <- 最近的关闭 )}
    let depth = 0;
    let i = startIdx + nestedDropdownStart.length;
    let endIdx = -1;
    // 找第一个 '(' 之后的配对 ')'
    // 其实整个模式就是 { ... && ( <jsx_here> ) }
    // 我们用简单的括号计数
    // 但这个匹配方法对嵌套 JSX 不够好，用 indexOf 方式
    // 找下一个 `            )}` (关闭这个块的)
    endIdx = content.indexOf(`${NL}                            )}`, i);
    if (endIdx !== -1) {
      const endLen = `${NL}                            )}`.length;
      content = content.slice(0, startIdx) + content.slice(endIdx + endLen);
      console.log('  ✅ 删除嵌套下拉菜单');
    } else {
      console.warn('  ⚠️  未找到嵌套下拉菜单的结束标记');
    }
  } else {
    console.warn('  ⚠️  未找到嵌套下拉菜单的开始标记');
  }

  // 8. 在编辑模态框前添加 fixed 定位下拉菜单
  const fixedDropdown = `      {/* 三点菜单浮层（fixed 定位避免被 overflow 截断）*/}${NL}      {openActionMenu ? (${NL}        <div${NL}          style={{${NL}            position: 'fixed',${NL}            top: openActionMenu.top,${NL}            left: openActionMenu.left,${NL}            minWidth: '132px',${NL}            padding: '0.4rem',${NL}            backgroundColor: '#ffffff',${NL}            border: '1px solid #d0d7de',${NL}            borderRadius: '0.75rem',${NL}            boxShadow: '0 12px 28px rgba(31, 35, 40, 0.12)',${NL}            zIndex: 9999,${NL}          }}${NL}          onClick={(event) => event.stopPropagation()}${NL}        >${NL}          {([${NL}            { label: '测试', color: '#1f2328', action: () => { handleTestRobot(openActionMenu.robotId); setOpenActionMenu(null); } },${NL}            { label: '集成', color: '#1f2328', action: () => { navigate(\`/robots/\${openActionMenu.robotId}/integrations\`); setOpenActionMenu(null); } },${NL}            { label: '编辑', color: '#1f2328', action: () => { const r = robots.find(x => x.id === openActionMenu.robotId); if (r) handleOpenEditModal(r); setOpenActionMenu(null); } },${NL}            { label: '删除', color: '#cf222e', action: () => { handleDeleteRobot(openActionMenu.robotId); setOpenActionMenu(null); } },${NL}          ] as const).map(item => (${NL}            <button${NL}              key={item.label}${NL}              type="button"${NL}              onClick={item.action}${NL}              style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: 'transparent', color: item.color, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}${NL}              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f6f8fa')}${NL}              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}${NL}            >${NL}              {item.label}${NL}            </button>${NL}          ))}${NL}        </div>${NL}      ) : null}${NL}${NL}      {/* 编辑机器人模态框 */}`;

  content = replaceExact(
    content,
    `      {/* 编辑机器人模态框 */}`,
    fixedDropdown,
    '添加 fixed 定位下拉菜单'
  );

  writeFile(filePath, content);
  console.log('  ✅ Robots.tsx 已写回磁盘');

  // 验证
  const verify = readFile(filePath);
  console.log(`  验证 openMenuId: ${(verify.match(/openMenuId/g) || []).length} 处`);
  console.log(`  验证 openActionMenu: ${(verify.match(/openActionMenu/g) || []).length} 处`);
  console.log(`  验证 position: 'fixed': ${(verify.match(/position: 'fixed'/g) || []).length} 处`);
}

// ===== 修复 History.tsx =====
{
  const filePath = path.join(rootDir, 'frontend/src/pages/History.tsx');
  console.log('\n=== 修复 History.tsx ===');
  let content = readFile(filePath);

  const crlf = content.includes('\r\n');
  const NL = crlf ? '\r\n' : '\n';
  console.log(`  换行符: ${crlf ? 'CRLF' : 'LF'}`);

  // 1. 添加 ActionMenuState 接口（在组件函数前）
  content = replaceExact(
    content,
    `const History: React.FC = () => {`,
    `interface ActionMenuState {${NL}  notificationId: string;${NL}  top: number;${NL}  left: number;${NL}}${NL}${NL}const History: React.FC = () => {`,
    '添加 ActionMenuState 接口'
  );

  // 2. 替换 openActionMenuId 状态
  content = replaceExact(
    content,
    `  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);`,
    `  const [openActionMenu, setOpenActionMenu] = useState<ActionMenuState | null>(null);`,
    '替换 openActionMenuId 状态'
  );

  // 3. 修改 useEffect 中的引用
  content = replaceExact(
    content,
    `    if (!openActionMenuId && !openFilterMenu) return undefined;${NL}    const handler = () => { setOpenActionMenuId(null); setOpenFilterMenu(null); };`,
    `    if (!openActionMenu && !openFilterMenu) return undefined;${NL}    const handler = () => { setOpenActionMenu(null); setOpenFilterMenu(null); };`,
    '修改 useEffect 中 openActionMenuId 引用'
  );
  content = replaceExact(
    content,
    `  }, [openActionMenuId, openFilterMenu]);`,
    `  }, [openActionMenu, openFilterMenu]);`,
    '修改 useEffect 依赖数组'
  );

  // 4. 添加 openActionMenuAt 函数（在 fetchData 前）
  content = replaceExact(
    content,
    `  const fetchData = async () => {`,
    `  const openActionMenuAt = (event: React.MouseEvent<HTMLButtonElement>, notificationId: string) => {${NL}    event.stopPropagation();${NL}    const rect = event.currentTarget.getBoundingClientRect();${NL}    setOpenActionMenu(current => {${NL}      if (current?.notificationId === notificationId) return null;${NL}      return { notificationId, top: rect.bottom + 8, left: rect.right - 132 };${NL}    });${NL}  };${NL}${NL}  const fetchData = async () => {`,
    '添加 openActionMenuAt 函数'
  );

  // 5. 修改按钮 onClick
  content = replaceExact(
    content,
    `                               onClick={() => setOpenActionMenuId(openActionMenuId === notification.id ? null : notification.id)}`,
    `                               onClick={(event) => openActionMenuAt(event, notification.id)}`,
    '修改按钮 onClick'
  );

  // 6. 删除嵌套的 absolute 下拉菜单
  const historyNestedStart = `${NL}                            {openActionMenuId === notification.id && (`;
  const hStartIdx = content.indexOf(historyNestedStart);
  if (hStartIdx !== -1) {
    const historyNestedEnd = `${NL}                            )}`;
    const hEndIdx = content.indexOf(historyNestedEnd, hStartIdx + historyNestedStart.length);
    if (hEndIdx !== -1) {
      content = content.slice(0, hStartIdx) + content.slice(hEndIdx + historyNestedEnd.length);
      console.log('  ✅ 删除 History 嵌套下拉菜单');
    } else {
      console.warn('  ⚠️  未找到 History 嵌套下拉菜单的结束标记');
    }
  } else {
    console.warn('  ⚠️  未找到 History 嵌套下拉菜单的开始标记');
  }

  // 7. 添加 titleSearch 状态（在 itemsPerPage 前）
  content = replaceExact(
    content,
    `  const itemsPerPage = 10;`,
    `  const [titleSearch, setTitleSearch] = useState('');${NL}  const itemsPerPage = 10;`,
    '添加 titleSearch 状态'
  );

  // 8. 在 displayedNotifications 过滤中加入 titleSearch
  content = replaceExact(
    content,
    `  const displayedNotifications = notifications.filter(n => {`,
    `  const displayedNotifications = notifications.filter(n => {${NL}    if (titleSearch.trim() && !n.title.toLowerCase().includes(titleSearch.toLowerCase())) return false;`,
    '添加 titleSearch 过滤'
  );

  // 9. 在通知历史卡片前添加搜索框
  content = replaceExact(
    content,
    `        {/* 通知历史表格 */}`,
    `        {/* 消息名称搜索框 */}${NL}        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>${NL}          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', border: '1px solid #d0d7de', borderRadius: '2rem', backgroundColor: 'white', width: '240px' }}>${NL}            <Search size={14} color="#57606a" />${NL}            <input${NL}              type="text"${NL}              placeholder="搜索消息名称"${NL}              value={titleSearch}${NL}              onChange={e => { setTitleSearch(e.target.value); setCurrentPage(1); }}${NL}              style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', width: '100%', color: '#24292f', backgroundColor: 'transparent' }}${NL}            />${NL}          </div>${NL}        </div>${NL}${NL}        {/* 通知历史表格 */}`,
    '添加消息名称搜索框'
  );

  // 10. 添加 fixed 定位下拉菜单（在 selectedNotification 弹窗前）
  const fixedDropdownHistory = `      {/* 三点菜单浮层（fixed 定位）*/}${NL}      {openActionMenu ? (${NL}        <div${NL}          style={{${NL}            position: 'fixed',${NL}            top: openActionMenu.top,${NL}            left: openActionMenu.left,${NL}            minWidth: '132px',${NL}            padding: '0.4rem',${NL}            backgroundColor: '#ffffff',${NL}            border: '1px solid #d0d7de',${NL}            borderRadius: '0.75rem',${NL}            boxShadow: '0 12px 28px rgba(31, 35, 40, 0.12)',${NL}            zIndex: 9999,${NL}          }}${NL}          onClick={(event) => event.stopPropagation()}${NL}        >${NL}          <button${NL}            type="button"${NL}            onClick={() => {${NL}              const n = notifications.find(x => x.id === openActionMenu.notificationId);${NL}              if (n) setSelectedNotification(n);${NL}              setOpenActionMenu(null);${NL}            }}${NL}            style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}${NL}            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; }}${NL}            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}${NL}          >${NL}            查看${NL}          </button>${NL}        </div>${NL}      ) : null}${NL}${NL}      {selectedNotification && (`;
  content = replaceExact(
    content,
    `      {selectedNotification && (`,
    fixedDropdownHistory,
    '添加 fixed 定位下拉菜单'
  );

  writeFile(filePath, content);
  console.log('  ✅ History.tsx 已写回磁盘');

  // 验证
  const verify = readFile(filePath);
  console.log(`  验证 openActionMenuId: ${(verify.match(/openActionMenuId/g) || []).length} 处`);
  console.log(`  验证 openActionMenu: ${(verify.match(/openActionMenu/g) || []).length} 处`);
  console.log(`  验证 position: 'fixed': ${(verify.match(/position: 'fixed'/g) || []).length} 处`);
  console.log(`  验证 titleSearch: ${(verify.match(/titleSearch/g) || []).length} 处`);
  console.log(`  验证 搜索消息名称: ${(verify.match(/搜索消息名称/g) || []).length} 处`);
}

console.log('\n✅ 所有修改完成！');

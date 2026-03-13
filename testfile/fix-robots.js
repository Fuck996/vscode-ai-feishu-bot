// Robots.tsx 综合修复脚本
// 1. 恢复 SceneIcon 导入
// 2. 标头：机器人管理标题移到左侧，新建按钮移到右侧
// 3. 机器人名称旁边恢复 SceneIcon 图标
// 4. 创建日期前加"创建日期"文字

const fs = require('fs');
const filePath = 'd:/work/vscode-ai-feishu-bot/frontend/src/pages/Robots.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// ===== 1. 添加 SceneIcon 导入 =====
const importOld = "import { useToast } from '../hooks/useToast';";
const importNew = "import SceneIcon from '../components/SceneIcon';\nimport { useToast } from '../hooks/useToast';";
if (!content.includes("import SceneIcon")) {
  content = content.replace(importOld, importNew);
  console.log('✅ 1. 添加 SceneIcon 导入');
} else {
  console.log('⚠ 1. SceneIcon 已存在');
}

// ===== 2. 交换标头：左侧标题，右侧新建按钮 =====
// 当前: 左侧新建按钮, 右侧（标题+state筛选）
// 目标: 左侧（标题+数量），右侧（状态筛选+新建按钮）
const headerOld = `            {/* 左侧：新建按钮 */}
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
              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {filteredRobots.length} 个</span>`;

const headerNew = `            {/* 左侧：标题 + 数量 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>机器人管理</span>
              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {filteredRobots.length} 个</span>
            </div>
            {/* 右侧：状态筛选 + 新建按钮 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>`;

if (content.includes(headerOld)) {
  content = content.replace(headerOld, headerNew);
  console.log('✅ 2. 标头布局已修正（标题左/按钮右）');

  // 修复：把原右侧 div 的关闭标签 + 新建按钮 从尾部的 div 移到右侧 div 末尾
  // 在状态筛选的关闭 </div> 之后，需要加上新建机器人按钮，然后关闭右侧 div
  // 原来右侧 div 结构是: 标题 + 数量 + 状态筛选下拉
  // 现在左侧 div 只有 标题+数量，右侧 div 需要有: 状态筛选下拉 + 新建按钮
  
  // 找到状态筛选下拉 div 的关闭，在其后加新建按钮
  // 状态筛选 div 关闭后，需要加 新建按钮，然后关闭右侧 div
  // 原来结构末尾: `              </div>\n            </div>` (关闭筛选dropdown div 和右侧div)
  // 变成: `              </div>\n              <button>新建机器人</button>\n            </div>`
  
  const filterCloseOld = `              </div>
            </div>
          </div>
          {/* 表格区域 */}`;
  
  const filterCloseNew = `              </div>
              <button
                onClick={() => setIsAddRobotModalOpen(true)}
                style={{ padding: '0.45rem 0.875rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#059669')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#10b981')}
              >
                ＋ 新建机器人
              </button>
            </div>
          </div>
          {/* 表格区域 */}`;
  
  if (content.includes(filterCloseOld)) {
    content = content.replace(filterCloseOld, filterCloseNew);
    console.log('✅ 2b. 新建按钮已移入右侧');
  } else {
    console.log('❌ 2b. 未找到筛选 div 关闭位置');
    // 输出调试信息
    const idx = content.indexOf('表格区域');
    if (idx > 0) {
      const before = content.substring(idx - 300, idx + 50);
      console.log('表格区域前300字节:', before.split('\n').map((l,i) => (i+':')+l.substring(0,60)).join('\n'));
    }
  }
} else {
  console.log('❌ 2. 未找到标头旧内容');
  // 调试
  const idx = content.indexOf('左侧：新建按钮');
  console.log('  左侧：新建按钮 位置:', idx);
}

// ===== 3. 恢复机器人名称旁边的 SceneIcon =====
const nameOld = `                            <span style={{ fontWeight: 600, color: '#1f2328', fontSize: '0.875rem' }}>{robot.name}</span>`;
const nameNew = `                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#1f2328', fontSize: '0.875rem' }}>
                              <SceneIcon name="robotMessage" size={16} title={robot.name} />
                              {robot.name}
                            </span>`;

if (content.includes(nameOld)) {
  content = content.replace(nameOld, nameNew);
  console.log('✅ 3. 恢复机器人名称 SceneIcon');
} else {
  console.log('❌ 3. 未找到机器人名称旧格式');
}

// ===== 4. 创建日期前加"创建日期"文字 =====
const dateOld = `                              <CalendarDays size={13} color="#57606a" />
                              <span>{getCreateDate(robot.createdAt)}</span>`;
const dateNew = `                              <CalendarDays size={13} color="#57606a" />
                              <span>创建日期：{getCreateDate(robot.createdAt)}</span>`;

if (content.includes(dateOld)) {
  content = content.replace(dateOld, dateNew);
  console.log('✅ 4. 添加"创建日期"标签');
} else {
  console.log('❌ 4. 未找到创建日期旧格式');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Robots.tsx 已保存，总行数:', content.split('\n').length);

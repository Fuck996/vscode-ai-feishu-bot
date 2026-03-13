// Robots.tsx 综合修复脚本 v2
const fs = require('fs');
const path = 'd:/work/vscode-ai-feishu-bot/frontend/src/pages/Robots.tsx';
let content = fs.readFileSync(path, 'utf8');
const hasCRLF = content.includes('\r\n');
if (hasCRLF) content = content.replace(/\r\n/g, '\n');

let changed = 0;

// ===== 1. 添加 SceneIcon 导入 =====
if (!content.includes('SceneIcon')) {
  content = content.replace(
    "import { useNavigate } from 'react-router-dom';",
    "import { useNavigate } from 'react-router-dom';\nimport SceneIcon from '../components/SceneIcon';"
  );
  console.log('✅ 1. SceneIcon 导入已添加');
  changed++;
} else {
  console.log('⚠ 1. SceneIcon 已存在');
}

// ===== 2. 左侧新建按钮注释 → 左侧标题注释 =====
// 步骤2a: 替换"左侧：新建按钮"注释 + 整个button块 + "右侧：标题+数量+状态筛选"注释 + div开头 + 两个span
// 变成"左侧：标题+数量" + div + 两个span + /div + "右侧：状态筛选+新建按钮"注释 + div开头
const headerOldComment = '            {/* 左侧：新建按钮 */}';
const headerNewStart = '            {/* 左侧：标题 + 数量 */}';

if (content.includes(headerOldComment)) {
  // 找到注释位置
  const commentIdx = content.indexOf(headerOldComment);
  // 找到右侧div注释位置
  const rightCommentIdx = content.indexOf('            {/* 右侧：标题 + 数量 + 状态筛选 */}');
  // 找到右侧div开始后，找到第一个span之后的位置（状态筛选注释前）
  const filterCommentIdx = content.indexOf('              {/* 状态筛选下拉 */}');
  
  console.log('注释位置:', commentIdx, '右侧注释:', rightCommentIdx, '筛选注释:', filterCommentIdx);
  
  // 旧内容：左侧新建按钮注释 → 到右侧div的两个span（不含状态筛选）
  const beforeFilter = content.substring(commentIdx, filterCommentIdx);
  console.log('旧标头片段（to筛选前）:', beforeFilter.substring(0, 200) + '...');
  
  // 新内容：左侧标题+数量div，然后右侧div开头+筛选注释
  const newBeforeFilter = 
    '            {/* 左侧：标题 + 数量 */}\n' +
    "            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>\n" +
    "              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>机器人管理</span>\n" +
    "              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {filteredRobots.length} 个</span>\n" +
    '            </div>\n' +
    '            {/* 右侧：状态筛选 + 新建按钮 */}\n' +
    "            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>\n" +
    '              {/* 状态筛选下拉 */}';
  
  content = content.substring(0, commentIdx) + newBeforeFilter + content.substring(filterCommentIdx + '              {/* 状态筛选下拉 */}'.length);
  console.log('✅ 2a. 左侧/右侧注释和 div 结构已修正');
  changed++;
  
  // 步骤2b: 在状态筛选关闭 </div> 后添加新建按钮，在右侧 </div> 前
  // 找到状态筛选下拉 div 的关闭: 后面跟着 </div> (右侧大div) 再跟 </div> (header div)
  // 格式: "              </div>\n            </div>\n          </div>"
  const filterCloseOld = 
    '              </div>\n' +
    '            </div>\n' +
    '          </div>\n' +
    '\n' +
    '          {/* 表格区域 */}';
  const filterCloseNew = 
    '              </div>\n' +
    '              <button\n' +
    "                onClick={() => setIsAddRobotModalOpen(true)}\n" +
    "                style={{ padding: '0.45rem 0.875rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}\n" +
    "                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#059669')}\n" +
    "                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#10b981')}\n" +
    '              >\n' +
    '                ＋ 新建机器人\n' +
    '              </button>\n' +
    '            </div>\n' +
    '          </div>\n' +
    '\n' +
    '          {/* 表格区域 */}';
  
  if (content.includes(filterCloseOld)) {
    content = content.replace(filterCloseOld, filterCloseNew);
    console.log('✅ 2b. 新建按钮已移入右侧');
    changed++;
  } else {
    console.log('❌ 2b. 未找到筛选div关闭结构，尝试查找...');
    const idx = content.indexOf('表格区域');
    if (idx > 0) {
      console.log('表格区域前150字节:');
      console.log(content.substring(idx - 150, idx + 20));
    }
  }
} else {
  console.log('❌ 2. 未找到左侧新建按钮注释');
}

// ===== 3. 恢复机器人名称行 SceneIcon =====
const nameOld = "                            <span style={{ fontWeight: 600, color: '#1f2328', fontSize: '0.875rem' }}>{robot.name}</span>";
const nameNew = 
  "                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>\n" +
  "                              <SceneIcon name=\"robotMessage\" size={16} title={robot.name} />\n" +
  "                              <span style={{ fontWeight: 600, color: '#1f2328', fontSize: '0.875rem' }}>{robot.name}</span>\n" +
  "                            </span>";

if (content.includes(nameOld)) {
  content = content.replace(nameOld, nameNew);
  console.log('✅ 3. 恢复机器人名称 SceneIcon');
  changed++;
} else {
  console.log('❌ 3. 未找到名称旧格式，检查周边...');
  const idx = content.indexOf('robot.name');
  console.log('robot.name 位置:', idx);
  if (idx > 0) console.log('周边:', content.substring(idx - 100, idx + 100));
}

// ===== 4. 创建日期前加"创建日期："文字 =====
const dateOld = '                              <span>{getCreateDate(robot.createdAt)}</span>';
const dateNew = '                              <span>创建日期：{getCreateDate(robot.createdAt)}</span>';

if (content.includes(dateOld)) {
  content = content.replace(dateOld, dateNew);
  console.log('✅ 4. 添加"创建日期："标签');
  changed++;
} else {
  console.log('❌ 4. 未找到 getCreateDate span，检查周边...');
  const idx = content.indexOf('getCreateDate');
  if (idx > 0) console.log('周边:', content.substring(idx - 100, idx + 100));
}

// 写回文件（保持原换行符）
if (hasCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log('\n完成！共' + changed + '处修改，行数: ' + content.split('\n').length);

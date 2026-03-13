// Dashboard.tsx 综合修复脚本
// 1. 修复 JSX 结构（移除多余 </div>，修复模态框缩进）
// 2. 修复通知表格列顺序：title | status(110px) | date(160px) | action
// 3. 移除 overflow:hidden 阻止下拉菜单显示

const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../frontend/src/pages/Dashboard.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// ===== 1. 修复 robot 卡片：移除 overflow:hidden =====
// 使 3 点菜单能正常显示在最上层
const robotCardOld = `background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>活跃机器人</span>`;

const robotCardNew = `background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>活跃机器人</span>`;

if (content.includes(robotCardOld)) {
  content = content.replace(robotCardOld, robotCardNew);
  console.log('✅ 1. 移除 robot 卡片 overflow:hidden');
} else {
  console.log('❌ 1. 未找到 robot 卡片 overflow:hidden');
}

// ===== 2. 修复 JSX 结构 =====
// 移除活跃机器人 section 后多余的 </div>（提前关闭了外层容器 B）
// 当前: `          </div>\n        </div>\n      </div>\n\n\n        {/* 最近通知记录 */}`
// 目标: `          </div>\n        </div>\n\n        {/* 最近通知记录 */}`
const structureOld = `          </div>
        </div>
      </div>


        {/* 最近通知记录 */}`;

const structureNew = `          </div>
        </div>

        {/* 最近通知记录 */}`;

if (content.includes(structureOld)) {
  content = content.replace(structureOld, structureNew);
  console.log('✅ 2. 修复 JSX 结构（移除多余 </div>）');
} else {
  console.log('❌ 2. 未找到多余 </div> 位置，尝试替代方案');
  // 尝试另一种格式（单空行）
  const alt = `          </div>
        </div>
      </div>

        {/* 最近通知记录 */}`;
  if (content.includes(alt)) {
    content = content.replace(alt, `          </div>
        </div>

        {/* 最近通知记录 */}`);
    console.log('✅ 2b. 修复 JSX 结构（单空行版本）');
  }
}

// ===== 3. 修复通知卡片：移除 overflow:hidden =====
const notifCardOld = `marginBottom: '2rem', overflow: 'hidden' }}>`;
const notifCardNew = `marginBottom: '2rem' }}>`;

if (content.includes(notifCardOld)) {
  content = content.replace(notifCardOld, notifCardNew);
  console.log('✅ 3. 移除通知卡片 overflow:hidden');
} else {
  console.log('⚠ 3. 通知卡片已无 overflow:hidden（跳过）');
}

// ===== 4. 修复末尾 JSX 结构：在modal前加 </div> 关闭容器B，修复modal缩进 =====
// 当前: `        </div>\n\n{selectedNotification && (\n        <div`
// 目标: `        </div>\n      </div>\n\n      {selectedNotification && (\n        <div`
const modalOld = `        </div>

{selectedNotification && (
        <div`;

const modalNew = `        </div>
      </div>

      {selectedNotification && (
        <div`;

if (content.includes(modalOld)) {
  content = content.replace(modalOld, modalNew);
  console.log('✅ 4. 修复 modal 前的结构（添加容器B关闭标签）');
} else {
  console.log('❌ 4. 未找到 modal 位置');
  // 调试
  const idx = content.indexOf('{selectedNotification && (');
  if (idx > 0) {
    console.log('  modal 前的50字节:', JSON.stringify(content.substring(idx - 50, idx)));
  }
}

// ===== 5. 交换通知表格中日期列和状态列的顺序 =====
// 当前: [title] | [date 160px] | [status 110px] | [action]
// 目标: [title] | [status 110px] | [date 160px] | [action]
// 
// 找通知表格的 date td 和 status td

// 使用字符串搜索找到 notification map 循环内的 td 块
const notifMapOld = `                        </td>
                        <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', width: '160px' }}>`;
const notifMapOldIdx = content.indexOf(notifMapOld);
console.log('date td 位置:', notifMapOldIdx);

if (notifMapOldIdx > 0) {
  // 从这个位置开始，找出完整的 date td 和 status td 块
  const startOfDateTd = notifMapOldIdx + `                        </td>\n`.length;
  const endOfStatusTd = content.indexOf(`                        </td>`, startOfDateTd + 10) + `                        </td>`.length;
  
  const dateAndStatusTds = content.substring(startOfDateTd, endOfStatusTd);
  
  // 找到 date td 和 status td 的分界点（</td>之后）
  const dateTdEnd = content.indexOf('                        </td>', startOfDateTd) + '                        </td>'.length;
  const dateTd = content.substring(startOfDateTd, dateTdEnd);
  const statusTd = content.substring(dateTdEnd, endOfStatusTd);
  
  console.log('dateTd 首行:', dateTd.split('\n')[0].substring(0, 80));
  console.log('statusTd 首行:', statusTd.split('\n')[0].substring(0, 80));
  
  // 替换：date+status → status+date
  content = content.substring(0, startOfDateTd) + statusTd + dateTd + content.substring(endOfStatusTd);
  console.log('✅ 5. 通知表格列顺序已修正：title | status | date | action');
} else {
  console.log('❌ 5. 未找到通知表格 date td 位置');
}

// 写回
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Dashboard.tsx 已保存');
console.log('总行数:', content.split('\n').length);

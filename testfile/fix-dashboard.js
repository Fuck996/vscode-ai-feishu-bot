// Dashboard.tsx 修复脚本
// 1. 通知表格：交换状态列和日期列的位置（状态移到日期后面）
// 2. 将活跃机器人表格移到最近通知记录表格上方

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// ===== 1. 交换通知表格中状态列和日期列 =====
// 当前顺序: 标题 | 状态(110px) | 日期(160px) | 操作
// 目标顺序: 标题 | 日期(160px) | 状态(110px) | 操作

// 找到通知表格行中状态td的开始标记
const statusTdMarker = "padding: '1rem 0.75rem', fontSize: '0.875rem', width: '110px', textAlign: 'center'";
const dateTdMarker = "padding: '1rem 0.75rem', fontSize: '0.875rem', width: '160px'";

const statusTdPos = content.indexOf(statusTdMarker);
const dateTdPos = content.indexOf(dateTdMarker);

console.log('状态列位置:', statusTdPos, '| 日期列位置:', dateTdPos);

if (statusTdPos > 0 && dateTdPos > 0) {
  // 找出状态td完整块（从 <td 到 </td>）
  // 需要找到 <td 的开始
  const statusTdStart = content.lastIndexOf('<td', statusTdPos);
  const dateTdStart = content.lastIndexOf('<td', dateTdPos);
  
  console.log('statusTdStart:', statusTdStart, 'dateTdStart:', dateTdStart);
  
  // 找到各自的 </td> 结束（找到位置后的第一个 </td>）
  const statusTdEnd = content.indexOf('</td>', statusTdPos) + '</td>'.length;
  const dateTdEnd = content.indexOf('</td>', dateTdPos) + '</td>'.length;
  
  console.log('statusTdEnd:', statusTdEnd, 'dateTdEnd:', dateTdEnd);
  
  // 提取两个 td 的内容
  const statusTdContent = content.substring(statusTdStart, statusTdEnd);
  const dateTdContent = content.substring(dateTdStart, dateTdEnd);
  
  console.log('statusTd (前80字符):', statusTdContent.substring(0, 80));
  console.log('dateTd (前80字符):', dateTdContent.substring(0, 80));
  
  // 状态td在前(index小)，日期td在后（index大）
  // 顺序验证
  if (statusTdStart < dateTdStart) {
    // 当前: statusTd...dateTd
    // 替换：insert dateTd at statusTdStart, remove dateTdContent after
    
    // 构建新内容：把日期td内容放到状态td位置，状态td内容放到日期td位置
    const before = content.substring(0, statusTdStart);
    const between = content.substring(statusTdEnd, dateTdStart);
    const after = content.substring(dateTdEnd);
    
    content = before + dateTdContent + between + statusTdContent + after;
    console.log('✅ 通知表格：状态列和日期列交换成功');
  }
}

// ===== 2. 将活跃机器人section移到最近通知记录section前面 =====
const notifMarker = '        {/* 最近通知记录 */}';
const robotMarker = '        {/* 活跃机器人 */}';

const notifStart = content.indexOf(notifMarker);
// 找第二次出现（第一次是stat卡片，第二次才是实际的表格）
const firstRobot = content.indexOf(robotMarker);
const robotStart = content.indexOf(robotMarker, firstRobot + 1);

console.log('通知section位置:', notifStart, '| 机器人TABLE section位置:', robotStart);

if (notifStart > 0 && robotStart > 0 && notifStart < robotStart) {
  // 通知在前，机器人在后 - 需要把机器人移到通知前
  
  // 机器人section: 从 robotStart 到通知记录详情modal或文件结尾
  // 通知section: 从 notifStart 到 robotStart 之前的空行
  
  // 找通知section结尾: 就是 robotStart 之前
  // 检查 robotStart 前面是否有空行
  const robotStartWithBlank = content.lastIndexOf('\n\n', robotStart);
  const notifEnd = robotStartWithBlank > notifStart ? robotStartWithBlank : robotStart;
  
  // 找机器人section结尾: 
  // 机器人section后面是 通知详情modal 或者 </div> 关闭外层 wrapper
  // 找 {selectedNotification && ( 的位置
  const selectedNotifModalPos = content.indexOf('{selectedNotification && (', robotStart);
  const robotEnd = selectedNotifModalPos > robotStart ? selectedNotifModalPos : content.length;
  
  console.log('notifStart:', notifStart, 'notifEnd:', notifEnd);
  console.log('robotStart:', robotStart, 'robotEnd:', robotEnd);
  
  // 提取各section内容
  const notifSection = content.substring(notifStart, notifEnd);
  const robotSection = content.substring(robotStart, robotEnd);
  
  console.log('notifSection首行:', notifSection.split('\n')[0]);
  console.log('robotSection首行:', robotSection.split('\n')[0]);
  console.log('notifSection末行:', notifSection.split('\n').slice(-3).join(' | '));
  console.log('robotSection末行:', robotSection.split('\n').slice(-3).join(' | '));
  
  // 替换：原来是 notifSection + (blank) + robotSection
  // 变成: robotSection + (blank) + notifSection（不含末尾空行）
  
  const before = content.substring(0, notifStart);
  const after = content.substring(robotEnd);
  
  // 通知section 末尾去掉多余空行
  const notifSectionTrimmed = notifSection.trimEnd();
  const robotSectionTrimmed = robotSection.trimEnd();
  
  content = before + robotSectionTrimmed + '\n\n' + notifSectionTrimmed + '\n\n' + after;
  
  console.log('✅ 活跃机器人移到最近通知记录上方成功');
}

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Dashboard.tsx 已保存');

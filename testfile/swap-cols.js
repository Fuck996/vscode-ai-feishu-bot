// 交换通知表格中 date 列和 status 列的位置
// title | date(160px) | status(110px) | action → title | status(110px) | date(160px) | action

const fs = require('fs');
const filePath = 'd:/work/vscode-ai-feishu-bot/frontend/src/pages/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const paginatedIdx = content.indexOf('paginatedNotifications.map');

// 找 date td (width: 160px)
const dateTdMarker = "width: '160px' }}>";
const dateTdMarkerPos = content.indexOf(dateTdMarker, paginatedIdx);

// 找 date td 的开始 <td
const dateTdStart = content.lastIndexOf('                        <td ', dateTdMarkerPos);

// 找 date td 的结束 </td>
const dateTdClosePos = content.indexOf('                        </td>', dateTdMarkerPos);
const dateTdEnd = dateTdClosePos + '                        </td>'.length;

// 找 status td 的结束（第二个 </td>）
const statusTdClosePos = content.indexOf('                        </td>', dateTdEnd + 1);
const statusTdEnd = statusTdClosePos + '                        </td>'.length;

const dateTd = content.substring(dateTdStart, dateTdEnd);
const statusTd = content.substring(dateTdEnd, statusTdEnd);

console.log('dateTd 首行:', dateTd.split('\n')[0].substring(0, 80));
console.log('statusTd 首行:', statusTd.trim().split('\n')[0].substring(0, 80));

// 交换：先 status，再 date
content = content.substring(0, dateTdStart) + statusTd + dateTd + content.substring(statusTdEnd);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ 列已交换：title | status(110px) | date(160px) | action');

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import authService from '../services/auth';

interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceName: string;
  details: string;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
}

const Audit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterUser, setFilterUser] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const itemsPerPage = 10;

  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.fetchWithAuth('/api/audit');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || (Array.isArray(data) ? data : []));
      } else if (response.status === 403) {
        setError('您没有权限访问审计日志，只有管理员可以查看');
      } else {
        setError('Failed to load audit logs');
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // 从日志中提取用户列表
      const auditResponse = await authService.fetchWithAuth('/api/audit');
      if (auditResponse.ok) {
        const data = await auditResponse.json();
        const auditLogs = data.data || (Array.isArray(data) ? data : []);
        const uniqueUsers = Array.from(new Set(auditLogs.map((log: { username: string }) => log.username))).map((username, idx) => ({
          id: `user-${idx}`,
          username: username as string
        }));
        setUsers(uniqueUsers);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const getResourceTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      'user': '👤 用户',
      'robot': '🤖 机器人',
      'integration': '🔗 集成',
      'service': '📡 服务',
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string): string => {
    const labels: { [key: string]: string } = {
      'create': '创建',
      'update': '更新',
      'delete': '删除',
      'login': '登录',
      'logout': '登出',
      'change_password': '修改密码',
      'reset_password': '重置密码',
      'start': '启动',
      'stop': '关闭',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'create':
        return '#10b981'; // 绿色
      case 'delete':
        return '#ef4444'; // 红色
      case 'update':
        return '#f59e0b'; // 黄色
      case 'login':
        return '#3b82f6'; // 蓝色
      default:
        return '#6b7280'; // 灰色
    }
  };

  const getUniquResourceTypes = (): string[] => {
    const types = new Set(logs.map(l => l.resourceType));
    return Array.from(types);
  };

  const filteredLogs = logs.filter(l => {
    if (filterUser && l.username !== filterUser) return false;
    if (filterResourceType && l.resourceType !== filterResourceType) return false;
    return true;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
            无权限访问
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '0' }}>
            只有管理员可以查看审计日志
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}>
          </div>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>加载中...</p>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>
          📋 审计日志
        </h1>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* 筛选条件 */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>用户</label>
            <select
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option key="all-users" value="">全部</option>
              {users.map((u, idx) => (
                <option key={`user-${u.id}-${idx}`} value={u.username}>{u.username}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>资源类型</label>
            <select
              value={filterResourceType}
              onChange={(e) => { setFilterResourceType(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option key="all-types" value="">全部</option>
              {getUniquResourceTypes().map((type, idx) => (
                <option key={`type-${type}-${idx}`} value={type}>{getResourceTypeLabel(type)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 审计日志列表 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937' }}>操作记录</h2>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>共 {filteredLogs.length} 条</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              暂无审计日志
            </div>
          ) : (
            <div style={{ overflowX: 'auto', padding: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>时间</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>用户</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>操作</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>资源类型</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>资源名称</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log, index) => (
                    <tr key={`log-${log.id}-${index}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {log.username}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.375rem',
                          backgroundColor: getActionColor(log.action) + '20',
                          color: getActionColor(log.action),
                          fontWeight: 500
                        }}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {getResourceTypeLabel(log.resourceType)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {log.resourceName}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 分页 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  第 {currentPage} / {totalPages || 1} 页
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: currentPage === 1 ? '#e5e7eb' : '#3b82f6',
                      color: currentPage === 1 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: currentPage === totalPages ? '#e5e7eb' : '#3b82f6',
                      color: currentPage === totalPages ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 详情模态框 */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedLog(null)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            {/* 模态框头部 */}
            <div style={{
              backgroundColor: getActionColor(selectedLog.action),
              padding: '1.5rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>
                  {getResourceTypeLabel(selectedLog.resourceType)} - {getActionLabel(selectedLog.action)}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                  {selectedLog.resourceName}
                </p>
              </div>
            </div>

            {/* 模态框内容区 */}
            <div style={{
              padding: '1.5rem',
              flex: 1,
              overflowY: 'auto'
            }}>
              {/* 基本信息 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    执行用户
                  </label>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                    {selectedLog.username}
                  </p>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    操作时间
                  </label>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                    {new Date(selectedLog.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              {/* 详细信息 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  操作详情
                </label>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: '#f9fafb',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb'
                }}>
                  {selectedLog.details || '暂无详情'}
                </div>
              </div>
            </div>

            {/* 模态框底部 */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Audit;

import React, { useState } from 'react';

/**
 * 新建机器人功能预览
 * 展示新建机器人表单的设计
 * 用户可以在此确认UI/UX设计后再进行开发
 */

export default function AddRobotPreview() {
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhookUrl: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) {
    return (
      <div style={{ padding: '2rem' }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          打开预览
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* 模态框背景 */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setIsOpen(false)}
        >
          {/* 模态框容器 */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
              width: '90%',
              maxWidth: '450px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                🤖 创建新的机器人
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* 模态框内容 */}
            <div style={{ padding: '1.5rem' }}>
              {/* 提示信息 */}
              <div
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                }}
              >
                💡 <strong>提示：</strong> 机器人是连接飞书的桥梁，用于接收和发送通知。每个机器人需要 Webhook URL 来接收回调。
              </div>

              {/* 表单 */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log('Form data:', formData);
                }}
              >
                {/* 机器人名称 */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      color: '#1f2937',
                      marginBottom: '0.5rem',
                    }}
                  >
                    机器人名称 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="例如：代码提交通知"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    用于识别不同的机器人，最多50个字符
                  </p>
                </div>

                {/* 机器人描述 */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      color: '#1f2937',
                      marginBottom: '0.5rem',
                    }}
                  >
                    描述（可选）
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="例如：用于发送 Git 提交通知到飞书群组"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      minHeight: '80px',
                      resize: 'none',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    描述此机器人的用途，帮助识别和管理
                  </p>
                </div>

                {/* Webhook URL */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      color: '#1f2937',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Webhook URL <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    name="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={handleInputChange}
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    从飞书开发者后台获取的 Webhook URL
                  </p>
                </div>

                {/* 错误提示示例 - 可选 */}
                {false && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      marginBottom: '1.5rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    ❌ Webhook URL 格式不正确
                  </div>
                )}

                {/* 按钮组 */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: '0.5rem 1.5rem',
                      backgroundColor: '#e5e7eb',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.5rem 1.5rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
                  >
                    ✓ 创建机器人
                  </button>
                </div>
              </form>

              {/* 帮助信息 */}
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  lineHeight: '1.6',
                }}
              >
                <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>需要帮助？</p>
                <ul style={{ margin: '0.5rem 0 0 1rem', paddingLeft: '1rem' }}>
                  <li>如何获取 Webhook URL？ <a href="#" style={{ color: '#3b82f6' }}>查看文档</a></li>
                  <li>一个 URL 可以绑定多个机器人吗？ <a href="#" style={{ color: '#3b82f6' }}>了解更多</a></li>
                  <li>创建后可以修改 URL 吗？ <a href="#" style={{ color: '#3b82f6' }}>查看指南</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 预览页面标题 */}
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '0.5rem' }}>
        <h3 style={{ color: '#0369a1', margin: 0 }}>预览模式</h3>
        <p style={{ color: '#0369a1', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
          这是新建机器人的设计预览。请确认界面设计是否满意。
        </p>
      </div>
    </div>
  );
}

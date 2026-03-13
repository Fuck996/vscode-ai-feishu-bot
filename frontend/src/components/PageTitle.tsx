import React from 'react';

import SceneIcon, { SceneIconName } from './SceneIcon';

interface PageTitleProps {
  icon: SceneIconName;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PageTitle({ icon, title, description, actions }: PageTitleProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '2rem',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.875rem',
            fontWeight: 700,
            color: '#1f2328',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            lineHeight: 1.2,
          }}
        >
          <SceneIcon name={icon} size={34} title={title} inheritColor />
          <span>{title}</span>
        </h1>
        {description ? (
          <p
            style={{
              margin: '0.5rem 0 0 0',
              fontSize: '0.875rem',
              color: '#656d76',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
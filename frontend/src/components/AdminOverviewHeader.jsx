import React, { useState } from 'react';

/**
 * AdminOverviewHeader Component
 * 
 * Reusable Show/Hide Overview toggle across all Admin pages:
 * - Displays page title, subtitle/badge, and compact summary strip
 * - "Show Overview" / "Hide Overview" toggle button with chevron/eye icon
 * - Children content (the 4-8 detailed summary cards / analytics) expand & collapse smoothly
 * - Remembers state in sessionStorage using storageKey (optional)
 * - Supports defaultCollapsed prop (defaults to true on small screens or when specified)
 */
export default function AdminOverviewHeader({
  title,
  subtitle,
  badge,
  storageKey,
  defaultCollapsed = true,
  summaryItems = [], // Array of { label, value, colorClass, isHiddenOnMobile }
  rightActions = null,
  children,
}) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (storageKey) {
      const saved = sessionStorage.getItem(`pg_admin_overview_${storageKey}`);
      if (saved !== null) return saved === 'true';
    }
    // Default collapsed on mobile (< 768px) or based on defaultCollapsed
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    return !defaultCollapsed;
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (storageKey) {
        sessionStorage.setItem(`pg_admin_overview_${storageKey}`, String(next));
      }
      return next;
    });
  };

  return (
    <div className="d-flex flex-column gap-2.5">
      {/* Overview Header Strip */}
      <div className="bg-white p-3 p-md-3.5 rounded-4 border shadow-sm d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2.5">
        {/* Title & Badge */}
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h4 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.15rem' }}>{title}</h4>
            {badge && (
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 small">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="text-muted small mt-0.5" style={{ fontSize: '0.75rem' }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Right Section: Compact Summary Strip + Toggle Button + Extra Actions */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {summaryItems.length > 0 && (
            <div className="d-flex align-items-center gap-2 bg-light px-2.5 py-1.5 rounded-3 border small overflow-x-auto text-nowrap">
              {summaryItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <span className={`text-muted opacity-50 ${item.isHiddenOnMobile ? 'd-none d-sm-inline' : ''}`}>|</span>
                  )}
                  <div className={`d-flex align-items-center gap-1 ${item.isHiddenOnMobile ? 'd-none d-sm-flex' : ''}`}>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{item.label}:</span>
                    <strong className={item.colorClass || 'text-dark'}>{item.value}</strong>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {rightActions}

          {/* Toggle Overview Button */}
          {children && (
            <button
              type="button"
              onClick={toggleExpanded}
              className={`btn btn-sm ${isExpanded ? 'btn-outline-secondary' : 'btn-pg-primary text-white'} d-inline-flex align-items-center gap-1.5 px-3 py-1.5 shadow-xs transition-all`}
              style={{ minHeight: '36px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              title={isExpanded ? 'Hide detailed summary metrics' : 'Expand full summary metrics'}
              aria-expanded={isExpanded}
            >
              <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
              <span>{isExpanded ? 'Hide Overview' : 'Show Overview'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Detailed Cards Container */}
      {isExpanded && children && (
        <div className="animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

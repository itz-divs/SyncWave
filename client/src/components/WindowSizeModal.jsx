// client/src/components/WindowSizeModal.jsx
// Purpose: Modal dialog allowing users to adjust application window sizing,
// panel widths (sidebar and members), layout display modes, and UI scaling.
// Palette: #F6E2E9, #FEFAF3, #B8CFB3, #84A282

import { useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Layout,
  Columns,
  ZoomIn,
  RotateCcw,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Monitor,
} from 'lucide-react';

export default function WindowSizeModal({
  isOpen,
  onClose,
  windowMode,
  setWindowMode,
  sidebarWidth,
  setSidebarWidth,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  membersWidth,
  setMembersWidth,
  isMembersOpen,
  setIsMembersOpen,
  uiScale,
  setUiScale,
  isFullscreen,
  toggleFullscreen,
  onResetDefaults,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const windowPresets = [
    {
      id: 'full',
      label: 'Full Screen',
      desc: '100% edge-to-edge monitor layout',
      icon: <Maximize2 size={18} />,
    },
    {
      id: 'wide',
      label: 'Wide (1440px)',
      desc: 'Spacious centered desktop window',
      icon: <Monitor size={18} />,
    },
    {
      id: 'standard',
      label: 'Standard (1200px)',
      desc: 'Balanced window for laptops & desktops',
      icon: <Layout size={18} />,
    },
    {
      id: 'compact',
      label: 'Compact (1000px)',
      desc: 'Streamlined cozy layout for multitasking',
      icon: <Columns size={18} />,
    },
  ];

  const scalePresets = [
    { value: 90, label: '90% (Compact)' },
    { value: 100, label: '100% (Default)' },
    { value: 110, label: '110% (Roomy)' },
  ];

  return (
    <div
      style={modalOverlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modalContentStyle} className="glass-panel">
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={iconBadgeStyle}>
              <SlidersHorizontal size={18} color="#84A282" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Adjust Window & Layout
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Fine-tune workspace dimensions, sidebar widths, and screen display
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        <div style={bodyStyle}>
          {/* SECTION 1: Window Size Mode */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Monitor size={14} color="#84A282" />
              <span>WINDOW DISPLAY MODE</span>
            </div>
            <div style={presetsGridStyle}>
              {windowPresets.map((preset) => {
                const isSelected = windowMode === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setWindowMode(preset.id);
                      localStorage.setItem('syncwave_window_mode', preset.id);
                    }}
                    style={{
                      ...presetCardStyle,
                      backgroundColor: isSelected ? 'rgba(132, 162, 130, 0.18)' : '#ffffff',
                      borderColor: isSelected ? '#84A282' : 'rgba(184, 207, 179, 0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: isSelected ? '#375338' : '#84A282' }}>{preset.icon}</span>
                      {isSelected && (
                        <span style={selectedPillStyle}>
                          <Check size={10} style={{ marginRight: '3px' }} /> Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {preset.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* True Fullscreen Toggle */}
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 14px' }}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F11)'}</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: Sidebar Column Width */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={sectionTitleStyle}>
                <Columns size={14} color="#84A282" />
                <span>SIDEBAR COLUMN WIDTH</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={widthValueBadgeStyle}>
                  {isSidebarCollapsed ? 'Collapsed' : `${sidebarWidth}px`}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                  style={toggleSmallBtnStyle}
                  title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
                  </span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>180px</span>
              <input
                type="range"
                min="180"
                max="450"
                step="5"
                value={sidebarWidth}
                disabled={isSidebarCollapsed}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSidebarWidth(val);
                  localStorage.setItem('syncwave_sidebar_width', val);
                }}
                style={{ flex: 1, accentColor: '#84A282', cursor: isSidebarCollapsed ? 'not-allowed' : 'pointer' }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>450px</span>
              <button
                type="button"
                onClick={() => {
                  setSidebarWidth(280);
                  localStorage.setItem('syncwave_sidebar_width', 280);
                }}
                style={resetLinkStyle}
                title="Reset to 280px"
              >
                Reset
              </button>
            </div>
          </div>

          {/* SECTION 3: Members Panel Width */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={sectionTitleStyle}>
                <Columns size={14} color="#84A282" />
                <span>MEMBERS LIST WIDTH</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={widthValueBadgeStyle}>
                  {!isMembersOpen ? 'Hidden' : `${membersWidth}px`}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMembersOpen((prev) => !prev)}
                  style={toggleSmallBtnStyle}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {isMembersOpen ? 'Hide Panel' : 'Show Panel'}
                  </span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>180px</span>
              <input
                type="range"
                min="180"
                max="380"
                step="5"
                value={membersWidth}
                disabled={!isMembersOpen}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMembersWidth(val);
                  localStorage.setItem('syncwave_members_width', val);
                }}
                style={{ flex: 1, accentColor: '#84A282', cursor: !isMembersOpen ? 'not-allowed' : 'pointer' }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>380px</span>
              <button
                type="button"
                onClick={() => {
                  setMembersWidth(240);
                  localStorage.setItem('syncwave_members_width', 240);
                }}
                style={resetLinkStyle}
                title="Reset to 240px"
              >
                Reset
              </button>
            </div>
          </div>

          {/* SECTION 4: UI Scale / Zoom */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <ZoomIn size={14} color="#84A282" />
              <span>INTERFACE SCALE / DENSITY</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {scalePresets.map((scale) => {
                const isSelected = uiScale === scale.value;
                return (
                  <button
                    key={scale.value}
                    type="button"
                    onClick={() => {
                      setUiScale(scale.value);
                      localStorage.setItem('syncwave_ui_scale', scale.value);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? '#84A282' : 'rgba(184, 207, 179, 0.25)',
                      color: isSelected ? '#FEFAF3' : 'var(--text-main)',
                      border: '1px solid',
                      borderColor: isSelected ? '#84A282' : 'rgba(184, 207, 179, 0.5)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {scale.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-subtle)' }}>
              Tip: Drag vertical borders between panels directly with your mouse.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onResetDefaults}
              style={resetAllBtnStyle}
              title="Reset all window settings to default"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.84rem' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(31, 45, 34, 0.45)',
  backdropFilter: 'blur(5px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: '16px',
};

const modalContentStyle = {
  width: '100%',
  maxWidth: '560px',
  backgroundColor: '#FEFAF3',
  borderRadius: '20px',
  border: '1px solid rgba(184, 207, 179, 0.65)',
  boxShadow: '0 20px 50px rgba(132, 162, 130, 0.25)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  animation: 'fadeIn 0.15s ease-out',
};

const headerStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid rgba(184, 207, 179, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: 'rgba(246, 226, 233, 0.35)',
};

const iconBadgeStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  backgroundColor: 'rgba(184, 207, 179, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle = {
  background: 'transparent',
  color: 'var(--text-muted)',
  padding: '6px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const bodyStyle = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
  maxHeight: '75vh',
  overflowY: 'auto',
};

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const sectionTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.74rem',
  fontWeight: 800,
  color: '#84A282',
  letterSpacing: '0.04em',
  marginBottom: '8px',
};

const presetsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '10px',
};

const presetCardStyle = {
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
};

const selectedPillStyle = {
  fontSize: '0.65rem',
  fontWeight: 800,
  color: '#2e4530',
  backgroundColor: 'rgba(132, 162, 130, 0.3)',
  padding: '2px 6px',
  borderRadius: '12px',
  display: 'inline-flex',
  alignItems: 'center',
};

const widthValueBadgeStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-main)',
  backgroundColor: 'rgba(184, 207, 179, 0.35)',
  padding: '2px 8px',
  borderRadius: '6px',
};

const toggleSmallBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  borderRadius: '6px',
  backgroundColor: 'rgba(184, 207, 179, 0.25)',
  border: '1px solid rgba(184, 207, 179, 0.5)',
  color: 'var(--text-main)',
  cursor: 'pointer',
};

const resetLinkStyle = {
  background: 'transparent',
  border: 'none',
  fontSize: '0.72rem',
  color: '#84A282',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '2px 4px',
  textDecoration: 'underline',
};

const footerStyle = {
  padding: '14px 20px',
  borderTop: '1px solid rgba(184, 207, 179, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: 'rgba(254, 250, 243, 0.6)',
};

const resetAllBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  background: 'transparent',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '0.76rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  cursor: 'pointer',
};

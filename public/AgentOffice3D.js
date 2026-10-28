/**
 * AgentOffice3D.js (v4.0 - Dynamic Morphing & Multi-Agent Topology Engine)
 *
 * Interactive 3D Isometric Cyberpunk Office Visualization for Multi-Agent Systems & Swarms.
 * Zero external dependencies (Pure HTML5 Canvas 2D with Retina HiDPI, Touch Gestures,
 * Keyed State Reconciliation, Smooth Spatial Morphing, Floor Topology Conduits & Bilingual UI).
 *
 * License: MIT
 */

(function (global) {
  'use strict';

  const PALETTE = [
    '#6366f1', '#38bdf8', '#34d399', '#fbbf24', '#f43f5e',
    '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
    '#84cc16', '#eab308', '#3b82f6', '#d946ef'
  ];

  const I18N = {
    vi: {
      agentsBadge: 'Agents',
      autoRotateOn: 'Tự xoay: Bật',
      autoRotateOff: 'Tự xoay: Tắt',
      overview: 'Toàn cảnh',
      hideDone: 'Ẩn đã xong',
      showDone: 'Hiện tất cả',
      progressTitle: 'Tiến Độ Đội Ngũ',
      reopenProgress: '📊 Bảng Tiến Độ',
      unselectedName: 'Chưa chọn tác tử',
      unselectedRole: 'Click vào bàn làm việc 3D',
      unselectedDesc: 'Chọn một nhân vật trong văn phòng 3D để theo dõi tiến độ và nhiệm vụ thời gian thực.',
      statusLabel: 'TRẠNG THÁI',
      progressLabel: 'TIẾN ĐỘ',
      readyState: 'Sẵn sàng',
      reopenInspector: 'Chi tiết tác tử',
      openBtn: '▲ Mở',
      jumpToDesk: 'Đến bàn:',
      defaultRole: 'Tác tử thực thi',
      defaultStatus: 'Đang hoạt động',
      defaultDesc: 'Đang xử lý luồng công việc trong hệ thống.',
      defaultMsg: 'Đang trực tại bàn làm việc.',
      focusMsg: 'Đang xử lý nhiệm vụ tại bàn.',
      modeSolo: 'Trung Tâm Đơn (1)',
      modeArc: 'Bán Nguyệt (2-4)',
      modeHub: 'Radial Hub (5-12)',
      modeMatrix: 'Swarm Matrix (13+)'
    },
    en: {
      agentsBadge: 'Agents',
      autoRotateOn: 'Auto-Rotate: ON',
      autoRotateOff: 'Auto-Rotate: OFF',
      overview: 'Overview',
      hideDone: 'Hide Done',
      showDone: 'Show All',
      progressTitle: 'Team Telemetry',
      reopenProgress: '📊 Team Telemetry',
      unselectedName: 'No Agent Selected',
      unselectedRole: 'Click any 3D workstation',
      unselectedDesc: 'Select a character in the 3D office to inspect real-time telemetry and task status.',
      statusLabel: 'STATUS',
      progressLabel: 'PROGRESS',
      readyState: 'Ready',
      reopenInspector: 'Agent Inspector',
      openBtn: '▲ Open',
      jumpToDesk: 'Jump to:',
      defaultRole: 'Worker Agent',
      defaultStatus: 'Active',
      defaultDesc: 'Processing assigned workflow tasks.',
      defaultMsg: 'Standing by at workstation.',
      focusMsg: 'Executing task at workstation.',
      modeSolo: 'Solo Center (1)',
      modeArc: 'Semi-Arc (2-4)',
      modeHub: 'Radial Hub (5-12)',
      modeMatrix: 'Swarm Matrix (13+)'
    }
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hashColor(idStr) {
    const str = String(idStr || 'agent');
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  }

  function formatShortName(name, maxLen = 15) {
    const clean = String(name || 'Agent').trim();
    if (clean.length <= maxLen) return clean;
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      const twoWords = `${parts[0]} ${parts[1]}`;
      if (twoWords.length <= maxLen) return twoWords;
    }
    return clean.slice(0, maxLen - 1) + '…';
  }

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('agent-office-3d-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'agent-office-3d-styles';
    styleEl.textContent = `
      .ao3d-root {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 460px;
        background: radial-gradient(circle at 50% 32%, #0f1b33 0%, #060a14 68%, #020409 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace, sans-serif;
        user-select: none;
        -webkit-user-select: none;
        overflow: hidden;
        color: #e2e8f0;
        box-sizing: border-box;
        touch-action: none;
      }
      .ao3d-root * { box-sizing: border-box; }
      .ao3d-canvas {
        width: 100%;
        height: 100%;
        display: block;
        cursor: grab;
      }
      .ao3d-canvas:active { cursor: grabbing; }

      /* Top Bar */
      .ao3d-topbar {
        position: absolute;
        top: 10px;
        left: 12px;
        right: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        pointer-events: none;
        z-index: 25;
      }
      .ao3d-topbar-group {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .ao3d-pill-btn {
        pointer-events: auto;
        background: rgba(15, 23, 42, 0.86);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #cbd5e1;
        padding: 5px 11px;
        border-radius: 8px;
        font-size: 11.5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        cursor: pointer;
        transition: all 0.18s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }
      .ao3d-pill-btn:hover {
        background: rgba(30, 41, 59, 0.96);
        border-color: rgba(56, 189, 248, 0.55);
        color: #f8fafc;
      }
      .ao3d-pill-btn.active {
        background: rgba(56, 189, 248, 0.18);
        border-color: #38bdf8;
        color: #38bdf8;
      }
      .ao3d-badge {
        font-size: 11px;
        padding: 3px 9px;
        border-radius: 12px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        backdrop-filter: blur(8px);
      }

      /* Floating Panels */
      .ao3d-panel {
        position: absolute;
        background: rgba(11, 18, 34, 0.90);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65);
        z-index: 20;
        pointer-events: auto;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* Left Dock */
      .ao3d-left-dock {
        top: 50px;
        left: 12px;
        width: 280px;
        max-height: calc(100% - 102px);
        display: flex;
        flex-direction: column;
        padding: 11px;
      }
      .ao3d-left-dock.compact { width: 205px; }
      .ao3d-scroll-list {
        overflow-y: auto;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-right: 3px;
      }
      .ao3d-scroll-list::-webkit-scrollbar { width: 4px; }
      .ao3d-scroll-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

      .ao3d-agent-row {
        background: rgba(2, 6, 23, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 8px;
        padding: 7px 9px;
        cursor: pointer;
        transition: all 0.18s;
      }
      .ao3d-agent-row:hover {
        background: rgba(30, 41, 59, 0.65);
        border-color: rgba(255, 255, 255, 0.22);
      }
      .ao3d-agent-row.active {
        background: rgba(30, 41, 59, 0.95);
        border-color: #38bdf8;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.22);
      }

      /* Right Inspector Card */
      .ao3d-inspector {
        bottom: 48px;
        right: 12px;
        width: 310px;
        padding: 13px;
      }

      /* Floating Reopen Pills */
      .ao3d-reopen-pill {
        position: absolute;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 11.5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #f1f5f9;
        cursor: pointer;
        backdrop-filter: blur(8px);
        z-index: 21;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 7px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.45);
        transition: transform 0.18s;
      }
      .ao3d-reopen-pill:hover { transform: scale(1.04); }

      /* Footer Quick Switcher */
      .ao3d-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40px;
        background: rgba(8, 13, 26, 0.92);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 12px;
        overflow-x: auto;
        z-index: 15;
      }
      .ao3d-footer::-webkit-scrollbar { display: none; }
      .ao3d-chip {
        flex-shrink: 0;
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(15, 23, 42, 0.6);
        color: #94a3b8;
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.18s;
      }
      .ao3d-chip:hover { color: #f8fafc; border-color: rgba(255,255,255,0.3); }
      .ao3d-chip.active {
        background: rgba(56, 189, 248, 0.16);
        border-color: #38bdf8;
        color: #e0f2fe;
      }

      /* Chat Bubbles Layer */
      .ao3d-bubbles {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 30;
      }
      .ao3d-bubble {
        position: absolute;
        pointer-events: auto;
        transform: translate(-50%, -100%);
        max-width: 265px;
        min-width: 145px;
        background: rgba(11, 18, 34, 0.96);
        border: 1.5px solid #38bdf8;
        border-radius: 11px;
        padding: 8px 11px;
        box-shadow: 0 12px 28px rgba(0,0,0,0.75);
        backdrop-filter: blur(10px);
        font-size: 11.5px;
        animation: ao3dPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes ao3dPop {
        from { opacity: 0; transform: translate(-50%, -82%) scale(0.75); }
        to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
      }
      .ao3d-bubble-arrow {
        position: absolute;
        bottom: -7px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid #38bdf8;
      }

      @media (max-width: 768px) {
        .ao3d-left-dock {
          width: 230px;
          max-height: 45vh;
        }
        .ao3d-inspector {
          width: calc(100vw - 24px);
          right: 12px;
          left: 12px;
          bottom: 46px;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  class AgentOffice3D {
    constructor(container, options = {}) {
      injectStyles();
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) throw new Error('AgentOffice3D: Target container not found.');

      const defaultLang = (options.lang || (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('vi') ? 'vi' : 'vi')).toLowerCase();
      this.lang = I18N[defaultLang] ? defaultLang : 'vi';

      this.options = Object.assign({
        autoRotate: true,
        title: '3D Multi-Agent Office Hub',
        showTopBar: true,
        onAgentSelect: null,
        onTopologyChange: null
      }, options);

      // Master agent list & active morphing nodes
      this.agents = [];
      this.despawningAgents = [];
      this.selectedAgent = null;
      this.hoveredAgent = null;
      this.focusedAgentId = null;
      this.hideCompleted = false;
      this.layoutMode = '';

      // 3D Camera with Smooth Lerp Damping
      this.rotX = 0.40;
      this.rotY = -0.35;
      this.zoom = 1.05;
      this.targetRotX = 0.40;
      this.targetRotY = -0.35;
      this.targetZoom = 1.05;

      // Dynamic Floor Morphing
      this.currentFloorSize = 340;
      this.targetFloorSize = 340;

      // Pointer & Touch State
      this.isDragging = false;
      this.dragMoved = false;
      this.prevMouseX = 0;
      this.prevMouseY = 0;
      this.pinchDist = 0;
      this.time = 0;
      this.isAutoRotate = this.options.autoRotate;

      // Responsive HUD State
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      this.isLeftCollapsed = isMobile;
      this.isLeftCompact = false;
      this.isRightCollapsed = isMobile;
      this.isRightCompact = false;

      // Active Speech Bubbles & Data Pulses
      this.bubbles = [];
      this.pulses = [];
      this._domUpdatePending = false;

      this._initDOM();
      this._bindEvents();
      this._startLoop();
    }

    t(key) {
      return (I18N[this.lang] && I18N[this.lang][key]) || I18N.vi[key] || key;
    }

    setLanguage(lang) {
      if (!I18N[lang]) return;
      this.lang = lang;
      this._refreshLabels();
      this._scheduleDOMUpdate();
      if (this.selectedAgent) {
        this._updateInspector(this.selectedAgent);
      }
    }

    setTitle(newTitle) {
      this.options.title = newTitle;
      if (this.titleEl) {
        this.titleEl.textContent = `🌐 ${newTitle}`;
      }
    }

    _initDOM() {
      this.container.innerHTML = `
        <div class="ao3d-root">
          <canvas class="ao3d-canvas"></canvas>

          <!-- Top Bar Controls -->
          <div class="ao3d-topbar" style="${this.options.showTopBar ? '' : 'display:none;'}">
            <div class="ao3d-topbar-group">
              <span id="ao3dTitleText" style="font-weight:700; font-size:13px; color:#f8fafc; letter-spacing:0.4px; font-family:monospace; background:rgba(15,23,42,0.8); padding:4px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                🌐 ${escapeHtml(this.options.title)}
              </span>
              <span class="ao3d-badge" id="ao3dAgentCountBadge" style="background:rgba(52,211,153,0.15); color:#34d399; border:1px solid rgba(52,211,153,0.35);">
                0 ${this.t('agentsBadge')}
              </span>
              <span class="ao3d-badge" id="ao3dLayoutBadge" style="background:rgba(99,102,241,0.16); color:#a5b4fc; border:1px solid rgba(99,102,241,0.35);">
                Solo
              </span>
            </div>
            <div class="ao3d-topbar-group">
              <button class="ao3d-pill-btn" id="ao3dFilterDoneBtn" title="Toggle completed agents">
                <span>👁️</span>
                <span id="ao3dFilterDoneText">${this.t('hideDone')}</span>
              </button>
              <button class="ao3d-pill-btn" id="ao3dAutoRotateBtn">
                <span id="ao3dRotateDot" style="width:8px; height:8px; border-radius:50%; background:${this.isAutoRotate ? '#38bdf8' : '#64748b'};"></span>
                <span id="ao3dRotateText">${this.isAutoRotate ? this.t('autoRotateOn') : this.t('autoRotateOff')}</span>
              </button>
              <button class="ao3d-pill-btn" id="ao3dResetCamBtn">🎯 ${this.t('overview')}</button>
            </div>
          </div>

          <!-- Speech Bubbles Layer -->
          <div class="ao3d-bubbles" id="ao3dBubblesLayer"></div>

          <!-- Left Dock (Team Telemetry) -->
          <div class="ao3d-panel ao3d-left-dock" id="ao3dLeftDock" style="${this.isLeftCollapsed ? 'display:none;' : 'display:flex;'}">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px; font-family:monospace;">
              <span id="ao3dLeftTitle" style="font-size:11px; font-weight:700; color:#f8fafc; text-transform:uppercase;">${this.t('progressTitle')}</span>
              <div style="display:flex; gap:4px;">
                <button class="ao3d-pill-btn" style="padding:2px 6px;" id="ao3dLeftCompactBtn" title="Compact">🗜️</button>
                <button class="ao3d-pill-btn" style="padding:2px 6px;" id="ao3dLeftCloseBtn" title="Close">✕</button>
              </div>
            </div>
            <div class="ao3d-scroll-list" id="ao3dProgressList"></div>
          </div>

          <!-- Reopen Left Dock Pill -->
          <button class="ao3d-reopen-pill" id="ao3dReopenLeftBtn" style="top:50px; left:12px; display:${this.isLeftCollapsed ? 'flex' : 'none'};">
            <span style="width:8px; height:8px; border-radius:50%; background:#34d399;"></span>
            <span id="ao3dReopenLeftText">${this.t('reopenProgress')}</span>
          </button>

          <!-- Right Inspector Card -->
          <div class="ao3d-panel ao3d-inspector" id="ao3dInspectorCard" style="${this.isRightCollapsed ? 'display:none;' : 'display:block;'}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span id="ao3dCardBadge" style="width:12px; height:12px; border-radius:50%; background:#38bdf8; box-shadow:0 0 10px #38bdf8; flex-shrink:0;"></span>
                <div>
                  <div id="ao3dCardName" style="font-size:13px; font-weight:700; font-family:monospace; color:#f8fafc;">${this.t('unselectedName')}</div>
                  <div id="ao3dCardRole" style="font-size:11px; color:#38bdf8; font-family:monospace;">${this.t('unselectedRole')}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <button class="ao3d-pill-btn" style="padding:2px 6px;" id="ao3dRightCompactBtn" title="Compact">🗜️</button>
                <button class="ao3d-pill-btn" style="padding:2px 6px;" id="ao3dRightCloseBtn" title="Close">✕</button>
              </div>
            </div>

            <div id="ao3dInspectorBody">
              <p id="ao3dCardDesc" style="font-size:11.5px; color:#94a3b8; line-height:1.45; margin:0 0 10px 0; word-break:break-word;">
                ${this.t('unselectedDesc')}
              </p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:rgba(0,0,0,0.35); padding:8px; border-radius:6px; font-family:monospace; font-size:11px;">
                <div>
                  <span id="ao3dLabelStatus" style="color:#64748b; display:block; font-size:10px;">${this.t('statusLabel')}</span>
                  <span id="ao3dCardState" style="color:#34d399; font-weight:600;">${this.t('readyState')}</span>
                </div>
                <div>
                  <span id="ao3dLabelProgress" style="color:#64748b; display:block; font-size:10px;">${this.t('progressLabel')}</span>
                  <span id="ao3dCardProg" style="color:#f8fafc; font-weight:600;">0%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reopen Right Inspector Pill -->
          <button class="ao3d-reopen-pill" id="ao3dReopenRightBtn" style="bottom:48px; right:12px; display:${this.isRightCollapsed ? 'flex' : 'none'};">
            <span id="ao3dReopenDot" style="width:8px; height:8px; border-radius:50%; background:#38bdf8;"></span>
            <span id="ao3dReopenText">${this.t('reopenInspector')}</span>
            <span id="ao3dReopenOpenLabel" style="color:#38bdf8; font-size:10px;">${this.t('openBtn')}</span>
          </button>

          <!-- Footer Quick Switcher -->
          <div class="ao3d-footer" id="ao3dFooterChips">
            <span id="ao3dJumpLabel" style="font-size:11px; color:#64748b; font-family:monospace; white-space:nowrap;">${this.t('jumpToDesk')}</span>
          </div>
        </div>
      `;

      this.canvas = this.container.querySelector('.ao3d-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.bubblesLayer = this.container.querySelector('#ao3dBubblesLayer');
      this.progressListEl = this.container.querySelector('#ao3dProgressList');
      this.footerChipsEl = this.container.querySelector('#ao3dFooterChips');
      this.agentCountBadge = this.container.querySelector('#ao3dAgentCountBadge');
      this.layoutBadge = this.container.querySelector('#ao3dLayoutBadge');
      this.titleEl = this.container.querySelector('#ao3dTitleText');

      this._resizeCanvas();
    }

    _refreshLabels() {
      const setTxt = (sel, txt) => {
        const el = this.container.querySelector(sel);
        if (el) el.textContent = txt;
      };
      setTxt('#ao3dFilterDoneText', this.hideCompleted ? this.t('showDone') : this.t('hideDone'));
      setTxt('#ao3dRotateText', this.isAutoRotate ? this.t('autoRotateOn') : this.t('autoRotateOff'));
      setTxt('#ao3dResetCamBtn', `🎯 ${this.t('overview')}`);
      setTxt('#ao3dLeftTitle', this.t('progressTitle'));
      setTxt('#ao3dReopenLeftText', this.t('reopenProgress'));
      setTxt('#ao3dLabelStatus', this.t('statusLabel'));
      setTxt('#ao3dLabelProgress', this.t('progressLabel'));
      setTxt('#ao3dReopenOpenLabel', this.t('openBtn'));
      setTxt('#ao3dJumpLabel', this.t('jumpToDesk'));
      this._updateTopBadges();
    }

    _updateTopBadges() {
      const visibleCount = this._getVisibleAgents().length;
      const totalCount = this.agents.length;
      if (this.agentCountBadge) {
        this.agentCountBadge.textContent = visibleCount === totalCount
          ? `${totalCount} ${this.t('agentsBadge')}`
          : `${visibleCount}/${totalCount} ${this.t('agentsBadge')}`;
      }
      if (this.layoutBadge) {
        let modeKey = 'modeSolo';
        if (visibleCount >= 2 && visibleCount <= 4) modeKey = 'modeArc';
        else if (visibleCount >= 5 && visibleCount <= 12) modeKey = 'modeHub';
        else if (visibleCount > 12) modeKey = 'modeMatrix';
        this.layoutMode = this.t(modeKey);
        this.layoutBadge.textContent = this.layoutMode;
      }
    }

    _getVisibleAgents() {
      if (!this.hideCompleted) return this.agents;
      return this.agents.filter(a => a.isLeader || (a.progress < 100 && !/done|completed|hoàn thành|xong/i.test(a.status)));
    }

    /**
     * Calculate Target 3D Coordinates for N visible agents
     * Supports smooth transition between Solo (1) <-> Arc (2-4) <-> Radial Hub (5-12) <-> Swarm Matrix (13+)
     */
    _recomputeTargets() {
      const visible = this._getVisibleAgents();
      const N = visible.length;

      this._updateTopBadges();

      if (N === 0) {
        this.targetFloorSize = 340;
        return;
      }

      // Identify Leader
      let leaderIdx = visible.findIndex(a =>
        a.isLeader ||
        (a.role && /chỉ huy|leader|orchestrator|lead|master|architect|coordinator/i.test(a.role))
      );
      if (leaderIdx === -1 && N >= 3) leaderIdx = 0;

      visible.forEach((ag, idx) => {
        ag.isLeaderComputed = (idx === leaderIdx);
      });

      if (N === 1) {
        visible[0].targetPos = { x: 0, y: 0, z: 0 };
        visible[0].targetDeskW = 74;
        visible[0].targetDeskD = 32;
        visible[0].screens = 3;
      } else if (N <= 4) {
        const span = (N - 1) * 120;
        visible.forEach((ag, i) => {
          const t = N === 1 ? 0 : (i / (N - 1) - 0.5);
          ag.targetPos = {
            x: t * span,
            y: Math.abs(t) * 14,
            z: Math.abs(t) * 48 - 22
          };
          ag.targetDeskW = ag.isLeaderComputed ? 66 : 58;
          ag.targetDeskD = ag.isLeaderComputed ? 28 : 26;
        });
      } else if (N <= 12) {
        const leader = leaderIdx !== -1 ? visible[leaderIdx] : null;
        if (leader) {
          leader.targetPos = { x: 0, y: -24, z: -115 };
          leader.targetDeskW = 76;
          leader.targetDeskD = 32;
          leader.screens = 3;
        }

        const others = visible.filter((_, idx) => idx !== leaderIdx);
        const count = others.length;
        const radiusX = Math.max(165, count * 27);
        const radiusZ = Math.max(115, count * 18);

        others.forEach((ag, i) => {
          const angle = (Math.PI * 2 * i) / count + Math.PI / 2;
          ag.targetPos = {
            x: Math.cos(angle) * radiusX,
            y: Math.sin(angle) * 14 + 18,
            z: Math.sin(angle) * radiusZ + 22
          };
          ag.targetDeskW = 54;
          ag.targetDeskD = 24;
        });
      } else {
        const leader = leaderIdx !== -1 ? visible[leaderIdx] : null;
        if (leader) {
          leader.targetPos = { x: 0, y: -48, z: -205 };
          leader.targetDeskW = 82;
          leader.targetDeskD = 34;
          leader.screens = 3;
        }

        const others = visible.filter((_, idx) => idx !== leaderIdx);
        const rows = Math.ceil(others.length / 2);
        others.forEach((ag, i) => {
          const side = (i % 2 === 0) ? -1 : 1;
          const row = Math.floor(i / 2);
          const colOffset = Math.floor(row / 4) * 90;
          const rowInCol = row % 4;
          const totalRowsInCol = Math.min(4, rows);
          ag.targetPos = {
            x: side * (125 + colOffset),
            y: (rowInCol - totalRowsInCol / 2) * 10,
            z: (rowInCol - totalRowsInCol / 2) * 88 + 20
          };
          ag.targetDeskW = 52;
          ag.targetDeskD = 24;
        });
      }

      // Dynamic Floor Size & Elastic Auto-Framing Zoom
      this.targetFloorSize = Math.max(340, Math.sqrt(N) * 120);
      if (!this.focusedAgentId) {
        const idealZoom = Math.max(0.58, Math.min(1.18, 410 / this.targetFloorSize));
        this.targetZoom = idealZoom;
      }

      if (typeof this.options.onTopologyChange === 'function') {
        this.options.onTopologyChange({
          count: N,
          totalCount: this.agents.length,
          mode: this.layoutMode
        });
      }
    }

    /**
     * Keyed State Reconciliation (Virtual-DOM style diffing for 3D Agents)
     * Preserves existing agent positions, colors, selection, and bubbles while morphing!
     */
    setAgents(agentsList) {
      if (!Array.isArray(agentsList)) return;

      const existingMap = new Map(this.agents.map(a => [String(a.id), a]));
      const nextAgents = [];

      agentsList.forEach((raw, idx) => {
        const id = String(raw.id || `agent_${idx + 1}`);
        const prev = existingMap.get(id);

        if (prev) {
          existingMap.delete(id);
          if (raw.name !== undefined) prev.name = raw.name;
          if (raw.role !== undefined) prev.role = raw.role;
          if (raw.status !== undefined) prev.status = raw.status;
          if (typeof raw.progress === 'number') prev.progress = Math.max(0, Math.min(100, raw.progress));
          if (raw.desc !== undefined) prev.desc = raw.desc;
          if (raw.message !== undefined) prev.message = raw.message;
          if (raw.color) prev.color = raw.color;
          if (raw.isLeader !== undefined) prev.isLeader = Boolean(raw.isLeader);
          if (raw.screens !== undefined) prev.screens = raw.screens;
          nextAgents.push(prev);
        } else {
          const color = raw.color || hashColor(id);
          nextAgents.push({
            id,
            name: raw.name || `Agent ${idx + 1}`,
            role: raw.role || this.t('defaultRole'),
            status: raw.status || this.t('defaultStatus'),
            progress: typeof raw.progress === 'number' ? Math.max(0, Math.min(100, raw.progress)) : 100,
            desc: raw.desc || this.t('defaultDesc'),
            message: raw.message || this.t('defaultMsg'),
            color,
            screens: raw.screens || 2,
            isLeader: Boolean(raw.isLeader),
            pos: { x: 0, y: -30, z: 0 },
            targetPos: { x: 0, y: 0, z: 0 },
            deskW: 54,
            deskD: 24,
            targetDeskW: 54,
            targetDeskD: 24,
            spawnScale: 0.08,
            spawnBeam: 1.0,
            phase: Math.random() * Math.PI * 2,
            joinedAt: Date.now() + idx
          });
        }
      });

      // Handle removed agents with Hologram Dissolve effect
      existingMap.forEach(removedAg => {
        this._triggerDespawn(removedAg);
      });

      this.agents = nextAgents;
      this._recomputeTargets();

      // Snap initial position if first load
      this.agents.forEach(ag => {
        if (ag.spawnScale < 0.15 && ag.pos.x === 0 && ag.pos.z === 0) {
          ag.pos = {
            x: ag.targetPos.x * 0.65,
            y: ag.targetPos.y,
            z: ag.targetPos.z * 0.65
          };
        }
      });

      // Maintain or fallback selection
      if (this.selectedAgent) {
        const stillThere = this.agents.find(a => a.id === this.selectedAgent.id);
        if (stillThere) {
          this.selectedAgent = stillThere;
          this._updateInspector(stillThere);
        } else if (this.agents.length > 0) {
          this.selectAgent(this.agents[0].id);
        } else {
          this.selectedAgent = null;
        }
      } else if (this.agents.length > 0) {
        this.selectAgent(this.agents[0].id);
      }

      this._scheduleDOMUpdate();
    }

    /**
     * Dynamically Add or Update a single agent (Auto-Spawn & Smooth Morph)
     */
    upsertAgent(agentData) {
      if (!agentData || !agentData.id) return;
      const id = String(agentData.id);
      const existing = this.agents.find(a => a.id === id);

      if (existing) {
        const prevProg = existing.progress;
        if (agentData.name !== undefined) existing.name = agentData.name;
        if (agentData.role !== undefined) existing.role = agentData.role;
        if (agentData.status !== undefined) existing.status = agentData.status;
        if (typeof agentData.progress === 'number') {
          existing.progress = Math.max(0, Math.min(100, agentData.progress));
        }
        if (agentData.desc !== undefined) existing.desc = agentData.desc;
        if (agentData.message !== undefined) existing.message = agentData.message;
        if (agentData.color) existing.color = agentData.color;
        if (agentData.isLeader !== undefined) existing.isLeader = Boolean(agentData.isLeader);
        if (agentData.screens !== undefined) existing.screens = agentData.screens;

        if (prevProg !== existing.progress) {
          this._emitDataPulse(existing.id);
        }

        if (this.hideCompleted) {
          this._recomputeTargets();
        }
        if (this.selectedAgent && this.selectedAgent.id === id) {
          this._updateInspector(existing);
        }
        this._scheduleDOMUpdate();
      } else {
        const color = agentData.color || hashColor(id);
        const newAg = {
          id,
          name: agentData.name || id,
          role: agentData.role || this.t('defaultRole'),
          status: agentData.status || this.t('defaultStatus'),
          progress: typeof agentData.progress === 'number' ? Math.max(0, Math.min(100, agentData.progress)) : 0,
          desc: agentData.desc || this.t('defaultDesc'),
          message: agentData.message || this.t('defaultMsg'),
          color,
          screens: agentData.screens || 2,
          isLeader: Boolean(agentData.isLeader),
          pos: { x: 0, y: -35, z: 0 },
          targetPos: { x: 0, y: 0, z: 0 },
          deskW: 54,
          deskD: 24,
          targetDeskW: 54,
          targetDeskD: 24,
          spawnScale: 0.05,
          spawnBeam: 1.0,
          phase: Math.random() * Math.PI * 2,
          joinedAt: Date.now()
        };

        this.agents.push(newAg);
        this._recomputeTargets();
        newAg.pos = {
          x: newAg.targetPos.x * 0.5,
          y: newAg.targetPos.y - 15,
          z: newAg.targetPos.z * 0.5
        };
        this._emitDataPulse(newAg.id);

        if (!this.selectedAgent) {
          this.selectAgent(newAg.id);
        }
        this._scheduleDOMUpdate();
      }

      if (agentData.speakMessage) {
        this.speak(id, agentData.speakMessage, agentData.durationMs || 5000);
      }
    }

    /**
     * Update an existing agent or auto-upsert if not found
     */
    updateAgent(agentId, data = {}) {
      this.upsertAgent(Object.assign({}, data, { id: agentId }));
    }

    /**
     * Remove an agent dynamically with Hologram Dissolve animation and re-layout remaining team
     */
    removeAgent(agentId) {
      const id = String(agentId);
      const idx = this.agents.findIndex(a => a.id === id);
      if (idx === -1) return;

      const [removed] = this.agents.splice(idx, 1);
      this._triggerDespawn(removed);

      // Remove active speech bubble for this agent
      const bIdx = this.bubbles.findIndex(b => b.agentId === id);
      if (bIdx !== -1) {
        this.bubbles[bIdx].el.remove();
        this.bubbles.splice(bIdx, 1);
      }

      if (this.focusedAgentId === id) {
        this.focusedAgentId = null;
      }

      this._recomputeTargets();

      if (this.selectedAgent && this.selectedAgent.id === id) {
        this.selectedAgent = this.agents[0] || null;
        if (this.selectedAgent) {
          this._updateInspector(this.selectedAgent);
        }
      }
      this._scheduleDOMUpdate();
    }

    _triggerDespawn(ag) {
      this.despawningAgents.push(Object.assign({}, ag, {
        despawnAlpha: 1.0
      }));
    }

    _emitDataPulse(targetAgentId) {
      this.pulses.push({
        targetId: targetAgentId,
        progress: 0,
        speed: 0.032
      });
    }

    /**
     * Show 3D Floating Speech Bubble with countdown bar (XSS-safe & Viewport-clamped)
     */
    speak(agentId, messageText, durationMs = 5000) {
      const id = String(agentId);
      const ag = this.agents.find(a => a.id === id);
      if (!ag) return;

      this._emitDataPulse(id);
      ag.message = messageText;

      const existIdx = this.bubbles.findIndex(b => b.agentId === id);
      if (existIdx !== -1) {
        this.bubbles[existIdx].el.remove();
        this.bubbles.splice(existIdx, 1);
      }

      const el = document.createElement('div');
      el.className = 'ao3d-bubble';
      el.style.borderColor = ag.color;
      el.style.boxShadow = `0 10px 26px ${ag.color}40`;

      const shortName = escapeHtml(formatShortName(ag.name, 16));
      const safeMsg = escapeHtml(messageText);
      const sec = Math.max(1, Math.round(durationMs / 1000));

      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; margin-bottom:4px; font-family:monospace;">
          <span style="font-weight:700; color:${escapeHtml(ag.color)}; display:flex; align-items:center; gap:5px;">
            <span style="width:6px; height:6px; border-radius:50%; background:${escapeHtml(ag.color)};"></span>
            ${shortName}
          </span>
          <span style="font-size:10px; color:#94a3b8; background:rgba(0,0,0,0.35); padding:1px 5px; border-radius:4px;">${sec}s</span>
        </div>
        <div style="color:#f1f5f9; font-weight:500; font-size:11.5px; line-height:1.38; word-break:break-word;">${safeMsg}</div>
        <div style="width:100%; height:3px; background:rgba(0,0,0,0.45); border-radius:2px; margin-top:6px; overflow:hidden;">
          <div class="ao3d-timer-bar" style="width:100%; height:100%; background:${escapeHtml(ag.color)}; transition: width ${durationMs}ms linear;"></div>
        </div>
        <div class="ao3d-bubble-arrow" style="border-top-color:${escapeHtml(ag.color)};"></div>
      `;

      this.bubblesLayer.appendChild(el);
      const timerBar = el.querySelector('.ao3d-timer-bar');
      setTimeout(() => {
        if (timerBar) timerBar.style.width = '0%';
      }, 25);

      this.bubbles.push({
        agentId: ag.id,
        el,
        startTime: Date.now(),
        duration: durationMs
      });
    }

    selectAgent(agentId) {
      const ag = typeof agentId === 'string' ? this.agents.find(a => a.id === agentId) : agentId;
      if (!ag) return;
      this.selectedAgent = ag;

      this._updateInspector(ag);
      this._highlightRowsAndChips(ag.id);

      if (typeof this.options.onAgentSelect === 'function') {
        this.options.onAgentSelect(ag);
      }
    }

    focusAgent(agentId) {
      const ag = this.agents.find(a => a.id === String(agentId));
      if (!ag) return;
      this.selectAgent(ag);
      this.focusedAgentId = ag.id;
      this.targetRotX = 0.25;
      this.targetRotY = -ag.targetPos.x * 0.0022;
      this.targetZoom = 1.65;
      this.speak(ag.id, ag.message || this.t('focusMsg'));
    }

    resetCamera() {
      this.focusedAgentId = null;
      this.targetRotX = 0.40;
      this.targetRotY = -0.35;
      this.targetZoom = Math.max(0.58, Math.min(1.18, 410 / this.targetFloorSize));
    }

    _updateInspector(ag) {
      const cardBadge = this.container.querySelector('#ao3dCardBadge');
      const cardName = this.container.querySelector('#ao3dCardName');
      const cardRole = this.container.querySelector('#ao3dCardRole');
      const cardDesc = this.container.querySelector('#ao3dCardDesc');
      const cardState = this.container.querySelector('#ao3dCardState');
      const cardProg = this.container.querySelector('#ao3dCardProg');
      const reopenDot = this.container.querySelector('#ao3dReopenDot');
      const reopenText = this.container.querySelector('#ao3dReopenText');

      if (cardBadge) {
        cardBadge.style.backgroundColor = ag.color;
        cardBadge.style.boxShadow = `0 0 12px ${ag.color}`;
      }
      if (cardName) cardName.textContent = ag.name;
      if (cardRole) {
        cardRole.textContent = ag.role;
        cardRole.style.color = ag.color;
      }
      if (cardDesc) cardDesc.textContent = ag.desc;
      if (cardState) cardState.textContent = ag.status;
      if (cardProg) {
        cardProg.textContent = `${ag.progress}%`;
        cardProg.style.color = ag.color;
      }
      if (reopenDot) reopenDot.style.backgroundColor = ag.color;
      if (reopenText) reopenText.textContent = formatShortName(ag.name, 16);
    }

    _scheduleDOMUpdate() {
      if (this._domUpdatePending) return;
      this._domUpdatePending = true;
      requestAnimationFrame(() => {
        this._domUpdatePending = false;
        this._renderProgressList();
        this._renderFooterChips();
      });
    }

    _renderProgressList() {
      if (!this.progressListEl) return;
      this.progressListEl.innerHTML = '';

      this.agents.forEach(ag => {
        const isSel = this.selectedAgent && this.selectedAgent.id === ag.id;
        const row = document.createElement('div');
        row.className = `ao3d-agent-row ${isSel ? 'active' : ''}`;
        row.dataset.id = ag.id;

        const safeColor = escapeHtml(ag.color);
        const safeName = escapeHtml(ag.name);
        const shortName = escapeHtml(formatShortName(ag.name, 14));
        const safeStatus = escapeHtml(ag.status);

        if (this.isLeftCompact) {
          row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-family:monospace; font-size:11px;">
              <span style="display:flex; align-items:center; gap:5px; font-weight:700; color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                <span style="width:6px; height:6px; border-radius:50%; background:${safeColor}; flex-shrink:0;"></span>
                ${shortName}
              </span>
              <span style="font-weight:700; color:${safeColor}; flex-shrink:0;">${ag.progress}%</span>
            </div>
            <div style="width:100%; height:3px; background:rgba(0,0,0,0.5); border-radius:2px; margin-top:4px; overflow:hidden;">
              <div style="width:${ag.progress}%; height:100%; background:${safeColor};"></div>
            </div>
          `;
        } else {
          row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-family:monospace; font-size:11px; margin-bottom:3px;">
              <span style="display:flex; align-items:center; gap:6px; font-weight:700; color:#f8fafc;">
                <span style="width:8px; height:8px; border-radius:50%; background:${safeColor};"></span>
                ${safeName}
              </span>
              <span style="font-weight:700; color:${safeColor};">${ag.progress}%</span>
            </div>
            <div style="font-size:10px; color:#94a3b8; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${safeStatus}
            </div>
            <div style="width:100%; height:4px; background:rgba(0,0,0,0.5); border-radius:2px; overflow:hidden;">
              <div style="width:${ag.progress}%; height:100%; background:linear-gradient(90deg, ${safeColor}, #34d399);"></div>
            </div>
          `;
        }

        row.addEventListener('click', () => this.focusAgent(ag.id));
        this.progressListEl.appendChild(row);
      });
    }

    _renderFooterChips() {
      if (!this.footerChipsEl) return;
      const label = this.footerChipsEl.firstElementChild;
      this.footerChipsEl.innerHTML = '';
      if (label) this.footerChipsEl.appendChild(label);

      this.agents.forEach(ag => {
        const isSel = this.selectedAgent && this.selectedAgent.id === ag.id;
        const chip = document.createElement('button');
        chip.className = `ao3d-chip ${isSel ? 'active' : ''}`;
        chip.dataset.id = ag.id;
        const safeColor = escapeHtml(ag.color);
        const shortName = escapeHtml(formatShortName(ag.name, 14));
        chip.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:${safeColor};"></span><span>${shortName}</span>`;
        chip.addEventListener('click', () => this.focusAgent(ag.id));
        this.footerChipsEl.appendChild(chip);
      });
    }

    _highlightRowsAndChips(agentId) {
      this.container.querySelectorAll('.ao3d-agent-row').forEach(row => {
        row.classList.toggle('active', row.dataset.id === agentId);
      });
      this.container.querySelectorAll('.ao3d-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.id === agentId);
      });
    }

    _resizeCanvas() {
      const rect = this.container.getBoundingClientRect();
      this.width = rect.width || 800;
      this.height = rect.height || 600;
      this.dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    _raycastAt(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;
      const visible = this._getVisibleAgents();

      // Check front-to-back (closest depth first)
      const sorted = visible
        .map(a => ({ agent: a, proj: this._project3D(a.pos) }))
        .sort((a, b) => a.proj.depth - b.proj.depth);

      for (const { agent, proj } of sorted) {
        const dw = (agent.deskW || 52) * proj.scale;
        const dist = Math.hypot(mouseX - proj.screenX, mouseY - (proj.screenY - 12 * proj.scale));
        if (dist <= dw * 0.78 + 12) {
          return agent;
        }
      }
      return null;
    }

    _bindEvents() {
      this._onResize = () => this._resizeCanvas();
      window.addEventListener('resize', this._onResize);

      // Mouse Controls
      this.canvas.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.dragMoved = false;
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
      });

      this._onMouseUp = () => {
        this.isDragging = false;
      };
      window.addEventListener('mouseup', this._onMouseUp);

      this.canvas.addEventListener('mousemove', (e) => {
        if (this.isDragging) {
          const dx = e.clientX - this.prevMouseX;
          const dy = e.clientY - this.prevMouseY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.dragMoved = true;
          this.targetRotY += dx * 0.0068;
          this.targetRotX = Math.max(0.12, Math.min(1.15, this.targetRotX + dy * 0.0068));
          this.prevMouseX = e.clientX;
          this.prevMouseY = e.clientY;
          return;
        }

        const hit = this._raycastAt(e.clientX, e.clientY);
        this.hoveredAgent = hit;
        this.canvas.style.cursor = hit ? 'pointer' : (this.isDragging ? 'grabbing' : 'grab');
      });

      this.canvas.addEventListener('click', (e) => {
        if (this.dragMoved) return;
        const hit = this._raycastAt(e.clientX, e.clientY);
        if (hit) {
          this.focusAgent(hit.id);
        }
      });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.targetZoom = Math.max(0.45, Math.min(2.8, this.targetZoom + e.deltaY * -0.0014));
      }, { passive: false });

      // Multi-Touch Support (Mobile & Tablet)
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.dragMoved = false;
          this.prevMouseX = e.touches[0].clientX;
          this.prevMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          this.isDragging = false;
          this.pinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      }, { passive: true });

      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && this.isDragging) {
          const dx = e.touches[0].clientX - this.prevMouseX;
          const dy = e.touches[0].clientY - this.prevMouseY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.dragMoved = true;
          this.targetRotY += dx * 0.007;
          this.targetRotX = Math.max(0.12, Math.min(1.15, this.targetRotX + dy * 0.007));
          this.prevMouseX = e.touches[0].clientX;
          this.prevMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (this.pinchDist > 0) {
            const delta = (dist - this.pinchDist) * 0.004;
            this.targetZoom = Math.max(0.45, Math.min(2.8, this.targetZoom + delta));
          }
          this.pinchDist = dist;
        }
      }, { passive: true });

      this.canvas.addEventListener('touchend', (e) => {
        if (!this.dragMoved && e.changedTouches.length === 1) {
          const t = e.changedTouches[0];
          const hit = this._raycastAt(t.clientX, t.clientY);
          if (hit) this.focusAgent(hit.id);
        }
        this.isDragging = false;
        this.pinchDist = 0;
      });

      // Top Bar Buttons
      const filterBtn = this.container.querySelector('#ao3dFilterDoneBtn');
      const filterTxt = this.container.querySelector('#ao3dFilterDoneText');
      if (filterBtn) {
        filterBtn.addEventListener('click', () => {
          this.hideCompleted = !this.hideCompleted;
          filterBtn.classList.toggle('active', this.hideCompleted);
          if (filterTxt) filterTxt.textContent = this.hideCompleted ? this.t('showDone') : this.t('hideDone');
          this._recomputeTargets();
        });
      }

      const autoRotateBtn = this.container.querySelector('#ao3dAutoRotateBtn');
      const rotateDot = this.container.querySelector('#ao3dRotateDot');
      const rotateText = this.container.querySelector('#ao3dRotateText');
      if (autoRotateBtn) {
        autoRotateBtn.addEventListener('click', () => {
          this.isAutoRotate = !this.isAutoRotate;
          rotateDot.style.background = this.isAutoRotate ? '#38bdf8' : '#64748b';
          rotateText.textContent = this.isAutoRotate ? this.t('autoRotateOn') : this.t('autoRotateOff');
        });
      }

      const resetBtn = this.container.querySelector('#ao3dResetCamBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.resetCamera());
      }

      // Left Dock Controls
      const leftDock = this.container.querySelector('#ao3dLeftDock');
      const reopenLeftBtn = this.container.querySelector('#ao3dReopenLeftBtn');
      const leftCloseBtn = this.container.querySelector('#ao3dLeftCloseBtn');
      const leftCompactBtn = this.container.querySelector('#ao3dLeftCompactBtn');

      leftCloseBtn.addEventListener('click', () => {
        this.isLeftCollapsed = true;
        leftDock.style.display = 'none';
        reopenLeftBtn.style.display = 'flex';
      });
      reopenLeftBtn.addEventListener('click', () => {
        this.isLeftCollapsed = false;
        leftDock.style.display = 'flex';
        reopenLeftBtn.style.display = 'none';
      });
      leftCompactBtn.addEventListener('click', () => {
        this.isLeftCompact = !this.isLeftCompact;
        leftDock.classList.toggle('compact', this.isLeftCompact);
        leftCompactBtn.textContent = this.isLeftCompact ? '📖' : '🗜️';
        this._scheduleDOMUpdate();
      });

      // Right Inspector Controls
      const inspectorCard = this.container.querySelector('#ao3dInspectorCard');
      const reopenRightBtn = this.container.querySelector('#ao3dReopenRightBtn');
      const rightCloseBtn = this.container.querySelector('#ao3dRightCloseBtn');
      const rightCompactBtn = this.container.querySelector('#ao3dRightCompactBtn');
      const inspectorBody = this.container.querySelector('#ao3dInspectorBody');

      rightCloseBtn.addEventListener('click', () => {
        this.isRightCollapsed = true;
        inspectorCard.style.display = 'none';
        reopenRightBtn.style.display = 'flex';
      });
      reopenRightBtn.addEventListener('click', () => {
        this.isRightCollapsed = false;
        inspectorCard.style.display = 'block';
        reopenRightBtn.style.display = 'none';
      });
      rightCompactBtn.addEventListener('click', () => {
        this.isRightCompact = !this.isRightCompact;
        inspectorBody.style.display = this.isRightCompact ? 'none' : 'block';
        rightCompactBtn.textContent = this.isRightCompact ? '📖' : '🗜️';
      });
    }

    _project3D(pos) {
      const cosY = Math.cos(this.rotY);
      const sinY = Math.sin(this.rotY);
      const cosX = Math.cos(this.rotX);
      const sinX = Math.sin(this.rotX);

      const x1 = pos.x * cosY + pos.z * sinY;
      const z1 = -pos.x * sinY + pos.z * cosY;

      const y2 = pos.y * cosX - z1 * sinX;
      const z2 = pos.y * sinX + z1 * cosX;

      const cameraDist = 660;
      const scale = (cameraDist / Math.max(120, cameraDist + z2)) * this.zoom;

      return {
        screenX: this.width / 2 + x1 * scale,
        screenY: this.height / 2 + y2 * scale,
        depth: z2,
        scale
      };
    }

    _startLoop() {
      const animate = () => {
        this.time += 0.035;

        if (this.isAutoRotate && !this.isDragging && !this.focusedAgentId) {
          this.targetRotY += 0.0022;
        }

        // Track focused agent if its desk morphed to a new coordinate
        if (this.focusedAgentId && !this.isDragging) {
          const fAg = this.agents.find(a => a.id === this.focusedAgentId);
          if (fAg) {
            this.targetRotY = -fAg.pos.x * 0.0022;
          }
        }

        // Smooth Camera & Floor Interpolation (Lerp)
        const camLerp = 0.12;
        this.rotX += (this.targetRotX - this.rotX) * camLerp;
        this.rotY += (this.targetRotY - this.rotY) * camLerp;
        this.zoom += (this.targetZoom - this.zoom) * camLerp;
        this.currentFloorSize += (this.targetFloorSize - this.currentFloorSize) * 0.08;

        // Smooth Agent Position Morphing & Spawn/Despawn Animations
        const posLerp = 0.11;
        this.agents.forEach(ag => {
          ag.pos.x += (ag.targetPos.x - ag.pos.x) * posLerp;
          ag.pos.y += (ag.targetPos.y - ag.pos.y) * posLerp;
          ag.pos.z += (ag.targetPos.z - ag.pos.z) * posLerp;
          ag.deskW += (ag.targetDeskW - ag.deskW) * posLerp;
          ag.deskD += (ag.targetDeskD - ag.deskD) * posLerp;
          if (ag.spawnScale < 1) {
            ag.spawnScale = Math.min(1, ag.spawnScale + 0.06);
          }
          if (ag.spawnBeam > 0) {
            ag.spawnBeam = Math.max(0, ag.spawnBeam - 0.03);
          }
        });

        for (let i = this.despawningAgents.length - 1; i >= 0; i--) {
          this.despawningAgents[i].despawnAlpha -= 0.065;
          if (this.despawningAgents[i].despawnAlpha <= 0) {
            this.despawningAgents.splice(i, 1);
          }
        }

        for (let i = this.pulses.length - 1; i >= 0; i--) {
          this.pulses[i].progress += this.pulses[i].speed;
          if (this.pulses[i].progress >= 1) {
            this.pulses.splice(i, 1);
          }
        }

        this._renderScene();
        this._updateBubbles();

        this.animFrameId = requestAnimationFrame(animate);
      };
      animate();
    }

    _renderScene() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const visible = this._getVisibleAgents();

      // 1. Draw Isometric Neon Floor
      this._drawFloor(this.currentFloorSize);

      // 2. Draw 3D Topology Conduits & Data Packets between Leader & Workers
      this._drawTopologyConduits(visible);

      // 3. Z-Sort all visible + despawning workstations
      const renderItems = visible.map(a => ({ agent: a, proj: this._project3D(a.pos), isDespawning: false }));
      this.despawningAgents.forEach(da => {
        renderItems.push({ agent: da, proj: this._project3D(da.pos), isDespawning: true });
      });
      renderItems.sort((a, b) => b.proj.depth - a.proj.depth);

      // 4. Draw Workstations & Seated Humanoid Agents
      renderItems.forEach(({ agent, proj, isDespawning }) => {
        this._drawWorkstation(agent, proj, isDespawning);
      });
    }

    _drawFloor(floorSize) {
      const ctx = this.ctx;
      const p1 = this._project3D({ x: -floorSize, y: 75, z: -floorSize });
      const p2 = this._project3D({ x: floorSize, y: 75, z: -floorSize });
      const p3 = this._project3D({ x: floorSize, y: 75, z: floorSize });
      const p4 = this._project3D({ x: -floorSize, y: 75, z: floorSize });

      ctx.beginPath();
      ctx.moveTo(p1.screenX, p1.screenY);
      ctx.lineTo(p2.screenX, p2.screenY);
      ctx.lineTo(p3.screenX, p3.screenY);
      ctx.lineTo(p4.screenX, p4.screenY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(7, 13, 27, 0.78)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const gridSteps = 10;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let i = -floorSize; i <= floorSize; i += floorSize / (gridSteps / 2)) {
        const startA = this._project3D({ x: i, y: 75, z: -floorSize });
        const endA = this._project3D({ x: i, y: 75, z: floorSize });
        ctx.beginPath();
        ctx.moveTo(startA.screenX, startA.screenY);
        ctx.lineTo(endA.screenX, endA.screenY);
        ctx.stroke();

        const startB = this._project3D({ x: -floorSize, y: 75, z: i });
        const endB = this._project3D({ x: floorSize, y: 75, z: i });
        ctx.beginPath();
        ctx.moveTo(startB.screenX, startB.screenY);
        ctx.lineTo(endB.screenX, endB.screenY);
        ctx.stroke();
      }
    }

    _drawTopologyConduits(visible) {
      if (visible.length < 2) return;
      const ctx = this.ctx;
      const leader = visible.find(a => a.isLeaderComputed) || visible[0];
      if (!leader) return;

      const lPos = { x: leader.pos.x, y: 72, z: leader.pos.z };
      const pLeader = this._project3D(lPos);

      visible.forEach(ag => {
        if (ag.id === leader.id) return;
        const wPos = { x: ag.pos.x, y: 72, z: ag.pos.z };
        const pWorker = this._project3D(wPos);

        // Glowing Conduit Line on Floor
        ctx.beginPath();
        ctx.moveTo(pLeader.screenX, pLeader.screenY);
        ctx.lineTo(pWorker.screenX, pWorker.screenY);
        ctx.strokeStyle = `${ag.color}38`;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Ambient Flowing Synapse Dot
        const t = ((this.time * 0.45 + ag.phase) % 1);
        const dotX = pLeader.screenX + (pWorker.screenX - pLeader.screenX) * t;
        const dotY = pLeader.screenY + (pWorker.screenY - pLeader.screenY) * t;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.2 * pWorker.scale, 0, Math.PI * 2);
        ctx.fillStyle = ag.color;
        ctx.fill();
      });

      // Active High-Speed Data Pulses (triggered when agents speak or update progress)
      this.pulses.forEach(pulse => {
        const target = visible.find(a => a.id === pulse.targetId);
        if (!target || target.id === leader.id) return;
        const pWorker = this._project3D({ x: target.pos.x, y: 72, z: target.pos.z });
        const px = pLeader.screenX + (pWorker.screenX - pLeader.screenX) * pulse.progress;
        const py = pLeader.screenY + (pWorker.screenY - pLeader.screenY) * pulse.progress;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 4.5 * pWorker.scale, 0, Math.PI * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = target.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      });
    }

    _drawWorkstation(agent, proj, isDespawning = false) {
      const ctx = this.ctx;
      const spawnScale = isDespawning ? agent.despawnAlpha : (agent.spawnScale || 1);
      const s = proj.scale * spawnScale;
      if (s <= 0.02) return;

      const cx = proj.screenX;
      const cy = proj.screenY;

      ctx.save();
      if (isDespawning) {
        ctx.globalAlpha = Math.max(0, agent.despawnAlpha);
      }

      const isSel = this.selectedAgent && this.selectedAgent.id === agent.id;
      const isHov = this.hoveredAgent && this.hoveredAgent.id === agent.id;
      const isDone = agent.progress >= 100 || /done|completed|hoàn thành|xong/i.test(agent.status);
      const isError = /error|fail|lỗi|blocked/i.test(agent.status);

      const dw = (agent.deskW || 52) * s;
      const dd = (agent.deskD || 24) * s;
      const deskY = cy + 6 * s;

      // 0. Spawn Hologram Beam Effect
      if (agent.spawnBeam > 0) {
        const grad = ctx.createLinearGradient(cx, deskY - 90 * s, cx, deskY + 25 * s);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.5, `${agent.color}55`);
        grad.addColorStop(1, `${agent.color}99`);
        ctx.fillStyle = grad;
        ctx.fillRect(cx - dw * 0.55, deskY - 90 * s, dw * 1.1, 115 * s);
      }

      // 1. Energy Pad under Desk
      ctx.beginPath();
      ctx.ellipse(cx, deskY + 22 * s, dw * 0.92, dd * 1.12, 0, 0, Math.PI * 2);
      if (isError) {
        const pulse = 0.2 + Math.abs(Math.sin(this.time * 4)) * 0.35;
        ctx.fillStyle = `rgba(244, 63, 94, ${pulse})`;
      } else if (isDone) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      } else {
        ctx.fillStyle = isSel ? 'rgba(56, 189, 248, 0.28)' : 'rgba(30, 41, 59, 0.45)';
      }
      ctx.fill();

      if (isSel || isHov || agent.isLeaderComputed) {
        ctx.strokeStyle = isError ? '#f43f5e' : (isDone ? '#10b981' : agent.color);
        ctx.lineWidth = isSel ? 2.2 : 1.2;
        ctx.stroke();
      }

      // 2. Metallic Desk Legs
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.65)';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - dw * 0.4, deskY);
      ctx.lineTo(cx - dw * 0.4, deskY + 20 * s);
      ctx.moveTo(cx + dw * 0.4, deskY);
      ctx.lineTo(cx + dw * 0.4, deskY + 20 * s);
      ctx.stroke();

      // 3. Curved Bevel Desk Surface
      ctx.beginPath();
      ctx.ellipse(cx, deskY, dw * 0.5, dd * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? '#1e293b' : '#0f172a';
      ctx.fill();
      ctx.strokeStyle = isSel ? agent.color : (isHov ? '#38bdf8' : 'rgba(255,255,255,0.16)');
      ctx.lineWidth = isSel ? 2.4 * s : 1.4 * s;
      ctx.stroke();

      // 4. Glowing Cyber Keyboard
      ctx.fillStyle = agent.color;
      ctx.shadowColor = agent.color;
      ctx.shadowBlur = 6 * s;
      ctx.fillRect(cx - 10 * s, deskY - 3 * s, 20 * s, 6.5 * s);
      ctx.shadowBlur = 0;

      // 5. Seated Humanoid Character (with animated typing arms)
      this._drawHumanoidAgent(agent, cx, deskY, s, !isDone && !isError);

      // 6. Floating Hologram Screens (with animated code lines)
      this._drawHologramScreens(agent, cx, deskY, dw, dd, s, !isDone);

      // 7. Floating Name & Status Tag above Head
      const labelY = deskY - 43 * s;
      ctx.font = `bold ${Math.max(10, Math.round(11 * s))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isSel ? '#38bdf8' : '#f1f5f9';
      const displayLabel = formatShortName(agent.name, 14) + ( isDone ? ' ✓' : (isError ? ' ⚠' : '') );
      ctx.fillText(displayLabel, cx, labelY);

      ctx.restore();
    }

    _drawHumanoidAgent(agent, cx, deskY, s, isTyping) {
      const ctx = this.ctx;
      const seatY = deskY + 2 * s;
      const bob = isTyping ? Math.sin(this.time * 3 + (agent.phase || 0)) * 0.8 * s : 0;
      const headY = seatY - 24 * s + bob;

      // Ergonomic Cyber Chair
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(cx - 12 * s, seatY - 18 * s, 24 * s, 24 * s, 6 * s);
      ctx.fill();

      // Torso
      ctx.fillStyle = agent.isLeaderComputed ? '#312e81' : '#334155';
      ctx.beginPath();
      ctx.roundRect(cx - 9 * s, seatY - 14 * s, 18 * s, 16 * s, 4 * s);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(cx, headY, 6.5 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      // Glowing Cyber Visor
      ctx.fillStyle = agent.color;
      ctx.shadowColor = agent.color;
      ctx.shadowBlur = 8 * s;
      ctx.beginPath();
      ctx.roundRect(cx - 5.5 * s, headY - 1.5 * s, 11 * s, 3.5 * s, 1.5 * s);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Animated Typing Arms
      const leftLift = isTyping ? Math.sin(this.time * 8 + (agent.phase || 0)) * 1.8 * s : 0;
      const rightLift = isTyping ? Math.cos(this.time * 8 + (agent.phase || 0)) * 1.8 * s : 0;

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 9 * s, seatY - 8 * s);
      ctx.lineTo(cx - 7 * s, deskY - 1 * s + leftLift);
      ctx.moveTo(cx + 9 * s, seatY - 8 * s);
      ctx.lineTo(cx + 7 * s, deskY - 1 * s + rightLift);
      ctx.stroke();
    }

    _drawHologramScreens(agent, cx, deskY, dw, dd, s, isActive) {
      const ctx = this.ctx;
      const screenCount = agent.screens || (agent.isLeaderComputed ? 3 : 2);
      const screenW = 20 * s;
      const screenH = 13 * s;
      const screenBaseY = deskY - 11 * s;

      const offsets = screenCount === 3
        ? [-screenW * 1.1, 0, screenW * 1.1]
        : [-screenW * 0.65, screenW * 0.65];

      offsets.forEach((off, idx) => {
        const sx = cx + off;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 1.2 * s;
        ctx.shadowColor = agent.color;
        ctx.shadowBlur = 4 * s;

        ctx.beginPath();
        ctx.roundRect(sx - screenW / 2, screenBaseY - screenH, screenW, screenH, 3 * s);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Animated scrolling code lines
        const wave = isActive ? (Math.sin(this.time * 4 + idx + (agent.phase || 0)) + 1) * 0.15 : 0;
        ctx.fillStyle = agent.color;
        ctx.fillRect(sx - screenW * 0.38, screenBaseY - screenH * 0.75, screenW * (0.45 + wave), 1.5 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(sx - screenW * 0.38, screenBaseY - screenH * 0.50, screenW * (0.68 - wave * 0.5), 1.5 * s);
        ctx.fillRect(sx - screenW * 0.38, screenBaseY - screenH * 0.25, screenW * (0.35 + wave * 0.8), 1.5 * s);
      });
    }

    _updateBubbles() {
      const now = Date.now();
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        const age = now - b.startTime;
        if (age >= b.duration) {
          b.el.remove();
          this.bubbles.splice(i, 1);
          continue;
        }

        const ag = this.agents.find(a => a.id === b.agentId);
        if (!ag) {
          b.el.remove();
          this.bubbles.splice(i, 1);
          continue;
        }

        const proj = this._project3D(ag.pos);
        // Clamp within viewport bounds so bubbles never clip off-screen
        const clampedX = Math.max(135, Math.min(this.width - 135, proj.screenX));
        const clampedY = Math.max(95, Math.min(this.height - 55, proj.screenY - 48 * proj.scale));
        b.el.style.left = `${clampedX}px`;
        b.el.style.top = `${clampedY}px`;
        b.el.style.zIndex = String(Math.round(1000 - proj.depth));
      }
    }

    destroy() {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      if (this._onMouseUp) window.removeEventListener('mouseup', this._onMouseUp);
      this.container.innerHTML = '';
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentOffice3D;
  } else {
    global.AgentOffice3D = AgentOffice3D;
  }

})(typeof window !== 'undefined' ? window : this);

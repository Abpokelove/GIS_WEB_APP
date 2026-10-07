import os

css_content = """/* ==========================================================================
   MADURAI GROUNDWATER QUALITY SPATIAL INTELLIGENCE PLATFORM
   Theme: Executive Warm Pleasing Light Blue (Government & CGWB Standards)
   Aesthetics: Soft Warm Ice Blue (#eef4f9), Crisp White Cards (#ffffff), High Contrast Dark Slate (#0f172a)
   ========================================================================== */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap');

:root {
    --bg-primary: #eef4f9;
    --bg-secondary: #e2ebf3;
    --bg-card: #ffffff;
    --bg-card-hover: #f8fafc;
    --bg-glass: rgba(255, 255, 255, 0.96);
    
    --border-subtle: #cbd5e1;
    --border-card: #cbd5e1;
    --border-highlight: #0284c7;
    
    --shadow-card: 0 4px 12px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    --shadow-modal: 0 20px 40px -10px rgba(15, 23, 42, 0.2);
    --backdrop-blur: blur(12px);
    
    --text-primary: #0f172a;
    --text-secondary: #1e293b;
    --text-muted: #475569;
    --text-white: #0f172a;
    
    --accent-blue: #0284c7;
    --accent-teal: #0d9488;
    --accent-amber: #d97706;
    --accent-rose: #dc2626;
    --accent-emerald: #059669;
    --accent-purple: #7c3aed;
    
    --font-heading: 'Outfit', sans-serif;
    --font-body: 'Inter', sans-serif;
    
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-full: 9999px;
    
    --header-height: 74px;
    --sidebar-width: 440px;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-body);
    background-color: #eef4f9;
    background-image: radial-gradient(circle at 50% 0%, rgba(2, 132, 199, 0.05) 0%, transparent 70%);
    color: #0f172a;
    line-height: 1.4;
    overflow: hidden;
    height: 100vh;
}

.app-wrapper {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    position: relative;
    z-index: 10;
    overflow: hidden;
}

/* ==========================================================================
   OFFICIAL HEADER BAR (PERFECT HORIZONTAL ALIGNMENT)
   ========================================================================== */
header.app-header {
    height: 74px;
    background: #ffffff;
    border-bottom: 2px solid #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    gap: 16px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.brand-section {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.brand-emblem {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #0284c7, #0d9488);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff !important;
    font-size: 18px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}

.brand-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.brand-info h1 {
    font-family: var(--font-heading);
    font-size: 1.05rem;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    line-height: 1.2;
}

.brand-info span.official-badge {
    font-size: 0.62rem;
    padding: 2px 6px;
    background: #e0f2fe;
    border: 1px solid #7dd3fc;
    color: #0369a1;
    border-radius: 4px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
}

.brand-info p {
    font-size: 0.7rem;
    color: #475569;
    margin: 2px 0 0 0;
    line-height: 1.2;
    white-space: nowrap;
}

.kpi-ribbon {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
}

.executive-kpi-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-md);
    padding: 6px 12px;
    min-width: 95px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.executive-kpi-card .lbl {
    font-size: 0.6rem;
    color: #475569;
    text-transform: uppercase;
    font-weight: 700;
    white-space: nowrap;
}

.executive-kpi-card .val {
    font-family: var(--font-heading);
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
}

.executive-kpi-card.status-safe .val { color: #059669; }
.executive-kpi-card.status-warning .val { color: #d97706; }
.executive-kpi-card.status-danger .val { color: #dc2626; }
.executive-kpi-card.status-blue .val { color: #0284c7; }

.header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.btn {
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
    white-space: nowrap;
}

.btn-primary {
    background: #0284c7;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}

.btn-primary:hover {
    background: #0369a1;
    transform: translateY(-1px);
}

.btn-glass {
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #cbd5e1;
}

.btn-glass:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
}

/* ==========================================================================
   TOPIC NAVIGATION STRIP (PERFECT HORIZONTAL SCROLL & PADDING)
   ========================================================================== */
.topic-nav-strip {
    background: #e2ebf3;
    border-bottom: 1px solid #cbd5e1;
    display: flex;
    align-items: center;
    padding: 6px 16px;
    gap: 6px;
    overflow-x: auto;
    white-space: nowrap;
    z-index: 900;
}

.topic-tab-btn {
    height: 32px;
    padding: 0 12px;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.topic-tab-btn .num {
    font-size: 0.65rem;
    padding: 2px 6px;
    background: #e2e8f0;
    color: #0f172a;
    border-radius: 4px;
    font-weight: 700;
}

.topic-tab-btn:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #94a3b8;
}

.topic-tab-btn.active {
    background: #0284c7 !important;
    border-color: #0369a1 !important;
    color: #ffffff !important;
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
}

.topic-tab-btn.active .num {
    background: #0369a1 !important;
    color: #ffffff !important;
}

.topic-tab-btn.report-tab-btn {
    background: #fee2e2 !important;
    border-color: #fca5a5 !important;
    color: #991b1b !important;
}

.topic-tab-btn.report-tab-btn.active {
    background: #dc2626 !important;
    border-color: #b91c1c !important;
    color: #ffffff !important;
}

.topic-tab-btn.report-tab-btn.active .num {
    background: #b91c1c !important;
    color: #ffffff !important;
}

/* ==========================================================================
   MAIN DASHBOARD WORKSPACE (BALANCED MAP + SIDEBAR)
   ========================================================================== */
.main-workspace {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
    padding: 14px 16px;
    gap: 14px;
    background: #eef4f9;
}

.map-panel-framed {
    flex: 1;
    height: 100%;
    position: relative;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.map-header-toolbar {
    height: 40px;
    background: #ffffff;
    border-bottom: 1px solid #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    font-size: 0.75rem;
    color: #0f172a;
    z-index: 10;
}

.map-header-toolbar .title {
    font-family: var(--font-heading);
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
}

.basemap-pill-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.basemap-pill {
    padding: 3px 8px;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 4px;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    cursor: pointer;
}

.basemap-pill.active {
    background: #0284c7;
    color: #ffffff;
    border-color: #0369a1;
}

#leaflet-map {
    flex: 1;
    width: 100%;
    height: 100%;
    z-index: 1;
}

/* FLOATING MAP CONTROLS */
.map-floating-overlay {
    position: absolute;
    z-index: 400;
    pointer-events: none;
}

.map-floating-overlay > * {
    pointer-events: auto;
}

.map-control-card {
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: var(--backdrop-blur);
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
    padding: 10px 12px;
}

.layer-switcher-box {
    top: 50px;
    left: 12px;
    max-width: 240px;
}

.layer-switcher-box h4 {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #0284c7;
    font-weight: 700;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.layer-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    margin-bottom: 4px;
    color: #1e293b;
}

.map-legend-box {
    bottom: 60px;
    left: 12px;
    max-width: 250px;
}

.map-legend-box h4 {
    font-size: 0.72rem;
    text-transform: uppercase;
    color: #0284c7;
    font-weight: 700;
    margin-bottom: 4px;
}

.legend-scale-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    margin: 4px 0;
    overflow: hidden;
}

.legend-scale-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.62rem;
    color: #64748b;
    font-weight: 600;
}

.legend-classes-list {
    margin-top: 6px;
    font-size: 0.68rem;
    color: #1e293b;
}

.legend-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
}

.legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.time-controller-bar {
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 24px);
    max-width: 750px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-md);
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
}

.time-play-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #0284c7;
    color: #ffffff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.time-slider-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.time-slider-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: #475569;
    font-weight: 600;
}

.time-slider-wrapper input[type="range"] {
    width: 100%;
    height: 4px;
    accent-color: #0284c7;
}

/* ==========================================================================
   ANALYTICS SIDEBAR (CLEAN CARDS & NO TEXT OVERLAPS)
   ========================================================================== */
aside.analytics-sidebar {
    width: 440px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    padding-right: 2px;
}

.sidebar-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-lg);
    padding: 14px;
    box-shadow: var(--shadow-card);
}

.sidebar-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
}

.sidebar-card-header h3 {
    font-family: var(--font-heading);
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* Forecast Panel */
.forecast-card {
    background: #f0f7fc;
    border: 1px solid #bae6fd;
    border-radius: var(--radius-lg);
    padding: 14px;
}

.forecast-card h3 {
    color: #0369a1;
    font-family: var(--font-heading);
    font-size: 0.95rem;
    font-weight: 700;
}

.horizon-pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0;
}

.horizon-pill {
    padding: 4px 10px;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 4px;
    background: #ffffff;
    color: #0369a1;
    border: 1px solid #7dd3fc;
    cursor: pointer;
    white-space: nowrap;
}

.horizon-pill.active {
    background: #0284c7;
    color: #ffffff;
    border-color: #0369a1;
}

.forecast-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 8px;
}

.forecast-tile {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
}

.forecast-tile .k {
    font-size: 0.62rem;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
}

.forecast-tile .v {
    font-family: var(--font-heading);
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
}

/* Leaderboard Table */
.leaderboard-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
}

.leaderboard-table th {
    text-align: left;
    padding: 6px 8px;
    background: #f1f5f9;
    color: #475569;
    border-bottom: 2px solid #cbd5e1;
    font-size: 0.65rem;
    text-transform: uppercase;
}

.leaderboard-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
}

/* ==========================================================================
   REPORT VIEW & MODALS
   ========================================================================== */
.report-view-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 20px;
    overflow-y: auto;
    height: calc(100vh - 74px - 44px);
    background: #eef4f9;
}

.report-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-lg);
    padding: 16px 20px;
    box-shadow: var(--shadow-card);
}

.report-section-header h2 {
    font-family: var(--font-heading);
    font-size: 1.2rem;
    font-weight: 700;
    color: #0f172a;
}

.quality-status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #e0f2fe;
    border: 1px solid #7dd3fc;
    border-radius: var(--radius-md);
    padding: 10px 16px;
    font-size: 0.78rem;
    color: #0369a1;
}

.quality-chip {
    background: #ffffff;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid #7dd3fc;
    color: #0284c7;
    font-weight: 700;
}

.zone-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
}

.zone-kpi-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-md);
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: var(--shadow-card);
}

.zone-kpi-card .card-content .val {
    font-family: var(--font-heading);
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
}

.zone-kpi-card .card-content .lbl {
    font-size: 0.65rem;
    color: #475569;
    text-transform: uppercase;
}

.spotlight-container, .data-table-wrapper, .methodology-box {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-lg);
    padding: 16px;
    box-shadow: var(--shadow-card);
}

.spotlight-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}

.spotlight-card {
    background: #fff5f5;
    border: 1px solid #fca5a5;
    border-left: 4px solid #ef4444;
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.spotlight-card .area-title {
    font-family: var(--font-heading);
    font-size: 0.9rem;
    font-weight: 700;
    color: #991b1b;
}

.styled-data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
}

.styled-data-table th {
    background: #f1f5f9;
    color: #334155;
    padding: 8px 10px;
    border-bottom: 2px solid #cbd5e1;
    font-size: 0.65rem;
    text-transform: uppercase;
}

.styled-data-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
}

.styled-data-table tbody tr:hover {
    background: #f8fafc;
}

/* Modals */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: var(--backdrop-blur);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
}

.modal-overlay.active {
    display: flex;
}

.modal-box {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-modal);
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 20px;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 8px;
}

.modal-header h2 {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
}

.modal-close-btn {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #475569;
}
"""

with open('dashboard/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css_content)

print("Successfully updated style.css with Warm Pleasing Light Blue theme and zero misalignments.")

with open('dashboard/css/style.css', 'a', encoding='utf-8') as f:
    f.write('''

/* ==========================================================================
   SUITABILITY CARDS, CROP TAGS & CHART CARDS
   ========================================================================== */
.suitability-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    margin-top: 6px;
}

.suitability-tier-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.suitability-tier-card .tier-title {
    font-size: 0.62rem;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
}

.suitability-tier-card .tier-pct {
    font-family: var(--font-heading);
    font-size: 0.9rem;
    font-weight: 700;
    color: #0f172a;
}

.suitability-tier-card .tier-area {
    font-size: 0.62rem;
    color: #64748b;
}

.tier-marginal {
    border-left: 3px solid #d97706;
}

.tier-unsuitable {
    border-left: 3px solid #dc2626;
}

.crop-tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
}

.crop-tag {
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #7dd3fc;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.crop-tag.moderate {
    background: #fef3c7;
    color: #92400e;
    border-color: #fde68a;
}

.crop-tag.unsuitable {
    background: #fee2e2;
    color: #991b1b;
    border-color: #fca5a5;
}

.chart-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: var(--radius-lg);
    padding: 12px;
    box-shadow: var(--shadow-card);
}

.chart-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
}

.chart-card-header h3 {
    font-family: var(--font-heading);
    font-size: 0.88rem;
    font-weight: 700;
    color: #0f172a;
}

.chart-card-header .unit {
    font-size: 0.65rem;
    color: #64748b;
}

.chart-canvas-wrapper {
    position: relative;
    height: 190px;
    width: 100%;
}
''')

print("Appended suitability styles to style.css")

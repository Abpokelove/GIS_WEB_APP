/**
 * ==============================================================================
 * MADURAI GROUNDWATER SPATIAL INTELLIGENCE & ML PREDICTION DASHBOARD
 * Core Application Controller (Zero Babel, Native ES6, 100% Guaranteed Load)
 * Standards: BIS 10500:2012 Drinking Water | USSL & FAO Irrigation Guidelines
 * ==============================================================================
 */

class DashboardApp {
    constructor() {
        this.data = {
            district: null,
            taluks: null,
            wells: null,
            surfaces: null,
            timeSeries: null,
            analytics: null,
            suitability: null
        };

        // State
        this.activeTopic = 'topic2'; // Default: GWQI Zonation
        this.selectedParam = 'GWQI';
        this.selectedTaluk = 'all';
        this.selectedYear = 'all';
        this.selectedSeason = 'All';
        this.forecastYear = 2030;
        this.activeChartTab = 'trend';
        this.surfaceOpacity = 0.75;
        this.isPlaying = false;
        this.playTimer = null;
        this.selectedWell = null;
        this.activeBasemap = 'satellite';

        // Engines
        this.mapEngine = null;
        this.chartEngine = null;

        // Topics Definition
        this.topics = {
            topic1: {
                num: 'T1',
                title: 'Spatial Interpolation (IDW)',
                desc: 'Continuous Inverse Distance Weighting (IDW) raster grids across 2,229 district cells.',
                param: 'TDS'
            },
            topic2: {
                num: 'T2',
                title: 'GWQI Zonation (BIS 10500)',
                desc: 'BIS 10500:2012 Drinking Water Quality Index (GWQI) classifying aquifers from Excellent to Unsuitable.',
                param: 'GWQI'
            },
            topic3: {
                num: 'T3',
                title: '15-Yr Change Detection',
                desc: 'Differencing between Baseline (2007-11) and Contemporary (2017-21) epochs.',
                param: 'GWQI'
            },
            topic4: {
                num: 'T4',
                title: 'Irrigation Suitability (USSL)',
                desc: 'Agricultural irrigation assessment using Sodium Adsorption Ratio (SAR) and USSL salinity/alkali matrix.',
                param: 'SAR'
            },
            topic5: {
                num: 'T5',
                title: 'Fluoride Health Risk',
                desc: 'Groundwater fluoride hazard mapping against BIS permissible limit (1.5 mg/L) for fluorosis risk.',
                param: 'F'
            },
            topic6: {
                num: 'T6',
                title: 'Nitrate Pollution Source',
                desc: 'Anthropogenic nitrate leaching comparing domestic sewage/septic tanks to agricultural runoff (45 mg/L).',
                param: 'NO2+NO3'
            },
            topic7: {
                num: 'T7',
                title: 'Taluk Vulnerability Ranking',
                desc: 'Administrative ranking across the 7 Taluks of Madurai District based on composite hazard severity.',
                param: 'GWQI'
            },
            topic9: {
                num: 'T9',
                title: 'Spatial Hotspots (Moran’s I)',
                desc: 'Global Moran’s I autocorrelation test and Getis-Ord Gi* 99% & 95% statistical contamination hotspots.',
                param: 'GWQI'
            },
            topic11: {
                num: 'ML 2030',
                title: 'Multi-Year ML Forecast (2024–2035)',
                desc: 'Calibrated regression model with hydro-inertia bounds forecasting post-2026, 2030, and 2035 quality.',
                param: 'GWQI_2030_ML'
            },
            topic12: {
                num: 'DRINK',
                title: 'Drinking Water Suitability Areas',
                desc: 'Zonation of Safe (1,014 km²), Marginal, and Unsuitable drinking water zones per BIS 10500 specifications.',
                param: 'Drinking_Suitability'
            },
            topic13: {
                num: 'AGRI',
                title: 'Agricultural Cropland Suitability',
                desc: 'Irrigation zonation: Prime Cropland (Paddy, Banana, Veggies: 1,930 km²), Salt-Tolerant, and Sodicity Hazard.',
                param: 'Agri_Suitability'
            }
        };

        this.init();
    }

    async init() {
        try {
            console.log("Initializing Madurai Geo-Hydro Intelligence Platform...");
            this.showLoading(true);

            // 1. Fetch all payloads in parallel
            const [distRes, taluksRes, wellsRes, surfRes, timeRes, anaRes, suitRes] = await Promise.all([
                fetch('data/madurai_district.json').then(r => r.json()),
                fetch('data/madurai_taluks.json').then(r => r.json()),
                fetch('data/madurai_wells.json').then(r => r.json()),
                fetch('data/interpolation_surfaces.json').then(r => r.json()),
                fetch('data/time_series.json').then(r => r.json()),
                fetch('data/analytics_summary.json').then(r => r.json()),
                fetch('data/suitability_and_ml.json').then(r => r.json())
            ]);

            this.data = {
                district: distRes,
                taluks: taluksRes,
                wells: wellsRes,
                surfaces: surfRes,
                timeSeries: timeRes,
                analytics: anaRes,
                suitability: suitRes
            };

            // 2. Initialize Engines
            this.initEngines();

            // 3. Bind UI Events & Listeners
            this.bindEvents();

            // 4. Render Initial Views
            this.updateHeaderKPIs();
            this.renderTopicTabs();
            this.syncMapAndAnalytics();

            this.showLoading(false);
            console.log("Dashboard loaded successfully.");
        } catch (err) {
            console.error("Dashboard initialization failed:", err);
            this.showError("Failed to initialize dashboard. " + err.message);
        }
    }

    showLoading(show) {
        const loader = document.getElementById('app-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }

    showError(msg) {
        const errBox = document.getElementById('app-error');
        if (errBox) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
        }
    }

    initEngines() {
        // Map Engine
        this.mapEngine = new MapEngine('leaflet-map', (wellProps) => {
            this.openWellModal(wellProps['Well No']);
        });
        this.mapEngine.setData({
            district: this.data.district,
            taluks: this.data.taluks,
            wells: this.data.wells,
            surfaces: this.data.surfaces,
            timeSeries: this.data.timeSeries,
            suitability: this.data.suitability
        });

        // Set default basemap to Satellite or Dark Gray
        this.mapEngine.setBasemap('satellite');

        // Chart Engine
        this.chartEngine = new ChartEngine();

        window.appInstance = {
            inspectWell: (wellNo) => this.openWellModal(wellNo),
            setTalukFilter: (taluk) => {
                this.selectedTaluk = taluk;
                const sel = document.getElementById('taluk-filter-select');
                if (sel) sel.value = taluk;
                this.syncMapAndAnalytics();
            }
        };
    }

    bindEvents() {
        // Parameter select
        const paramSelect = document.getElementById('param-filter-select');
        if (paramSelect) {
            paramSelect.addEventListener('change', (e) => {
                this.selectedParam = e.target.value;
                this.syncMapAndAnalytics();
            });
        }

        // Taluk select
        const talukSelect = document.getElementById('taluk-filter-select');
        if (talukSelect) {
            talukSelect.addEventListener('change', (e) => {
                this.selectedTaluk = e.target.value;
                this.syncMapAndAnalytics();
            });
        }

        // Basemap switcher buttons in toolbar
        document.querySelectorAll('.basemap-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.basemap-pill').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                const bmap = target.getAttribute('data-basemap');
                this.activeBasemap = bmap;
                if (this.mapEngine) this.mapEngine.setBasemap(bmap);
            });
        });

        // Surface Opacity Slider
        const opacitySlider = document.getElementById('surface-opacity-slider');
        const opacityVal = document.getElementById('surface-opacity-val');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.surfaceOpacity = val;
                if (opacityVal) opacityVal.textContent = Math.round(val * 100) + '%';
                if (this.mapEngine) this.mapEngine.setSurfaceOpacity(val);
            });
        }

        // Layer toggles
        const chkSurface = document.getElementById('chk-layer-surface');
        if (chkSurface) {
            chkSurface.addEventListener('change', (e) => {
                if (this.mapEngine) {
                    if (e.target.checked) this.mapEngine.map.addLayer(this.mapEngine.layers.surface);
                    else this.mapEngine.map.removeLayer(this.mapEngine.layers.surface);
                }
            });
        }
        const chkWells = document.getElementById('chk-layer-wells');
        if (chkWells) {
            chkWells.addEventListener('change', (e) => {
                if (this.mapEngine) {
                    if (e.target.checked) this.mapEngine.map.addLayer(this.mapEngine.layers.wells);
                    else this.mapEngine.map.removeLayer(this.mapEngine.layers.wells);
                }
            });
        }
        const chkTaluks = document.getElementById('chk-layer-taluks');
        if (chkTaluks) {
            chkTaluks.addEventListener('change', (e) => {
                if (this.mapEngine) {
                    if (e.target.checked) this.mapEngine.map.addLayer(this.mapEngine.layers.taluks);
                    else this.mapEngine.map.removeLayer(this.mapEngine.layers.taluks);
                }
            });
        }

        // Reset map view button
        const resetBtn = document.getElementById('btn-reset-map');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.mapEngine) this.mapEngine.map.setView([9.9252, 78.1198], 10);
            });
        }

        // Time slider
        const timeSlider = document.getElementById('time-horizon-slider');
        if (timeSlider) {
            timeSlider.addEventListener('input', (e) => {
                this.stopAnimation();
                const val = Number(e.target.value);
                this.setTimelineYear(val);
            });
        }

        // Time play button
        const playBtn = document.getElementById('btn-timeline-play');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.toggleAnimation();
            });
        }

        // All years button
        const btnAllYears = document.getElementById('btn-all-years');
        if (btnAllYears) {
            btnAllYears.addEventListener('click', () => {
                this.stopAnimation();
                this.setTimelineYear('all');
            });
        }

        // Season switcher buttons
        document.querySelectorAll('.season-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.selectedSeason = target.getAttribute('data-season');
                this.syncMapAndAnalytics();
            });
        });

        // Chart tabs switcher
        document.querySelectorAll('.chart-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                const tab = target.getAttribute('data-tab');
                this.activeChartTab = tab;
                this.updateActiveChartTab();
            });
        });

        // Multi-Year Horizon pills in Forecast Card
        document.querySelectorAll('.horizon-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.horizon-pill').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                const yr = Number(target.getAttribute('data-year'));
                this.forecastYear = yr;
                this.updateForecastPanel();
                this.setTimelineYear(yr);
            });
        });

        // Guide Modal
        const btnGuide = document.getElementById('btn-open-guide');
        const modalGuide = document.getElementById('modal-guide');
        const closeGuide = document.getElementById('btn-close-guide');
        if (btnGuide && modalGuide) {
            btnGuide.addEventListener('click', () => modalGuide.classList.add('active'));
        }
        if (closeGuide && modalGuide) {
            closeGuide.addEventListener('click', () => modalGuide.classList.remove('active'));
        }

        // Well Modal Close
        const modalWell = document.getElementById('modal-well');
        const closeWell = document.getElementById('btn-close-well');
        if (closeWell && modalWell) {
            closeWell.addEventListener('click', () => modalWell.classList.remove('active'));
        }

        // Close modals on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });

        // Add water ripple trigger on brand emblem and KPI cards
        document.querySelectorAll('.trigger-water-fx').forEach(el => {
            el.addEventListener('click', (e) => {
                if (this.waterEngine) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;
                    this.waterEngine.drop(Math.floor(x / 4), Math.floor(y / 4), 25, 450);
                    this.waterEngine.createDomDroplet(x, y);
                }
            });
        });
    }

    renderTopicTabs() {
        const strip = document.getElementById('topic-nav-strip');
        if (!strip) return;
        strip.innerHTML = '';

        Object.keys(this.topics).forEach(key => {
            const t = this.topics[key];
            const btn = document.createElement('button');
            const isActive = this.activeTopic === key;
            const isSpecial = key === 'topic11' || key === 'topic12' || key === 'topic13';

            btn.className = `topic-tab-btn ${isActive ? 'active' : ''} ${isSpecial ? 'ml-highlight' : ''}`;
            btn.innerHTML = `
                <span class="num">${t.num}</span>
                <span>${t.title}</span>
                ${key === 'topic11' ? '<i class="fa-solid fa-wand-magic-sparkles" style="font-size:0.68rem; margin-left:3px;"></i>' : ''}
                ${key === 'topic12' ? '<i class="fa-solid fa-faucet-drip" style="font-size:0.68rem; margin-left:3px; color:#34d399;"></i>' : ''}
                ${key === 'topic13' ? '<i class="fa-solid fa-wheat-awn" style="font-size:0.68rem; margin-left:3px; color:#fbbf24;"></i>' : ''}
            `;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.topic-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchTopic(key);
            });

            strip.appendChild(btn);
        });
    }

    switchTopic(topicKey) {
        this.activeTopic = topicKey;
        const t = this.topics[topicKey];

        // Set default parameter
        this.selectedParam = t.param;
        const sel = document.getElementById('param-filter-select');
        if (sel) sel.value = t.param;

        // Auto-switch to forecast year if ML topic selected
        if (topicKey === 'topic11') {
            this.setTimelineYear(this.forecastYear);
        }

        this.syncMapAndAnalytics();
    }

    setTimelineYear(year) {
        this.selectedYear = year;
        const timeSlider = document.getElementById('time-horizon-slider');
        const yearLabel = document.getElementById('current-year-label');

        if (year === 'all') {
            if (timeSlider) timeSlider.value = 2021;
            if (yearLabel) yearLabel.textContent = '15-Year Longitudinal Mean (2007–2021)';
        } else {
            if (timeSlider) timeSlider.value = year;
            if (yearLabel) {
                if (year > 2021) {
                    yearLabel.innerHTML = `<span style="color:#c4b5fd;"><i class="fa-solid fa-wand-magic-sparkles"></i> ML Projected Horizon: ${year}</span>`;
                } else {
                    yearLabel.textContent = `Observation Year: ${year}`;
                }
            }
        }

        this.syncMapAndAnalytics();
    }

    toggleAnimation() {
        if (this.isPlaying) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }

    startAnimation() {
        this.isPlaying = true;
        const playBtn = document.getElementById('btn-timeline-play');
        if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

        const years = [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2026, 2030, 2035];
        let curIdx = years.indexOf(this.selectedYear === 'all' ? 2007 : Number(this.selectedYear));
        if (curIdx === -1) curIdx = 0;

        this.playTimer = setInterval(() => {
            curIdx = (curIdx + 1) % years.length;
            this.setTimelineYear(years[curIdx]);
        }, 1300);
    }

    stopAnimation() {
        this.isPlaying = false;
        if (this.playTimer) clearInterval(this.playTimer);
        const playBtn = document.getElementById('btn-timeline-play');
        if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }

    syncMapAndAnalytics() {
        if (!this.mapEngine || !this.data.wells) return;

        // 1. Update Sidebar Topic Info
        const tInfo = this.topics[this.activeTopic];
        const badgeEl = document.getElementById('active-topic-badge');
        const titleEl = document.getElementById('active-topic-title');
        const descEl = document.getElementById('active-topic-desc');
        const mapBadge = document.getElementById('map-status-badge');

        if (badgeEl) badgeEl.textContent = tInfo.num;
        if (titleEl) titleEl.textContent = tInfo.title;
        if (descEl) descEl.textContent = tInfo.desc;
        if (mapBadge) mapBadge.textContent = tInfo.title;

        // 2. Render Taluk Choropleth
        this.mapEngine.renderTaluks(this.activeTopic);

        // 3. Render Wells Layer
        this.mapEngine.renderWells({
            topic: this.activeTopic,
            param: this.selectedParam,
            year: this.selectedYear,
            season: this.selectedSeason,
            taluk: this.selectedTaluk
        });

        // 4. Render Surface
        let surfP = this.selectedParam;
        if (this.activeTopic === 'topic11') {
            surfP = `GWQI_${this.forecastYear}_ML`;
        } else if (this.activeTopic === 'topic12') {
            surfP = 'Drinking_Suitability';
        } else if (this.activeTopic === 'topic13') {
            surfP = 'Agri_Suitability';
        } else if (this.activeTopic === 'topic2') {
            surfP = 'GWQI';
        } else if (this.activeTopic === 'topic4') {
            surfP = 'SAR';
        } else if (this.activeTopic === 'topic5') {
            surfP = 'F';
        } else if (this.activeTopic === 'topic6') {
            surfP = 'NO2+NO3';
        }
        this.mapEngine.renderSurface(surfP);

        // 5. Update Dynamic Map Legend
        this.updateMapLegend(surfP);

        // 6. Update Forecast & Suitability Panels
        this.updateForecastPanel();

        // 7. Update Taluk Leaderboard
        this.updateTalukLeaderboard();

        // 8. Update Charts
        this.updateCharts();
    }

    updateMapLegend(param) {
        const legendTitle = document.getElementById('map-legend-title');
        const scaleBar = document.getElementById('map-legend-scale-bar');
        const scaleLabels = document.getElementById('map-legend-scale-labels');
        const classesList = document.getElementById('map-legend-classes');

        if (!legendTitle || !scaleBar || !scaleLabels || !classesList) return;

        legendTitle.innerHTML = `<i class="fa-solid fa-palette"></i> Active Legend: ${param}`;

        if (param === 'Drinking_Suitability') {
            scaleBar.style.background = 'linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)';
            scaleLabels.innerHTML = '<span>Zone 1: Safe</span><span>Zone 2: Marginal</span><span>Zone 3: Unsuitable</span>';
            classesList.innerHTML = `
                <div class="legend-row"><div class="legend-dot" style="background:#10b981"></div><span>Safe Drinking (&lt; 100 GWQI, &lt; 1.0 F, &lt; 45 NO3)</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#f59e0b"></div><span>Marginal (Permissible with Softening)</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#ef4444"></div><span>Unsuitable (Critical Fluoride/Salinity Risk)</span></div>
            `;
        } else if (param === 'Agri_Suitability') {
            scaleBar.style.background = 'linear-gradient(90deg, #059669 0%, #d97706 50%, #dc2626 100%)';
            scaleLabels.innerHTML = '<span>Zone A: Prime</span><span>Zone B: Salt-Tolerant</span><span>Zone C: Sodicity Hazard</span>';
            classesList.innerHTML = `
                <div class="legend-row"><div class="legend-dot" style="background:#059669"></div><span>Prime Cropland (Paddy, Banana, Vegetables)</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#d97706"></div><span>Moderate (Cotton, Millets, Pulses with drainage)</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#dc2626"></div><span>Severe Hazard (Alkali/Sodicity Breakdown)</span></div>
            `;
        } else if (param.startsWith('GWQI')) {
            scaleBar.style.background = 'linear-gradient(90deg, #10b981 0%, #06b6d4 25%, #f59e0b 50%, #f97316 75%, #ef4444 100%)';
            scaleLabels.innerHTML = '<span>&lt; 50 (Excellent)</span><span>100 (Good)</span><span>&gt; 200 (Poor/Unfit)</span>';
            classesList.innerHTML = `
                <div class="legend-row"><div class="legend-dot" style="background:#10b981"></div><span>&lt; 50: Excellent Quality</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#06b6d4"></div><span>50–100: Good Quality</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#f59e0b"></div><span>100–200: Poor Quality</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#f97316"></div><span>200–300: Very Poor</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#ef4444"></div><span>&gt; 300: Unsuitable for Drinking</span></div>
            `;
        } else if (param === 'F') {
            scaleBar.style.background = 'linear-gradient(90deg, #10b981 0%, #06b6d4 35%, #f97316 70%, #ef4444 100%)';
            scaleLabels.innerHTML = '<span>&lt; 1.0 (Safe)</span><span>1.5 (Permissible)</span><span>&gt; 2.0 (Hazard)</span>';
            classesList.innerHTML = `
                <div class="legend-row"><div class="legend-dot" style="background:#10b981"></div><span>&lt; 1.0 mg/L: Desirable (Safe)</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#06b6d4"></div><span>1.0–1.5 mg/L: Permissible Limit</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#f97316"></div><span>1.5–2.0 mg/L: Dental Fluorosis Risk</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#ef4444"></div><span>&gt; 2.0 mg/L: Skeletal Fluorosis Risk</span></div>
            `;
        } else if (param === 'NO2+NO3') {
            scaleBar.style.background = 'linear-gradient(90deg, #10b981 0%, #06b6d4 25%, #f97316 60%, #ef4444 100%)';
            scaleLabels.innerHTML = '<span>&lt; 10 (Background)</span><span>45 (WHO Limit)</span><span>&gt; 100 (Severe)</span>';
            classesList.innerHTML = `
                <div class="legend-row"><div class="legend-dot" style="background:#10b981"></div><span>&lt; 10 mg/L: Natural Background</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#06b6d4"></div><span>10–45 mg/L: Acceptable</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#f97316"></div><span>45–100 mg/L: Anthropogenic Leaching</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#ef4444"></div><span>&gt; 100 mg/L: Severe Septic/Agri Pollution</span></div>
            `;
        } else {
            scaleBar.style.background = 'linear-gradient(90deg, #10b981 0%, #06b6d4 35%, #f59e0b 70%, #ef4444 100%)';
            scaleLabels.innerHTML = '<span>Low</span><span>Moderate</span><span>High</span>';
            classesList.innerHTML = `
                <div class="legend-row"><div class="legend-dot" style="background:#10b981"></div><span>Low Concentration</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#06b6d4"></div><span>Moderate / Desirable</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#f59e0b"></div><span>Permissible Threshold</span></div>
                <div class="legend-row"><div class="legend-dot" style="background:#ef4444"></div><span>Exceeded Permissible Limit</span></div>
            `;
        }
    }

    updateForecastPanel() {
        if (!this.data.suitability) return;

        const hSummary = this.data.suitability.horizons_summary;
        const yr = this.forecastYear;
        const s = hSummary[String(yr)] || hSummary['2030'];

        // District metric tiles
        const gwqiEl = document.getElementById('forecast-val-gwqi');
        const tdsEl = document.getElementById('forecast-val-tds');
        const fEl = document.getElementById('forecast-val-f');
        const no3El = document.getElementById('forecast-val-no3');

        if (gwqiEl) gwqiEl.textContent = s.mean_GWQI;
        if (tdsEl) tdsEl.textContent = s.mean_TDS + ' mg/L';
        if (fEl) fEl.textContent = s.mean_F + ' mg/L';
        if (no3El) no3El.textContent = s.mean_NO3 + ' mg/L';

        // Drinking Suitability breakdown
        const dSafePct = document.getElementById('forecast-drink-safe-pct');
        const dSafeKm = document.getElementById('forecast-drink-safe-km');
        const dMargPct = document.getElementById('forecast-drink-marg-pct');
        const dMargKm = document.getElementById('forecast-drink-marg-km');
        const dUnsPct = document.getElementById('forecast-drink-uns-pct');
        const dUnsKm = document.getElementById('forecast-drink-uns-km');

        if (dSafePct) dSafePct.textContent = s.drinking_suitability.safe_pct + '%';
        if (dSafeKm) dSafeKm.textContent = s.drinking_suitability.safe_sq_km + ' km²';
        if (dMargPct) dMargPct.textContent = s.drinking_suitability.marginal_pct + '%';
        if (dMargKm) dMargKm.textContent = s.drinking_suitability.marginal_sq_km + ' km²';
        if (dUnsPct) dUnsPct.textContent = s.drinking_suitability.unsuitable_pct + '%';
        if (dUnsKm) dUnsKm.textContent = s.drinking_suitability.unsuitable_sq_km + ' km²';

        // Agriculture Suitability breakdown
        const aPrimePct = document.getElementById('forecast-agri-prime-pct');
        const aPrimeKm = document.getElementById('forecast-agri-prime-km');
        const aModPct = document.getElementById('forecast-agri-mod-pct');
        const aModKm = document.getElementById('forecast-agri-mod-km');
        const aUnsPct = document.getElementById('forecast-agri-uns-pct');
        const aUnsKm = document.getElementById('forecast-agri-uns-km');

        if (aPrimePct) aPrimePct.textContent = s.agri_suitability.prime_pct + '%';
        if (aPrimeKm) aPrimeKm.textContent = s.agri_suitability.prime_sq_km + ' km²';
        if (aModPct) aModPct.textContent = s.agri_suitability.moderate_pct + '%';
        if (aModKm) aModKm.textContent = s.agri_suitability.moderate_sq_km + ' km²';
        if (aUnsPct) aUnsPct.textContent = s.agri_suitability.unsuitable_pct + '%';
        if (aUnsKm) aUnsKm.textContent = s.agri_suitability.unsuitable_sq_km + ' km²';

        // Selected year title in card
        const cardYr = document.getElementById('forecast-panel-year');
        if (cardYr) cardYr.textContent = `Horizon ${yr}`;
    }

    updateTalukLeaderboard() {
        const tbody = document.getElementById('taluk-leaderboard-tbody');
        if (!tbody || !this.data.analytics) return;

        const talukStats = this.data.analytics.taluk_stats;
        const sorted = Object.keys(talukStats).sort((a, b) => talukStats[a].Vulnerability_Rank - talukStats[b].Vulnerability_Rank);

        tbody.innerHTML = '';
        sorted.forEach(t => {
            const st = talukStats[t];
            const rankClass = st.Vulnerability_Rank === 1 ? 'rank-1' : st.Vulnerability_Rank <= 3 ? `rank-${st.Vulnerability_Rank}` : 'rank-other';
            const isSel = this.selectedTaluk === t;

            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            if (isSel) tr.style.background = 'rgba(37, 99, 235, 0.2)';

            tr.innerHTML = `
                <td><span class="rank-badge ${rankClass}">#${st.Vulnerability_Rank}</span></td>
                <td><strong>${t}</strong></td>
                <td>${st.mean_GWQI}</td>
                <td>${st.pct_F_exceed}%</td>
                <td>${st.pct_NO3_exceed}%</td>
            `;

            tr.addEventListener('click', () => {
                this.selectedTaluk = t;
                const sel = document.getElementById('taluk-filter-select');
                if (sel) sel.value = t;
                this.syncMapAndAnalytics();
            });

            tbody.appendChild(tr);
        });
    }

    updateCharts() {
        if (!this.chartEngine || !this.data.wells) return;

        let wells = this.data.wells.features;
        if (this.selectedTaluk !== 'all') {
            wells = wells.filter(w => w.properties.Taluk === this.selectedTaluk);
        }

        // 1. Distribution Chart
        const vals = wells.map(w => w.properties[this.selectedParam] || w.properties.GWQI).filter(v => v !== null && !isNaN(v));
        this.chartEngine.renderDistributionChart('chart-distribution', vals, this.selectedParam);

        // 2. Taluk Comparison
        if (this.data.analytics && this.data.analytics.taluk_stats) {
            this.chartEngine.renderTalukComparison('chart-taluk', this.data.analytics.taluk_stats, `mean_${this.selectedParam}`);
        }

        // 3. Multi-Year Longitudinal Trend (2007-2021 Observed + 2026-2035 ML Projections)
        if (this.data.timeSeries && this.data.timeSeries.by_year) {
            this.chartEngine.renderLongitudinalTrend('chart-trend', this.data.timeSeries.by_year, `mean_${this.selectedParam}`);
        }

        // 4. USSL Diagram Scatter
        this.chartEngine.renderIrrigationScatter('chart-irrigation', wells);
    }

    updateActiveChartTab() {
        const tabs = ['distribution', 'taluk', 'trend', 'irrigation'];
        tabs.forEach(t => {
            const canvas = document.getElementById(`chart-${t}`);
            if (canvas) canvas.style.display = (t === this.activeChartTab) ? 'block' : 'none';
        });
    }

    updateHeaderKPIs() {
        const wellsVal = document.getElementById('kpi-wells-count');
        const recordsVal = document.getElementById('kpi-records-count');
        const gwqiVal = document.getElementById('kpi-mean-gwqi');
        const safeVal = document.getElementById('kpi-safe-area');
        const agriVal = document.getElementById('kpi-prime-agri');
        const worstVal = document.getElementById('kpi-worst-taluk');

        if (this.data.analytics) {
            if (wellsVal) wellsVal.textContent = this.data.analytics.overview.unique_wells;
            if (recordsVal) recordsVal.textContent = this.data.analytics.overview.total_records.toLocaleString();
            if (gwqiVal) gwqiVal.textContent = this.data.analytics.overview.mean_GWQI;
            if (worstVal) worstVal.textContent = 'Thirumangalam';
        }

        if (this.data.suitability && this.data.suitability.horizons_summary) {
            const h2026 = this.data.suitability.horizons_summary['2026'];
            if (h2026) {
                if (safeVal) safeVal.textContent = `${h2026.drinking_suitability.safe_pct}% (${h2026.drinking_suitability.safe_sq_km} km²)`;
                if (agriVal) agriVal.textContent = `${h2026.agri_suitability.prime_pct}% (${h2026.agri_suitability.prime_sq_km} km²)`;
            }
        }
    }

    openWellModal(wellNo) {
        if (!this.data.wells) return;
        const feature = this.data.wells.features.find(f => f.properties['Well No'] === wellNo);
        if (!feature) return;

        const p = feature.properties;
        this.selectedWell = p;

        // Modal elements
        const modal = document.getElementById('modal-well');
        if (!modal) return;

        document.getElementById('modal-well-title').textContent = `Monitoring Well: ${p['Well No']}`;
        document.getElementById('modal-well-meta').textContent = `Village: ${p.Village} | Taluk: ${p.Taluk} | Samples: ${p.Total_Samples || 12} (2007–2021)`;

        const statusEl = document.getElementById('modal-well-status');
        statusEl.textContent = p.Drinking_Status || (p.GWQI < 100 ? 'Safe Drinking Water' : 'Unsafe for Drinking');
        statusEl.style.color = p.GWQI < 100 ? '#10b981' : p.GWQI < 200 ? '#f59e0b' : '#ef4444';

        document.getElementById('modal-well-gwqi').textContent = `${p.GWQI} (${p.GWQI_Class || 'Good'})`;
        document.getElementById('modal-well-f').textContent = `${p.F} mg/L`;
        document.getElementById('modal-well-no3').textContent = `${p['NO2+NO3']} mg/L`;

        // Aquifer Compliance Verdict Card (Official Institutional Classification)
        const verdictTag = document.getElementById('modal-verdict-tag');
        const verdictSummary = document.getElementById('modal-verdict-summary');
        const verdictIcon = document.getElementById('modal-verdict-icon');
        const verdictCard = document.getElementById('modal-aquifer-verdict');

        const isFluorideSafe = (p.F || 0) <= 1.5;
        const isNitrateSafe = (p['NO2+NO3'] || 0) <= 45;
        const isGwqiSafe = (p.GWQI || 0) < 100;

        if (verdictCard) {
            if (isGwqiSafe && isFluorideSafe && isNitrateSafe) {
                verdictCard.className = 'aquifer-verdict-card verdict-safe';
                if (verdictTag) verdictTag.textContent = 'POTABLE / SAFE DRINKING (BIS 10500)';
                if (verdictIcon) verdictIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                if (verdictSummary) verdictSummary.textContent = `Aquifer fully compliant with BIS 10500 standards (GWQI ${p.GWQI}, F: ${p.F} mg/L, Nitrate: ${p['NO2+NO3']} mg/L). Highly suitable for municipal tap and drinking water supply.`;
            } else if ((p.GWQI || 0) < 200 && isFluorideSafe) {
                verdictCard.className = 'aquifer-verdict-card verdict-marginal';
                if (verdictTag) verdictTag.textContent = 'MARGINAL / CONVENTIONAL TREATMENT REQUIRED';
                if (verdictIcon) verdictIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
                if (verdictSummary) verdictSummary.textContent = `Aquifer exhibits moderate mineralization (GWQI ${p.GWQI}). Demineralization, aeration, or reverse osmosis treatment recommended before public distribution.`;
            } else {
                verdictCard.className = 'aquifer-verdict-card verdict-danger';
                if (verdictTag) verdictTag.textContent = 'NON-POTABLE / SEVERE CONTAMINATION HAZARD';
                if (verdictIcon) verdictIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
                const reasons = [];
                if (!isFluorideSafe) reasons.push(`Excess Fluoride (${p.F} mg/L > 1.5)`);
                if (!isNitrateSafe) reasons.push(`Excess Nitrate (${p['NO2+NO3']} mg/L > 45)`);
                if ((p.GWQI || 0) >= 200) reasons.push(`Elevated GWQI (${p.GWQI})`);
                if (verdictSummary) verdictSummary.textContent = `Aquifer unfit for direct drinking per TWAD & CGWB regulations due to: ${reasons.join(', ')}. Direct potable use strictly prohibited without advanced purification.`;
            }
        }

        // Compliance Table values
        document.getElementById('modal-tbl-f-val').textContent = `${p.F} mg/L`;
        document.getElementById('modal-tbl-f-badge').innerHTML = `<span class="${p.F <= 1.0 ? 'badge-safe' : p.F <= 1.5 ? 'badge-marginal' : 'badge-unsafe'}">${p.Fluoride_Risk || (p.F <= 1.5 ? 'Permissible' : 'Risk')}</span>`;

        document.getElementById('modal-tbl-no3-val').textContent = `${p['NO2+NO3']} mg/L`;
        document.getElementById('modal-tbl-no3-badge').innerHTML = `<span class="${p['NO2+NO3'] <= 45 ? 'badge-safe' : 'badge-unsafe'}">${p['NO2+NO3'] <= 45 ? 'Compliant' : 'Excessive'}</span>`;

        document.getElementById('modal-tbl-tds-val').textContent = `${p.TDS} mg/L`;
        document.getElementById('modal-tbl-tds-badge').innerHTML = `<span class="${p.TDS <= 1000 ? 'badge-safe' : p.TDS <= 2000 ? 'badge-marginal' : 'badge-unsafe'}">${p.TDS <= 2000 ? 'Within Limits' : 'Excessive'}</span>`;

        document.getElementById('modal-tbl-har-val').textContent = `${p.HAR_Total} mg/L`;
        document.getElementById('modal-tbl-har-badge').innerHTML = `<span class="${p.HAR_Total <= 300 ? 'badge-safe' : p.HAR_Total <= 600 ? 'badge-marginal' : 'badge-unsafe'}">${p.HAR_Total <= 600 ? 'Acceptable Hardness' : 'Very Hard Water'}</span>`;

        document.getElementById('modal-tbl-irr-val').textContent = `SAR: ${p.SAR || 3.2}`;
        document.getElementById('modal-tbl-irr-badge').innerHTML = `<span class="${(p.Irrigation_Suitability && p.Irrigation_Suitability.includes('Excellent')) ? 'badge-safe' : 'badge-marginal'}">${p.Irrigation_Suitability || 'Good'}</span>`;

        modal.classList.add('active');

        // Render well charts after modal is displayed
        setTimeout(() => {
            if (this.chartEngine) {
                this.chartEngine.renderWellRadar('chart-well-radar', p);
                if (this.data.timeSeries && this.data.timeSeries.well_histories) {
                    this.chartEngine.renderWellTrend('chart-well-trend', this.data.timeSeries.well_histories[wellNo]);
                }
            }
        }, 80);
    }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DashboardApp();
});

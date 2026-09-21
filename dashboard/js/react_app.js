/**
 * React 18 Application Orchestrator for Madurai Groundwater GIS Dashboard
 * Incorporates Modern Hooks, Interactive Map Binding, and Touchable Water Physics
 */

const { useState, useEffect, useRef, useMemo } = React;

function App() {
    // Application State
    const [data, setData] = useState({
        district: null,
        taluks: null,
        wells: null,
        surfaces: null,
        timeSeries: null,
        analytics: null
    });
    const [loading, setLoading] = useState(true);
    
    // UI Filters & Topics
    const [activeTopic, setActiveTopic] = useState('topic2');
    const [selectedParam, setSelectedParam] = useState('GWQI');
    const [selectedTaluk, setSelectedTaluk] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedSeason, setSelectedSeason] = useState('All');
    const [surfaceOpacity, setSurfaceOpacity] = useState(0.65);
    const [activeChartTab, setActiveChartTab] = useState('distribution');
    
    // Animation Player
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Modal State
    const [selectedWell, setSelectedWell] = useState(null);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showQgisModal, setShowQgisModal] = useState(false);
    const [waterFxActive, setWaterFxActive] = useState(true);
    
    // References for engines
    const mapEngineRef = useRef(null);
    const chartEngineRef = useRef(null);
    const waterEngineRef = useRef(null);
    const animIntervalRef = useRef(null);
    
    // 1. Load All GIS & Hydrochemical Payloads
    useEffect(() => {
        async function fetchPayloads() {
            try {
                const [distRes, taluksRes, wellsRes, surfRes, timeRes, anaRes, mlRes] = await Promise.all([
                    fetch('data/madurai_district.json').then(r => r.json()),
                    fetch('data/madurai_taluks.json').then(r => r.json()),
                    fetch('data/madurai_wells.json').then(r => r.json()),
                    fetch('data/interpolation_surfaces.json').then(r => r.json()),
                    fetch('data/time_series.json').then(r => r.json()),
                    fetch('data/analytics_summary.json').then(r => r.json()),
                    fetch('data/ml_predictions_2030.json').then(r => r.json())
                ]);
                
                const payload = {
                    district: distRes,
                    taluks: taluksRes,
                    wells: wellsRes,
                    surfaces: surfRes,
                    timeSeries: timeRes,
                    analytics: anaRes,
                    ml: mlRes
                };
                
                setData(payload);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load dashboard data:", err);
                setLoading(false);
            }
        }
        fetchPayloads();
    }, []);
    
    // 2. Initialize Map & Physics Engines
    useEffect(() => {
        if (loading) return;
        
        // Initialize Map
        if (!mapEngineRef.current) {
            mapEngineRef.current = new MapEngine('leaflet-map', (wellProps) => {
                inspectWell(wellProps['Well No']);
            });
            mapEngineRef.current.setData(data);
        }
        
        // Initialize Chart Engine
        if (!chartEngineRef.current) {
            chartEngineRef.current = new ChartEngine();
        }
        
        // Initialize Touchable Water Canvas
        if (!waterEngineRef.current) {
            waterEngineRef.current = new InteractiveWaterCanvas('water-canvas');
        }
        
        window.appInstance = {
            setTalukFilter: (t) => setSelectedTaluk(t),
            inspectWell: (w) => inspectWell(w)
        };
    }, [loading]);
    
    // 3. Synchronize Map Layers on Topic or Filter Changes
    useEffect(() => {
        if (!mapEngineRef.current || !data.wells) return;
        
        mapEngineRef.current.renderTaluks(activeTopic);
        mapEngineRef.current.renderWells({
            topic: activeTopic,
            param: selectedParam,
            year: selectedYear,
            season: selectedSeason,
            taluk: selectedTaluk
        });
        
        // Update surface parameter
        let surfP = selectedParam;
        if (activeTopic === 'topic11' || selectedYear === 2030) surfP = 'GWQI_2030_ML';
        else if (activeTopic === 'topic2') surfP = 'GWQI';
        else if (activeTopic === 'topic4') surfP = 'SAR';
        else if (activeTopic === 'topic5') surfP = 'F';
        else if (activeTopic === 'topic6') surfP = 'NO2+NO3';
        
        mapEngineRef.current.renderSurface(surfP);
        updateCharts();
    }, [activeTopic, selectedParam, selectedTaluk, selectedYear, selectedSeason, loading]);
    
    // Update surface opacity
    useEffect(() => {
        if (mapEngineRef.current) {
            mapEngineRef.current.setSurfaceOpacity(surfaceOpacity);
        }
    }, [surfaceOpacity]);
    
    // 4. Update Charts
    const updateCharts = () => {
        if (!chartEngineRef.current || !data.wells) return;
        
        let wells = data.wells.features;
        if (selectedTaluk !== 'all') {
            wells = wells.filter(w => w.properties.Taluk === selectedTaluk);
        }
        
        // Distribution Histogram
        const vals = wells.map(w => w.properties[selectedParam] || w.properties.GWQI).filter(v => v !== null);
        chartEngineRef.current.renderDistributionChart('chart-distribution', vals, selectedParam);
        
        // Taluk Comparison
        if (data.analytics && data.analytics.taluk_stats) {
            chartEngineRef.current.renderTalukComparison('chart-taluk', data.analytics.taluk_stats, `mean_${selectedParam}`);
        }
        
        // Longitudinal Multi-Year Trend
        if (data.timeSeries && data.timeSeries.by_year) {
            chartEngineRef.current.renderLongitudinalTrend('chart-trend', data.timeSeries.by_year, `mean_${selectedParam}`);
        }
        
        // USSL Diagram Scatter
        chartEngineRef.current.renderIrrigationScatter('chart-irrigation', wells);
    };
    
    // 5. Animation Timer (Scrubbing across 2007–2021)
    useEffect(() => {
        if (isPlaying) {
            const years = data.timeSeries ? data.timeSeries.available_years : [];
            if (!years.length) return;
            
            animIntervalRef.current = setInterval(() => {
                setSelectedYear(prev => {
                    if (prev === 'all') return years[0];
                    const idx = years.indexOf(Number(prev));
                    if (idx === -1 || idx === years.length - 1) return years[0];
                    return years[idx + 1];
                });
            }, 1400);
        } else {
            if (animIntervalRef.current) clearInterval(animIntervalRef.current);
        }
        return () => { if (animIntervalRef.current) clearInterval(animIntervalRef.current); };
    }, [isPlaying, data.timeSeries]);
    
    // Inspect specific well
    const inspectWell = (wellNo) => {
        if (!data.wells) return;
        const feature = data.wells.features.find(f => f.properties['Well No'] === wellNo);
        if (feature) {
            setSelectedWell(feature.properties);
            setTimeout(() => {
                if (chartEngineRef.current) {
                    chartEngineRef.current.renderWellRadar('chart-well-radar', feature.properties);
                    if (data.timeSeries && data.timeSeries.well_histories) {
                        chartEngineRef.current.renderWellTrend('chart-well-trend', data.timeSeries.well_histories[wellNo]);
                    }
                }
            }, 100);
        }
    };
    
    // Trigger Water Slosh Effect on Element
    const triggerCardWaterEffect = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (waterEngineRef.current) {
            waterEngineRef.current.drop(Math.floor(x / 4), Math.floor(y / 4), 20, 500);
            waterEngineRef.current.createDomDroplet(x, y);
        }
    };
    
    // Topic metadata dictionary
    const topicMetadata = {
        topic1: {
            title: "Spatial Interpolation Mapping",
            num: "Topic 1",
            desc: "Inverse Distance Weighting (IDW) & Ordinary Kriging continuous surfaces across 2,229 grid cells clipped to Madurai District.",
            param: "TDS"
        },
        topic2: {
            title: "Groundwater Quality Index (GWQI) Zonation",
            num: "Topic 2",
            desc: "BIS 10500:2012 weighted composite index categorizing Madurai wells into Excellent, Good, Poor, Very Poor, and Unsuitable drinking water zones.",
            param: "GWQI"
        },
        topic3: {
            title: "Temporal Change Detection (2007–2021)",
            num: "Topic 3",
            desc: "15-year multi-epoch differencing between Baseline (2007-11) and Contemporary (2017-21) groundwater quality showing degradation and improvement trajectories.",
            param: "GWQI"
        },
        topic4: {
            title: "Irrigation Water Suitability Mapping",
            num: "Topic 4",
            desc: "Agricultural suitability evaluation using Sodium Adsorption Ratio (SAR), Residual Sodium Carbonate (RSC), Na%, and USSL / Wilcox hazard matrices.",
            param: "SAR"
        },
        topic5: {
            title: "Fluoride Contamination & Health Risk",
            num: "Topic 5",
            desc: "Dental and skeletal fluorosis risk mapping comparing groundwater concentrations to the BIS desirable (1.0 mg/L) and permissible (1.5 mg/L) limits.",
            param: "F"
        },
        topic6: {
            title: "Nitrate Distribution & Source Attribution",
            num: "Topic 6",
            desc: "Spatial analysis of anthropogenic nitrate pollution identifying urban sewage/septic leaching versus agricultural fertilizer return flows (WHO 45 mg/L threshold).",
            param: "NO2+NO3"
        },
        topic7: {
            title: "Taluk-Wise Comparative Choropleth",
            num: "Topic 7",
            desc: "Administrative district ranking across the 7 Taluks of Madurai assessing vulnerability, exceedance percentages, and priority monitoring areas.",
            param: "GWQI"
        },
        topic8: {
            title: "LULC vs Groundwater Quality Correlation",
            num: "Topic 8",
            desc: "Investigates statistical correlation between land use classes (Urban Built-up, Intensive Irrigated Cropland, Rainfed Agriculture, Scrub) and water chemistry.",
            param: "TDS"
        },
        topic9: {
            title: "Spatial Autocorrelation & Moran's I Hotspots",
            num: "Topic 9",
            desc: "Rigorous spatial statistics: Global Moran's I testing clustering significance, and Getis-Ord Gi* identifying high-confidence 99% and 95% contamination hotspots.",
            param: "GWQI"
        },
        topic10: {
            title: "Integrated Web-GIS Capstone Explorer",
            num: "Topic 10",
            desc: "All-in-one geospatial monitoring platform combining rasters, vectors, time slider, interactive well inspector, and exportable analytics.",
            param: "GWQI"
        },
        topic11: {
            title: "ML Quality Forecast (Vision 2030)",
            num: "ML 2030",
            desc: "Multi-variate auto-trend regression forecasting groundwater quality to 2026 & 2030 with actionable policy directives for TWAD & PWD.",
            param: "GWQI_2030_ML"
        }
    };
    
    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#070b16', color: '#06b6d4', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', border: '3px solid rgba(6, 182, 212, 0.2)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '0.05em' }}>INITIALIZING MADURAI GEO-HYDRO DASHBOARD...</h3>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
            {/* Official Header Bar */}
            <header className="app-header">
                <div className="brand-section">
                    <div className="brand-emblem" onClick={triggerCardWaterEffect} title="Touch to simulate aquifer disturbance!">
                        <div className="wave-fill"></div>
                        <i className="fa-solid fa-water" style={{ position: 'relative', zIndex: 2, color: '#fff' }}></i>
                    </div>
                    <div className="brand-info">
                        <h1>MADURAI GEO-HYDRO <span className="official-badge">Govt. of Tamil Nadu</span></h1>
                        <p>TWAD Board &amp; CGWB Spatial Quality Monitoring &amp; Vision 2030 Forecast (2007–2030)</p>
                    </div>
                </div>
                
                {/* Official KPI Ribbon */}
                <div className="kpi-ribbon">
                    <div className="executive-kpi-card status-blue" onClick={triggerCardWaterEffect} title="Touch to slosh groundwater!">
                        <div className="liquid-anim"></div>
                        <div className="content">
                            <span className="lbl">Monitored Wells</span>
                            <span className="val">{data.analytics ? data.analytics.overview.unique_wells : 225}</span>
                        </div>
                    </div>
                    <div className="executive-kpi-card" onClick={triggerCardWaterEffect} title="Touch to slosh groundwater!">
                        <div className="liquid-anim"></div>
                        <div className="content">
                            <span className="lbl">Records (15 Yrs)</span>
                            <span className="val">{data.analytics ? data.analytics.overview.total_records.toLocaleString() : '2,059'}</span>
                        </div>
                    </div>
                    <div className="executive-kpi-card status-warning" onClick={triggerCardWaterEffect} title="Touch to slosh groundwater!">
                        <div className="liquid-anim"></div>
                        <div className="content">
                            <span className="lbl">Current GWQI</span>
                            <span className="val">{data.analytics ? data.analytics.overview.mean_GWQI : 137.9}</span>
                        </div>
                    </div>
                    <div className="executive-kpi-card" style={{ borderColor: 'rgba(124, 58, 237, 0.4)' }} onClick={triggerCardWaterEffect} title="Touch to view 2030 ML Projection!">
                        <div className="liquid-anim"></div>
                        <div className="content">
                            <span className="lbl" style={{ color: '#c4b5fd' }}>2030 Forecast</span>
                            <span className="val" style={{ color: '#c4b5fd' }}>139.4</span>
                        </div>
                    </div>
                    <div className="executive-kpi-card status-safe" onClick={triggerCardWaterEffect} title="Touch to slosh groundwater!">
                        <div className="liquid-anim"></div>
                        <div className="content">
                            <span className="lbl">Safe Wells</span>
                            <span className="val">20.8%</span>
                        </div>
                    </div>
                    <div className="executive-kpi-card status-danger" onClick={triggerCardWaterEffect} title="Touch to slosh groundwater!">
                        <div className="liquid-anim"></div>
                        <div className="content">
                            <span className="lbl">Worst Taluk</span>
                            <span className="val">Thirumangalam</span>
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="header-actions">
                    <button 
                        className={`btn ${waterFxActive ? 'btn-water-active' : 'btn-glass'}`}
                        onClick={() => {
                            if (waterEngineRef.current) {
                                const state = waterEngineRef.current.toggle();
                                setWaterFxActive(state);
                            }
                        }}
                        title="Toggle Interactive Touch/Click Water Ripples"
                    >
                        <i className="fa-solid fa-droplet"></i>
                        <span>Water FX: {waterFxActive ? 'ON' : 'OFF'}</span>
                    </button>
                    
                    <button className="btn btn-glass" onClick={() => setShowGuideModal(true)}>
                        <i className="fa-solid fa-book-open"></i>
                        <span>10 Topics Guide</span>
                    </button>
                    
                    <button className="btn btn-glass" onClick={() => setShowQgisModal(true)} title="Open project directly in QGIS 3.44.8">
                        <i className="fa-solid fa-map-location-dot" style={{ color: '#10b981' }}></i>
                        <span>QGIS Integration</span>
                    </button>
                    
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        <i className="fa-solid fa-file-pdf"></i>
                        <span>Export Report</span>
                    </button>
                </div>
            </header>
            
            {/* Topic Switcher Strip */}
            <nav className="topic-nav-strip">
                {Object.keys(topicMetadata).map((key) => {
                    const t = topicMetadata[key];
                    const isActive = activeTopic === key;
                    return (
                        <button 
                            key={key} 
                            className={`topic-tab-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTopic(key);
                                setSelectedParam(t.param);
                            }}
                        >
                            <span className="num">{t.num.replace('Topic ', 'T')}</span>
                            <span>{t.title}</span>
                        </button>
                    );
                })}
            </nav>
            
            {/* Main Workspace */}
            <div className="main-workspace">
                {/* Map Viewport */}
                <div className="map-container">
                    <div id="leaflet-map"></div>
                    
                    {/* Floating Layer Controls */}
                    <div className="map-floating-overlay layer-switcher-box">
                        <div className="map-control-card">
                            <h4>
                                <span><i className="fa-solid fa-layer-group"></i> Layer Controls</span>
                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>EPSG:4326</span>
                            </h4>
                            <div className="layer-item">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        defaultChecked={true} 
                                        onChange={(e) => {
                                            if (mapEngineRef.current) {
                                                if (e.target.checked) mapEngineRef.current.map.addLayer(mapEngineRef.current.layers.surface);
                                                else mapEngineRef.current.map.removeLayer(mapEngineRef.current.layers.surface);
                                            }
                                        }} 
                                    />
                                    <span>Continuous IDW Surface</span>
                                </label>
                            </div>
                            <div className="layer-item">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        defaultChecked={true} 
                                        onChange={(e) => {
                                            if (mapEngineRef.current) {
                                                if (e.target.checked) mapEngineRef.current.map.addLayer(mapEngineRef.current.layers.wells);
                                                else mapEngineRef.current.map.removeLayer(mapEngineRef.current.layers.wells);
                                            }
                                        }} 
                                    />
                                    <span>Monitoring Wells (Points)</span>
                                </label>
                            </div>
                            <div className="layer-item">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        defaultChecked={true} 
                                        onChange={(e) => {
                                            if (mapEngineRef.current) {
                                                if (e.target.checked) mapEngineRef.current.map.addLayer(mapEngineRef.current.layers.taluks);
                                                else mapEngineRef.current.map.removeLayer(mapEngineRef.current.layers.taluks);
                                            }
                                        }} 
                                    />
                                    <span>Taluk Choropleth Boundaries</span>
                                </label>
                            </div>
                            
                            {/* Basemap Switcher */}
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <label style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Base Map</label>
                                <select 
                                    style={{ width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.72rem' }}
                                    onChange={(e) => {
                                        if (mapEngineRef.current) mapEngineRef.current.setBasemap(e.target.value);
                                    }}
                                >
                                    <option value="dark">Esri Dark Gray Canvas (No API Key)</option>
                                    <option value="satellite">Esri World Satellite Imagery</option>
                                    <option value="osm">OpenStreetMap Standard</option>
                                    <option value="topo">Esri World Topographic</option>
                                </select>
                            </div>
                            
                            {/* Surface Opacity Slider */}
                            <div className="opacity-slider-row">
                                <label>
                                    <span>Surface Opacity</span>
                                    <span>{Math.round(surfaceOpacity * 100)}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="1.0" 
                                    step="0.05" 
                                    value={surfaceOpacity} 
                                    onChange={(e) => setSurfaceOpacity(parseFloat(e.target.value))} 
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Floating Legend */}
                    <div className="map-floating-overlay map-legend-box">
                        <div className="map-control-card">
                            <h4><i className="fa-solid fa-palette"></i> Active Legend: {selectedParam}</h4>
                            <div className="legend-scale-bar" style={{
                                background: selectedParam === 'GWQI' 
                                    ? 'linear-gradient(90deg, #10b981 0%, #06b6d4 25%, #f59e0b 50%, #f97316 75%, #ef4444 100%)'
                                    : 'linear-gradient(90deg, #10b981 0%, #06b6d4 35%, #f59e0b 70%, #ef4444 100%)'
                            }}></div>
                            <div className="legend-scale-labels">
                                <span>Low / Safe</span>
                                <span>Permissible</span>
                                <span>High / Hazard</span>
                            </div>
                            
                            <div className="legend-classes-list">
                                {activeTopic === 'topic2' && (
                                    <>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#10b981' }}></div><span>&lt; 50: Excellent Quality</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#06b6d4' }}></div><span>50–100: Good Quality</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#f59e0b' }}></div><span>100–200: Poor Quality</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#f97316' }}></div><span>200–300: Very Poor</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#ef4444' }}></div><span>&gt; 300: Unsuitable</span></div>
                                    </>
                                )}
                                {activeTopic === 'topic5' && (
                                    <>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#10b981' }}></div><span>&lt; 1.0 mg/L: Safe</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#06b6d4' }}></div><span>1.0–1.5 mg/L: Permissible</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#f97316' }}></div><span>1.5–2.0 mg/L: Dental Risk</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#ef4444' }}></div><span>&gt; 2.0 mg/L: Skeletal Risk</span></div>
                                    </>
                                )}
                                {activeTopic === 'topic6' && (
                                    <>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#10b981' }}></div><span>&lt; 10 mg/L: Background</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#06b6d4' }}></div><span>10–45 mg/L: Acceptable</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#f97316' }}></div><span>45–100 mg/L: Anthropogenic</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#ef4444' }}></div><span>&gt; 100 mg/L: Severe</span></div>
                                    </>
                                )}
                                {activeTopic === 'topic4' && (
                                    <>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#10b981' }}></div><span>S1 / Safe: Excellent</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#06b6d4' }}></div><span>S2: Good / Permissible</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#f59e0b' }}></div><span>S3: Marginal / Moderate</span></div>
                                        <div className="legend-row"><div className="legend-dot" style={{ background: '#ef4444' }}></div><span>S4: Unsuitable (SAR &gt; 26)</span></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Floating Time Controller Bar */}
                    <div className="map-floating-overlay time-controller-bar">
                        <button 
                            className="time-play-btn" 
                            onClick={() => setIsPlaying(!isPlaying)}
                            title={isPlaying ? "Pause Timeline Animation" : "Play Longitudinal Evolution"}
                        >
                            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        
                        <div className="time-slider-wrapper">
                            <div className="time-slider-labels">
                                <span>2007 Baseline</span>
                                <span className="current-year">
                                    {selectedYear === 'all' ? '15-Year Longitudinal Mean (2007–2021)' : `Observation Year: ${selectedYear}`}
                                </span>
                                <span>2021 Contemporary</span>
                            </div>
                            <input 
                                type="range" 
                                min="2007" 
                                max="2021" 
                                step="1" 
                                value={selectedYear === 'all' ? 2021 : selectedYear} 
                                onChange={(e) => {
                                    setIsPlaying(false);
                                    setSelectedYear(Number(e.target.value));
                                }} 
                            />
                        </div>
                        
                        <button 
                            className="btn btn-glass" 
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                            onClick={() => setSelectedYear('all')}
                        >
                            All Years
                        </button>
                        
                        {/* Seasonal Switch */}
                        <div className="season-switch-group">
                            <button 
                                className={`season-btn ${selectedSeason === 'All' ? 'active' : ''}`}
                                onClick={() => setSelectedSeason('All')}
                            >
                                All
                            </button>
                            <button 
                                className={`season-btn ${selectedSeason === 'Post-Monsoon' ? 'active' : ''}`}
                                onClick={() => setSelectedSeason('Post-Monsoon')}
                                title="January Post-Monsoon Winter Sampling"
                            >
                                Post-Monsoon
                            </button>
                            <button 
                                className={`season-btn ${selectedSeason === 'Pre-Monsoon' ? 'active' : ''}`}
                                onClick={() => setSelectedSeason('Pre-Monsoon')}
                                title="July Pre-Monsoon Summer Sampling"
                            >
                                Pre-Monsoon
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Right Analytical Drawer */}
                <aside className="analytics-sidebar">
                    <div className="sidebar-header">
                        <div className="topic-badge-row">
                            <span className="badge">{topicMetadata[activeTopic].num}</span>
                            <span style={{ fontSize: '0.7rem', color: '#06b6d4' }}>GIS Workflow</span>
                        </div>
                        <h2>{topicMetadata[activeTopic].title}</h2>
                        <p className="topic-desc">{topicMetadata[activeTopic].desc}</p>
                    </div>
                    
                    {/* Filters Strip */}
                    <div className="filter-controls-strip">
                        <div className="filter-item">
                            <label>Target Parameter</label>
                            <select 
                                value={selectedParam} 
                                onChange={(e) => setSelectedParam(e.target.value)}
                            >
                                <option value="GWQI">GWQI (Water Quality Index)</option>
                                <option value="TDS">TDS (Total Dissolved Solids)</option>
                                <option value="F">F (Fluoride - Health Risk)</option>
                                <option value="NO2+NO3">NO2+NO3 (Nitrate - Anthro)</option>
                                <option value="EC_GEN">EC (Electrical Conductivity)</option>
                                <option value="HAR_Total">Total Hardness (CaCO3)</option>
                                <option value="pH_GEN">pH (Acidity/Alkalinity)</option>
                                <option value="SAR">SAR (Sodium Hazard)</option>
                                <option value="RSC">RSC (Carbonate Hazard)</option>
                                <option value="Na%">Na% (Sodium Percentage)</option>
                            </select>
                        </div>
                        
                        <div className="filter-item">
                            <label>Taluk Filter</label>
                            <select 
                                value={selectedTaluk} 
                                onChange={(e) => setSelectedTaluk(e.target.value)}
                            >
                                <option value="all">All 7 Taluks (District)</option>
                                <option value="Madurai North">Madurai North</option>
                                <option value="Madurai South">Madurai South</option>
                                <option value="Thirumangalam">Thirumangalam</option>
                                <option value="Melur">Melur</option>
                                <option value="Peraiyur">Peraiyur</option>
                                <option value="Vadipatti">Vadipatti</option>
                                <option value="Usilampatti">Usilampatti</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Analytical Content & Charts */}
                    <div className="sidebar-content">
                        {/* Interactive Chart Tabs */}
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button 
                                        className={`btn ${activeChartTab === 'distribution' ? 'btn-primary' : 'btn-glass'}`}
                                        style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                                        onClick={() => setActiveChartTab('distribution')}
                                    >
                                        Distribution
                                    </button>
                                    <button 
                                        className={`btn ${activeChartTab === 'taluk' ? 'btn-primary' : 'btn-glass'}`}
                                        style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                                        onClick={() => setActiveChartTab('taluk')}
                                    >
                                        Taluk Ranks
                                    </button>
                                    <button 
                                        className={`btn ${activeChartTab === 'trend' ? 'btn-primary' : 'btn-glass'}`}
                                        style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                                        onClick={() => setActiveChartTab('trend')}
                                    >
                                        2007-21 Trend
                                    </button>
                                    <button 
                                        className={`btn ${activeChartTab === 'irrigation' ? 'btn-primary' : 'btn-glass'}`}
                                        style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                                        onClick={() => setActiveChartTab('irrigation')}
                                    >
                                        USSL Matrix
                                    </button>
                                </div>
                                <span className="unit">Interactive</span>
                            </div>
                            
                            <div className="chart-canvas-wrapper">
                                <canvas id="chart-distribution" style={{ display: activeChartTab === 'distribution' ? 'block' : 'none' }}></canvas>
                                <canvas id="chart-taluk" style={{ display: activeChartTab === 'taluk' ? 'block' : 'none' }}></canvas>
                                <canvas id="chart-trend" style={{ display: activeChartTab === 'trend' ? 'block' : 'none' }}></canvas>
                                <canvas id="chart-irrigation" style={{ display: activeChartTab === 'irrigation' ? 'block' : 'none' }}></canvas>
                            </div>
                        </div>
                        
                        {/* Topic 7: Taluk Comparative Leaderboard */}
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h3>Taluk Vulnerability Ranking (Topic 7)</h3>
                                <span className="unit">Priority Order</span>
                            </div>
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Taluk Name</th>
                                        <th>Mean GWQI</th>
                                        <th>% Fluoride Exceed</th>
                                        <th>% Nitrate Exceed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.analytics && Object.keys(data.analytics.taluk_stats)
                                        .sort((a, b) => data.analytics.taluk_stats[a].Vulnerability_Rank - data.analytics.taluk_stats[b].Vulnerability_Rank)
                                        .map((t) => {
                                            const st = data.analytics.taluk_stats[t];
                                            const rankClass = st.Vulnerability_Rank === 1 ? 'rank-1' : st.Vulnerability_Rank <= 3 ? `rank-${st.Vulnerability_Rank}` : 'rank-other';
                                            return (
                                                <tr key={t} onClick={() => setSelectedTaluk(t)} style={{ cursor: 'pointer' }}>
                                                    <td><span className={`rank-badge ${rankClass}`}>#{st.Vulnerability_Rank}</span></td>
                                                    <td><strong>{t}</strong></td>
                                                    <td>{st.mean_GWQI}</td>
                                                    <td>{st.pct_F_exceed}%</td>
                                                    <td>{st.pct_NO3_exceed}%</td>
                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Topic 9: Spatial Autocorrelation (Moran's I Summary) */}
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h3>Spatial Autocorrelation (Topic 9)</h3>
                                <span className="unit">Moran's I &amp; Gi*</span>
                            </div>
                            <div className="stat-tiles-grid">
                                <div className="stat-tile">
                                    <div className="title">Nitrate Moran's I</div>
                                    <div className="stat-value" style={{ color: '#ef4444' }}>0.231</div>
                                    <div className="subtext">z-score: 7.41 (p &lt; 0.001)</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="title">TDS Moran's I</div>
                                    <div className="stat-value" style={{ color: '#f59e0b' }}>0.120</div>
                                    <div className="subtext">z-score: 3.94 (p &lt; 0.001)</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="title">Fluoride Moran's I</div>
                                    <div className="stat-value" style={{ color: '#06b6d4' }}>0.082</div>
                                    <div className="subtext">z-score: 2.72 (p = 0.006)</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="title">GWQI Moran's I</div>
                                    <div className="stat-value" style={{ color: '#10b981' }}>0.107</div>
                                    <div className="subtext">z-score: 3.53 (p &lt; 0.001)</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Topic 8: LULC Correlation Profile */}
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h3>LULC vs Quality Correlation (Topic 8)</h3>
                                <span className="unit">ANOVA Signif.</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {data.analytics && Object.entries(data.analytics.lulc_correlation).map(([lulc, info]) => (
                                    <div key={lulc} style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                                            <span>{lulc}</span>
                                            <span style={{ color: info.mean_GWQI > 150 ? '#ef4444' : '#10b981' }}>GWQI: {info.mean_GWQI}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                                            <span>TDS: {info.mean_TDS} mg/L</span>
                                            <span>NO3: {info.mean_NO3} mg/L</span>
                                            <span>Poor Quality: {info.pct_poor_gwqi}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
            
            {/* Well Inspection Modal */}
            {selectedWell && (
                <div className="modal-overlay active">
                    <div className="modal-box">
                        <div className="modal-header">
                            <div>
                                <h2>Monitoring Well: {selectedWell['Well No']}</h2>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Village: {selectedWell.Village} | Taluk: {selectedWell.Taluk} | Samples: {selectedWell.Total_Samples} (2007–2021)
                                </p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setSelectedWell(null)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            {/* Profile Grid */}
                            <div className="well-profile-grid">
                                <div className="profile-card">
                                    <div className="k">Overall Status</div>
                                    <div className="v" style={{ 
                                        color: selectedWell.Drinking_Status === 'Safe Drinking Water' ? '#10b981' : selectedWell.Drinking_Status === 'Unsafe for Drinking' ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {selectedWell.Drinking_Status}
                                    </div>
                                </div>
                                <div className="profile-card">
                                    <div className="k">Composite GWQI</div>
                                    <div className="v">{selectedWell.GWQI} ({selectedWell.GWQI_Class})</div>
                                </div>
                                <div className="profile-card">
                                    <div className="k">Fluoride Concentration</div>
                                    <div className="v">{selectedWell.F} mg/L</div>
                                </div>
                                <div className="profile-card">
                                    <div className="k">Nitrate Concentration</div>
                                    <div className="v">{selectedWell['NO2+NO3']} mg/L</div>
                                </div>
                            </div>
                            
                            {/* Touchable Interactive Water Quality Tube */}
                            <div 
                                className="water-tube-container"
                                onClick={(e) => {
                                    triggerCardWaterEffect(e);
                                }}
                                title="Touch to slosh groundwater!"
                            >
                                <div 
                                    className="water-tube-fluid" 
                                    style={{
                                        height: `${Math.min(95, Math.max(25, 100 - (selectedWell.GWQI / 3)))}%`,
                                        background: selectedWell.GWQI < 100 
                                            ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.6) 0%, rgba(2, 132, 199, 0.9) 100%)'
                                            : selectedWell.GWQI < 200 
                                            ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.6) 0%, rgba(180, 83, 9, 0.9) 100%)'
                                            : 'linear-gradient(180deg, rgba(239, 68, 68, 0.6) 0%, rgba(185, 28, 28, 0.9) 100%)'
                                    }}
                                >
                                    <div className="water-tube-wave"></div>
                                </div>
                                <div className="water-tube-label">
                                    <h4>Touchable Aquifer Column: {selectedWell.Drinking_Status}</h4>
                                    <p>Touch or click this water container to simulate groundwater disturbance &amp; well sloshing</p>
                                </div>
                            </div>
                            
                            {/* Charts Split: Radar + Longitudinal */}
                            <div className="modal-charts-split">
                                <div className="chart-card">
                                    <div className="chart-card-header">
                                        <h3>Hydrochemical Fingerprint Radar</h3>
                                        <span className="unit">vs BIS 10500</span>
                                    </div>
                                    <div style={{ height: '210px' }}>
                                        <canvas id="chart-well-radar"></canvas>
                                    </div>
                                </div>
                                
                                <div className="chart-card">
                                    <div className="chart-card-header">
                                        <h3>15-Year Longitudinal Trend (2007–2021)</h3>
                                        <span className="unit">GWQI &amp; Fluoride</span>
                                    </div>
                                    <div style={{ height: '210px' }}>
                                        <canvas id="chart-well-trend"></canvas>
                                    </div>
                                </div>
                            </div>
                            
                            {/* BIS 10500 Compliance Table */}
                            <div className="chart-card">
                                <div className="chart-card-header">
                                    <h3>BIS 10500:2012 Drinking Water Quality Compliance</h3>
                                    <span className="unit">Indian Standards</span>
                                </div>
                                <table className="modal-compliance-table">
                                    <thead>
                                        <tr>
                                            <th>Chemical Parameter</th>
                                            <th>Well Mean</th>
                                            <th>Desirable Limit</th>
                                            <th>Permissible Limit</th>
                                            <th>Compliance Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Fluoride (F)</td>
                                            <td>{selectedWell.F} mg/L</td>
                                            <td>1.0 mg/L</td>
                                            <td>1.5 mg/L</td>
                                            <td><span className={selectedWell.F <= 1.0 ? 'badge-safe' : selectedWell.F <= 1.5 ? 'badge-marginal' : 'badge-unsafe'}>{selectedWell.Fluoride_Risk}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Nitrate (NO2+NO3)</td>
                                            <td>{selectedWell['NO2+NO3']} mg/L</td>
                                            <td>45.0 mg/L</td>
                                            <td>45.0 mg/L</td>
                                            <td><span className={selectedWell['NO2+NO3'] <= 45 ? 'badge-safe' : 'badge-unsafe'}>{selectedWell.Nitrate_Risk}</span></td>
                                        </tr>
                                        <tr>
                                            <td>TDS (Total Dissolved Solids)</td>
                                            <td>{selectedWell.TDS} mg/L</td>
                                            <td>500 mg/L</td>
                                            <td>2000 mg/L</td>
                                            <td><span className={selectedWell.TDS <= 500 ? 'badge-safe' : selectedWell.TDS <= 2000 ? 'badge-marginal' : 'badge-unsafe'}>{selectedWell.TDS > 2000 ? 'Exceeded Limit' : 'Within Limits'}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Total Hardness (CaCO3)</td>
                                            <td>{selectedWell.HAR_Total} mg/L</td>
                                            <td>200 mg/L</td>
                                            <td>600 mg/L</td>
                                            <td><span className={selectedWell.HAR_Total <= 200 ? 'badge-safe' : selectedWell.HAR_Total <= 600 ? 'badge-marginal' : 'badge-unsafe'}>{selectedWell.HAR_Total > 600 ? 'Very Hard Water' : 'Acceptable Hardness'}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Irrigation Suitability</td>
                                            <td>SAR: {selectedWell.SAR}</td>
                                            <td>SAR &lt; 10</td>
                                            <td>SAR &lt; 26</td>
                                            <td><span className={selectedWell.Irrigation_Suitability === 'Excellent' ? 'badge-safe' : 'badge-marginal'}>{selectedWell.Irrigation_Suitability}</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 10 Topics Comprehensive Guide Modal */}
            {showGuideModal && (
                <div className="modal-overlay active">
                    <div className="modal-box" style={{ maxWidth: '900px' }}>
                        <div className="modal-header">
                            <div>
                                <h2>10 GIS Project Topics — Comprehensive Guide</h2>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Madurai District Groundwater Quality Dataset (2007–2021) | Objectives, Methodologies &amp; Standards
                                </p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowGuideModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            {Object.keys(topicMetadata).map((k) => {
                                const t = topicMetadata[k];
                                return (
                                    <div key={k} style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span className="rank-badge rank-1" style={{ fontSize: '0.65rem' }}>{t.num}</span>
                                            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.95rem' }}>{t.title}</h3>
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{t.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            {/* QGIS Integration Modal */}
            {showQgisModal && (
                <div className="modal-overlay active">
                    <div className="modal-box" style={{ maxWidth: '820px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-map-location-dot" style={{ color: '#10b981' }}></i>
                                    QGIS 3.44.8 Desktop Integration Guide
                                </h2>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Native project files, GeoTIFF continuous rasters, and GeoPackage integration
                                </p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowQgisModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="modal-body" style={{ fontSize: '0.82rem', lineHeight: '1.6' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '14px' }}>
                                <h4 style={{ color: '#10b981', marginBottom: '6px', fontSize: '0.9rem' }}>
                                    <i className="fa-solid fa-bolt"></i> 1-Click Launch: Open Project in QGIS Desktop
                                </h4>
                                <p style={{ color: '#cbd5e1' }}>
                                    A ready-to-open QGIS project file <code>Madurai_Groundwater_Project.qgs</code> has been pre-configured with all layers, CRS (EPSG:4326), OpenStreetMap basemap, and IDW raster surfaces.
                                </p>
                                <p style={{ marginTop: '8px', color: '#fff', fontWeight: 600 }}>
                                    Run the launcher file on your computer:
                                    <br/>
                                    <code style={{ background: '#000', padding: '4px 10px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', color: '#38bdf8' }}>
                                        D:\web dashboard GIS\open_in_qgis.bat
                                    </code>
                                </p>
                            </div>

                            <h3 style={{ fontFamily: "'Outfit', sans-serif", marginTop: '10px', fontSize: '1rem', color: '#06b6d4' }}>
                                Available Layers Ready to Drag &amp; Drop into QGIS:
                            </h3>
                            <ul style={{ paddingLeft: '20px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li>
                                    <strong>IDW Continuous Rasters (.tif):</strong> Located in <code>data/processed/rasters/</code>
                                    <br/>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        Includes <code>madurai_gwqi_idw.tif</code>, <code>madurai_tds_idw.tif</code>, <code>madurai_f_idw.tif</code>, <code>madurai_no2+no3_idw.tif</code>. Style using Singleband Pseudocolor with graduated color ramps.
                                    </span>
                                </li>
                                <li>
                                    <strong>Enriched Monitoring Wells (.geojson / .csv):</strong> Located in <code>data/processed/</code>
                                    <br/>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        File: <code>madurai_wells_enriched.geojson</code> (225 wells with GWQI, SAR, RSC, Na%, Fluoride, Nitrate, and Getis-Ord Gi* hotspot z-scores).
                                    </span>
                                </li>
                                <li>
                                    <strong>7 Taluks Choropleth Layer:</strong> Located in <code>data/processed/madurai_taluks.geojson</code>
                                    <br/>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        Polygon boundaries of the 7 standardized taluks with pre-calculated vulnerability ranks and mean parameters.
                                    </span>
                                </li>
                                <li>
                                    <strong>District Boundary Polygon:</strong> Located in <code>data/processed/madurai_district_boundary.geojson</code>
                                </li>
                            </ul>

                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
                                <h4 style={{ color: '#f59e0b', marginBottom: '4px', fontSize: '0.85rem' }}>
                                    <i className="fa-solid fa-lightbulb"></i> How to add Basemaps in QGIS without API Keys:
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    In QGIS Browser panel, right-click <strong>XYZ Tiles</strong> &gt; <strong>New Connection</strong>:
                                    <br/>
                                    • OpenStreetMap: <code>https://tile.openstreetmap.org/{'{z}'}/{'{x}'}/{'{y}'}.png</code>
                                    <br/>
                                    • Google Satellite: <code>https://mt1.google.com/vt/lyrs=s&amp;x={'{x}'}&amp;y={'{y}'}&amp;z={'{z}'}</code>
                                    <br/>
                                    • Esri Dark Gray: <code>https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{'{z}'}/{'{y}'}/{'{x}'}</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Mount React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

/**
 * Leaflet Map & Spatial Layers Management Engine
 * Handles Vector Layers, Choropleths, IDW Raster Surfaces & Hotspot Overlays
 */

class MapEngine {
    constructor(containerId, onWellSelect) {
        this.containerId = containerId;
        this.onWellSelect = onWellSelect;
        this.map = null;
        
        // Layer groups
        this.layers = {
            district: L.geoJSON(null),
            taluks: L.geoJSON(null),
            wells: L.layerGroup(),
            surface: null, // Canvas overlay
            hotspots: L.layerGroup()
        };
        
        this.data = {
            district: null,
            taluks: null,
            wells: null,
            surfaces: null,
            timeSeries: null
        };
        
        this.surfaceOpacity = 0.65;
        this.activeSurfaceParam = 'GWQI';
        this.colorRamps = {
            GWQI: [
                { val: 50, color: [16, 185, 129] },   // Excellent (Green)
                { val: 100, color: [6, 182, 212] },   // Good (Cyan)
                { val: 200, color: [245, 158, 11] },  // Poor (Amber)
                { val: 300, color: [249, 115, 22] },  // Very Poor (Orange)
                { val: 450, color: [239, 68, 68] }    // Unsuitable (Red)
            ],
            TDS: [
                { val: 500, color: [16, 185, 129] },
                { val: 1000, color: [6, 182, 212] },
                { val: 1500, color: [245, 158, 11] },
                { val: 2000, color: [249, 115, 22] },
                { val: 3500, color: [239, 68, 68] }
            ],
            F: [
                { val: 0.8, color: [16, 185, 129] },
                { val: 1.0, color: [6, 182, 212] },
                { val: 1.5, color: [245, 158, 11] },
                { val: 2.0, color: [249, 115, 22] },
                { val: 2.8, color: [239, 68, 68] }
            ],
            'NO2+NO3': [
                { val: 10, color: [16, 185, 129] },
                { val: 25, color: [6, 182, 212] },
                { val: 45, color: [245, 158, 11] },
                { val: 80, color: [249, 115, 22] },
                { val: 150, color: [239, 68, 68] }
            ],
            EC_GEN: [
                { val: 750, color: [16, 185, 129] },
                { val: 1500, color: [6, 182, 212] },
                { val: 2250, color: [245, 158, 11] },
                { val: 3500, color: [249, 115, 22] },
                { val: 5000, color: [239, 68, 68] }
            ],
            HAR_Total: [
                { val: 200, color: [16, 185, 129] },
                { val: 400, color: [6, 182, 212] },
                { val: 600, color: [245, 158, 11] },
                { val: 1000, color: [239, 68, 68] }
            ],
            SAR: [
                { val: 5, color: [16, 185, 129] },
                { val: 10, color: [6, 182, 212] },
                { val: 18, color: [245, 158, 11] },
                { val: 26, color: [239, 68, 68] }
            ],
            Drinking_Suitability: [
                { val: 1.0, color: [16, 185, 129] }, // Safe (Green)
                { val: 2.0, color: [245, 158, 11] }, // Marginal (Amber)
                { val: 3.0, color: [239, 68, 68] }   // Unsuitable (Red)
            ],
            Agri_Suitability: [
                { val: 1.0, color: [5, 150, 105] },  // Prime Cropland (Emerald)
                { val: 2.0, color: [217, 119, 6] },  // Moderate / Salt-Tolerant (Amber)
                { val: 3.0, color: [220, 38, 38] }   // Severe Sodicity Hazard (Red)
            ]
        };
        
        this.initMap();
    }
    
    initMap() {
        // Center on Madurai District (9.925 N, 78.12 E)
        this.map = L.map(this.containerId, {
            center: [9.9252, 78.1198],
            zoom: 10,
            minZoom: 8,
            maxZoom: 16,
            zoomControl: false
        });
        
        L.control.zoom({ position: 'topright' }).addTo(this.map);
        
        // Basemaps (100% Free, High Resolution, Zero API Key / Watermark)
        this.basemaps = {
            dark: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
                maxZoom: 16
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri, Maxar, Earthstar Geographics',
                maxZoom: 18
            }),
            osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
            }),
            topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri, USGS, NOAA',
                maxZoom: 18
            })
        };
        
        this.basemaps.satellite.addTo(this.map);
        
        // Add layer groups to map
        this.layers.district.addTo(this.map);
        this.layers.taluks.addTo(this.map);
        this.layers.wells.addTo(this.map);
        this.layers.hotspots.addTo(this.map);
    }
    
    setBasemap(type) {
        Object.values(this.basemaps).forEach(b => {
            if (this.map.hasLayer(b)) this.map.removeLayer(b);
        });
        const target = this.basemaps[type] || this.basemaps.satellite;
        if (target) {
            target.addTo(this.map);
            if (typeof target.bringToBack === 'function') target.bringToBack();
            else if (target.eachLayer) target.eachLayer(l => l.bringToBack && l.bringToBack());
        }
    }
    
    setData(payload) {
        this.data = payload;
        this.renderDistrictBoundary();
        this.renderTaluks();
        this.renderWells();
        this.renderSurface();
    }
    
    renderDistrictBoundary() {
        if (!this.data.district) return;
        this.layers.district.clearLayers();
        this.layers.district.addData(this.data.district);
        this.layers.district.setStyle({
            color: '#06b6d4',
            weight: 2.5,
            opacity: 0.9,
            fillOpacity: 0.03,
            dashArray: '4, 4'
        });
    }
    
    renderTaluks(topic = 'topic7') {
        if (!this.data.taluks) return;
        this.layers.taluks.clearLayers();
        
        const getTalukColor = (rank) => {
            switch(rank) {
                case 1: return '#ef4444'; // Most vulnerable (Thirumangalam)
                case 2: return '#f97316'; // Usilampatti
                case 3: return '#f59e0b'; // Madurai South
                case 4: return '#eab308'; // Peraiyur
                case 5: return '#3b82f6'; // Madurai North
                case 6: return '#06b6d4'; // Melur
                case 7: return '#10b981'; // Vadipatti (Best quality)
                default: return '#64748b';
            }
        };
        
        this.layers.taluks.addData(this.data.taluks);
        this.layers.taluks.setStyle((feature) => {
            const rank = feature.properties.Vulnerability_Rank;
            return {
                fillColor: getTalukColor(rank),
                weight: 1.5,
                opacity: 0.8,
                color: '#ffffff',
                dashArray: '2, 2',
                fillOpacity: topic === 'topic7' ? 0.45 : 0.12
            };
        });
        
        this.layers.taluks.eachLayer((layer) => {
            const p = layer.feature.properties;
            layer.bindTooltip(`
                <strong>${p.Taluk} Taluk</strong><br/>
                Rank: #${p.Vulnerability_Rank} | Mean GWQI: ${p.mean_GWQI}<br/>
                Fluoride Exceedance: ${p.pct_F_exceed}%<br/>
                Nitrate Exceedance: ${p.pct_NO3_exceed}%
            `, { sticky: true, className: 'taluk-tooltip' });
            
            layer.on('click', () => {
                this.map.fitBounds(layer.getBounds(), { padding: [30, 30] });
                if (window.appInstance) {
                    window.appInstance.setTalukFilter(p.Taluk);
                }
            });
        });
    }
    
    renderWells(options = {}) {
        if (!this.data.wells) return;
        this.layers.wells.clearLayers();
        
        const {
            topic = 'topic2',
            param = 'GWQI',
            year = 'all',
            season = 'All',
            taluk = 'all',
            healthFilter = 'all'
        } = options;
        // If future year or specific year selected, pull well records
        let features = this.data.wells.features;
        if (year !== 'all' && Number(year) > 2021 && this.data.suitability && this.data.suitability.well_models) {
            const yNum = Number(year);
            features = Object.values(this.data.suitability.well_models).map(m => {
                const fcast = m.forecasts[yNum] || m.base_2021;
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [m.lon, m.lat] },
                    properties: {
                        'Well No': m.well_no,
                        Village: m.village,
                        Taluk: m.taluk,
                        Latitude_DD: m.lat,
                        Longitude_DD: m.lon,
                        GWQI: fcast.GWQI,
                        GWQI_Class: fcast.GWQI_Class || (fcast.GWQI < 100 ? 'Good' : fcast.GWQI < 200 ? 'Poor' : 'Very Poor'),
                        TDS: fcast.TDS,
                        F: fcast.F,
                        'NO2+NO3': fcast['NO2+NO3'],
                        SAR: fcast.SAR,
                        EC_GEN: fcast.EC_GEN,
                        HAR_Total: fcast.HAR_Total,
                        Drinking_Status: fcast.Drinking_Status,
                        Drinking_Tier: fcast.Drinking_Tier,
                        Agri_Status: fcast.Agri_Status,
                        Agri_Tier: fcast.Agri_Tier,
                        Agri_Crops: fcast.Agri_Crops,
                        Irrigation_Suitability: fcast.Agri_Tier === 1 ? 'Excellent' : fcast.Agri_Tier === 2 ? 'Good / Permissible' : 'Unsuitable'
                    }
                };
            });
        } else if (year !== 'all' && this.data.timeSeries && this.data.timeSeries.by_year[year]) {
            const yrWells = this.data.timeSeries.by_year[year].wells;
            features = yrWells.map(w => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [w.Longitude_DD, w.Latitude_DD] },
                properties: w
            }));
        }

        if (taluk !== 'all') {
            features = features.filter(f => f.properties.Taluk === taluk);
        }
        
        features.forEach((feature) => {
            const p = feature.properties;
            const [lon, lat] = feature.geometry.coordinates;
            
            // Determine color and size based on active topic
            let color = '#2563eb';
            let radius = 6;
            
            if (topic === 'topic12' || param === 'Drinking_Suitability') {
                const dTier = p.Drinking_Tier || (p.Drinking_Status === 'Safe Drinking Water' ? 1 : p.Drinking_Status === 'Marginal Drinking Water' ? 2 : 3);
                if (dTier === 1) { color = '#10b981'; radius = 6; }
                else if (dTier === 2) { color = '#f59e0b'; radius = 7; }
                else { color = '#ef4444'; radius = 8; }
            } else if (topic === 'topic13' || param === 'Agri_Suitability') {
                const aTier = p.Agri_Tier || (p.Irrigation_Suitability === 'Excellent' ? 1 : (p.Irrigation_Suitability && p.Irrigation_Suitability.includes('Good')) ? 2 : 3);
                if (aTier === 1) { color = '#059669'; radius = 6; }
                else if (aTier === 2) { color = '#d97706'; radius = 7; }
                else { color = '#dc2626'; radius = 8; }
            } else if (topic === 'topic2' || topic === 'topic11' || param.startsWith('GWQI')) { // GWQI Zonation or ML
                const gClass = p.GWQI_Class || (p.GWQI < 50 ? 'Excellent' : p.GWQI < 100 ? 'Good' : p.GWQI < 200 ? 'Poor' : p.GWQI < 300 ? 'Very Poor' : 'Unsuitable');
                switch(gClass) {
                    case 'Excellent': color = '#10b981'; radius = 5; break;
                    case 'Good': color = '#06b6d4'; radius = 6; break;
                    case 'Poor': color = '#f59e0b'; radius = 7; break;
                    case 'Very Poor': color = '#f97316'; radius = 8; break;
                    case 'Unsuitable': color = '#ef4444'; radius = 9; break;
                    default: color = '#38bdf8'; break;
                }
            } else if (topic === 'topic4') { // Irrigation Suitability
                switch(p.Irrigation_Suitability) {
                    case 'Excellent': color = '#10b981'; break;
                    case 'Good / Permissible': color = '#06b6d4'; break;
                    case 'Marginal / Moderate': color = '#f59e0b'; break;
                    case 'Unsuitable': color = '#ef4444'; break;
                }
            } else if (topic === 'topic5') { // Fluoride Health Risk
                if (p.F > 2.0) { color = '#ef4444'; radius = 9; }
                else if (p.F > 1.5) { color = '#f97316'; radius = 8; }
                else if (p.F > 1.0) { color = '#06b6d4'; radius = 6; }
                else { color = '#10b981'; radius = 5; }
            } else if (topic === 'topic6') { // Nitrate Distribution
                if (p['NO2+NO3'] > 100) { color = '#ef4444'; radius = 9; }
                else if (p['NO2+NO3'] > 45) { color = '#f97316'; radius = 8; }
                else if (p['NO2+NO3'] > 10) { color = '#06b6d4'; radius = 6; }
                else { color = '#10b981'; radius = 5; }
            } else if (topic === 'topic9') { // Hotspots & Spatial Autocorrelation
                if (p.Hotspot_GWQI && p.Hotspot_GWQI.includes('Hotspot')) { color = '#ef4444'; radius = 9; }
                else if (p.Hotspot_GWQI && p.Hotspot_GWQI.includes('Coldspot')) { color = '#10b981'; radius = 6; }
                else { color = '#64748b'; radius = 4; }
            } else {
                // Topic 1 or generic parameter
                color = this.interpolateColor(param, p[param]);
            }
            
            const marker = L.circleMarker([lat, lon], {
                radius: radius,
                fillColor: color,
                color: '#ffffff',
                weight: 1.5,
                opacity: 0.9,
                fillOpacity: 0.85
            });
            
            // Popup
            const popupHtml = `
                <div class="well-popup-card">
                    <h4>Well: ${p['Well No']}</h4>
                    <p><strong>Village:</strong> ${p.Village} | <strong>Taluk:</strong> ${p.Taluk}</p>
                    <div class="well-popup-stats">
                        <div class="well-popup-stat"><span class="lbl">GWQI</span><div class="val">${p.GWQI} (${p.GWQI_Class})</div></div>
                        <div class="well-popup-stat"><span class="lbl">Fluoride</span><div class="val">${p.F} mg/L</div></div>
                        <div class="well-popup-stat"><span class="lbl">Nitrate</span><div class="val">${p['NO2+NO3']} mg/L</div></div>
                        <div class="well-popup-stat"><span class="lbl">TDS</span><div class="val">${p.TDS} mg/L</div></div>
                    </div>
                    <button class="btn btn-primary" style="width:100%; padding:4px 8px; font-size:0.72rem; margin-top:4px;" onclick="window.appInstance.inspectWell('${p['Well No']}')">
                        Inspect Detailed Well Profile
                    </button>
                </div>
            `;
            marker.bindPopup(popupHtml);
            
            marker.on('click', () => {
                if (this.onWellSelect) this.onWellSelect(p);
            });
            
            this.layers.wells.addLayer(marker);
        });
    }
    
    renderSurface(param = 'GWQI') {
        if (!this.data.surfaces) return;
        this.activeSurfaceParam = param;
        
        if (this.layers.surface) {
            this.map.removeLayer(this.layers.surface);
            this.layers.surface = null;
        }
        
        const surfData = this.data.surfaces.surfaces;
        const pData = surfData.parameters[param];
        if (!pData) return;
        
        const bounds = surfData.meta.bounds; // [minx, miny, maxx, maxy]
        const southWest = L.latLng(bounds[1], bounds[0]);
        const northEast = L.latLng(bounds[3], bounds[2]);
        const imageBounds = L.latLngBounds(southWest, northEast);
        
        // Render 2D grid to an offscreen Canvas
        const gridRes = surfData.meta.grid_res;
        const canvas = document.createElement('canvas');
        canvas.width = gridRes;
        canvas.height = gridRes;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(gridRes, gridRes);
        const data = imgData.data;
        
        const grid = pData.grid;
        const ramp = this.colorRamps[param] || this.colorRamps.GWQI;
        
        for (let y = 0; y < gridRes; y++) {
            // Invert y axis for image rendering
            const srcRow = gridRes - 1 - y;
            for (let x = 0; x < gridRes; x++) {
                const val = grid[srcRow][x];
                const idx = (y * gridRes + x) * 4;
                
                if (val === null || val === undefined) {
                    data[idx + 3] = 0; // Transparent
                } else {
                    const rgb = this.getInterpolatedRgb(ramp, val);
                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = 230; // Solid alpha on canvas, opacity controlled by Leaflet
                }
            }
        }
        
        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL();
        
        this.layers.surface = L.imageOverlay(dataUrl, imageBounds, {
            opacity: this.surfaceOpacity,
            interactive: false
        });
        this.layers.surface.addTo(this.map);
        Object.values(this.basemaps).forEach(b => {
            if (this.map.hasLayer(b)) {
                if (typeof b.bringToBack === 'function') b.bringToBack();
                else if (b.eachLayer) b.eachLayer(l => l.bringToBack && l.bringToBack());
            }
        });
    }
    
    setSurfaceOpacity(opacity) {
        this.surfaceOpacity = opacity;
        if (this.layers.surface) {
            this.layers.surface.setOpacity(opacity);
        }
    }
    
    getInterpolatedRgb(ramp, val) {
        if (val <= ramp[0].val) return ramp[0].color;
        if (val >= ramp[ramp.length - 1].val) return ramp[ramp.length - 1].color;
        
        for (let i = 0; i < ramp.length - 1; i++) {
            if (val >= ramp[i].val && val <= ramp[i + 1].val) {
                const factor = (val - ramp[i].val) / (ramp[i + 1].val - ramp[i].val);
                return [
                    Math.round(ramp[i].color[0] + factor * (ramp[i + 1].color[0] - ramp[i].color[0])),
                    Math.round(ramp[i].color[1] + factor * (ramp[i + 1].color[1] - ramp[i].color[1])),
                    Math.round(ramp[i].color[2] + factor * (ramp[i + 1].color[2] - ramp[i].color[2]))
                ];
            }
        }
        return ramp[0].color;
    }
    
    interpolateColor(param, val) {
        const ramp = this.colorRamps[param] || this.colorRamps.GWQI;
        const rgb = this.getInterpolatedRgb(ramp, val);
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
}

window.MapEngine = MapEngine;

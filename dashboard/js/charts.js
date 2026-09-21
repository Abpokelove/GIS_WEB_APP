/**
 * Chart.js Integration Engine for Hydrochemical & Spatial Analysis
 */

class ChartEngine {
    constructor() {
        this.charts = {
            distribution: null,
            talukCompare: null,
            longitudinalTrend: null,
            irrigationScatter: null,
            wellRadar: null,
            wellTrend: null
        };
        
        // Chart.js dark theme global defaults
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.plugins.legend.labels.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.07)';
    }
    
    renderDistributionChart(canvasId, values, paramName, bisLimit) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (this.charts.distribution) this.charts.distribution.destroy();
        
        // Compute 10 histogram bins
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = 10;
        const step = (max - min) / binCount;
        
        const bins = new Array(binCount).fill(0);
        const labels = [];
        for (let i = 0; i < binCount; i++) {
            const start = (min + i * step).toFixed(1);
            const end = (min + (i + 1) * step).toFixed(1);
            labels.push(`${start}-${end}`);
        }
        
        values.forEach(v => {
            let idx = Math.floor((v - min) / step);
            if (idx >= binCount) idx = binCount - 1;
            if (idx >= 0) bins[idx]++;
        });
        
        this.charts.distribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${paramName} Distribution`,
                    data: bins,
                    backgroundColor: 'rgba(6, 182, 212, 0.45)',
                    borderColor: '#06b6d4',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Wells: ${ctx.raw}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Well Count', font: { size: 10 } }
                    }
                }
            }
        });
    }
    
    renderTalukComparison(canvasId, talukStats, param = 'mean_GWQI') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (this.charts.talukCompare) this.charts.talukCompare.destroy();
        
        const taluks = Object.keys(talukStats);
        const values = taluks.map(t => talukStats[t][param] || talukStats[t]['mean_GWQI']);
        
        const bgColors = taluks.map(t => {
            const rank = talukStats[t].Vulnerability_Rank;
            if (rank === 1) return 'rgba(239, 68, 68, 0.6)';
            if (rank <= 3) return 'rgba(249, 115, 22, 0.6)';
            return 'rgba(6, 182, 212, 0.6)';
        });
        
        this.charts.talukCompare = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: taluks,
                datasets: [{
                    label: 'Mean Value',
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { font: { size: 9 } }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    renderLongitudinalTrend(canvasId, timeSeriesByYear, param = 'mean_GWQI') {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (this.charts.longitudinalTrend) this.charts.longitudinalTrend.destroy();
        
        const allYears = Object.keys(timeSeriesByYear).sort((a, b) => Number(a) - Number(b));
        const historicalVals = allYears.map(y => Number(y) <= 2021 ? (timeSeriesByYear[y][param] || timeSeriesByYear[y]['mean_GWQI']) : null);
        const forecastVals = allYears.map(y => Number(y) >= 2021 ? (timeSeriesByYear[y][param] || timeSeriesByYear[y]['mean_GWQI']) : null);
        
        this.charts.longitudinalTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allYears,
                datasets: [
                    {
                        label: 'Observed Trajectory (2007–2021)',
                        data: historicalVals,
                        borderColor: '#0284c7',
                        backgroundColor: 'rgba(2, 132, 199, 0.15)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2.5,
                        pointRadius: 3.5,
                        pointBackgroundColor: '#0284c7'
                    },
                    {
                        label: 'ML Forecast Horizon (2026–2030)',
                        data: forecastVals,
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        borderDash: [6, 4],
                        fill: false,
                        tension: 0.3,
                        borderWidth: 2.5,
                        pointRadius: 4.5,
                        pointBackgroundColor: '#c084fc',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { size: 9 },
                            boxWidth: 12
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { font: { size: 9 }, color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    y: {
                        ticks: { font: { size: 9 }, color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        beginAtZero: false
                    }
                }
            }
        });
    }
    
    renderIrrigationScatter(canvasId, wells) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (this.charts.irrigationScatter) this.charts.irrigationScatter.destroy();
        
        // USSL Diagram: EC (X) vs SAR (Y)
        const dataPoints = wells.map(w => ({
            x: w.properties.EC_GEN,
            y: w.properties.SAR,
            name: w.properties['Well No'],
            taluk: w.properties.Taluk
        }));
        
        this.charts.irrigationScatter = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Wells',
                    data: dataPoints,
                    backgroundColor: 'rgba(6, 182, 212, 0.65)',
                    borderColor: '#06b6d4',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.raw.name} (${ctx.raw.taluk}): EC=${ctx.raw.x}, SAR=${ctx.raw.y}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Electrical Conductivity (µS/cm)' },
                        type: 'linear'
                    },
                    y: {
                        title: { display: true, text: 'SAR (Sodium Adsorption Ratio)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    renderWellRadar(canvasId, wellData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (this.charts.wellRadar) this.charts.wellRadar.destroy();
        
        // Normalize against BIS Standards (100% = Standard Limit)
        const labels = ['pH', 'TDS', 'EC', 'Fluoride', 'Nitrate', 'Hardness', 'Chloride', 'Sulphate'];
        const values = [
            (wellData.pH_GEN / 8.5) * 100,
            (wellData.TDS / 500) * 100,
            (wellData.EC_GEN / 750) * 100,
            (wellData.F / 1.0) * 100,
            ((wellData['NO2+NO3'] || wellData.NO3) / 45) * 100,
            (wellData.HAR_Total / 200) * 100,
            (wellData.Cl / 250) * 100,
            (wellData.SO4 / 200) * 100
        ];
        
        this.charts.wellRadar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Well Concentration (% of Standard)',
                        data: values.map(v => Math.min(300, Math.round(v))),
                        backgroundColor: 'rgba(6, 182, 212, 0.25)',
                        borderColor: '#06b6d4',
                        borderWidth: 2,
                        pointBackgroundColor: '#06b6d4'
                    },
                    {
                        label: 'BIS Standard Limit (100%)',
                        data: [100, 100, 100, 100, 100, 100, 100, 100],
                        borderColor: 'rgba(239, 68, 68, 0.7)',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                        grid: { color: 'rgba(255, 255, 255, 0.08)' },
                        pointLabels: { font: { size: 10 } },
                        suggestedMin: 0,
                        suggestedMax: 150
                    }
                }
            }
        });
    }
    
    renderWellTrend(canvasId, wellHistory) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (this.charts.wellTrend) this.charts.wellTrend.destroy();
        if (!wellHistory || !wellHistory.years) return;
        
        this.charts.wellTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: wellHistory.dates || wellHistory.years,
                datasets: [
                    {
                        label: 'GWQI Trajectory',
                        data: wellHistory.GWQI,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2
                    },
                    {
                        label: 'Fluoride (mg/L)',
                        data: wellHistory.F,
                        borderColor: '#f59e0b',
                        borderWidth: 1.5,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 8 } } },
                    y: { title: { display: true, text: 'GWQI' }, beginAtZero: false },
                    y1: { position: 'right', title: { display: true, text: 'F (mg/L)' }, grid: { display: false } }
                }
            }
        });
    }
}

window.ChartEngine = ChartEngine;

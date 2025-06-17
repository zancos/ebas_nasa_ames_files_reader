// Analysis page functionality
let charts = {};
let timeLabels = [];
let chartsData = {};
let originalChartsData = {};
let totalPoints = 0;
let currentTimeRange = [0, -1];

// Simple but effective grid for large, aligned charts
const ALIGNED_GRID = {
    left: 120,      // Fixed left margin for Y-axis labels
    right: 50,      // Fixed right margin
    top: 80,        // Fixed top margin for title/legend
    bottom: 80,     // Fixed bottom margin for X-axis/controls
    containLabel: false
};

// Debug function
function debugLog(message) {
    console.log('[Analysis Debug]:', message);
    const debugElement = document.getElementById('debug-info');
    if (debugElement) {
        debugElement.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    debugLog('Starting initialization...');
    
    // Initialize filename animation
    initializeFilenameAnimation();
    
    // Wait a bit for everything to load
    setTimeout(function() {
        initializeAnalysisPage();
    }, 100);
});

function initializeFilenameAnimation() {
    const filenameElement = document.getElementById('filename-display');
    if (filenameElement) {
        const textWidth = filenameElement.scrollWidth;
        const containerWidth = filenameElement.parentElement.offsetWidth;
        
        if (textWidth > containerWidth) {
            filenameElement.classList.add('animate');
            
            filenameElement.addEventListener('mouseenter', function() {
                this.classList.add('paused');
            });
            
            filenameElement.addEventListener('mouseleave', function() {
                this.classList.remove('paused');
            });
        }
    }
}

function initializeAnalysisPage() {
    try {
        debugLog('Loading data...');
        
        const chartDataElement = document.getElementById('chart-data');
        const timeLabelsElement = document.getElementById('time-labels');
        
        if (!chartDataElement || !timeLabelsElement) {
            throw new Error('Required data elements not found');
        }
        
        chartsData = JSON.parse(chartDataElement.textContent);
        originalChartsData = JSON.parse(JSON.stringify(chartsData));
        timeLabels = JSON.parse(timeLabelsElement.textContent);
        totalPoints = timeLabels.length;
        currentTimeRange = [0, totalPoints - 1];
        
        debugLog(`Loaded ${Object.keys(chartsData).length} charts, ${totalPoints} time points`);
        
        if (typeof echarts === 'undefined') {
            throw new Error('ECharts library not loaded');
        }
        
        initializeCharts();
        initializeSlider();
        setupButtons();
        setupGlobalResize(); // Add global resize handler
        
        debugLog('Initialization complete!');
        
    } catch (error) {
        console.error('Error initializing analysis:', error);
        debugLog(`Error: ${error.message}`);
    }
}

function initializeCharts() {
    debugLog('Initializing charts...');
    
    let chartsInitialized = 0;
    
    for (const [chartId, chartInfo] of Object.entries(chartsData)) {
        try {
            const element = document.getElementById(chartId);
            if (!element) {
                console.warn(`Chart element not found: ${chartId}`);
                continue;
            }
            
            debugLog(`Creating chart: ${chartId}`);
            
            // Clear loading content
            element.innerHTML = '';
            
            // Ensure element has proper dimensions
            element.style.width = '100%';
            element.style.height = '500px';
            element.style.minHeight = '500px';
            element.style.display = 'block';
            
            const chart = echarts.init(element, null, {
                renderer: 'canvas',
                width: element.offsetWidth,
                height: 500
            });
            
            charts[chartId] = chart;
            
            if (chartInfo.config.type === 'heatmap') {
                createHeatmapChart(chart, chartId, chartInfo);
            } else if (chartInfo.config.type === 'line') {
                createLineChart(chart, chartId, chartInfo);
            }
            
            chartsInitialized++;
            
        } catch (error) {
            console.error(`Error creating chart ${chartId}:`, error);
        }
    }
    
    debugLog(`Initialized ${chartsInitialized} charts`);
}

// Global resize handler for all charts
function setupGlobalResize() {
    const resizeHandler = debounce(() => {
        debugLog('Handling window resize...');
        
        // Force redraw all charts with new dimensions
        for (const [chartId, chartInfo] of Object.entries(chartsData)) {
            const chart = charts[chartId];
            const element = document.getElementById(chartId);
            
            if (chart && element && chartInfo) {
                try {
                    // Ensure container maintains proper dimensions
                    element.style.width = '100%';
                    element.style.height = '500px';
                    element.style.minHeight = '500px';
                    element.style.display = 'block';
                    
                    // Force chart to recognize new container size
                    chart.resize({
                        width: element.offsetWidth,
                        height: 500
                    });
                    
                    // Recreate chart with new dimensions
                    if (chartInfo.config.type === 'heatmap') {
                        createHeatmapChart(chart, chartId, chartInfo);
                    } else if (chartInfo.config.type === 'line') {
                        createLineChart(chart, chartId, chartInfo);
                    }
                    
                } catch (error) {
                    console.error(`Error resizing chart ${chartId}:`, error);
                }
            }
        }
        
        debugLog('Resize complete');
    }, 200);
    
    window.addEventListener('resize', resizeHandler);
    
    // Also handle orientation change on mobile devices
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeHandler, 500);
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function filterDataByTimeRange(data, startIdx, endIdx, chartType) {
    if (chartType === 'heatmap') {
        return data.filter(point => {
            const timeIndex = point[0];
            return timeIndex >= startIdx && timeIndex <= endIdx;
        }).map(point => [point[0] - startIdx, point[1], point[2]]);
    } else if (chartType === 'line') {
        const filteredData = {
            x_data: data.x_data.slice(startIdx, endIdx + 1),
            y_data: {}
        };
        
        for (const [key, values] of Object.entries(data.y_data)) {
            filteredData.y_data[key] = values.slice(startIdx, endIdx + 1);
        }
        
        return filteredData;
    }
    
    return data;
}

function createHeatmapChart(chart, chartId, chartInfo) {
    const config = chartInfo.config;
    const data = chartInfo.data;
    const columns = chartInfo.columns;
    
    const vmin = config.default_min !== undefined ? config.default_min : chartInfo.stats.min;
    const vmax = config.default_max !== undefined ? config.default_max : chartInfo.stats.max;
    
    const filteredData = filterDataByTimeRange(data, currentTimeRange[0], currentTimeRange[1], 'heatmap');
    const timeRangeSize = currentTimeRange[1] - currentTimeRange[0] + 1;
    
    const option = {
        title: {
            text: config.title,
            subtext: `${config.description} (${columns.length} columns, ${timeRangeSize} time points)`,
            left: 'center',
            top: 15,
            textStyle: { fontSize: 16 },
            subtextStyle: { fontSize: 12 }
        },
        tooltip: {
            position: 'top',
            formatter: function(params) {
                const timeIdx = params.data[0] + currentTimeRange[0];
                const colIdx = params.data[1];
                const value = params.data[2];
                const timeLabel = timeIdx < timeLabels.length ? timeLabels[timeIdx] : `Time ${timeIdx}`;
                const colName = colIdx < columns.length ? columns[colIdx] : `Col ${colIdx}`;
                return `Time: ${timeLabel}<br/>Variable: ${colName}<br/>Value: ${value.toFixed(3)}`;
            }
        },
        grid: ALIGNED_GRID,
        xAxis: {
            type: 'category',
            data: Array.from({length: timeRangeSize}, (_, i) => currentTimeRange[0] + i),
            splitArea: { show: true },
            name: 'Time Index',
            nameLocation: 'middle',
            nameGap: 30,
            axisLabel: { fontSize: 11 }
        },
        yAxis: {
            type: 'category',
            data: columns,
            splitArea: { show: true },
            name: `Variables (${config.units})`,
            nameLocation: 'middle',
            nameGap: 80,
            axisLabel: {
                fontSize: 10,
                width: 100,
                overflow: 'truncate'
            }
        },
        visualMap: {
            min: vmin,
            max: vmax,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 15,
            inRange: {
                color: config.colour_scale === 'grafana_style' ? [
                    '#0d0887', '#2d1e8f', '#4a0da6', '#6a00a8', '#8b0aa5',
                    '#a9179c', '#c42e88', '#dc4869', '#f0624a', '#fc8023',
                    '#fd9a44', '#feb078', '#fdc7a4', '#fcfdbf'
                ] : ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', 
                     '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
            }
        },
        series: [{
            name: config.title,
            type: 'heatmap',
            data: filteredData || [],
            label: { show: false },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }],
        toolbox: {
            show: true,
            right: 20,
            top: 15,
            feature: {
                saveAsImage: { 
                    title: 'Save as Image',
                    name: `${config.title}_heatmap`
                }
            }
        }
    };
    
    chart.setOption(option, true);
}

function createLineChart(chart, chartId, chartInfo) {
    const config = chartInfo.config;
    const data = chartInfo.data;
    
    if (!data || !data.y_data) {
        console.error('Invalid line chart data:', data);
        return;
    }
    
    const filteredData = filterDataByTimeRange(data, currentTimeRange[0], currentTimeRange[1], 'line');
    
    const series = [];
    const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
    let colorIndex = 0;
    
    for (const [colName, values] of Object.entries(filteredData.y_data)) {
        series.push({
            name: colName,
            type: 'line',
            data: values || [],
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 2 },
            color: colors[colorIndex % colors.length]
        });
        colorIndex++;
    }
    
    const option = {
        title: {
            text: config.title,
            subtext: `${config.description} (${Object.keys(filteredData.y_data).length} series, ${filteredData.x_data.length} points)`,
            left: 'center',
            top: 15,
            textStyle: { fontSize: 16 },
            subtextStyle: { fontSize: 12 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        legend: {
            top: 55,
            type: 'scroll',
            pageButtonItemGap: 5,
            pageButtonGap: 10,
            pageIconSize: 12
        },
        grid: ALIGNED_GRID,
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: filteredData.x_data || [],
            name: 'Time Index',
            nameLocation: 'middle',
            nameGap: 30,
            axisLabel: { fontSize: 11 }
        },
        yAxis: {
            type: 'value',
            name: `Value (${config.units})`,
            nameLocation: 'middle',
            nameGap: 60,
            min: config.default_min,
            max: config.default_max,
            axisLabel: {
                fontSize: 11,
                width: 100,
                overflow: 'truncate'
            }
        },
        series: series,
        toolbox: {
            show: true,
            right: 20,
            top: 15,
            feature: {
                saveAsImage: { 
                    title: 'Save as Image',
                    name: `${config.title}_line`
                },
                dataZoom: { 
                    title: { zoom: 'Zoom', back: 'Reset Zoom' }
                }
            }
        },
        dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { start: 0, end: 100, height: 25, bottom: 40 }
        ]
    };
    
    chart.setOption(option, true);
}

function updateAllChartsWithTimeRange(startIdx, endIdx) {
    currentTimeRange = [startIdx, endIdx];
    
    for (const [chartId, chartInfo] of Object.entries(chartsData)) {
        const chart = charts[chartId];
        if (chart && chartInfo) {
            if (chartInfo.config.type === 'heatmap') {
                createHeatmapChart(chart, chartId, chartInfo);
            } else if (chartInfo.config.type === 'line') {
                createLineChart(chart, chartId, chartInfo);
            }
        }
    }
    
    debugLog(`Updated all charts for time range: ${startIdx} to ${endIdx}`);
}

function initializeSlider() {
    const slider = document.getElementById('time-range-slider');
    if (!slider || totalPoints === 0) {
        debugLog('Slider element not found or no data points');
        return;
    }
    
    try {
        if (slider.noUiSlider) {
            slider.noUiSlider.destroy();
        }
        
        debugLog(`Creating slider for ${totalPoints} points`);
        
        noUiSlider.create(slider, {
            start: [0, Math.min(totalPoints - 1, 99)],
            connect: true,
            range: { 'min': 0, 'max': totalPoints - 1 },
            step: 1,
            tooltips: [
                {
                    to: function(value) {
                        const idx = Math.round(value);
                        return idx < timeLabels.length ? timeLabels[idx].substring(0, 10) : `${idx}`;
                    }
                },
                {
                    to: function(value) {
                        const idx = Math.round(value);
                        return idx < timeLabels.length ? timeLabels[idx].substring(0, 10) : `${idx}`;
                    }
                }
            ]
        });
        
        slider.noUiSlider.on('update', function(values) {
            const startIdx = Math.round(values[0]);
            const endIdx = Math.round(values[1]);
            updateTimeDisplay(startIdx, endIdx);
            updateAllChartsWithTimeRange(startIdx, endIdx);
        });
        
        updateAllChartsWithTimeRange(0, Math.min(totalPoints - 1, 99));
        
        debugLog('Slider initialized successfully');
        
    } catch (error) {
        console.error('Slider initialization error:', error);
        debugLog('Slider initialization failed');
    }
}

function setupButtons() {
    const resetButton = document.getElementById('reset-time-button');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            const slider = document.getElementById('time-range-slider');
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([0, totalPoints - 1]);
            }
        });
        debugLog('Reset button configured');
    }
}

function updateTimeDisplay(startIdx, endIdx) {
    const startDisplay = document.getElementById('start-time-display');
    const endDisplay = document.getElementById('end-time-display');
    
    if (startDisplay) {
        startDisplay.textContent = (startIdx < timeLabels.length ? 
            timeLabels[startIdx] : `Index ${startIdx}`).substring(0, 16);
    }
    
    if (endDisplay) {
        endDisplay.textContent = (endIdx < timeLabels.length ? 
            timeLabels[endIdx] : `Index ${endIdx}`).substring(0, 16);
    }
}

function updateChartRange(chartId) {
    const minInput = document.getElementById(`min-${chartId}`);
    const maxInput = document.getElementById(`max-${chartId}`);
    
    if (!minInput || !maxInput || !charts[chartId]) return;
    
    const minValue = parseFloat(minInput.value);
    const maxValue = parseFloat(maxInput.value);
    
    if (isNaN(minValue) || isNaN(maxValue)) return;
    
    const chart = charts[chartId];
    const chartInfo = chartsData[chartId];
    
    try {
        if (chartInfo.config.type === 'heatmap') {
            chart.setOption({
                visualMap: { min: minValue, max: maxValue }
            });
        } else {
            chart.setOption({
                yAxis: { min: minValue, max: maxValue }
            });
        }
        debugLog(`Updated range for ${chartId}: ${minValue} to ${maxValue}`);
    } catch (error) {
        console.error(`Error updating chart range for ${chartId}:`, error);
    }
}

function resetChartRange(chartId, dataMin, dataMax) {
    const minInput = document.getElementById(`min-${chartId}`);
    const maxInput = document.getElementById(`max-${chartId}`);
    
    if (minInput) minInput.value = dataMin.toFixed(2);
    if (maxInput) maxInput.value = dataMax.toFixed(2);
    
    updateChartRange(chartId);
}

// Global filename animation functions
function pauseAnimation(element) {
    element.classList.add('paused');
}

function resumeAnimation(element) {
    element.classList.remove('paused');
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    debugLog('An error occurred - check console');
});

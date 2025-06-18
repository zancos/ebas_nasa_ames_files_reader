// Analysis page functionality
let charts = {};
let timeLabels = [];
let chartsData = {};
let originalChartsData = {};
let totalPoints = 0;
let currentTimeRange = [0, -1];
let lastTimeRange = [0, -1]; // ADDED: Track last range to avoid unnecessary updates
let rangeSlider = null;
let isUpdating = false; // ADDED: Prevent concurrent updates

// Simple but effective grid for large, aligned charts
const ALIGNED_GRID = {
    left: 120,
    right: 50,
    top: 80,
    bottom: 80,
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

// Format time label for display
function formatTimeLabel(index) {
    if (index >= 0 && index < timeLabels.length) {
        return timeLabels[index];
    }
    return `Index ${index}`;
}

// Calculate time duration between two indices
function calculateDuration(startIdx, endIdx) {
    const pointCount = endIdx - startIdx + 1;
    if (pointCount === totalPoints) {
        return "Full dataset";
    }
    return `${pointCount} points`;
}

// PERFORMANCE: Check if range actually changed
function hasRangeChanged(newStartIdx, newEndIdx) {
    return lastTimeRange[0] !== newStartIdx || lastTimeRange[1] !== newEndIdx;
}

// Error display system
function displayError(message) {
    const errorBanner = document.createElement('div');
    errorBanner.className = 'alert alert-danger alert-dismissible fade show';
    errorBanner.style.position = 'fixed';
    errorBanner.style.top = '60px';
    errorBanner.style.left = '20px';
    errorBanner.style.right = '20px';
    errorBanner.style.zIndex = '2000';
    
    errorBanner.innerHTML = `
        <strong>Error:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(errorBanner);
    
    setTimeout(() => {
        errorBanner.classList.remove('show');
        setTimeout(() => errorBanner.remove(), 500);
    }, 10000);
}

// Diagnostics function
function runDiagnostics() {
    const results = {
        jquery: typeof $ !== 'undefined' ? 'Available ✓' : 'MISSING ✗',
        ionRangeSlider: (typeof $ !== 'undefined' && typeof $.fn.ionRangeSlider !== 'undefined') ? 'Available ✓' : 'MISSING ✗',
        echarts: typeof echarts !== 'undefined' ? 'Available ✓' : 'MISSING ✗',
        timeLabels: timeLabels.length + ' labels loaded',
        chartsData: Object.keys(chartsData).length + ' chart configurations',
        chartsInitialized: Object.keys(charts).length + ' charts created',
        currentTimeRange: `${currentTimeRange[0]} to ${currentTimeRange[1]}`,
        lastTimeRange: `${lastTimeRange[0]} to ${lastTimeRange[1]}`,
        rangeSlider: rangeSlider ? 'Initialized ✓' : 'Not initialized ✗',
        performanceOptimization: 'Range change detection ✓',
        browserInfo: navigator.userAgent.substring(0, 50) + '...'
    };
    
    const message = 'Diagnostics Results:\n\n' + 
                   Object.entries(results)
                         .map(([key, value]) => `${key}: ${value}`)
                         .join('\n') +
                   '\n\nCheck the browser console for more details.';
    
    alert(message);
    console.log('Full Diagnostics Results:', results);
}

document.addEventListener('DOMContentLoaded', function() {
    debugLog('Starting initialization...');
    
    initializeFilenameAnimation();
    
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
        lastTimeRange = [0, totalPoints - 1]; // Initialize last range
        
        debugLog(`Loaded ${Object.keys(chartsData).length} charts, ${totalPoints} time points`);
        
        if (typeof $ === 'undefined') {
            throw new Error('jQuery library not loaded. Required for timeline slider.');
        }
        
        if (typeof $.fn.ionRangeSlider === 'undefined') {
            throw new Error('Ion.RangeSlider library not loaded. Please ensure it\'s included.');
        }
        
        if (typeof echarts === 'undefined') {
            throw new Error('ECharts library not loaded. Required for data visualization.');
        }
        
        try {
            initializeCharts();
            debugLog('Charts initialized');
        } catch (chartError) {
            console.error('Error initializing charts:', chartError);
            debugLog('Chart initialization failed; continuing with other components');
            displayError('Chart initialization failed: ' + chartError.message);
        }
        
        try {
            initializeAdvancedSlider();
            debugLog('Slider initialized');
        } catch (sliderError) {
            console.error('Error initializing slider:', sliderError);
            debugLog('Slider initialization failed; fallback to static view');
            displayError('Timeline slider failed to load: ' + sliderError.message);
        }
        
        setupButtons();
        setupGlobalResize();
        
        debugLog('Initialization complete!');
        
    } catch (error) {
        console.error('Error initializing analysis:', error);
        debugLog(`Error: ${error.message}`);
        displayError('Initialization failed: ' + error.message);
    }
}

function initializeAdvancedSlider() {
    try {
        debugLog('Setting up timeline slider...');
        
        const sliderElement = document.getElementById('time-range-slider');
        if (!sliderElement) {
            throw new Error('Slider element not found in DOM');
        }
        
        if (typeof $ !== 'function') {
            throw new Error('jQuery not available');
        }
        
        // IMPROVED: Initialize with better tooltip positioning
        $("#time-range-slider").ionRangeSlider({
            type: "double",
            min: 0,
            max: totalPoints - 1,
            from: 0,
            to: Math.min(totalPoints - 1, 99),
            step: 1,
            drag_interval: true,
            grid: true,
            grid_num: 8, // Reduced from 10 for compactness
            hide_min_max: true, // Hide min/max to save space
            prettify: function(num) {
                const idx = parseInt(num);
                if (idx >= 0 && idx < timeLabels.length) {
                    const timeStr = timeLabels[idx];
                    // Shorter format for tooltips
                    return `${idx}: ${timeStr.substring(5, 16)}`; // Show only date part
                }
                return `${idx}`;
            },
            onStart: function(data) {
                // Always update display immediately
                updateTimeDisplay(data.from, data.to);
                // PERFORMANCE: Only update charts if range actually changed
                if (hasRangeChanged(data.from, data.to)) {
                    updateAllChartsWithTimeRange(data.from, data.to);
                }
            },
            onChange: function(data) {
                // Always update display for immediate feedback
                updateTimeDisplay(data.from, data.to);
                // But don't update charts during dragging for better performance
            },
            onFinish: function(data) {
                // Update display
                updateTimeDisplay(data.from, data.to);
                // PERFORMANCE: Only update charts if range actually changed
                if (hasRangeChanged(data.from, data.to)) {
                    updateAllChartsWithTimeRange(data.from, data.to);
                } else {
                    debugLog('Range unchanged, skipping chart update');
                }
            }
        });
        
        rangeSlider = $("#time-range-slider").data("ionRangeSlider");
        
        debugLog('Slider setup complete');
    } catch (error) {
        console.error('Failed to initialize timeline slider:', error);
        debugLog('Timeline slider initialization failed. Check console for details.');
        createFallbackSlider();
    }
}

function createFallbackSlider() {
    const container = document.getElementById('time-range-slider');
    if (!container) return;
    
    container.innerHTML = `
        <div class="alert alert-warning mb-2">
            <small>Interactive timeline not available. Using basic range controls:</small>
        </div>
        <div class="d-flex justify-content-between mb-2">
            <input type="number" id="fallback-start" value="0" min="0" max="${totalPoints-1}" 
                   class="form-control form-control-sm" style="width: 100px;" placeholder="Start">
            <span class="mx-2 align-self-center">to</span>
            <input type="number" id="fallback-end" value="${Math.min(totalPoints-1, 99)}" min="0" max="${totalPoints-1}" 
                   class="form-control form-control-sm" style="width: 100px;" placeholder="End">
            <button id="fallback-apply" class="btn btn-primary btn-sm ms-2">Apply</button>
        </div>
    `;
    
    document.getElementById('fallback-apply').addEventListener('click', function() {
        const start = parseInt(document.getElementById('fallback-start').value) || 0;
        const end = parseInt(document.getElementById('fallback-end').value) || totalPoints-1;
        updateTimeDisplay(start, end);
        
        // PERFORMANCE: Check if range changed before updating
        if (hasRangeChanged(start, end)) {
            updateAllChartsWithTimeRange(start, end);
        }
    });
    
    debugLog('Fallback slider created');
}

// PERFORMANCE OPTIMIZED: Update display function
function updateTimeDisplay(startIdx, endIdx) {
    const startDisplay = document.getElementById('start-time-display');
    const endDisplay = document.getElementById('end-time-display');
    const startIndexDisplay = document.getElementById('start-index-display');
    const endIndexDisplay = document.getElementById('end-index-display');
    const rangeSizeDisplay = document.getElementById('range-size-display');
    const rangeDurationDisplay = document.getElementById('range-duration-display');
    
    if (startDisplay) {
        const startTime = formatTimeLabel(startIdx);
        startDisplay.textContent = startTime.substring(0, 12); // Shorter display
    }
    
    if (endDisplay) {
        const endTime = formatTimeLabel(endIdx);
        endDisplay.textContent = endTime.substring(0, 12); // Shorter display
    }
    
    if (startIndexDisplay) {
        startIndexDisplay.textContent = `Index: ${startIdx}`;
    }
    
    if (endIndexDisplay) {
        endIndexDisplay.textContent = `Index: ${endIdx}`;
    }
    
    if (rangeSizeDisplay) {
        const pointCount = endIdx - startIdx + 1;
        rangeSizeDisplay.textContent = `${pointCount} points`;
    }
    
    if (rangeDurationDisplay) {
        rangeDurationDisplay.textContent = calculateDuration(startIdx, endIdx);
    }
}

// PERFORMANCE OPTIMIZED: Only update charts when range actually changes
function updateAllChartsWithTimeRange(startIdx, endIdx) {
    // Prevent concurrent updates
    if (isUpdating) {
        debugLog('Update already in progress, skipping');
        return;
    }
    
    // Check if range actually changed
    if (!hasRangeChanged(startIdx, endIdx)) {
        debugLog('Range unchanged, skipping update');
        return;
    }
    
    isUpdating = true;
    currentTimeRange = [startIdx, endIdx];
    lastTimeRange = [startIdx, endIdx]; // Update last range
    
    try {
        let updatedCharts = 0;
        
        for (const [chartId, chartInfo] of Object.entries(chartsData)) {
            const chart = charts[chartId];
            if (chart && chartInfo) {
                if (chartInfo.config.type === 'heatmap') {
                    createHeatmapChart(chart, chartId, chartInfo);
                    updatedCharts++;
                } else if (chartInfo.config.type === 'line') {
                    createLineChart(chart, chartId, chartInfo);
                    updatedCharts++;
                }
            }
        }
        
        debugLog(`Updated ${updatedCharts} charts for time range: ${startIdx} to ${endIdx}`);
        
    } catch (error) {
        console.error('Error updating charts:', error);
        debugLog('Chart update failed');
    } finally {
        isUpdating = false;
    }
}

function setupButtons() {
    // Reset button
    const resetButton = document.getElementById('reset-time-button');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (rangeSlider) {
                rangeSlider.update({
                    from: 0,
                    to: totalPoints - 1
                });
            } else {
                const startInput = document.getElementById('fallback-start');
                const endInput = document.getElementById('fallback-end');
                if (startInput) startInput.value = 0;
                if (endInput) endInput.value = totalPoints - 1;
                updateTimeDisplay(0, totalPoints - 1);
                
                if (hasRangeChanged(0, totalPoints - 1)) {
                    updateAllChartsWithTimeRange(0, totalPoints - 1);
                }
            }
        });
    }
    
    // Move left button
    const moveLeftButton = document.getElementById('move-left-button');
    if (moveLeftButton) {
        moveLeftButton.addEventListener('click', function() {
            if (rangeSlider) {
                const currentRange = rangeSlider.result.to - rangeSlider.result.from;
                const step = Math.max(1, Math.floor(currentRange * 0.1));
                const newFrom = Math.max(0, rangeSlider.result.from - step);
                const newTo = Math.max(currentRange, newFrom + currentRange);
                
                rangeSlider.update({
                    from: newFrom,
                    to: newTo
                });
            }
        });
    }
    
    // Move right button
    const moveRightButton = document.getElementById('move-right-button');
    if (moveRightButton) {
        moveRightButton.addEventListener('click', function() {
            if (rangeSlider) {
                const currentRange = rangeSlider.result.to - rangeSlider.result.from;
                const step = Math.max(1, Math.floor(currentRange * 0.1));
                const newTo = Math.min(totalPoints - 1, rangeSlider.result.to + step);
                const newFrom = Math.min(newTo - currentRange, newTo - currentRange);
                
                rangeSlider.update({
                    from: newFrom,
                    to: newTo
                });
            }
        });
    }
    
    // Zoom in button
    const zoomInButton = document.getElementById('zoom-in-button');
    if (zoomInButton) {
        zoomInButton.addEventListener('click', function() {
            if (rangeSlider) {
                const center = Math.floor((rangeSlider.result.from + rangeSlider.result.to) / 2);
                const currentRange = rangeSlider.result.to - rangeSlider.result.from;
                const newRange = Math.max(1, Math.floor(currentRange * 0.7));
                const newFrom = Math.max(0, center - Math.floor(newRange / 2));
                const newTo = Math.min(totalPoints - 1, newFrom + newRange);
                
                rangeSlider.update({
                    from: newFrom,
                    to: newTo
                });
            }
        });
    }
    
    debugLog('Timeline buttons configured');
}

// Rest of the functions remain the same as in the previous version...
// (initializeCharts, setupGlobalResize, debounce, filterDataByTimeRange, 
//  createHeatmapChart, createLineChart, updateChartRange, resetChartRange, etc.)

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
            
            element.innerHTML = '';
            
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

function setupGlobalResize() {
    const resizeHandler = debounce(() => {
        debugLog('Handling window resize...');
        
        for (const [chartId, chartInfo] of Object.entries(chartsData)) {
            const chart = charts[chartId];
            const element = document.getElementById(chartId);
            
            if (chart && element && chartInfo) {
                try {
                    element.style.width = '100%';
                    element.style.height = '500px';
                    element.style.minHeight = '500px';
                    element.style.display = 'block';
                    
                    chart.resize({
                        width: element.offsetWidth,
                        height: 500
                    });
                    
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

// Enhanced error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    debugLog('An error occurred - check console');
    displayError(`JavaScript error: ${e.error?.message || 'Unknown error'}`);
});

// Check if all dependencies loaded correctly when everything is ready
window.addEventListener('load', function() {
    setTimeout(() => {
        if (typeof $ === 'undefined') {
            displayError('jQuery failed to load. Timeline features will not work.');
        }
        if (typeof echarts === 'undefined') {
            displayError('ECharts failed to load. Charts will not display.');
        }
        if (typeof $ !== 'undefined' && typeof $.fn.ionRangeSlider === 'undefined') {
            displayError('Ion.RangeSlider failed to load. Advanced timeline features will not work.');
        }
    }, 1000);
});

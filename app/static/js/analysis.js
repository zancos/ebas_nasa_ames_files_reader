// Analysis page functionality
let charts = {};
let timeLabels = [];
let chartsData = {};
let originalChartsData = {};
let totalPoints = 0;
let currentTimeRange = [0, -1];

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
    
    // Wait a bit for everything to load
    setTimeout(function() {
        initializeAnalysisPage();
    }, 100);
});

function initializeAnalysisPage() {
    try {
        debugLog('Loading data...');
        
        // Load data from page
        const chartDataElement = document.getElementById('chart-data');
        const timeLabelsElement = document.getElementById('time-labels');
        
        if (!chartDataElement || !timeLabelsElement) {
            throw new Error('Required data elements not found');
        }
        
        chartsData = JSON.parse(chartDataElement.textContent);
        originalChartsData = JSON.parse(JSON.stringify(chartsData)); // Deep copy
        timeLabels = JSON.parse(timeLabelsElement.textContent);
        totalPoints = timeLabels.length;
        currentTimeRange = [0, totalPoints - 1];
        
        debugLog(`Loaded ${Object.keys(chartsData).length} charts, ${totalPoints} time points`);
        
        // Check if ECharts is loaded
        if (typeof echarts === 'undefined') {
            throw new Error('ECharts library not loaded');
        }
        
        // Initialize components
        initializeCharts();
        initializeSlider();
        setupButtons();
        
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
            
            const chart = echarts.init(element, null, {
                renderer: 'canvas',
                useDirtyRect: false
            });
            
            charts[chartId] = chart;
            
            if (chartInfo.config.type === 'heatmap') {
                createHeatmapChart(chart, chartId, chartInfo);
            } else if (chartInfo.config.type === 'line') {
                createLineChart(chart, chartId, chartInfo);
            }
            
            // Auto-resize on window resize
            const resizeHandler = () => {
                setTimeout(() => chart.resize(), 100);
            };
            window.addEventListener('resize', resizeHandler);
            
            chartsInitialized++;
            
        } catch (error) {
            console.error(`Error creating chart ${chartId}:`, error);
        }
    }
    
    debugLog(`Initialized ${chartsInitialized} charts`);
}

function filterDataByTimeRange(data, startIdx, endIdx, chartType) {
    if (chartType === 'heatmap') {
        // Filter heatmap data by time index (first dimension)
        return data.filter(point => {
            const timeIndex = point[0];
            return timeIndex >= startIdx && timeIndex <= endIdx;
        }).map(point => [point[0] - startIdx, point[1], point[2]]); // Adjust time index
    } else if (chartType === 'line') {
        // Filter line chart data
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
    
    // Filter data based on current time range
    const filteredData = filterDataByTimeRange(data, currentTimeRange[0], currentTimeRange[1], 'heatmap');
    const timeRangeSize = currentTimeRange[1] - currentTimeRange[0] + 1;
    
    const option = {
        title: {
            text: config.title,
            subtext: `${config.description} (${columns.length} columns, showing ${timeRangeSize} time points)`,
            left: 'center',
            textStyle: {
                fontSize: 16
            },
            subtextStyle: {
                fontSize: 12
            }
        },
        tooltip: {
            position: 'top',
            formatter: function(params) {
                const timeIdx = params.data[0] + currentTimeRange[0]; // Adjust for filtered range
                const colIdx = params.data[1];
                const value = params.data[2];
                const timeLabel = timeIdx < timeLabels.length ? timeLabels[timeIdx] : `Time ${timeIdx}`;
                const colName = colIdx < columns.length ? columns[colIdx] : `Col ${colIdx}`;
                return `Time: ${timeLabel}<br/>Variable: ${colName}<br/>Value: ${value.toFixed(3)}`;
            }
        },
        grid: {
            height: '60%',
            top: '15%',
            left: '10%',
            right: '10%'
        },
        xAxis: {
            type: 'category',
            data: Array.from({length: timeRangeSize}, (_, i) => currentTimeRange[0] + i),
            splitArea: {
                show: true
            },
            name: 'Time Index',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'category',
            data: columns,
            splitArea: {
                show: true
            },
            name: `Variables (${config.units})`,
            nameLocation: 'middle',
            nameGap: 80
        },
        visualMap: {
            min: vmin,
            max: vmax,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '2%',
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
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }],
        toolbox: {
            show: true,
            feature: {
                saveAsImage: { 
                    title: 'Save as Image',
                    name: `${config.title}_heatmap`
                }
            }
        }
    };
    
    chart.setOption(option);
}

function createLineChart(chart, chartId, chartInfo) {
    const config = chartInfo.config;
    const data = chartInfo.data;
    
    if (!data || !data.y_data) {
        console.error('Invalid line chart data:', data);
        return;
    }
    
    // Filter data based on current time range
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
            lineStyle: {
                width: 2
            },
            color: colors[colorIndex % colors.length]
        });
        colorIndex++;
    }
    
    const option = {
        title: {
            text: config.title,
            subtext: `${config.description} (${Object.keys(filteredData.y_data).length} series, ${filteredData.x_data.length} points)`,
            left: 'center',
            textStyle: {
                fontSize: 16
            },
            subtextStyle: {
                fontSize: 12
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            }
        },
        legend: {
            top: '12%',
            type: 'scroll',
            pageButtonItemGap: 5,
            pageButtonGap: 10,
            pageIconSize: 12
        },
        grid: {
            left: '8%',
            right: '8%',
            bottom: '15%',
            top: '25%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: filteredData.x_data || [],
            name: 'Time Index',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'value',
            name: `Value (${config.units})`,
            nameLocation: 'middle',
            nameGap: 50,
            min: config.default_min,
            max: config.default_max
        },
        series: series,
        toolbox: {
            show: true,
            feature: {
                saveAsImage: { 
                    title: 'Save as Image',
                    name: `${config.title}_line`
                },
                dataZoom: { 
                    title: { 
                        zoom: 'Zoom', 
                        back: 'Reset Zoom' 
                    } 
                }
            }
        },
        dataZoom: [
            {
                type: 'inside',
                start: 0,
                end: 100
            },
            {
                start: 0,
                end: 100,
                height: 30
            }
        ]
    };
    
    chart.setOption(option);
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
        // Destroy existing slider if it exists
        if (slider.noUiSlider) {
            slider.noUiSlider.destroy();
        }
        
        debugLog(`Creating slider for ${totalPoints} points`);
        
        noUiSlider.create(slider, {
            start: [0, Math.min(totalPoints - 1, 99)], // Limit initial range for performance
            connect: true,
            range: {
                'min': 0,
                'max': totalPoints - 1
            },
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
        
        // Initialize with default range
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
                visualMap: {
                    min: minValue,
                    max: maxValue
                }
            });
        } else {
            chart.setOption({
                yAxis: {
                    min: minValue,
                    max: maxValue
                }
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

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    debugLog('An error occurred - check console');
});

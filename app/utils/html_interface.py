import json

def generate_compact_chart_controls(chart_data):
    """Generate compact controls for the sidebar with Bootstrap styling"""
    
    controls_html = ""
    
    for chart_id, data in chart_data.items():
        if not data["config"].get("show_controls", False) or not data["columns"]:
            continue
        
        config = data["config"]
        stats = data["stats"]
        default_min = config.get("default_min") or stats["p5"]
        default_max = config.get("default_max") or stats["p95"]
        
        short_title = config["title"][:25] + ("..." if len(config["title"]) > 25 else "")
        type_indicator = "■" if config["type"] == "heatmap" else "―"
        
        controls_html += f"""
        <div class="card mb-2">
            <div class="card-body p-2">
                <h6 class="card-title mb-2" style="font-size: 0.85rem;">
                    <span class="text-primary">{type_indicator}</span> {short_title}
                </h6>
                
                <div class="mb-2">
                    <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Min:</label>
                    <input type="number" 
                           id="min_{chart_id}" 
                           value="{default_min:.2f}" 
                           step="0.01"
                           class="form-control form-control-sm"
                           style="font-size: 0.75rem;"
                           onchange="updateChartRange('{chart_id}')">
                </div>
                
                <div class="mb-2">
                    <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Max:</label>
                    <input type="number" 
                           id="max_{chart_id}" 
                           value="{default_max:.2f}" 
                           step="0.01"
                           class="form-control form-control-sm"
                           style="font-size: 0.75rem;"
                           onchange="updateChartRange('{chart_id}')">
                </div>
                
                <button onclick="resetChartRange('{chart_id}', {stats['min']}, {stats['max']})" 
                        class="btn btn-primary btn-sm w-100"
                        style="font-size: 0.75rem;">
                    <i class="fas fa-sync-alt"></i> Auto
                </button>
            </div>
        </div>
        """
    
    return controls_html

def generate_complete_html(charts_html, time_labels, chart_data, total_points):
    """Generate complete HTML with Bootstrap styling matching the main application"""
    
    chart_controls_html = generate_compact_chart_controls(chart_data)
    
    interface_html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Particle Analysis Results</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.1/nouislider.min.css">
        <style>
            body {{
                background-color: #f8f9fa;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }}
            
            .card {{
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                border: none;
                border-radius: 8px;
            }}
            
            .card-header {{
                background-color: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
                border-radius: 8px 8px 0 0 !important;
            }}
            
            .btn {{
                border-radius: 6px;
            }}
            
            .btn-primary {{
                background-color: #007bff;
                border-color: #007bff;
            }}
            
            .btn-primary:hover {{
                background-color: #0056b3;
                border-color: #0056b3;
            }}
            
            .form-control {{
                border-radius: 6px;
            }}
            
            .form-control:focus {{
                border-color: #007bff;
                box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
            }}
            
            .navbar-brand {{
                font-weight: bold;
            }}
            
            .time-control-panel {{
                position: fixed;
                top: 70px;
                left: 15px;
                right: 15px;
                background: white;
                border: 1px solid #dee2e6;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                z-index: 1001;
                height: auto;
                min-height: 80px;
            }}
            
            .scales-control-panel {{
                position: fixed;
                left: 15px;
                top: 170px;
                bottom: 15px;
                width: 220px;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                z-index: 1000;
                overflow-y: auto;
                padding: 15px;
            }}
            
            .charts-container {{
                margin-left: 255px;
                margin-top: 170px;
                padding: 15px;
            }}
            
            @media (max-width: 768px) {{
                .scales-control-panel {{
                    position: relative;
                    width: 100%;
                    left: 0;
                    top: 0;
                    bottom: auto;
                    margin-bottom: 15px;
                }}
                
                .charts-container {{
                    margin-left: 0;
                    margin-top: 15px;
                }}
                
                .time-control-panel {{
                    position: relative;
                    top: 0;
                    left: 0;
                    right: 0;
                    margin-bottom: 15px;
                }}
            }}
        </style>
    </head>
    <body>
        <!-- Navigation Bar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container-fluid">
                <a class="navbar-brand" href="#" onclick="window.history.back()">
                    <i class="fas fa-chart-line"></i> Particle Analysis Tool
                </a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="#" onclick="window.history.back()">
                        <i class="fas fa-arrow-left"></i> Back to Application
                    </a>
                </div>
            </div>
        </nav>

        <!-- Time Control Panel -->
        <div class="time-control-panel">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="fas fa-clock text-primary"></i> Time Range Control
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <div id="time_range_slider" style="margin: 10px 0;"></div>
                        </div>
                        <div class="col-md-4">
                            <div class="small">
                                <div><strong>Start:</strong> <span id="start_time_display">{time_labels[0][:16] if time_labels else 'N/A'}</span></div>
                                <div><strong>End:</strong> <span id="end_time_display">{time_labels[-1][:16] if time_labels else 'N/A'}</span></div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <button id="reset_time_button" class="btn btn-primary btn-sm w-100">
                                <i class="fas fa-sync-alt"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Scale Controls Panel -->
        <div class="scales-control-panel">
            <div class="card h-100">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-sliders-h text-success"></i> Chart Controls
                    </h6>
                </div>
                <div class="card-body" style="overflow-y: auto;">
                    {chart_controls_html}
                    
                    <div class="mt-3">
                        <div class="card bg-light">
                            <div class="card-body p-2 text-center">
                                <small class="text-muted">
                                    <i class="fas fa-info-circle"></i>
                                    <span id="debug_info">Initializing...</span>
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Container -->
        <div class="charts-container">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="fas fa-chart-area text-info"></i> Analysis Results
                    </h5>
                </div>
                <div class="card-body">
                    {charts_html}
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.1/nouislider.min.js"></script>
        
        <script>
            // Global data
            var timeLabels = {json.dumps(time_labels[:1000])};
            var totalPoints = {total_points};
            var chartIds = {json.dumps(list(chart_data.keys()))};
            var chartConfig = {json.dumps({k: v["config"] for k, v in chart_data.items()})};
            var charts = {{}};
            var isUpdating = false;
            
            // Initialize interface
            function initialise() {{
                var attempts = 0;
                var maxAttempts = 15;
                
                function tryInit() {{
                    attempts++;
                    document.getElementById('debug_info').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Attempt ' + attempts;
                    
                    if (typeof echarts === 'undefined') {{
                        if (attempts < maxAttempts) {{
                            setTimeout(tryInit, 1000);
                        }} else {{
                            document.getElementById('debug_info').innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Charts not loaded';
                        }}
                        return;
                    }}
                    
                    initialiseSlider();
                    setupButtons();
                    document.getElementById('debug_info').innerHTML = '<i class="fas fa-check text-success"></i> Ready';
                }}
                
                tryInit();
            }}
            
            function initialiseSlider() {{
                var slider = document.getElementById('time_range_slider');
                if (!slider || slider.noUiSlider) return;
                
                try {{
                    noUiSlider.create(slider, {{
                        start: [0, totalPoints - 1],
                        connect: true,
                        range: {{
                            'min': 0,
                            'max': totalPoints - 1
                        }},
                        step: 1,
                        tooltips: [false, false]
                    }});
                    
                    slider.noUiSlider.on('update', function(values, handle) {{
                        var startIdx = Math.round(values[0]);
                        var endIdx = Math.round(values[1]);
                        updateAllCharts(startIdx, endIdx);
                    }});
                }} catch (e) {{
                    console.error('Slider error:', e);
                    document.getElementById('debug_info').innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Slider error';
                }}
            }}
            
            function setupButtons() {{
                var resetTimeButton = document.getElementById('reset_time_button');
                if (resetTimeButton) {{
                    resetTimeButton.addEventListener('click', function() {{
                        var slider = document.getElementById('time_range_slider');
                        if (slider && slider.noUiSlider) {{
                            slider.noUiSlider.set([0, totalPoints - 1]);
                        }}
                    }});
                }}
            }}
            
            function updateAllCharts(startIdx, endIdx) {{
                // Update time displays
                document.getElementById('start_time_display').textContent = 
                    (startIdx < timeLabels.length ? timeLabels[startIdx] : 'Index ' + startIdx).substring(0, 16);
                document.getElementById('end_time_display').textContent = 
                    (endIdx < timeLabels.length ? timeLabels[endIdx] : 'Index ' + endIdx).substring(0, 16);
            }}
            
            function updateChartRange(chartId) {{
                // Chart range update logic
                var minValue = parseFloat(document.getElementById('min_' + chartId).value);
                var maxValue = parseFloat(document.getElementById('max_' + chartId).value);
                
                // Update chart if echarts is available
                if (typeof echarts !== 'undefined') {{
                    var element = document.getElementById(chartId);
                    if (element) {{
                        var chart = echarts.getInstanceByDom(element);
                        if (chart) {{
                            try {{
                                if (chartConfig[chartId] && chartConfig[chartId].type === 'heatmap') {{
                                    chart.setOption({{
                                        visualMap: {{
                                            min: minValue,
                                            max: maxValue
                                        }}
                                    }});
                                }} else {{
                                    chart.setOption({{
                                        yAxis: {{
                                            min: minValue,
                                            max: maxValue
                                        }}
                                    }});
                                }}
                            }} catch (e) {{
                                console.error('Chart update error:', e);
                            }}
                        }}
                    }}
                }}
            }}
            
            function resetChartRange(chartId, dataMin, dataMax) {{
                document.getElementById('min_' + chartId).value = dataMin.toFixed(2);
                document.getElementById('max_' + chartId).value = dataMax.toFixed(2);
                updateChartRange(chartId);
            }}
            
            // Initialize when page loads
            if (document.readyState === 'loading') {{
                document.addEventListener('DOMContentLoaded', initialise);
            }} else {{
                initialise();
            }}
            
            // Auto-resize charts on window resize
            window.addEventListener('resize', function() {{
                if (typeof echarts !== 'undefined') {{
                    setTimeout(function() {{
                        for (var chartId of chartIds) {{
                            var element = document.getElementById(chartId);
                            if (element) {{
                                var chart = echarts.getInstanceByDom(element);
                                if (chart) {{
                                    chart.resize();
                                }}
                            }}
                        }}
                    }}, 250);
                }}
            }});
        </script>
    </body>
    </html>
    """
    
    return interface_html

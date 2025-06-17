import pandas as pd
import numpy as np
from pyecharts import options as opts
from pyecharts.charts import HeatMap, Line
from pyecharts.globals import ThemeType
from app.utils.config import CHART_CONFIG
from app.utils.ebas_parser import find_columns_for_chart, calculate_data_statistics

def generate_charts_data(df, unique_id):
    """Generate chart configuration data for frontend rendering"""
    
    # Convert UUID hyphens to underscores to avoid JavaScript syntax errors
    safe_unique_id = unique_id.replace('-', '_')
    
    charts_data = {}
    
    for chart_id, config in CHART_CONFIG.items():
        columns = find_columns_for_chart(df, config)
        stats = calculate_data_statistics(df, columns)
        
        if not columns:
            continue
            
        # Use safe ID for JavaScript compatibility
        safe_chart_id = f"{chart_id}_{safe_unique_id}"
        
        # Prepare chart data
        chart_data = []
        if config["type"] == "heatmap":
            for i, time_idx in enumerate(df.index):
                for j, col_name in enumerate(columns):
                    value = df.loc[time_idx, col_name] if col_name in df.columns else 0
                    chart_data.append([i, j, float(value) if not pd.isna(value) else 0])
        else:  # line chart
            x_data = list(range(len(df)))
            y_data = {}
            for col in columns:
                if col in df.columns:
                    y_data[col] = df[col].fillna(0).tolist()
            chart_data = {'x_data': x_data, 'y_data': y_data}
        
        charts_data[safe_chart_id] = {
            'config': config,
            'columns': columns,
            'stats': stats,
            'data': chart_data,
            'original_id': chart_id
        }
    
    return charts_data

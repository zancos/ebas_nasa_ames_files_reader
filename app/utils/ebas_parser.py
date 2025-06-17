import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import re

def parse_ebas_file(file_path):
    """Parse the EBAS file and extract the data"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        # Find where the data starts
        data_start = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('starttime') and 'endtime' in line:
                data_start = i + 1
                header_line = line.strip()
                break

        if data_start == 0:
            raise ValueError("Could not find data header in file")

        columns = header_line.split()

        # Read data
        data_lines = []
        for line in lines[data_start:]:
            if line.strip() and not line.startswith('#'):
                data_lines.append(line.strip().split())

        if not data_lines:
            raise ValueError("No data found in file")

        df = pd.DataFrame(data_lines, columns=columns)

        # Convert numerical types
        numeric_columns = [col for col in df.columns if col not in ['starttime', 'endtime']]
        converted_data = {}
        converted_data['starttime'] = df['starttime']
        converted_data['endtime'] = df['endtime']

        for col in numeric_columns:
            converted_data[col] = pd.to_numeric(df[col], errors='coerce')

        # Convert time
        df_times = pd.to_numeric(df['starttime'], errors='coerce') * 24
        base_date = datetime(2024, 1, 1)
        converted_data['datetime'] = df_times.apply(lambda x: base_date + timedelta(hours=x) if not pd.isna(x) else pd.NaT)

        df_final = pd.DataFrame(converted_data)
        return df_final

    except Exception as e:
        print(f"Error parsing EBAS file: {e}")
        return None

def create_time_labels(df):
    """Create readable time labels"""
    time_labels = []
    for i, row in df.iterrows():
        if pd.notna(row['datetime']):
            time_labels.append(row['datetime'].strftime('%Y-%m-%d %H:%M'))
        else:
            time_labels.append(f"Sample {i}")
    return time_labels

def find_columns_for_chart(df, chart_config):
    """Find columns that match the chart configuration"""
    pattern = chart_config["columns_pattern"]
    exclude_pattern = chart_config.get("exclude_pattern")

    matching_columns = []

    for col in df.columns:
        if re.search(pattern, col, re.IGNORECASE):
            if exclude_pattern is None or not re.search(exclude_pattern, col, re.IGNORECASE):
                matching_columns.append(col)

    return sorted(matching_columns)

def calculate_data_statistics(df, columns):
    """Calculate data statistics for min/max controls"""
    if not columns:
        return {"min": 0, "max": 100, "mean": 50, "std": 25}

    all_values = []
    for col in columns:
        if col in df.columns:
            values = df[col].dropna()
            all_values.extend(values.tolist())

    if not all_values:
        return {"min": 0, "max": 100, "mean": 50, "std": 25}

    all_values = np.array(all_values)

    return {
        "min": float(np.min(all_values)),
        "max": float(np.max(all_values)),
        "mean": float(np.mean(all_values)),
        "std": float(np.std(all_values)),
        "p5": float(np.percentile(all_values, 5)),
        "p95": float(np.percentile(all_values, 95))
    }

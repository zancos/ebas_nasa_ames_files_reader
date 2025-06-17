"""
Chart configuration for particle analysis
"""

CHART_CONFIG = {
    "chart_bins": {
        "title": "Particle Distribution - Bins",
        "type": "heatmap",
        "columns_pattern": r"^bin_\d+$",
        "exclude_pattern": r"flag_",
        "description": "Particle concentration by bin size",
        "units": "particles/cm³",
        "colour_scale": "grafana_style",
        "show_controls": True,
        "default_min": 0,
        "default_max": 5
    },
    "chart_flag_bins": {
        "title": "Quality Flags - Bins",
        "type": "heatmap",
        "columns_pattern": r"^flag_bin_\d+$",
        "exclude_pattern": None,
        "description": "Quality codes for bin measurements",
        "units": "flag code",
        "colour_scale": "standard",
        "show_controls": True,
        "default_min": 0,
        "default_max": 1
    },
    "chart_bnloer": {
        "title": "Lower Percentiles (15.87%)",
        "type": "heatmap",
        "columns_pattern": r"^bnloer\d+$",
        "exclude_pattern": r"flag_",
        "description": "15.87th percentile of distribution by bin",
        "units": "particles/cm³",
        "colour_scale": "grafana_style",
        "show_controls": True,
        "default_min": 0,
        "default_max": 5
    },
    "chart_flag_bnloer": {
        "title": "Flags - Lower Percentiles",
        "type": "heatmap",
        "columns_pattern": r"^flag_bnloer\d+$",
        "exclude_pattern": None,
        "description": "Quality codes for lower percentiles",
        "units": "flag code",
        "colour_scale": "standard",
        "show_controls": True,
        "default_min": 0,
        "default_max": 1
    },
    "chart_bnhier": {
        "title": "Upper Percentiles (84.13%)",
        "type": "heatmap",
        "columns_pattern": r"^bnhier\d+$",
        "exclude_pattern": r"flag_",
        "description": "84.13th percentile of distribution by bin",
        "units": "particles/cm³",
        "colour_scale": "grafana_style",
        "show_controls": True,
        "default_min": 0,
        "default_max": 5
    },
    "chart_flag_bnhier": {
        "title": "Flags - Upper Percentiles",
        "type": "heatmap",
        "columns_pattern": r"^flag_bnhier\d+$",
        "exclude_pattern": None,
        "description": "Quality codes for upper percentiles",
        "units": "flag code",
        "colour_scale": "standard",
        "show_controls": True,
        "default_min": 0,
        "default_max": 1
    },
    "chart_rh": {
        "title": "Relative Humidity",
        "type": "line",
        "columns_pattern": r".*RH.*",
        "exclude_pattern": r"flag_",
        "description": "Relative humidity of inlet air",
        "units": "%",
        "show_controls": True,
        "default_min": 0,
        "default_max": 60
    },
    "chart_met": {
        "title": "Meteorological Variables",
        "type": "line",
        "columns_pattern": r"^(P_sys|T_sys|temperature|pressure)$",
        "exclude_pattern": r"flag_",
        "description": "System pressure and temperature",
        "units": "Pa, K",
        "show_controls": True,
        "default_min": None,
        "default_max": None
    },
    "chart_flags_met": {
        "title": "Flags - Meteorological Variables",
        "type": "heatmap",
        "columns_pattern": r"^flag_(P_sys|T_sys|RH|temperature|pressure)",
        "exclude_pattern": None,
        "description": "Quality codes for meteorological variables",
        "units": "flag code",
        "colour_scale": "standard",
        "show_controls": True,
        "default_min": 0,
        "default_max": 1
    }
}

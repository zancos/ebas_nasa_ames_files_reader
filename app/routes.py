from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify, send_file, current_app
import os
import pandas as pd
from werkzeug.utils import secure_filename
from app.utils.ebas_parser import parse_ebas_file, create_time_labels
from app.utils.chart_generator import generate_charts_data
from app.utils.config import CHART_CONFIG
from app.models import AnalysisMetadata, AnalysisStorage
from datetime import datetime
import uuid
import json

main = Blueprint('main', __name__)

ALLOWED_EXTENSIONS = {'nas', 'txt', 'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_analysis_storage():
    return AnalysisStorage(current_app.config['UPLOAD_FOLDER'])

def determine_time_period(df):
    """Determine the time period covered by the data"""
    try:
        if 'datetime' in df.columns and not df['datetime'].isna().all():
            start_time = df['datetime'].min()
            end_time = df['datetime'].max()
            if pd.notna(start_time) and pd.notna(end_time):
                return f"{start_time.strftime('%Y-%m-%d %H:%M')} to {end_time.strftime('%Y-%m-%d %H:%M')}"
        
        # Fallback to row count
        return f"{len(df)} time points"
    except Exception:
        return f"{len(df)} data points"

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/history')
def analysis_history():
    try:
        storage = get_analysis_storage()
        analyses = storage.get_all_analyses()
        return render_template('history.html', analyses=analyses)
    except Exception as e:
        flash(f'Error loading analysis history: {str(e)}')
        current_app.logger.error(f'History loading error: {str(e)}')
        return render_template('history.html', analyses=[])

@main.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file selected')
        return redirect(request.url)
    
    file = request.files['file']
    if file.filename == '':
        flash('No file selected')
        return redirect(request.url)
    
    if file and allowed_file(file.filename):
        try:
            # Generate unique filename
            unique_id = str(uuid.uuid4())
            filename = secure_filename(file.filename)
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"{unique_id}_{filename}")
            file.save(file_path)
            
            # Process the file
            df = parse_ebas_file(file_path)
            
            if df is None or df.empty:
                flash('Error: Could not parse the file or file is empty')
                return redirect(url_for('main.index'))
            
            # Generate charts data
            time_labels = create_time_labels(df)
            charts_data = generate_charts_data(df, unique_id)
            
            # Save processed data as JSON for the analysis view
            analysis_data = {
                'df_data': df.to_json(orient='records'),
                'time_labels': time_labels,
                'charts_data': charts_data,
                'metadata': {
                    'rows': len(df),
                    'columns': len(df.columns),
                    'time_period': determine_time_period(df),
                    'original_filename': filename
                }
            }
            
            data_filename = f"data_{unique_id}.json"
            data_path = os.path.join(current_app.config['UPLOAD_FOLDER'], data_filename)
            
            with open(data_path, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, ensure_ascii=False, indent=2)
            
            # Save analysis metadata
            time_period = determine_time_period(df)
            metadata = AnalysisMetadata(
                analysis_id=unique_id,
                original_filename=filename,
                creation_date=datetime.now().isoformat(),
                data_points=len(df),
                variables=len(df.columns),
                time_period=time_period,
                status="completed"
            )
            
            storage = get_analysis_storage()
            storage.save_analysis(metadata)
            
            # Clean up uploaded file
            os.remove(file_path)
            
            return render_template('results.html', 
                                 unique_id=unique_id,
                                 rows=len(df),
                                 columns=len(df.columns),
                                 time_period=time_period,
                                 original_filename=filename)
            
        except Exception as e:
            flash(f'Error processing file: {str(e)}')
            current_app.logger.error(f'File processing error: {str(e)}')
            return redirect(url_for('main.index'))
    
    flash('Invalid file type. Please upload .nas, .txt, or .csv files')
    return redirect(url_for('main.index'))

@main.route('/analysis/<analysis_id>')
def view_analysis(analysis_id):
    try:
        storage = get_analysis_storage()
        metadata = storage.get_analysis(analysis_id)
        
        if not metadata:
            flash('Analysis not found')
            return redirect(url_for('main.analysis_history'))
        
        # Load analysis data
        data_filename = f"data_{analysis_id}.json"
        data_path = os.path.join(current_app.config['UPLOAD_FOLDER'], data_filename)
        
        if not os.path.exists(data_path):
            flash('Analysis data not found')
            return redirect(url_for('main.analysis_history'))
        
        with open(data_path, 'r', encoding='utf-8') as f:
            analysis_data = json.load(f)
        
        return render_template('analysis.html',
                             analysis_id=analysis_id,
                             metadata=metadata,
                             analysis_data=analysis_data)
        
    except Exception as e:
        flash(f'Error viewing analysis: {str(e)}')
        current_app.logger.error(f'View analysis error: {str(e)}')
        return redirect(url_for('main.analysis_history'))

@main.route('/download/<analysis_id>')
def download_analysis(analysis_id):
    try:
        storage = get_analysis_storage()
        metadata = storage.get_analysis(analysis_id)
        
        if not metadata:
            flash('Analysis not found')
            return redirect(url_for('main.analysis_history'))
        
        # Generate standalone HTML file for download
        data_filename = f"data_{analysis_id}.json"
        data_path = os.path.join(current_app.config['UPLOAD_FOLDER'], data_filename)
        
        with open(data_path, 'r', encoding='utf-8') as f:
            analysis_data = json.load(f)
        
        # Render the analysis template for download
        html_content = render_template('analysis_standalone.html',
                                     analysis_id=analysis_id,
                                     metadata=metadata,
                                     analysis_data=analysis_data)
        
        # Save as downloadable file
        download_filename = f"analysis_{analysis_id}.html"
        download_path = os.path.join(current_app.config['UPLOAD_FOLDER'], download_filename)
        
        with open(download_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return send_file(download_path, as_attachment=True, 
                        download_name=f"{metadata.original_filename}_analysis.html")
        
    except Exception as e:
        flash(f'Error downloading analysis: {str(e)}')
        current_app.logger.error(f'Download error: {str(e)}')
        return redirect(url_for('main.analysis_history'))

@main.route('/delete/<analysis_id>', methods=['POST'])
def delete_analysis(analysis_id):
    try:
        storage = get_analysis_storage()
        success = storage.delete_analysis(analysis_id)
        
        # Also delete data file
        data_filename = f"data_{analysis_id}.json"
        data_path = os.path.join(current_app.config['UPLOAD_FOLDER'], data_filename)
        if os.path.exists(data_path):
            os.remove(data_path)
        
        if success:
            flash('Analysis deleted successfully', 'success')
        else:
            flash('Error deleting analysis', 'error')
            
    except Exception as e:
        flash(f'Error deleting analysis: {str(e)}', 'error')
        current_app.logger.error(f'Delete analysis error: {str(e)}')
    
    return redirect(url_for('main.analysis_history'))

@main.route('/cleanup', methods=['POST'])
def cleanup_old_analyses():
    try:
        days = int(request.form.get('days', 7))
        storage = get_analysis_storage()
        deleted_count = storage.cleanup_old_analyses(days)
        
        flash(f'Cleaned up {deleted_count} old analyses', 'success')
    except Exception as e:
        flash(f'Error during cleanup: {str(e)}', 'error')
        current_app.logger.error(f'Cleanup error: {str(e)}')
    
    return redirect(url_for('main.analysis_history'))

@main.route('/api/status')
def api_status():
    try:
        storage = get_analysis_storage()
        analyses = storage.get_all_analyses()
        return jsonify({
            'status': 'healthy',
            'charts_available': len(CHART_CONFIG),
            'supported_formats': list(ALLOWED_EXTENSIONS),
            'upload_folder': current_app.config['UPLOAD_FOLDER'],
            'total_analyses': len(analyses)
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

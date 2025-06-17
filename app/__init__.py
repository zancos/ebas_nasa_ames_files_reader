from flask import Flask
import os
import logging
from logging.handlers import RotatingFileHandler

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    # Ensure upload folder exists
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except PermissionError as e:
        app.logger.error(f'Could not create upload folder: {str(e)}')
        # Create a temporary folder as fallback
        import tempfile
        app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
        app.logger.warning(f'Using temporary upload folder: {app.config["UPLOAD_FOLDER"]}')
    
    # Set up logging
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/particle_analysis.log',
                                         maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Particle Analysis startup')
    
    # Register error handlers
    @app.errorhandler(413)
    def too_large(e):
        return "File is too large. Maximum file size is 16MB.", 413
    
    @app.errorhandler(404)
    def not_found(e):
        return "Page not found.", 404
    
    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f'Server Error: {str(e)}')
        return "Internal server error.", 500
    
    # Register routes
    from app.routes import main
    app.register_blueprint(main)
    
    # Log configuration
    app.logger.info(f'Upload folder: {app.config["UPLOAD_FOLDER"]}')
    app.logger.info(f'Max file size: {app.config["MAX_CONTENT_LENGTH"]} bytes')
    
    return app

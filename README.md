# Particle Analysis Web Application

A Flask-based web application for analyzing particle data from EBAS files, featuring interactive visualizations and comprehensive data analysis tools.

## Features

- **File Upload**: Support for .nas, .txt, and .csv files
- **Interactive Visualizations**: Heatmaps and line charts with Grafana-style coloring
- **Dynamic Controls**: Time range sliders and scale adjustments
- **Export Options**: Download analysis results as HTML files
- **Docker Support**: Containerized deployment with Docker Compose

## Quick Start

1. **Clone the repository**

```bash
git clone <repository-url>
cd particle-analysis-webapp
```

2. **Run with Docker Compose**

```bash
docker-compose up --build
```

3. **Access the application**
Open http://localhost:5000 in your browser

## Manual Installation

1. **Install dependencies**

```bash
pip install -r requirements.txt
```

2. **Run the application**

```bash
python run.py
```

## Usage

1. Upload your EBAS data file through the web interface
2. Wait for processing to complete
3. View interactive analysis with charts and controls
4. Download results as HTML files for sharing

## API Endpoints

- `GET /`: Main upload interface
- `POST /upload`: File upload and processing
- `GET /view/<filename>`: View analysis results
- `GET /download/<filename>`: Download analysis files
- `GET /api/status`: Health check endpoint

## Configuration

Environment variables:
- `FLASK_ENV`: Set to 'production' for production deployment
- `SECRET_KEY`: Flask secret key for security
- `PORT`: Application port (default: 5000)

## License

MIT License

## Deployment Instructions

### Development Deployment

1. Set up the directory structure as shown above
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the application:

```bash
python run.py
```

### Production Deployment with Docker

1. Build and run with Docker Compose:

```bash
docker-compose up --build -d
```

2. Access the application at http://localhost:5000
3. Monitor logs:

```bash
docker-compose logs -f
```

This comprehensive Flask application maintains all the functionality of your original script while providing a modern web interface, proper error handling, file upload capabilities, and containerized deployment options. The modular structure makes it easy to maintain and extend with additional features.

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import csv
import subprocess
import shutil
from werkzeug.utils import secure_filename
from pathlib import Path

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed_data'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Crowd Analysis API is running'})

@app.route('/api/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'filepath': filepath
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/analyze', methods=['POST'])
def analyze_video():
    """
    Analyzes a previously uploaded video file.
    Expects JSON: {"filename": "video.mp4"}
    """
    # Get filename from JSON request
    data = request.get_json()
    
    if not data or 'filename' not in data:
        return jsonify({'error': 'No filename provided in request'}), 400
    
    filename = data.get('filename')
    
    if not filename:
        return jsonify({'error': 'Filename is empty'}), 400
    
    # Check if uploaded file exists
    video_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(video_path):
        return jsonify({'error': f'Video file not found: {filename}'}), 404
    
    # Update config.py to use the uploaded video
    config_path = 'config.py'
    
    try:
        with open(config_path, 'r') as f:
            original_config = f.read()
        
        # Backup original config
        with open('config_backup.py', 'w') as f:
            f.write(original_config)
        
        # Normalize path for cross-platform compatibility
        video_path_normalized = video_path.replace('\\', '/')
        
        # Update config with new video path
        updated_config = original_config.replace(
            '"VIDEO_CAP" : "video.mp4"',
            f'"VIDEO_CAP" : "{video_path_normalized}"'
        )
        
        with open(config_path, 'w') as f:
            f.write(updated_config)
        
        # Run the analysis
        result = subprocess.run(
            ['python', 'main.py'],
            capture_output=True,
            text=True,
            timeout=300
        )
        
        # Restore original config
        with open('config_backup.py', 'r') as f:
            original = f.read()
        with open(config_path, 'w') as f:
            f.write(original)
        
        if result.returncode != 0:
            return jsonify({
                'error': 'Analysis failed',
                'details': result.stderr
            }), 500
        
        # Generate visualization plots (run these after main analysis completes)
        print("Generating visualization plots...")
        try:
            # Generate crowd analysis plot
            result_viz = subprocess.run(['python', 'crowd_data_present.py'], 
                         capture_output=True, text=True, timeout=30)
            if result_viz.returncode != 0:
                print(f"Crowd analysis plot error: {result_viz.stderr}")
        except Exception as e:
            print(f"Warning: Could not generate crowd analysis plot: {e}")
        
        try:
            # Generate movement heatmap and tracks
            result_viz = subprocess.run(['python', 'movement_data_present.py'], 
                         capture_output=True, text=True, timeout=30)
            if result_viz.returncode != 0:
                print(f"Movement visualization error: {result_viz.stderr}")
        except Exception as e:
            print(f"Warning: Could not generate movement visualizations: {e}")
        
        try:
            # Generate energy distribution plot
            result_viz = subprocess.run(['python', 'abnormal_data_process.py'], 
                         capture_output=True, text=True, timeout=30)
            if result_viz.returncode != 0:
                print(f"Energy distribution error: {result_viz.stderr}")
        except Exception as e:
            print(f"Warning: Could not generate energy distribution plot: {e}")
        
        print("Visualization generation complete.")

        # Read and return analysis results
        print("Calling get_analysis_results()...")
        analysis_data = get_analysis_results()
        
        print("Creating response JSON...")
        response_data = {
            'success': True,
            'filename': filename,
            'data': analysis_data
        }
        print(f"Response data created successfully")
        
        print("Returning JSON response...")
        # Use json.dumps with sort_keys=False to avoid NoneType comparison errors
        from flask import make_response
        import json
        response = make_response(json.dumps(response_data, sort_keys=False))
        response.headers['Content-Type'] = 'application/json'
        return response
    
    except subprocess.TimeoutExpired:
        # Restore config on timeout
        try:
            with open('config_backup.py', 'r') as f:
                original = f.read()
            with open(config_path, 'w') as f:
                f.write(original)
        except:
            pass
        return jsonify({'error': 'Analysis timeout (exceeded 5 minutes)'}), 500
    
    except Exception as e:
        # Restore config on error
        print(f"EXCEPTION CAUGHT: {type(e).__name__}: {str(e)}")
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        
        try:
            with open('config_backup.py', 'r') as f:
                original = f.read()
            with open(config_path, 'w') as f:
                f.write(original)
        except:
            pass
        return jsonify({'error': f'Analysis error: {str(e)}'}), 500


def get_analysis_results():
    print("Starting get_analysis_results()...")
    results = {
        'video_data': {},
        'crowd_data': [],
        'movement_data': [],
        'summary': {}
    }
    
    # Read video data
    print("Reading video data...")
    video_data_path = os.path.join(PROCESSED_FOLDER, 'video_data.json')
    if os.path.exists(video_data_path):
        try:
            with open(video_data_path, 'r') as f:
                results['video_data'] = json.load(f)
            print(f"Video data loaded successfully: {results['video_data']}")
        except Exception as e:
            print(f"Error reading video data: {e}")
    
    # Read crowd data
    print("Reading crowd data...")
    crowd_data_path = os.path.join(PROCESSED_FOLDER, 'crowd_data.csv')
    if os.path.exists(crowd_data_path):
        try:
            with open(crowd_data_path, 'r') as f:
                reader = csv.DictReader(f)
                # Clean None values from rows to prevent JSON serialization errors
                results['crowd_data'] = [
                    {k: (v if v is not None else '') for k, v in row.items()} 
                    for row in reader
                ]
            print(f"Crowd data loaded: {len(results['crowd_data'])} rows")
        except Exception as e:
            print(f"Error reading crowd data: {e}")
            results['crowd_data'] = []
    
    # Read movement data
    print("Reading movement data...")
    movement_data_path = os.path.join(PROCESSED_FOLDER, 'movement_data.csv')
    if os.path.exists(movement_data_path):
        try:
            with open(movement_data_path, 'r') as f:
                reader = csv.DictReader(f)
                # Clean None values from rows to prevent JSON serialization errors
                results['movement_data'] = [
                    {k: (v if v is not None else '') for k, v in row.items()} 
                    for row in reader
                ]
            print(f"Movement data loaded: {len(results['movement_data'])} rows")
        except Exception as e:
            print(f"Error reading movement data: {e}")
            results['movement_data'] = []
    
    # Calculate summary statistics
    print("Calculating summary statistics...")
    if results['crowd_data']:
        try:
            crowd_counts = []
            violations = []
            abnormal = []
            restricted = []
            
            for row in results['crowd_data']:
                try:
                    # Safely convert values, skip if invalid
                    if 'Human Count' in row and row['Human Count']:
                        crowd_counts.append(int(row['Human Count']))
                    if 'Social Distance violate' in row and row['Social Distance violate']:
                        violations.append(int(row['Social Distance violate']))
                    if 'Abnormal Activity' in row and row['Abnormal Activity']:
                        abnormal.append(int(row['Abnormal Activity']))
                    if 'Restricted Entry' in row and row['Restricted Entry']:
                        restricted.append(int(row['Restricted Entry']))
                except (ValueError, KeyError) as e:
                    # Skip malformed rows
                    continue
            
            print(f"Parsed {len(crowd_counts)} valid crowd count entries")
            
            results['summary'] = {
                'max_crowd_count': max(crowd_counts) if crowd_counts else 0,
                'avg_crowd_count': sum(crowd_counts) / len(crowd_counts) if crowd_counts else 0,
                'total_violations': sum(violations) if violations else 0,
                'abnormal_activity_detected': sum(abnormal) > 0 if abnormal else False,
                'restricted_entry_detected': sum(restricted) > 0 if restricted else False,
                'total_frames_analyzed': len(crowd_counts)
            }
            print(f"Summary calculated successfully: {results['summary']}")
        except Exception as e:
            print(f"Error calculating summary statistics: {e}")
            import traceback
            traceback.print_exc()
            results['summary'] = {
                'max_crowd_count': 0,
                'avg_crowd_count': 0,
                'total_violations': 0,
                'abnormal_activity_detected': False,
                'restricted_entry_detected': False,
                'total_frames_analyzed': 0
            }
    
    print("get_analysis_results() completed successfully")
    return results

@app.route('/api/results', methods=['GET'])
def get_results():
    results = get_analysis_results()
    return jsonify(results)

@app.route('/api/visualizations/heatmap', methods=['GET'])
def get_heatmap():
    """Get the heatmap visualization image"""
    heatmap_path = os.path.join(PROCESSED_FOLDER, 'heatmap.png')
    if os.path.exists(heatmap_path):
        return send_file(heatmap_path, mimetype='image/png')
    return jsonify({'error': 'Heatmap not available'}), 404

@app.route('/api/visualizations/movement-tracks', methods=['GET'])
def get_movement_tracks():
    """Get the movement tracks visualization image"""
    tracks_path = os.path.join(PROCESSED_FOLDER, 'movement_tracks.png')
    if os.path.exists(tracks_path):
        return send_file(tracks_path, mimetype='image/png')
    return jsonify({'error': 'Movement tracks not available'}), 404

@app.route('/api/visualizations/crowd-analysis', methods=['GET'])
def get_crowd_analysis():
    """Get the crowd analysis plot image"""
    crowd_path = os.path.join(PROCESSED_FOLDER, 'crowd_analysis.png')
    if os.path.exists(crowd_path):
        return send_file(crowd_path, mimetype='image/png')
    return jsonify({'error': 'Crowd analysis plot not available'}), 404

@app.route('/api/visualizations/energy-distribution', methods=['GET'])
def get_energy_distribution():
    """Get the energy distribution plot image"""
    energy_path = os.path.join(PROCESSED_FOLDER, 'energy_distribution.png')
    if os.path.exists(energy_path):
        return send_file(energy_path, mimetype='image/png')
    return jsonify({'error': 'Energy distribution plot not available'}), 404

@app.route('/api/visualizations', methods=['GET'])
def list_visualizations():
    """List all available visualization images"""
    visualizations = {
        'heatmap': os.path.exists(os.path.join(PROCESSED_FOLDER, 'heatmap.png')),
        'movement_tracks': os.path.exists(os.path.join(PROCESSED_FOLDER, 'movement_tracks.png')),
        'crowd_analysis': os.path.exists(os.path.join(PROCESSED_FOLDER, 'crowd_analysis.png')),
        'energy_distribution': os.path.exists(os.path.join(PROCESSED_FOLDER, 'energy_distribution.png'))
    }
    return jsonify(visualizations)

@app.route('/api/processed-video', methods=['GET'])
def get_processed_video():
    """Serve the processed video with annotations (bounding boxes, tracking, etc.)"""
    video_path = os.path.join(PROCESSED_FOLDER, 'processed_video.mp4')
    if os.path.exists(video_path):
        return send_file(video_path, mimetype='video/mp4')
    return jsonify({'error': 'Processed video not available'}), 404

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Crowd Analysis API Server")
    print("=" * 60)
    print("✅ Server running on http://localhost:5000")
    print("📊 Visualization endpoints:")
    print("   - /api/visualizations/heatmap")
    print("   - /api/visualizations/movement-tracks")
    print("   - /api/visualizations/crowd-analysis")
    print("   - /api/visualizations/energy-distribution")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)

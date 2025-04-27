import os
import json
import time
import uuid
import subprocess
import threading
import yaml
from datetime import datetime
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

# Import our browser use handler
from browser_use_handler import browser_use_interaction

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

RESULTS_DIR = "./results"
LOGS_DIR = "./logs"
CONFIG_FILE_PATH = "./config.yaml"

# Create directories if they don't exist
os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# Store active processes and their log files
active_runs = {}

@app.route('/api/runs', methods=['GET'])
def get_runs():
    """Get a list of all runs in the results directory"""
    try:
        # List all JSON files in the results directory
        if not os.path.exists(RESULTS_DIR):
            return jsonify({"success": False, "error": "Results directory not found"}), 404
            
        run_files = [f for f in os.listdir(RESULTS_DIR) if f.endswith('.json')]
        
        # Sort files by modification time (newest first)
        run_files.sort(key=lambda x: os.path.getmtime(os.path.join(RESULTS_DIR, x)), reverse=True)
        
        # Make sure we're returning with the correct structure
        return jsonify({"success": True, "data": {"runs": run_files}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/runs/<run_id>', methods=['GET'])
def get_run_result(run_id):
    """Get the results of a specific run"""
    try:
        file_path = os.path.join(RESULTS_DIR, run_id)
        
        # Check if the file exists
        if not os.path.exists(file_path):
            return jsonify({"success": False, "error": f"Run file {run_id} not found"}), 404
            
        # Read and parse the JSON file
        with open(file_path, 'r') as f:
            result_data = json.load(f)
            
        return jsonify({"success": True, "data": result_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get the current configuration from config.yaml"""
    try:
        if not os.path.exists(CONFIG_FILE_PATH):
            # If config doesn't exist, maybe return a default or error
            # Returning error for now, as frontend expects a config
            return jsonify({"success": False, "error": "Configuration file (config.yaml) not found."}), 404 
            
        with open(CONFIG_FILE_PATH, 'r') as f:
            config_data = yaml.safe_load(f)
            if config_data is None: # Handle empty file case
                 config_data = {}
                 
        # Simple redaction for API keys - replace with more robust solution if needed
        if isinstance(config_data.get("api_keys"), dict):
            for key in config_data["api_keys"]:
                 if isinstance(config_data["api_keys"][key], str) and config_data["api_keys"][key]:
                    config_data["api_keys"][key] = "********" # Redact non-empty keys
                    
        return jsonify({"success": True, "data": config_data})
    except yaml.YAMLError as e:
        app.logger.error(f"Error parsing config.yaml: {e}")
        return jsonify({"success": False, "error": f"Error parsing configuration file: {e}"}), 500
    except FileNotFoundError:
         return jsonify({"success": False, "error": "Configuration file (config.yaml) not found."}), 404 
    except Exception as e:
        app.logger.error(f"Error reading config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/config', methods=['POST'])
def update_config():
    """Update the configuration in config.yaml"""
    try:
        new_config_data = request.json
        if not new_config_data:
             return jsonify({"success": False, "error": "No configuration data received"}), 400

        current_config = {}
        # Load existing config to preserve structure/comments if possible
        # Though PyYAML might not preserve all comments perfectly on dump
        try:
            if os.path.exists(CONFIG_FILE_PATH):
                with open(CONFIG_FILE_PATH, 'r') as f:
                    current_config = yaml.safe_load(f) or {}
        except Exception as e:
             app.logger.warning(f"Could not load existing config.yaml, will overwrite: {e}")

        # Basic merge - assumes frontend sends the full structure
        # More sophisticated merging might be needed depending on frontend behavior
        # Need to handle API keys carefully - don't overwrite with redacted values
        new_api_keys = new_config_data.pop('api_keys', None)
        
        # Update the rest of the config
        current_config.update(new_config_data)
        
        # Restore/update API keys only if new, non-redacted keys were sent
        if isinstance(new_api_keys, dict):
            if "api_keys" not in current_config or not isinstance(current_config.get("api_keys"), dict):
                 current_config["api_keys"] = {}
            for key, value in new_api_keys.items():
                 # Only update if the new value is not the redacted placeholder
                 if isinstance(value, str) and value != "********":
                     current_config["api_keys"][key] = value
        
        # Write the updated config back to the file
        with open(CONFIG_FILE_PATH, 'w') as f:
            yaml.dump(current_config, f, default_flow_style=False, sort_keys=False)
            
        # Return the *saved* config (without redaction internally, GET will redact)
        return jsonify({"success": True, "data": current_config})
    except yaml.YAMLError as e:
        app.logger.error(f"Error writing config.yaml: {e}")
        return jsonify({"success": False, "error": f"Error writing configuration file: {e}"}), 500
    except Exception as e:
        app.logger.error(f"Error updating config: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

def run_process(run_id, log_file_path):
    """Run the main.py process and capture its output to a log file"""
    try:
        with open(log_file_path, 'w') as f:
            # Initial log entry
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] Starting honeypot run with ID: {run_id}\n")
            f.flush()
            
            # Run the main.py process, capturing its output
            process = subprocess.Popen(
                ["python", "main.py"], 
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            # Store the process in active_runs
            active_runs[run_id] = {
                "process": process,
                "log_file": log_file_path,
                "start_time": time.time()
            }
            
            # Stream the output to the log file
            for line in process.stdout:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"[{timestamp}] {line}")
                f.flush()
            
            # When process is done, finalize the log
            process.wait()
            exit_code = process.returncode
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] Process completed with exit code: {exit_code}\n")
            
            # Remove from active_runs once finished
            if run_id in active_runs:
                del active_runs[run_id]
                
    except Exception as e:
        # Log the exception
        with open(log_file_path, 'a') as f:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] Error in run process: {str(e)}\n")
        
        # Clean up
        if run_id in active_runs:
            del active_runs[run_id]

@app.route('/api/run/start', methods=['POST'])
def start_run():
    """Start a new run"""
    try:
        # Generate a unique run ID based on timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_id = f"honeypot_run_{timestamp}"
        
        # Create log file
        log_file_path = os.path.join(LOGS_DIR, f"{run_id}.log")
        
        # Start the process in a separate thread to avoid blocking
        thread = threading.Thread(
            target=run_process, 
            args=(run_id, log_file_path),
            daemon=True
        )
        thread.start()
        
        return jsonify({
            "success": True, 
            "data": {
                "run_id": run_id,
                "log_file": log_file_path
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/run/<run_id>/status', methods=['GET'])
def get_run_status(run_id):
    """Get the status of a run"""
    try:
        # Check if the run is active
        if run_id in active_runs:
            process_info = active_runs[run_id]
            process = process_info["process"]
            
            # Check if the process is still running
            is_running = process.poll() is None
            
            # Calculate run time
            elapsed_time = time.time() - process_info["start_time"]
            
            return jsonify({
                "success": True, 
                "data": {
                    "is_running": is_running,
                    "run_id": run_id,
                    "elapsed_time": round(elapsed_time, 2)
                }
            })
        
        # If not active, check if we have a result file
        result_file = os.path.join(RESULTS_DIR, f"{run_id}.json")
        if os.path.exists(result_file):
            return jsonify({
                "success": True, 
                "data": {
                    "is_running": False,
                    "run_id": run_id,
                    "status": "completed"
                }
            })
            
        # Check if there's a log file
        log_file = os.path.join(LOGS_DIR, f"{run_id}.log")
        if os.path.exists(log_file):
            return jsonify({
                "success": True, 
                "data": {
                    "is_running": False,
                    "run_id": run_id,
                    "status": "unknown"
                }
            })
        
        return jsonify({"success": False, "error": f"Run {run_id} not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/run/<run_id>/logs', methods=['GET'])
def get_run_logs(run_id):
    """Get the logs for a specific run, optionally since a specific line."""
    try:
        log_file_path = os.path.join(LOGS_DIR, f"{run_id}.log")
        since_line = request.args.get('since_line', default=0, type=int)

        # Check if the log file exists
        if not os.path.exists(log_file_path):
            return jsonify({
                "success": True,
                "data": {
                    "logs": [f"No logs found for run {run_id}"],
                    "is_running": run_id in active_runs,
                    "current_line_count": 0
                }
            })

        # Read the log file lines
        with open(log_file_path, 'r') as f:
            all_lines = f.readlines()
            current_line_count = len(all_lines)

        # Get only new lines if since_line is valid
        if 0 <= since_line < current_line_count:
            new_log_lines = all_lines[since_line:]
        elif since_line >= current_line_count:
             # Client is up-to-date or ahead, send nothing
             new_log_lines = []
        else:
             # Invalid since_line, send all lines
             new_log_lines = all_lines

        # Determine if the run is still active
        is_running = run_id in active_runs

        # Return the logs
        return jsonify({
            "success": True,
            "data": {
                "logs": new_log_lines,
                "is_running": is_running,
                "current_line_count": current_line_count
            }
        })
    except Exception as e:
        app.logger.error(f"Error fetching logs for {run_id}: {str(e)}") # Log the error
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/run/<run_id>/stop', methods=['POST'])
def stop_run(run_id):
    """Stop a running process"""
    try:
        # Check if the run is active
        if run_id in active_runs:
            process_info = active_runs[run_id]
            process = process_info["process"]
            
            # Terminate the process
            process.terminate()
            
            # Wait for it to stop and update the log
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't terminate gracefully
                process.kill()
            
            # Log the termination
            with open(process_info["log_file"], 'a') as f:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"[{timestamp}] Process was stopped manually\n")
            
            # Remove from active_runs
            del active_runs[run_id]
            
            return jsonify({"success": True, "data": {"stopped": True}})
        
        return jsonify({"success": False, "error": f"Run {run_id} is not active"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/browser-use', methods=['POST'])
def browser_use():
    """Handle browser-use requests"""
    try:
        # Get the request data
        data = request.json
        url = data.get('url')
        prompt = data.get('prompt')
        provider = data.get('provider', 'openai')  # Default to OpenAI if not specified
        
        # Validate required fields
        if not url:
            return jsonify({"success": False, "error": "URL is required"}), 400
        if not prompt:
            return jsonify({"success": False, "error": "Prompt is required"}), 400
        
        # Log the request
        app.logger.info(f"Browser Use request - URL: {url}, Provider: {provider}")
        
        # Run the browser use interaction
        result = browser_use_interaction(url, prompt, provider)
        
        # Return the result
        return jsonify({"success": True, "data": result})
    except Exception as e:
        app.logger.error(f"Error in browser-use endpoint: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True) 
"""
app.py  —  Flask backend for Neuromarketing Research Platform
Place this file in:  Research-Project\backend\app.py
Run: pip install flask flask-cors && python app.py
"""

import os
import sys
import json
import threading
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT   = r"C:\Users\M S I\OneDrive\Documents\GitHub\Research-Project"
PSYEXP_PATH    = os.path.join(PROJECT_ROOT, "Cheese.psyexp")
DATA_FOLDER    = os.path.join(PROJECT_ROOT, "data")
RESULTS_JSON   = os.path.join(DATA_FOLDER,  "latest_results.json")

# Add project root to path so we can import behavior_model.py
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ── State ─────────────────────────────────────────────────────────────────────
experiment_state = {
    "status":            "idle",   # idle | running | complete
    "participant_count": 0,
}

training_state = {
    "status":  "idle",             # idle | running | complete | error
    "log":     [],
    "results": None,
}


# ── Experiment endpoints ──────────────────────────────────────────────────────
@app.route("/api/experiment/launch", methods=["POST"])
def launch_experiment():
    if experiment_state["status"] == "running":
        return jsonify({"error": "Experiment already running"}), 400
    experiment_state["status"] = "running"

    def _open():
        try:
            os.startfile(PSYEXP_PATH)
        except Exception as e:
            print(f"Could not open PsychoPy: {e}")

    threading.Thread(target=_open, daemon=True).start()
    return jsonify({"status": "launching"})


@app.route("/api/experiment/complete", methods=["POST"])
def complete_experiment():
    data = request.get_json() or {}
    experiment_state["status"]            = "complete"
    experiment_state["participant_count"] = data.get("participant_count", 1)
    return jsonify(experiment_state)


@app.route("/api/experiment/status", methods=["GET"])
def experiment_status():
    return jsonify(experiment_state)


# ── Training endpoint — imports and calls behavior_model.run_pipeline() ───────
def _run_pipeline(age: int, gender: str):
    training_state["status"] = "running"
    training_state["log"]    = []
    training_state["results"] = None

    # Redirect stdout so every print() from the model appears in the log
    import io

    class LogCapture:
        def write(self, msg):
            if msg.strip():
                training_state["log"].append(msg.rstrip())
        def flush(self):
            pass

    old_stdout = sys.stdout
    sys.stdout = LogCapture()

    try:
        # Import fresh each time (reload handles re-runs)
        import importlib
        import behavior_model
        importlib.reload(behavior_model)

        results = behavior_model.run_pipeline(age, gender)
        training_state["results"] = results
        training_state["status"]  = "complete"

    except Exception as e:
        import traceback
        training_state["log"].append(f"ERROR: {e}")
        training_state["log"].append(traceback.format_exc())
        training_state["status"] = "error"

    finally:
        sys.stdout = old_stdout


@app.route("/api/training/start", methods=["POST"])
def start_training():
    if training_state["status"] == "running":
        return jsonify({"error": "Already running"}), 400

    data   = request.get_json() or {}
    age    = int(data.get("age",    25))
    gender = str(data.get("gender", "Female"))

    threading.Thread(target=_run_pipeline, args=(age, gender), daemon=True).start()
    return jsonify({"status": "started"})


@app.route("/api/training/status", methods=["GET"])
def training_status():
    return jsonify({
        "status":  training_state["status"],
        "log":     training_state["log"][-50:],
        "results": training_state["results"],
    })


# ── Health ────────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "ok":         True,
        "experiment": experiment_state["status"],
        "training":   training_state["status"],
    })


if __name__ == "__main__":
    print("=" * 52)
    print("  Neuromarketing Backend  →  http://localhost:5000")
    print("=" * 52)
    app.run(debug=False, port=5000, threaded=True)

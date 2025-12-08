from sage.all import *
from flask import Flask, render_template, jsonify, request
import os, json

# the following line allows importing from hpg-lib, adjust as needed for your setup
import sys
sys.path.append('/home/stephan/Documents/Coding/sage/Diagrammatics-Web/hpg-lib/')
from HourglassClasses.hourglassplabicgraph import HourglassPlabicGraph

app = Flask(__name__)
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# --- Persistent store for combinatorial graphs ---
class HPGStore:
    """A class to manage the persistent storage of HourglassPlabicGraph objects."""
    def __init__(self, directory):
        """Initializes the HPGStore, creating the data directory if it doesn't exist."""
        self.dir = directory
        os.makedirs(self.dir, exist_ok=True)
        self.hpgs = {}
        self._load_all()

    def _path(self, name):
        """Generates a safe file path for a given HPG name."""
        safe = f"{name}.hpg"
        return os.path.join(self.dir, safe)

    def _load_all(self):
        """Loads all HPG files from the data directory into memory."""
        for fn in os.listdir(self.dir):
            if fn.endswith('.hpg'):
                name = fn[:-4]
                try:
                    with open(os.path.join(self.dir, fn), 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    # pylint: disable=no-member
                    self.hpgs[name] = HourglassPlabicGraph.from_dict(data)
                except Exception:
                    continue
        print(self.hpgs)

    def list(self):
        """Returns a sorted list of all HPG names in the store."""
        return sorted(self.hpgs.keys())

    def exists(self, name):
        """Checks if an HPG with the given name exists."""
        return name in self.hpgs

    def add(self, name, vertices=1):
        """Adds a new HourglassPlabicGraph to the store and saves it."""
        if self.exists(name):
            raise ValueError(f"HPG '{name}' already exists")
        self.hpgs[name] = HourglassPlabicGraph(vertices)
        self._save(name)
        return self.hpgs[name]

    def remove(self, name):
        """Removes an HPG from the store and deletes its file."""
        if not self.exists(name):
            raise KeyError(name)
        del self.hpgs[name]
        try:
            os.remove(self._path(name))
        except FileNotFoundError:
            pass

    def get(self, name):
        """Retrieves an HPG from the store by its name."""
        if not self.exists(name):
            raise KeyError(name)
        return self.hpgs[name]

    def _save(self, name):
        """Saves a specific HPG to its corresponding file."""
        with open(self._path(name), 'w', encoding='utf-8') as f:
            json.dump(self.hpgs[name].to_dict(), f, ensure_ascii=False, indent=2)


STORE = HPGStore(DATA_DIR)

# --- Flask routes ---
@app.route('/')
def index():
    """Serves the main index.html page."""
    return render_template('index.html')

# --- Dataset management ---
@app.route('/datasets', methods=['GET'])
def list_datasets():
    """Returns a list of all available dataset names."""
    return jsonify({"datasets": STORE.list()})

@app.route('/datasets', methods=['POST'])
def create_dataset():
    """Creates a new dataset (HPG) with a given name and number of vertices."""
    data = request.get_json(force=True, silent=True) or {}
    name = data.get('name')
    vertices = data.get('boundaryVertices', 1)
    if not name:
        return jsonify({"error": "Missing 'name'"}), 400
    try:
        ds = STORE.add(name, vertices)
        return jsonify({"name": name, "data": ds.to_dict()}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409

@app.route('/datasets/<name>', methods=['GET'])
def get_dataset_raw(name):
    """Retrieves the raw data for a specific dataset."""
    try:
        ds = STORE.get(name)
    except KeyError:
        return jsonify({"error": "Dataset not found"}), 404
    return jsonify({"name": name, "data": ds.to_dict()})

@app.route('/datasets/<name>', methods=['DELETE'])
def delete_dataset(name):
    """Deletes a specific dataset."""
    try:
        STORE.remove(name)
    except KeyError:
        return jsonify({"error": "Dataset not found"}), 404
    return jsonify({"deleted": name})

# --- Named applet data endpoints ---
@app.route('/datasetsApplet/getData/<name>', methods=['GET'])
def datasets_applet_get(name):
    """Endpoint for the 'datasets' applet to get its data."""
    #fmt = request.args.get('format') or 'edge_list'
    try:
        ds = STORE.get(name)
    except KeyError:
        return jsonify({"error": "Dataset not found"}), 404
    return jsonify({"name": name, "data": ds.to_dict()})

@app.route('/analyzerApplet/getData/<name>', methods=['GET'])
def analyzer_applet_get(name):
    """Endpoint for the 'analyzer' applet to get its data."""
    try:
        ds = STORE.get(name)
    except KeyError:
        return jsonify({"error": "Dataset not found"}), 404
    return jsonify({"name": name, "data": ds.to_dict_analyzer()})

@app.route('/editorApplet/getData/<name>', methods=['GET'])
def visualizer_applet_get(name):
    """Endpoint for the 'editor' applet to get its data."""
    try:
        ds = STORE.get(name)
    except KeyError:
        return jsonify({"error": "Dataset not found"}), 404
    return jsonify({"name": name, "data": ds.to_dict()})

@app.route('/editorApplet/saveData/<name>', methods=['POST'])
def editor_applet_save(name):
    """Endpoint for the 'editor' applet to save its data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        # Create a new HPG from the editor data and replace the old one in the store
        STORE.hpgs[name] = HourglassPlabicGraph.from_dict(data)
        STORE._save(name)
        return jsonify({"name": name, "message": "Saved successfully"}), 200
    except KeyError:
        return jsonify({"error": "Dataset not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/editorApplet/tutteLayout/<name>', methods=['POST'])
def editor_applet_tutte_layout(name):
    """Applies the Tutte layout to a graph in the editor."""
    try:
        ds = STORE.get(name)
        ds.tutte_layout()
        STORE._save(name)
        return jsonify({"name": name, "data": ds.to_dict()})
    except KeyError:
        return jsonify({"error": "Dataset not found"}), 404
    except Exception as e:
        # Log the full error for debugging
        print(f"Error during Tutte layout for {name}: {e}")
        return jsonify({"error": "Failed to apply Tutte layout."}), 500

# --- Analyzer Applet Endpoints ---

def _get_ds_from_request():
    """Helper function to get a dataset from a JSON request."""
    data = request.get_json(force=True, silent=True) or {}
    name = data.get('dataset')
    if not name:
        raise ValueError("Missing 'dataset' name in request")
    try:
        return name, STORE.get(name)
    except KeyError:
        raise KeyError(f"Dataset '{name}' not found")

@app.route('/analyzerApplet/tutte_layout', methods=['POST'])
def analyzer_tutte_layout():
    """Applies the Tutte layout via the analyzer applet."""
    try:
        name, ds = _get_ds_from_request()
        ds.tutte_layout()
        STORE._save(name)
        return jsonify({"name": name, "data": ds.to_dict_analyzer()})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route('/analyzerApplet/lloyd_layout', methods=['POST'])
def analyzer_lloyd_layout():
    """Applies the Lloyd layout via the analyzer applet."""
    try:
        name, ds = _get_ds_from_request()
        ds.lloyd_layout()
        STORE._save(name)
        return jsonify({"name": name, "data": ds.to_dict_analyzer()})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route('/analyzerApplet/cycle_face', methods=['POST'])
def analyzer_cycle_face():
    """Performs a cycle move on a face via the analyzer applet."""
    try:
        name, ds = _get_ds_from_request()
        data = request.get_json()
        face_id = data.get('face_id')
        inverse = data.get('inverse', False)
        if ds.is_cycle_valid(face_id, None, None, inverse):
            ds.cycle(face_id, None, None, inverse)
            STORE._save(name)
        return jsonify({"name": name, "data": ds.to_dict_analyzer()})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route('/analyzerApplet/square_move', methods=['POST'])
def analyzer_square_move():
    """Performs a square move on a face via the analyzer applet."""
    try:
        name, ds = _get_ds_from_request()
        data = request.get_json()
        face_id = data.get('face_id')
        if ds.is_square_move_valid(face_id):
            ds.square_move(face_id)
            STORE._save(name)
        return jsonify({"name": name, "data": ds.to_dict_analyzer()})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route('/analyzerApplet/separation_labeling', methods=['POST'])
def analyzer_separation_labeling():
    """Calculates and applies separation labeling via the analyzer applet."""
    try:
        name, ds = _get_ds_from_request()
        data = request.get_json()
        face_id = data.get('face_id')
        rank = max(v.total_degree() for v in ds._inner_vertices.values())
        ds.separation_labeling(ds._faces[face_id], rank)
        STORE._save(name)
        return jsonify({"name": name, "data": ds.to_dict_analyzer()})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route('/analyzerApplet/get_trip', methods=['POST'])
def analyzer_get_trip():
    """Calculates and returns a trip without modifying the graph."""
    # This endpoint does not modify the graph, so it doesn't save.
    name, ds = _get_ds_from_request()
    data = request.get_json()
    v = ds._get_vertex(data.get('vertexId'))
    trip = ds.get_trip(v, data.get('tripIndex'), output='ids')
    return jsonify({"trip": trip})

if __name__ == '__main__':
    app.run(debug=True)

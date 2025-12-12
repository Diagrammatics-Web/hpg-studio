# client.py
import requests
import sys

sys.path.append('/home/stephan/Documents/Coding/sage/Diagrammatics-Web/hpg-lib/')
from HourglassClasses.hourglassplabicgraph import HourglassPlabicGraph


class HPGStudioClient:
    """
    Client for the HPG Studio server.
    """

    def __init__(self, base_url="http://127.0.0.1:5000", timeout=30):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.timeout = timeout
        self._server_up = None

    # ---------- Dataset management ----------

    def list(self):
        """Lists all available datasets on the server."""
        url = f"{self.base_url}/datasets"
        r = self.session.get(url, timeout=self.timeout)
        r.raise_for_status()
        return r.json().get("datasets", [])

    def pull(self, name):
        """
        Pulls a dataset from the server and returns it as an HourglassPlabicGraph object.
        """
        url = f"{self.base_url}/datasets/{name}"
        r = self.session.get(url, timeout=self.timeout)
        r.raise_for_status()
        data = r.json().get("data")
        if data:
            return HourglassPlabicGraph.from_dict(data)
        return None

    def push(self, name, hpg):
        """
        Pushes an HourglassPlabicGraph object to the server.
        Creates a new dataset if 'name' does not exist, otherwise updates the existing one.
        """
        # The /editorApplet/saveData endpoint conveniently handles both creation and update.
        # While the route is under 'editorApplet', it saves the full graph structure,
        # which is what we want for a general push/save operation.
        # If the dataset doesn't exist, the server creates it.
        url = f"{self.base_url}/editorApplet/saveData/{name}"
        payload = hpg.to_dict()
        r = self.session.post(url, json=payload, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def delete(self, name):
        """Deletes a dataset from the server."""
        url = f"{self.base_url}/datasets/{name}"
        r = self.session.delete(url, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

# client.py
import requests

class GraphServerClient:
    """
    Simple client for the graph server.
    """

    def __init__(self, base_url="http://127.0.0.1:5000", timeout=30):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.timeout = timeout

    # ---------- Dataset management ----------

    def list_datasets(self):
        url = f"{self.base_url}/datasets"
        r = self.session.get(url, timeout=self.timeout)
        r.raise_for_status()
        return r.json().get("datasets", [])

    def get_dataset_raw(self, name):
        url = f"{self.base_url}/datasets/{name}"
        r = self.session.get(url, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def create_dataset(self, name, edges=None):
        url = f"{self.base_url}/datasets"
        payload = {"name": name, "edges": [list(e) for e in (edges or [])]}
        r = self.session.post(url, json=payload, timeout=self.timeout)
        if r.status_code >= 400:
            try:
                err = r.json().get("error")
            except Exception:
                err = r.text
            raise requests.HTTPError(f"create_dataset failed: {err}", response=r)
        return r.json()

    def delete_dataset(self, name):
        url = f"{self.base_url}/datasets/{name}"
        r = self.session.delete(url, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    # ---------- Applet-specific data ----------

    def get_data_for_applet(self, applet, name, format=None):
        routes = {
            "Datasets": "/datasetsApplet/getData",
            "Analysis": "/analyzerApplet/getData",
            "Visualization": "/visualizerApplet/getData",
        }
        url = f"{self.base_url}{routes[applet]}/{name}"
        params = {"format": format} if format else {}
        r = self.session.get(url, params=params, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    # Convenience shortcuts
    def get_d3(self, name):
        return self.get_data_for_applet("Visualization", name, format="d3")

    def get_adjacency(self, name):
        return self.get_data_for_applet("Analysis", name, format="adjacency")

    def get_edge_list(self, name):
        return self.get_data_for_applet("Datasets", name, format="edge_list")

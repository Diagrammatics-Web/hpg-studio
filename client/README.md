# Graph Server Python Client

A minimal client and CLI to interact with the Flask graph server.

## Files
- `client.py` — Python client API.
- `cli.py` — Command-line interface.
- `example_usage.py` — Example script demonstrating the API.

## Requirements
- Python 3.8+
- `requests` package: `pip install requests`

## Usage

### Python API
```bash
python example_usage.py
```

### CLI
List datasets:
```bash
python cli.py list
```
Create a dataset:
```bash
python cli.py create hexagon --edge 1,2 --edge 2,3 --edge 3,4 --edge 4,5 --edge 5,6 --edge 6,1
```
Get raw dataset:
```bash
python cli.py get hexagon
```
Get dataset in a specific format via applet:
```bash
python cli.py format Visualization hexagon --format d3
```
Delete dataset:
```bash
python cli.py delete hexagon
```

## Notes
- Ensure your Flask server from the previous ZIP is running (default: `http://127.0.0.1:5000`).
- The client only depends on `requests`.
- No `typing` or `__future__` imports are used.

# example_usage.py
from client import GraphServerClient

client = GraphServerClient(base_url="http://127.0.0.1:5000")

print("Datasets:", client.list_datasets())

# Create a dataset
print("Create hexagon:", client.create_dataset("hexagon", edges=[(1,2),(2,3),(3,4),(4,5),(5,6),(6,1)]))

# Get raw
print("Raw hexagon:", client.get_dataset_raw("hexagon"))

# Get formats
print("Edge list:", client.get_edge_list("hexagon"))
print("Adjacency:", client.get_adjacency("hexagon"))
print("D3:", client.get_d3("hexagon"))

# Delete
print("Delete hexagon:", client.delete_dataset("hexagon"))

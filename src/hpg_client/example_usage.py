# example_usage.py
import sys
from sage.all import *
from hpg_client import HPGStudioClient


from hpg_lib.examples import Examples

client = HPGStudioClient(base_url="http://127.0.0.1:5000")

print("Initial datasets:", client.list())

# A list of example names to test from the Examples class
example_names = ["example_ASM", "example_5_by_2", "example_benzene"]

for name in example_names:
    print(f"\n--- Testing with '{name}' ---")
    try:
        # Get the graph object from the Examples class
        graph_to_push = Examples.get_example(name)
        print(f"Pushing '{name}' to the server...")
        push_response = client.push(name, graph_to_push)
        print("Server response:", push_response)

        print(f"Pulling '{name}' from the server...")
        pulled_graph = client.pull(name)
        if pulled_graph:
            print(f"Successfully pulled '{name}'.")

        #print(f"Deleting '{name}' from the server...")
        #delete_response = client.delete(name)
        #print("Server response:", delete_response)
    except ValueError as e:
        print(f"Could not process example '{name}': {e}")

print("\nFinal datasets:", client.list())

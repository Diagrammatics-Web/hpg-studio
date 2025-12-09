# cli.py
import argparse
import sys
from client import HPGStudioClient

sys.path.append('/home/stephan/Documents/Coding/sage/Diagrammatics-Web/hpg-lib/')
from HourglassClasses.hourglassplabicgraph import HourglassPlabicGraph


def main():
    p = argparse.ArgumentParser(description="Graph server CLI")
    p.add_argument("--base-url", default="http://127.0.0.1:5000", help="Server base URL")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List datasets")

    pullp = sub.add_parser("pull", help="Pull a dataset from the server")
    pullp.add_argument("name")

    pushp = sub.add_parser("push", help="Push a dataset to the server")
    pushp.add_argument("name")
    pushp.add_argument("--vertices", type=int, default=0, help="Number of vertices for a new graph")

    delp = sub.add_parser("delete", help="Delete dataset")
    delp.add_argument("name")

    args = p.parse_args()
    client = HPGStudioClient(base_url=args.base_url)

    if args.command == "list":
        print(client.list())

    elif args.command == "pull":
        hpg = client.pull(args.name)
        if hpg:
            print(hpg.to_dict())
        else:
            print(f"Dataset '{args.name}' not found or is empty.")

    elif args.command == "push":
        hpg = HourglassPlabicGraph(args.vertices)
        print(client.push(args.name, hpg))

    elif args.command == "delete":
        print(client.delete(args.name))


if __name__ == "__main__":
    main()

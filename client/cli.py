# cli.py
import argparse
from client import GraphServerClient


def main():
    p = argparse.ArgumentParser(description="Graph server CLI")
    p.add_argument("--base-url", default="http://127.0.0.1:5000", help="Server base URL")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="List datasets")

    getp = sub.add_parser("get", help="Get raw dataset")
    getp.add_argument("name")

    addp = sub.add_parser("create", help="Create dataset")
    addp.add_argument("name")
    addp.add_argument("--edge", action="append", default=[], help="Edge as 'u,v' (repeatable)")

    delp = sub.add_parser("delete", help="Delete dataset")
    delp.add_argument("name")

    fmtp = sub.add_parser("format", help="Get dataset in format via applet")
    fmtp.add_argument("applet", choices=["Datasets", "Analysis", "Visualization"]) 
    fmtp.add_argument("name")
    fmtp.add_argument("--format", choices=["edge_list", "adjacency", "d3"])

    args = p.parse_args()
    client = GraphServerClient(base_url=args.base_url)

    if args.cmd == "list":
        print(client.list_datasets())

    elif args.cmd == "get":
        print(client.get_dataset_raw(args.name))

    elif args.cmd == "create":
        edges = []
        for e in args.edge:
            try:
                u, v = e.split(",")
                edges.append((int(u), int(v)))
            except Exception:
                raise SystemExit(f"Invalid --edge value: '{e}', expected 'u,v' with integers")
        print(client.create_dataset(args.name, edges=edges))

    elif args.cmd == "delete":
        print(client.delete_dataset(args.name))

    elif args.cmd == "format":
        print(client.get_data_for_applet(args.applet, args.name, format=args.format))


if __name__ == "__main__":
    main()

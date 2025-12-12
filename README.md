# About `hpg-studio`

This is a Python/JavaScript implementation of a client and server for manipulating hourglass plabic graphs (HPG's) in a graphical user interface. Key functionality includes a graphical user interface for drawing HPG's, trip permutations, performing square moves, etc. A programmatic interface with the underlying backend companion project [hpg-lib](https://github.com/Diagrammatics-Web/hpg-lib) provides a powerful method to compute with the HPG's you draw, or to visualize HPG's. See [[GPPSS25]](https://arxiv.org/abs/2306.12501) for mathematical details.

# Installation and basic usage

You must have a working installation of [SageMath](https://doc.sagemath.org/html/en/installation/index.html). To install the current development version of `hpg-studio` in the system `sage`, run the following, either in a terminal or in Sage itself:

    sage -pip install git+https://github.com/Diagrammatics-Web/hpg-studio/

The `hpg-studio` may be used as in the following example. First start the server which powers the user interface by running the following in a terminal:

    sage -python -m hpg_server

The server by default runs on `http://127.0.0.1:5000`. Open a web browser and connect to that URL. You may draw new HPG's using the HPG Studio Editor tab. Available HPG's are stored in the first tab, which is initially empty. You may also work with HPG's using the Analyzer tab, where you can view trips, perform moves, etc. (The save location is in `%site packages%/hpg_server/data/` where `%site packages%` may be found with `sage -python -m pip show hpg_studio`.)

To programmatically interface with the underlying Sage library, start `sage` and proceed as in the following example.

    sage: from hpg_client import HPGStudioClient
    sage: client = HPGStudioClient(base_url="http://127.0.0.1:5000")   # default server address
    
    sage: from hpg_lib.examples import Examples
    sage: G = Examples.get_example("example_ASM")
    sage: client.push("ASM-example", G)

In your web browser's HPG Studio tab, click the `refresh list` button, and "example_ASM" will appear. You may now manipulate it. For instance, you can go to the Analyzer tab, click the square move tool, and click the square to perform a move. You may then retrieve the updated HPG in Sage as follows:

    sage: H = client.pull("ASM-example")
    sage: G.is_isomorphic(H)
    False
    sage: H in G.get_square_move_class()
    True

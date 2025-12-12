var ic = new InputController();
analyzer = new Applet({ vertices: [], edges: [], faces: [] });
analyzer.size = 750;
analyzer.ic = ic;
analyzer.edgePaths = [];
analyzer.highlightedPath = null;
analyzer.showLabels = false;
analyzer.showEdgeLabels = false;

/**
 * Preprocesses the graph data fetched from the backend. It resolves vertex references for edges and calculates face centers.
 */
analyzer.preprocess_data = function () {
  // add references to source and target vertices
  this.data.edges.forEach((edge, i) => {
    edge.source = this.data.vertices.find(vertex => vertex.id == edge.sourceId);
    edge.target = this.data.vertices.find(vertex => vertex.id == edge.targetId);
  });

  this.data.faces.forEach((face, i) => {
    face.vertices = face.vertexIds.map(id => this.data.vertices.find(vertex => vertex.id == id));
    face.center = {
      x: d3.mean(face.vertices, vertex => vertex.x),
      y: d3.mean(face.vertices, vertex => vertex.y)
    };
  });
};

/**
 * Fetches graph data for the currently selected dataset from the backend.
 */
analyzer.fetchData = async function () {
  if (!this.app.selectedDataset) {
    this.app.updateStatus("No dataset selected.");
    return;
  }
  const res = await fetch(`analyzerApplet/getData/${encodeURIComponent(this.app.selectedDataset)}`);
  const json = await res.json();
  this.data = json.data;
  this.preprocess_data();
  this.update();
};

/**
 * Redraws the entire SVG canvas, including vertices, edges, and faces, based on the current data.
 */
analyzer.update = function () {
  if (!this.data) return;

  /**
   * Generates the SVG path for a given edge, including curves for multi-edges.
   * @param {object} edge - The edge data object.
   */
  function hp(edge) {
    var path = d3.path();
    var start = edge.source;
    var end = edge.target;
    var v = { x: (end.x - start.x) / 4, y: (end.y - start.y) / 4 };
    var factor = (-(edge.multiplicity - 1) / 2 + edge.index);
    var phi = 40 * Math.PI / 180;
    var looseness = 1.5;
    var dir = { x: v.x * Math.cos(factor * phi) + v.y * Math.sin(factor * phi), y: -v.x * Math.sin(factor * phi) + v.y * Math.cos(factor * phi) };

    path.moveTo(analyzer.x(start.x), analyzer.y(start.y));

    path.bezierCurveTo(analyzer.x(start.x + looseness * dir.x),
      analyzer.y(start.y + looseness * dir.y),
      analyzer.x(end.x - looseness * dir.x),
      analyzer.y(end.y - looseness * dir.y),
      analyzer.x(end.x),
      analyzer.y(end.y));
    return path;
  }

  this.edges.selectAll(".edge").data(this.data.edges, d => d.id)
    .join("path")
    .attr("class", "edge")
    .attr("id", d => d.id)
    .attr("d", d => hp(d))
    .attr("fill", "none")
    .attr("stroke-width", d => (this.highlightedPath != null && this.edgePaths[this.highlightedPath].indexOf(d.id) > -1) ? 4 : 2)
    .attr("stroke", d => (this.highlightedPath != null && this.edgePaths[this.highlightedPath].indexOf(d.id) > -1) ? d3.schemeCategory10[this.highlightedPath%10] : "black");

  this.vertices.selectAll(".vertex").data(this.data.vertices, d => d.id)
    .join("circle")
    .attr("class", d => "vertex " + (d.filled ? "filled" : "unfilled"))
    .attr("cx", d => this.x(d.x))
    .attr("cy", d => this.y(d.y))
    .attr("r", 4);

  this.vertices.selectAll(".vertex-label").data(this.data.vertices, d => d.id)
    .join("text")
    .attr("class", "vertex-label")
    .attr("x", d => this.x(d.x - 0.3))
    .attr("y", d => this.y(d.y + 0.3))
    .text(d => this.showLabels ? d.id : "");

  this.edges.selectAll(".hourglass-label-background").data(this.data.edges, d => d.id)
    .join("circle")
    .attr("class", "hourglass-label-background")
    .attr("cx", function (d) {
      var pnode = d3.select(`#${d.id}`).node();
      d.label_pos = pnode.getPointAtLength(pnode.getTotalLength() * 0.25);
      return d.label_pos.x;
    })
    .attr("cy", d => d.label_pos.y)
    .attr("r", 6)
    .attr("fill", d => this.showEdgeLabels ? "white" : "none");

  this.edges.selectAll(".hourglass-label").data(this.data.edges, d => d.id)
    .join("text")
    .attr("class", "hourglass-label")
    .attr("x", d => d.label_pos.x)
    .attr("y", d => d.label_pos.y)
    .text(d => this.showEdgeLabels ? d.label : "");

  this.faces.selectAll(".face").data(this.data.faces, d => d.id)
    .join("path")
    .attr("d", d => {
      let polygon = d3.line().curve(d3.curveLinearClosed);
      return polygon(d.vertices.map(v => [this.x(v.x), this.y(v.y)]));
    })
    .attr("class", "face");

  var self = this;
  this.paths.selectAll(".edgePath").data(
    function () {
      var edgs = [];
      edgePathsCnt = {};
      for (i = 0; i < self.edgePaths.length; i++) {
        path = self.edgePaths[i]
        for (j = 0; j < path.length; j++) {
          if (edgePathsCnt[path[j]] == undefined) {
            edgePathsCnt[path[j]] = 1;
          }
          edgs.push({ edge: path[j], pathIdx: i, shift: edgePathsCnt[path[j]] });
          edgePathsCnt[path[j]]++;
        }
      }
      for (i = 0; i < edgs.length; i++) {
        edgs[i].total = edgePathsCnt[edgs[i].edge] - 1;
      }
      return edgs;

    })
    .join("circle")
    .attr("class", "edgePath")
    .attr("cx", (d) => {
      var pnode = d3.select("#" + d.edge).node();
      var plen = pnode.getTotalLength() / 2;
      var pos = plen + (d.shift - 0.5) * plen / d.total;
      d.point = pnode.getPointAtLength(pos);
      return d.point.x;
    })
    .attr("cy", (d) => d.point.y)
    .attr("r", 2)
    .attr("stroke", d => d3.schemeCategory10[d.pathIdx%10])
    .attr("fill", d => d3.schemeCategory10[d.pathIdx%10])
    .attr("stroke-width", 2)
    .on("mousemove", function (e, d) {
      self.highlightedPath = d.pathIdx;
      self.update();
    });
};

/**
 * Renders the main content area for the analyzer, setting up the SVG canvas and D3 scales.
 */
analyzer.renderContentArea = function () {
  if (!this.app.selectedDataset) {
    this.app.updateStatus("Please select a dataset first.");
    this.app.selectApplet(0); // Redirect to HPGs applet
    return;
  }

  this.edgePaths = [];
  this.highlightedPath = null;

  this.x = d3.scaleLinear().domain([-11, 11]).range([0, this.size]);
  this.y = d3.scaleLinear().domain([-11, 11]).range([this.size, 0]);

  d3.select("#content-area").selectAll("*").remove();
  this.svg = d3.select("#content-area")
    .append("svg")
    .attr("id", "paper")
    .attr("width", this.size)
    .attr("height", this.size);

  this.canvasObjects = this.svg.append("g");

  this.canvasObjects.append("circle")
    .attr("cx", this.x(0))
    .attr("cy", this.y(0))
    .attr("r", this.x(10) - this.x(0))
    .attr("fill", "none")
    .attr("stroke", "black");

  this.faces = this.canvasObjects.append("g").attr("id", "faces");
  this.edges = this.canvasObjects.append("g").attr("id", "edges");
  this.vertices = this.canvasObjects.append("g").attr("id", "vertices");
  this.paths = this.canvasObjects.append("g").attr("id", "edgePaths");

  this.zoomed = d3.zoom()
    .translateExtent([[0, 0], [this.size, this.size]])
    .scaleExtent([1, 8])
    .on("zoom", e => this.canvasObjects.attr("transform", e.transform));

  this.svg.call(this.zoomed);

  this.fetchData();
  this.selectTool(this.defaultTool);
};

/**
 * A generic helper function to make a POST request to a backend endpoint.
 * @param {Tool} tool - The tool instance making the call.
 * @param {string} endpoint - The API endpoint to call.
 * @param {object} body - The JSON body for the request.
 */
async function callBackend(tool, endpoint, body) {
  try {
    const res = await fetch(`analyzerApplet/${endpoint}/${encodeURIComponent(tool.applet.app.selectedDataset)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      tool.applet.app.updateStatus(`Error: ${err.error}`);
      return null;
    }
    const json = await res.json();
    tool.applet.data = json.data;
    tool.applet.preprocess_data();
  } catch (err) {
    console.error(`Error calling ${endpoint}:`, err);
    tool.applet.app.updateStatus(`Error: ${err.message}`);
  }
}

const defaultToolAnalyzer = new Tool("")
  .setIcon("fa-solid fa-arrow-pointer")
  .on("start", function () {
    // Does nothing
  })
  .on("stop", function () {
    // Does nothing
  });



/*
const panAndZoomAnalyzer = new Tool("panAndZoom")
  .setIcon("fa-solid fa-hand")
  .on("start", function () {
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "move");
    this.applet.svg.call(this.applet.zoomed);
  })
  .on("stop", function () {
    if (this.applet.svg) {
      this.applet.svg.on('.zoom', null);
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });
analyzer.addTool(panAndZoomAnalyzer, true);
*/

const analyzerTutteLayout = new Tool("tutteLayout")
  .setIcon("fa-solid fa-wand-magic-sparkles")
  .on("start", function () {
    console.log("Tutte analyzer layout");
    callBackend(this, 'tutte_layout', {}).finally(() => {
      this.applet.selectTool(this.applet.defaultTool);
      this.applet.update();
    });
  });


/**
 * Factory function to create a "Trip" tool.
 * @param {string} name - The name of the tool.
 * @param {number} tripIndex - The index of the trip to calculate (1, 2, or 3).
 */
function createTripTool(name, tripIndex) {
  return new Tool(name)
    .setIcon("fa-solid fa-shoe-prints")
    .on("start", function () {
      this.applet.ic.initInput()
        .then(this.applet.ic.input('.vertex'))
        .then(async (values) => {
          const vertexId = values[0].id;
          const res = await fetch(`analyzerApplet/get_trip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataset: this.applet.app.selectedDataset, vertexId, tripIndex })
          });
          const json = await res.json();
          this.applet.edgePaths.push(json.trip);
          this.applet.update();
          this.restartTool();
        })
        .catch(err => {
          if (err !== 'abort') this.restartTool();
        });
    })
    .on("stop", function () {
      this.applet.ic.abortInput();
    });
}

const edgeTrips = new Tool("edgeTrips")
  .setIcon("fa-solid fa-route")
  .on("start", function () {
    const self = this;
    this.applet.ic.initInput()
      .then(this.applet.ic.input('.edge'))
      .then(values => {
        const edgeId = values[0].id;
        console.log("Fetching edge trips for edge", edgeId, "in dataset", self.applet.app.selectedDataset);
        return fetch(`analyzerApplet/get_edge_trips/${encodeURIComponent(self.applet.app.selectedDataset)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strand_id: edgeId })
        });
      })
      .then(res => {
        if (!res.ok) throw new Error('Error fetching edge trips');
        return res.json();
      })
      .then(json => {
        json.trips.forEach(trip => self.applet.edgePaths.push(trip));
        self.applet.update();
        self.applet.selectTool(self.applet.defaultTool);
      })
      .catch(err => {
        if (err !== 'abort') self.restartTool();
      });
  })
  .on("stop", function () {
    this.applet.ic.abortInput();
  });

const cycleFace = new Tool("cycle_face")
  .setIcon("fa-solid fa-gear")
  .on("init", function () {
    this.addSetting("invert", new BinaryChoice("false", "true"));
  })
  .on("start", function () {
    this.applet.ic.initInput()
      .then(this.applet.ic.input('.face'))
      .then(values => {
        const faceId = values[0].id;
        const inverse = this.settings.invert.getValue();
        return callBackend(this, 'cycle_face', { face_id: faceId, inverse: inverse==='true' });
      })
      .then(() => {
        this.restartTool();
        this.applet.update();
      })
      .catch(err => {
        if (err !== 'abort') this.restartTool();
      }).finally(() => {
      });
  })
  .on("stop", function () {
    this.applet.ic.abortInput();
  });

const squareMove = new Tool("square_move")
  .setIcon("fa-regular fa-square")
  .on("start", function () {
    this.applet.ic.initInput()
      .then(this.applet.ic.input('.face'))
      .then(values => {
        const faceId = values[0].id;
        return callBackend(this, 'square_move', { face_id: faceId });
      })
      .then(() => {
        this.restartTool();
        this.applet.update();
      })
      .catch(err => {
        if (err !== 'abort') this.restartTool();
      })
      .finally(() => {
      });
  })
  .on("stop", function () {
    this.applet.ic.abortInput();
    console.log("Stopped square move tool");
  });

const separationLabeling = new Tool("separation_labeling")
  .setIcon("fa-solid fa-brush")
  .on("start", function () {
    this.applet.ic.initInput()
      .then(this.applet.ic.input('.face'))
      .then(values => {
        const faceId = values[0].id;
        this.applet.showEdgeLabels = true;
        return callBackend(this, 'separation_labeling', { face_id: faceId });
      })
      .then(() => {
        this.applet.update();
        this.restartTool();
        //this.applet.selectTool(this.applet.defaultTool);
      })
      .catch(err => {
        if (err !== 'abort') this.restartTool();
      })
      .finally(() => {

      });
  })
  .on("stop", function () {
    this.applet.ic.abortInput();
  });

const clearPaths = new Tool("clearPaths")
  .setIcon("fa-solid fa-xmark")
  .on("start", function () {
    this.applet.edgePaths = [];
    this.applet.highlightedPath = null;
    this.applet.update();
    this.applet.selectTool(this.applet.defaultTool);
  });

const clearEdgeLabels = new Tool("clearEdgeLabels")
  .setIcon("fa-solid fa-xmark")
  .on("start", function () {
    this.applet.showEdgeLabels = false;
    this.applet.update();
    this.applet.selectTool(this.applet.defaultTool);
  });

const toggleLabels = new Tool("toggleVertexLabels")
  .setIcon("fa-solid fa-tags")
  .on("start", function () {
    this.applet.showLabels = !this.applet.showLabels;
    this.applet.update();
    this.applet.selectTool(this.applet.defaultTool);
  });

analyzer.addTool(defaultToolAnalyzer, true);
//analyzer.addTool(createTripTool("Trip1", 1));
//analyzer.addTool(createTripTool("Trip2", 2));
//analyzer.addTool(createTripTool("Trip3", 3));
analyzer.addTool(edgeTrips);
analyzer.addTool(separationLabeling);
analyzer.addTool(cycleFace);
analyzer.addTool(squareMove);
analyzer.addTool(clearPaths);
analyzer.addTool(clearEdgeLabels);
analyzer.addTool(analyzerTutteLayout);
analyzer.addTool(toggleLabels);
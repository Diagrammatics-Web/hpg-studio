var ic = new InputController();
analyzer = new Applet({vertices:[], edges:[], faces:[]});
analyzer.size = 750;
analyzer.ic = ic;
analyzer.edgePaths = [];
analyzer.highlightedPath = null;
analyzer.showLabels = false;
analyzer.showEdgeLabels = false;

// bring graph to frontend and preprocess data
analyzer.preprocess_data = function() {
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

analyzer.fetchData = async function() {
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

analyzer.update = function() {
  if (!this.data) return;

  function hp(edge) {
      var path = d3.path();
      var start = edge.source;
      var end = edge.target;
      var v = {x: (end.x-start.x)/4, y: (end.y-start.y)/4};
      var factor = (-(edge.multiplicity-1)/2+edge.index);
      var phi = 40*Math.PI/180;
      var looseness = 1.5;
      var dir = {x:v.x*Math.cos(factor*phi)+v.y*Math.sin(factor*phi),y:-v.x*Math.sin(factor*phi)+v.y*Math.cos(factor*phi)};

      path.moveTo(analyzer.x(start.x), analyzer.y(start.y));

  		path.bezierCurveTo(analyzer.x(start.x+looseness*dir.x),
                         analyzer.y(start.y+looseness*dir.y),
                         analyzer.x(end.x-looseness*dir.x),
                         analyzer.y(end.y-looseness*dir.y),
                         analyzer.x(end.x),
                         analyzer.y(end.y));
      return path;
  }

  this.edges.selectAll(".edge").data(this.data.edges, d => d.id)
    .join("path")
    .attr("class", "edge")
    .attr("id", d=>`edge-${d.id}`)
    .attr("d", d=>hp(d))
    .attr("fill", "none")
    .attr("stroke-width",d => (this.highlightedPath != null && this.edgePaths[this.highlightedPath].indexOf(d.id) > -1) ? 4 : 2)
    .attr("stroke", d => (this.highlightedPath != null && this.edgePaths[this.highlightedPath].indexOf(d.id) > -1) ? d3.schemeCategory10[this.highlightedPath] : "black");

  this.vertices.selectAll(".vertex").data(this.data.vertices, d => d.id)
    .join("circle")
    .attr("class", d => "vertex " + (d.filled ? "filled" : "unfilled"))
    .attr("cx", d => this.x(d.x))
    .attr("cy", d => this.y(d.y))
    .attr("r", 4);

  this.vertices.selectAll(".vertex-label").data(this.data.vertices, d => d.id)
    .join("text")
    .attr("class", "vertex-label")
    .attr("x", d => this.x(d.x-0.3))
    .attr("y", d => this.y(d.y+0.3))
    .text(d => this.showLabels ? d.id : "");

  this.edges.selectAll(".hourglass-label-background").data(this.data.edges, d => d.id)
    .join("circle")
    .attr("class", "hourglass-label-background")
    .attr("cx", function(d) {
      var pnode = d3.select(`#edge-${d.id}`).node();
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
};

analyzer.renderContentArea = function() {
  if (!this.app.selectedDataset) {
    this.app.updateStatus("Please select a dataset first.");
    this.app.selectApplet(0); // Redirect to HPGs applet
    return;
  }
  this.x = d3.scaleLinear().domain([-11,11]).range([0, this.size]);
  this.y = d3.scaleLinear().domain([-11,11]).range([this.size, 0]);

  d3.select("#content-area").selectAll("*").remove();
  this.svg = d3.select("#content-area")
   .append("svg")
   .attr("id", "paper")
   .attr("width", this.size)
   .attr("height", this.size);

  this.canvasObjects = this.svg.append("g");

  this.faces = this.canvasObjects.append("g").attr("id", "faces");
  this.edges = this.canvasObjects.append("g").attr("id", "edges");
  this.vertices = this.canvasObjects.append("g").attr("id", "vertices");
  this.paths = this.canvasObjects.append("g").attr("id", "edgePaths");

  this.zoomed = d3.zoom()
      .translateExtent([[0, 0], [this.size, this.size]])
      .scaleExtent([1, 8])
      .on("zoom", e => this.canvasObjects.attr("transform", e.transform));

  this.fetchData();
  this.selectTool(this.defaultTool);
};

async function callBackend(tool, endpoint, body) {
    try {
        const res = await fetch(`analyzerApplet/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, dataset: tool.applet.app.selectedDataset })
        });
        if (!res.ok) {
            const err = await res.json();
            tool.applet.app.updateStatus(`Error: ${err.error}`);
            return null;
        }
        const json = await res.json();
        tool.applet.data = json.data;
        tool.applet.preprocess_data();
        tool.applet.update();
        tool.restartTool();
    } catch (err) {
        console.error(`Error calling ${endpoint}:`, err);
        tool.applet.app.updateStatus(`Error: ${err.message}`);
    }
}

const panAndZoomAnalyzer = new Tool("panAndZoom")
  .setIcon("fa-solid fa-hand")
  .on("start", function() {
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "move");
    this.applet.svg.call(this.applet.zoomed);
  })
  .on("stop", function() {
    if (this.applet.svg) {
      this.applet.svg.on('.zoom', null);
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });
analyzer.addTool(panAndZoomAnalyzer, true);

const toggleLabels = new Tool("toggleLabels")
    .setIcon("fa-solid fa-tags")
    .on("start", function() {
        this.applet.showLabels = !this.applet.showLabels;
        this.applet.update();
        this.applet.selectTool(this.applet.defaultTool);
    });
analyzer.addTool(toggleLabels);

const analyzerTutteLayout = new Tool("tutteLayout")
    .setIcon("fa-solid fa-diagram-project")
    .on("start", function() {
        callBackend(this, 'tutte_layout', {});
        this.applet.selectTool(this.applet.defaultTool);
    });
analyzer.addTool(analyzerTutteLayout);


function createTripTool(name, tripIndex) {
    return new Tool(name)
        .setIcon("fa-solid fa-shoe-prints")
        .on("start", function() {
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
        .on("stop", function() {
            this.applet.ic.abortInput();
        });
}

analyzer.addTool(createTripTool("Trip1", 1));
analyzer.addTool(createTripTool("Trip2", 2));
analyzer.addTool(createTripTool("Trip3", 3));

const edgeTrips = new Tool("edge_trips")
    .setIcon("fa-solid fa-road")
    .on("start", function() {
        this.applet.ic.initInput()
            .then(this.applet.ic.input('.edge'))
            .then(async (values) => {
                const edgeId = values[0].id;
                const res = await fetch(`analyzerApplet/get_edge_trips`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dataset: this.applet.app.selectedDataset, edgeId })
                });
                const json = await res.json();
                json.trips.forEach(trip => this.applet.edgePaths.push(trip));
                this.applet.update();
                this.restartTool();
            })
            .catch(err => {
                if (err !== 'abort') this.restartTool();
            });
    })
    .on("stop", function() {
        this.applet.ic.abortInput();
    });
analyzer.addTool(edgeTrips);

const cycleFace = new Tool("cycle_face")
    .setIcon("fa-solid fa-rotate")
    .on("init", function() {
        this.addSetting("invert", new BinaryChoice(false, true));
    })
    .on("start", function() {
        this.applet.ic.initInput()
            .then(this.applet.ic.input('.face'))
            .then(values => {
                const faceId = values[0].id;
                const inverse = this.settings.invert.getValue();
                callBackend(this, 'cycle_face', { face_id: faceId, inverse: inverse });
                this.restartTool();
            })
            .catch(err => {
                if (err !== 'abort') this.restartTool();
            });
    })
    .on("stop", function() {
        this.applet.ic.abortInput();
    });
analyzer.addTool(cycleFace);

const squareMove = new Tool("square_move")
    .setIcon("fa-solid fa-square-pen")
    .on("start", function() {
        this.applet.ic.initInput()
            .then(this.applet.ic.input('.face'))
            .then(values => {
                const faceId = values[0].id;
                callBackend(this, 'square_move', { face_id: faceId });
                this.restartTool();
            })
            .catch(err => {
                if (err !== 'abort') this.restartTool();
            });
    })
    .on("stop", function() {
        this.applet.ic.abortInput();
    });
analyzer.addTool(squareMove);

const separationLabeling = new Tool("separation_labeling")
    .setIcon("fa-solid fa-palette")
    .on("start", function() {
        this.applet.ic.initInput()
            .then(this.applet.ic.input('.face'))
            .then(values => {
                const faceId = values[0].id;
                this.applet.showEdgeLabels = true;
                callBackend(this, 'separation_labeling', { face_id: faceId });
                this.restartTool();
            })
            .catch(err => {
                if (err !== 'abort') this.restartTool();
            });
    })
    .on("stop", function() {
        this.applet.ic.abortInput();
    });
analyzer.addTool(separationLabeling);

const clearPaths = new Tool("clearPaths")
    .setIcon("fa-solid fa-xmark")
    .on("start", function() {
        this.applet.edgePaths = [];
        this.applet.highlightedPath = null;
        this.applet.update();
        this.applet.selectTool(this.applet.defaultTool);
    });
analyzer.addTool(clearPaths);
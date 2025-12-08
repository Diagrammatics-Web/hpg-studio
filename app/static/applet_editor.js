var ic = new InputController();
editor = new Applet({vertices:[], edges:[]});
editor.size = 750;
editor.ic = ic;
editor.hasUnsavedChanges = false; // New flag for unsaved changes

/**
 * Preprocesses graph data after fetching. It resolves vertex object references for edges.
 */
editor.preprocess_data = function() {
  maxVertexId = Math.max(...editor.data.vertices.map(v => v.id)) + 1;

  // add references to source and target vertices
  // TODO: This assumes vertex IDs are unique and present.
  this.data.edges.forEach(function(edge, i) {
    edge.source = editor.data.vertices.filter(vertex => vertex.id == edge.sourceId)[0];
    edge.target = editor.data.vertices.filter(vertex => vertex.id == edge.targetId)[0];
    edge.id = i;
  });
}

// After initial load or data fetch, assume no unsaved changes
editor.hasUnsavedChanges = false;

/**
 * Fetches the graph data for the currently selected dataset from the backend.
 */
editor.fetchData = async function() {
  const res = await fetch(`editorApplet/getData/${encodeURIComponent(this.app.selectedDataset)}`);
  const json = await res.json();
  console.log(json);
  this.data = json.data;
  console.log("Fetched data for editor:", this.data);
  this.preprocess_data();
  this.update();
}



/**
 * Redraws the SVG canvas, updating vertices, edges, and labels based on the current data.
 */
editor.update = function() {
  // Update vertices.
  this.vertices.selectAll(".vertex").data(this.data.vertices, (d, i) => i)
    .join(
      enter => enter.append("circle"),
      update => update,
      exit => exit.remove()
    )
    .attr("class", d => "vertex " + (d.filled ? "filled-vertex" : "unfilled-vertex"))
    .attr("cx", d => this.x(d.x))
    .attr("cy", d => this.y(d.y))
    .attr("r", 3.5);

  // Update edges
  this.edges.selectAll(".edge-line").data(this.data.edges)
    .join(
      enter => enter.append("line"),
      update => update,
      exit => exit.remove()
    )
    .attr("class", "edge-line")
    .attr("x1", d => this.x(d.source.x))
    .attr("y1", d => this.y(d.source.y))
    .attr("x2", d => this.x(d.target.x))
    .attr("y2", d => this.y(d.target.y));

  // Update edge multiplicity labels with background
  const multiplicityGroups = this.edges.selectAll(".edge-multiplicity-group").data(this.data.edges)
    .join(
      enter => enter.append("g").attr("class", "edge-multiplicity-group"),
      update => update,
      exit => exit.remove()
    )
    .attr("transform", d => `translate(${(this.x(d.source.x) + this.x(d.target.x)) / 2}, ${(this.y(d.source.y) + this.y(d.target.y)) / 2})`);

  // Add background circle
  multiplicityGroups.selectAll("circle.edge-multiplicity-bg").data(d => [d])
    .join(
      enter => enter.insert("circle", ":first-child"),
      update => update
    )
    .attr("class", "edge-multiplicity-bg")
    .attr("r", 10);

  // Add text
  multiplicityGroups.selectAll("text").data(d => [d])
    .join(
      enter => enter.append("text"),
      update => update
    )
    .attr("class", "edge-multiplicity")
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .text(d => d.multiplicity);
}

/**
 * Gets the index of a vertex object within the applet's data array.
 * @param {object} vertexObject - The vertex data object to find.
 * @returns {number} The index of the vertex, or -1 if not found.
 */
editor._getVertexIndex = function(vertexObject) {
  // The input function returns the vertex data object directly
  // Find its index in the vertices array
  for (let i = 0; i < this.data.vertices.length; i++) {
    if (this.data.vertices[i] === vertexObject) {
      return i;
    }
  }
  console.error("Vertex not found in data", vertexObject);
  return -1;
};

/*********************
* Zoom and Pan tool  *
*********************/
panAndZoom = new Tool("panAndZoom")
  .setIcon("fa-solid fa-hand")
  .on("start", function() {
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "move");
    this.applet.svg.call(this.applet.zoomed);
  })
  .on("reset", function() {
    this.applet.svg.call(this.applet.zoomed.transform, d3.zoomIdentity)
  })
  .on("stop", function() {
    if (this.applet.svg) {
      this.applet.svg.on('.zoom', null);
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });


/*********************
* Place Vertex tool  *
*********************/
placeVertex = new Tool("placeVertex")
  .setIcon("fa-solid fa-circle-plus")
  .on("init", function(){
    this.addSetting("vertexType", new BinaryChoice("filled", "unfilled"));
  })
  .on("start", function() {
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "pointer");
    this.applet.ic.initInput()
        .then(this.applet.ic.inputXY("#paper"))
        .then(value => {
          console.log("done", value);
          var xy = value[0];
          var transform = d3.zoomTransform(this.applet.canvasObjects.node());
          xy = transform.invert(xy);
          // Get vertex type from settings
          var vertexType = this.settings.vertexType.getValue();
          this.applet.data.vertices.push({
            id: maxVertexId,
            x: this.applet.x.invert(xy[0]),
            y: this.applet.y.invert(xy[1]),
            filled: vertexType === "filled",
            boundary: false
          });
          maxVertexId++;
          this.applet.hasUnsavedChanges = true; // Mark as unsaved
          this.applet.update();
          this.restartTool();
        })
        .catch(value => {
          console.log(value);
          if(value!="abort") {
            console.log("not abort");
            this.restartTool();
          }
        });
  })
  .on("stop", function() {
    this.applet.ic.abortInput();
    if (this.applet.svg) {
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });

/*********************
* Place Edge tool    *
*********************/
placeEdge = new Tool("placeEdge")
  .setIcon("fa-solid fa-share-nodes")
  .on("init", function(){
    this.addSetting("multiplicity", new Counter(1));
  })
  .on("start", function() {
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "pointer");
    var tool = this;
    this.applet.ic.initInput()
        .then(this.applet.ic.input(".vertex"))
        .then(this.applet.ic.input(".vertex"))
        .then(values => {
            console.log("done", values);
            var source = values[0];
            var target = values[1];
            var multiplicity = tool.settings.multiplicity.getValue();
            console.log("Adding edge", source, target, multiplicity);
            // Do not create self-edges
            if (source === target) {
              console.log("Selected same vertex for sourceId and targetId; skipping self-edge");
              tool.applet.update();
              tool.restartTool();
              return;
            }

            // If an edge between these vertices already exists (undirected), add multiplicities
            var existing = tool.applet.data.edges.find(e => (e.source === source && e.target === target) || (e.source === target && e.target === source));
            if (existing) {
              existing.multiplicity = (existing.multiplicity || 0) + multiplicity;
              console.log("Merged multiplicity into existing edge", existing);
            } else {
              tool.applet.data.edges.push({
                source: source,
                target: target,
                multiplicity: multiplicity
              });
            }
            tool.applet.hasUnsavedChanges = true; // Mark as unsaved
            tool.applet.update();
            tool.restartTool();
        })
        .catch(value => {
          console.log(value);
          tool.applet.update();
          if(value!="abort") {
            tool.restartTool();
          }
        });
  })
  .on("stop", function() {
    this.applet.ic.abortInput();
    if (this.applet.svg) {
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });

editor.addTool(panAndZoom, true);
editor.addTool(placeVertex);
editor.addTool(placeEdge);

/**
 * Change Multiplicity tool. Click an existing edge, then input an integer to set its multiplicity.
 */
changeMultiplicity = new Tool("changeMultiplicity")
  .setIcon("fa-solid fa-pen-to-square")
  .on("start", function() {
    var tool = this;
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "pointer");
    this.applet.ic.initInput()
      .then(this.applet.ic.input('.edge-line, .edge-multiplicity-group'))
      .then(this.applet.ic.inputInteger("Select new multiplicity for the selected edge:"))
      .then(values => {
        var edge = values[0];
        var newVal = values[1];
        if (edge) {
            edge.multiplicity = newVal;
            tool.applet.hasUnsavedChanges = true; // Mark as unsaved
            tool.applet.update();
        }
        tool.restartTool();

      })
      .catch(err => {
        console.log('edge selection aborted', err);
        if(err!="abort") {
            tool.restartTool();
        }
      });
  })
  .on("stop", function() {
    this.applet.ic.abortInput();
    if (this.applet.svg) {
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });

editor.addTool(changeMultiplicity);

const saveGraph = new Tool("save")
  .setIcon("fa-solid fa-save")
  .on("start", function() {
    const tool = this;
    const applet = this.applet;
    const datasetName = applet.app.selectedDataset;

    if (!datasetName) {
      applet.app.updateStatus("No dataset selected to save to.");
      applet.selectTool(applet.defaultTool);
      return;
    }

    // Prepare data for serialization: convert vertex objects in edges back to IDs
    const edgesForSave = applet.data.edges.map(e => ({
      sourceId: e.source.id,
      targetId: e.target.id,
      multiplicity: e.multiplicity
    }));

    const dataToSave = {
      vertices: applet.data.vertices,
      edges: edgesForSave
    };

    console.log(edgesForSave)

    fetch(`/editorApplet/saveData/${encodeURIComponent(datasetName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSave)
    })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`Save failed: ${res.statusText}`)))
    .then(data => {
      applet.app.updateStatus(`Dataset '${data.name}' saved successfully.`);
      tool.applet.hasUnsavedChanges = false; // Mark as saved
    })
    .catch(err => {
      applet.app.updateStatus(`Error saving: ${err.message}`);
      console.error('Error saving graph:', err);
    })
    .finally(() => applet.selectTool(applet.defaultTool));
  });
editor.addTool(saveGraph);

/**
 * Delete tool. Click a vertex to delete it and all its incident edges, or click an edge to delete just that edge.
 */
deleteElement = new Tool("deleteElement")
  .setIcon("fa-solid fa-eraser")
  .on("start", function() {
    var tool = this;
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "pointer");
    this.applet.ic.initInput()
      .then(this.applet.ic.input('.vertex, .edge-line, .edge-multiplicity-group'))
      .then(values => {
        var element = values[0];
        
        // Check if it's a vertex
        var vertexIndex = tool.applet._getVertexIndex(element);
        if (vertexIndex >= 0) {
          // It's a vertex: delete it and all incident edges
          tool.applet.data.edges = tool.applet.data.edges.filter(e => e.source !== element && e.target !== element);
          tool.applet.data.vertices.splice(vertexIndex, 1);
        } else {
          // Try as an edge
          var edgeIndex = tool.applet.data.edges.indexOf(element);
          if (edgeIndex >= 0) {
            tool.applet.data.edges.splice(edgeIndex, 1);
          }
        }
        
        tool.applet.hasUnsavedChanges = true; // Mark as unsaved
        tool.applet.update();
        tool.restartTool();
      })
      .catch(err => {
        console.log('element selection aborted', err);
        if (err !== "abort") {
          tool.restartTool();
        }
      });
  })
  .on("stop", function() {
    this.applet.ic.abortInput();
    if (this.applet.svg) {
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });

editor.addTool(deleteElement);



/**
 * Renders the main content area for the editor, setting up the SVG canvas, scales, and zoom behavior.
 */
editor.renderContentArea = function() {
  if (!this.app.selectedDataset) {
    this.app.updateStatus("Please select a dataset first.");
    this.app.selectApplet(0); // Redirect to HPGs applet
    return;
  }

/*
 *  Initialize Canvas
 */
var maxVertexId = 0;
var body = d3.select("body");
this.x = d3.scaleLinear().domain([-11,11]).range([0, this.size]);
this.y = d3.scaleLinear().domain([-11,11]).range([this.size, 0]);

var selectedIds = []; // ids of selected vertices
var selected = []; // selected vertices
var highlightedPath = null;

// init graph canvas
d3.select("#content-area").selectAll("*").remove();
this.svg = d3.select("#content-area")
 .append("svg")
 .attr("id", "paper")
 .attr("width", this.size)
 .attr("height", this.size);

this.canvasObjects = this.svg.append("g");

// init groups for edges and vertices
this.edges = this.canvasObjects.append("g").attr("id", "edges");
this.vertices = this.canvasObjects.append("g").attr("id", "vertices");

this.zoomed = d3.zoom()
    .translateExtent([[0, 0], [this.size, this.size]])
    .scaleExtent([1, 8])
    .on("zoom", e => this.canvasObjects.attr("transform", e.transform));

this.fetchData();
}



/**
 * D3 drag handler for moving vertices.
 */
editor.dragHandler = d3.drag()
  .on("start", function(event, d) {
    d3.select(this).classed("selected", true);
  })
  .on("drag", function(event, d) {
    d.x += editor.x.invert(event.dx)-editor.x.invert(0);
    d.y += editor.y.invert(event.dy)-editor.y.invert(0);
    editor.hasUnsavedChanges = true; // Mark as unsaved
    editor.update();
    d3.select(this).classed("selected", true);
  })
  .on("end", function(event, d) {
    d3.select(this).classed("selected", false);
    editor.update();
    editor.svg.selectAll(".vertex").classed("selectable", true);
  });

/**
 * D3 drag handler to disable dragging behavior.
 */
editor.nodrag = d3.drag()
  .on("start", null)
  .on("drag", null)
  .on("end", null);



/*********************
* Move Vertex tool  *
*********************/
moveVertex = new Tool("moveVertex")
  .setIcon("fa-solid fa-arrows-up-down-left-right")
  .on("start", function() {
    var tool = this;
    this.currentCursor = this.applet.svg.style("cursor");
    this.applet.svg.style("cursor", "pointer");
    this.applet.svg.selectAll(".vertex")
      .classed("selectable", true)
      .call(this.applet.dragHandler);
  })
  .on("stop", function() {
    if (this.applet.svg) {
      this.applet.svg.selectAll(".vertex")
        .call(this.applet.nodrag)
        .classed("selectable", false);
      this.applet.svg.style("cursor", this.currentCursor);
    }
  });

editor.addTool(moveVertex);

const tutteLayout = new Tool("tutteLayout")
  .setIcon("fa-solid fa-diagram-project")
  .on("start", function() {
    const tool = this;
    const applet = this.applet;
    const datasetName = applet.app.selectedDataset;

    if (!datasetName) {
      applet.app.updateStatus("No dataset selected for layout.");
      applet.selectTool(applet.defaultTool);
      return;
    }

    fetch(`/editorApplet/tutteLayout/${encodeURIComponent(datasetName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`Tutte layout failed: ${res.statusText}`)))
    .then(data => {
      applet.app.updateStatus(`Tutte layout applied to '${data.name}'.`);
      applet.data = data.data;
      applet.preprocess_data();
      applet.update();
      applet.hasUnsavedChanges = true; // Layout is a change that should be saved
    })
    .catch(err => {
      applet.app.updateStatus(`Error applying layout: ${err.message}`);
      console.error('Error applying Tutte layout:', err);
    })
    .finally(() => applet.selectTool(applet.defaultTool));
  });
editor.addTool(tutteLayout);
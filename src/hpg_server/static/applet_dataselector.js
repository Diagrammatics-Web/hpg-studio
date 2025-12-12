var ic = new InputController();
dataSelector = new Applet({hpgs:[]});

/**
 * Renders the content area for the Data Selector, showing a list of available HPGs.
 */
dataSelector.renderContentArea = function() {
  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = `
    <h2>Available HPGs</h2>
    <div style="display:flex; gap:20px; align-items:flex-start;">
      <ul id="dataset-list" class="list-selector" ></ul>
    </div>
  `;

  this.selectTool(refreshList)
}

/**
 * Updates the list of HPGs displayed in the UI.
 */
dataSelector.update = function() {
const ul = d3.select('#dataset-list');
ul.selectAll(".hpg-list-item").data(this.data.hpgs)
  .join(
    enter => enter.append("li"),
    update => update,
    exit => exit.remove()
  )
  .attr("class", "hpg-list-item")
  .attr("tabindex", 0)
  .text(d => d)
  .classed("chosen", d => d == this.app.selectedDataset);

}

selectDataset = new Tool("select HPG")
  .setIcon("fa-solid fa-hand-pointer")
  .on("start", function() {
    ic.initInput()
      .then(ic.input('.hpg-list-item'))
      .then(values => {
        var name = values[0];
        if (name) {
            this.applet.app.selectedDataset = name;
            this.applet.app.updateStatus(`Selected dataset '${name}'`);
            this.applet.app.updateDatasetIndicator();
            this.applet.update();
        }
        this.restartTool();
        
      })
      .catch(err => {
        console.log('hpg selection aborted', err);
        if(err!="abort") {
            this.restartTool();
        }
      });
  });

dataSelector.addTool(selectDataset, true);

refreshList = new Tool("refreshList")
  .setIcon("fa-solid fa-sync")
  .on("start", function() {
    fetch('/datasets')
      .then(res => res.json())
      .then(json => {
        this.applet.data.hpgs = json.datasets;
        this.applet.update();
        this.applet.selectTool(this.applet.defaultTool);
      })
      .catch(err => {
        console.error('Error refreshing dataset list:', err);
      });
  });

dataSelector.addTool(refreshList);

newHPG = new Tool("new")
  .setIcon("fa-solid fa-plus")
  .on("start", function() {
    var tool = this;
    ic.initInput()
      .then(ic.inputString("Name:"))
      .then(ic.inputInteger("Number of boundary vertices:"))
      .then(values => fetch('/datasets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({name:values[0],boundaryVertices:values[1]}) }))
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then(data => {
        this.applet.app.updateStatus(`Created dataset '${data.name}'`);
        this.applet.selectTool(refreshList);
      })
      .catch(err => {
        console.log('new hpg aborted', err);
        this.applet.selectTool(this.applet.defaultTool);
        /*if(err!="abort") {
            tool.restartTool();
        }*/
      });
  });

dataSelector.addTool(newHPG);

duplicateHPG = new Tool("duplicate")
  .setIcon("fa-solid fa-copy")
  .on("start", function() {
    const tool = this;
    ic.initInput()
      .then(ic.input('.hpg-list-item'))
      .then(ic.inputString("Enter name for the new duplicate HPG:"))
      .then(values => {
        const [sourceName, newName] = values;
        return fetch('/datasets/duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceName, newName })
        });
      })
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then(data => {
        tool.applet.app.updateStatus(`Duplicated '${data.sourceName}' to '${data.newName}'.`);
        tool.applet.selectTool(refreshList);
      })
      .catch(err => {
        console.log('HPG duplication aborted', err);
        tool.applet.selectTool(tool.applet.defaultTool);
      });
  });

dataSelector.addTool(duplicateHPG);
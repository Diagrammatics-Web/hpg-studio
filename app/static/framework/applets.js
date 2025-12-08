class Applet {
  constructor(data = [], renderContentArea = Function(), update = Function()) {
    this.data = data;
    this.tools = [];
    this.defaultTool = undefined;
    this.selectedTool = undefined;
    this.app = undefined;
    this.renderContentArea = renderContentArea;
    this.update = update;
  }
  addTool(tool, isDefault = false) {
    this.tools.push(tool);
    if(isDefault) {
      this.defaultTool = tool;
    }
    tool.applet = this;
    tool.initializeTool();
  }
  selectTool(tool) {
    if(this.selectedTool != undefined) {
      this.selectedTool.stopTool();
    }

    // Update the UI to reflect the new tool selection
    const toolRadio = document.querySelector(`input[name="tools"][value="${tool.name}"]`);
    if (toolRadio) {
      toolRadio.checked = true;
    }

    this.selectedTool = tool;
    this.selectedTool.startTool();
  }
  createSettingsToolbar(settings) {
    d3.selectAll('.tool-settings-inline').classed("open", false);
    const toolSettingsInline = d3.select(`#settings-${this.selectedTool.name}`);
    toolSettingsInline.selectAll("*").remove();
        // Iterate through settings object and create HTML for each
    for (const [settingName, settingObject] of Object.entries(settings)) {
      const settingElement = settingObject.createHTML(settingName);
      toolSettingsInline.node().appendChild(settingElement);
    }
    if(settings && Object.keys(settings).length > 0) {
      toolSettingsInline.classed("open", true);
    }

  }
  

  run() {
    const toolsContainer = document.getElementById("tools-container");
    toolsContainer.innerHTML = '';
    const groupDiv = document.createElement('div'); groupDiv.className = 'tool-group';
    const radioName = 'tools';
    this.tools.forEach((tool, tIdx) => {
      const label = document.createElement('label');
      label.className = 'tool-item';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = radioName; radio.value = tool.name;
      radio.addEventListener('change', () => this.selectTool(tool));

      const visual = document.createElement('span');
      visual.className = 'tool-visual';
      const icon = document.createElement('i');
      icon.className = tool.icon;
      visual.appendChild(icon);
      visual.appendChild(document.createTextNode(tool.name));
      label.appendChild(radio);
      label.appendChild(visual);

      const settingsContainer = document.createElement('div');
      settingsContainer.className = 'tool-settings-inline';
      settingsContainer.id = `settings-${tool.name}`;
      label.appendChild(settingsContainer);

      groupDiv.appendChild(label);
      if (tool==this.defaultTool) { radio.checked = true; }
    });
    toolsContainer.appendChild(groupDiv);
    this.renderContentArea();
  }

}
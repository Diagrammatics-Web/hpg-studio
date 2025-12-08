class App {
  constructor() {
    this.applets = [];
    this.ribbon = document.getElementById("applet-ribbon");
    this.tabsContainer = document.getElementById("applet-tabs");
    this.datasetIndicator = document.getElementById("dataset-indicator");
    this.toolsContainer = document.getElementById("tools-container");
    this.toolSettings = document.getElementById("tool-settings");
    this.contentArea = document.getElementById("content-area");
    this.statusBar = document.getElementById("status-bar");

    this.currentAppletInfo = null;
    this.selectedDataset = null;
  }

  addApplet(name, applet, icon) {
    this.applets.push({ name, applet, icon });
    applet.app = this; // Give applet a reference to the app
  }

  updateStatus(message) {
    this.statusBar.textContent = `Status: ${message}`;
  }

  updateDatasetIndicator() {
    const label = this.selectedDataset
      ? `<i class="fa-solid fa-circle-nodes"></i> <em>${this.selectedDataset}</em>`
      : `<i class="fa-solid fa-circle-nodes"></i> <em>none selected</em>`;
    this.datasetIndicator.innerHTML = label;
  }

  buildRibbon() {
    const groupName = 'applet-tabs';
    this.tabsContainer.innerHTML = '';
    this.applets.forEach((appletInfo, index) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'applet-tab';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = groupName;
      radio.value = appletInfo.name;
      radio.addEventListener('change', () => this.selectApplet(index));
      const visual = document.createElement('span');
      visual.className = 'tab-visual';
      const icon = document.createElement('i');
      icon.className = appletInfo.icon;
      visual.appendChild(icon);
      visual.appendChild(document.createTextNode(appletInfo.name));
      wrapper.appendChild(radio);
      wrapper.appendChild(visual);
      this.tabsContainer.appendChild(wrapper);
      if (index === 0) radio.checked = true;
    });
    this.updateDatasetIndicator();
  }

  selectApplet(newAppletIndex) {
    const newAppletInfo = this.applets[newAppletIndex];
    const oldAppletInfo = this.currentAppletInfo;

    // Handle unsaved changes in Editor
    if (oldAppletInfo && oldAppletInfo.name === "Editor" && editor.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes in the Editor. Do you want to discard them?")) {
        // User cancelled, revert radio button selection and do not switch applet
        const oldAppletRadio = document.querySelector(`input[name="applet-tabs"][value="${oldAppletInfo.name}"]`);
        if (oldAppletRadio) {
          oldAppletRadio.checked = true;
        }
        return; // Stop the applet switch
      } else {
        // User confirmed discarding changes
        editor.hasUnsavedChanges = false;
      }
    }

    // Stop the currently running tool of the old applet, if any
    if (oldAppletInfo && oldAppletInfo.applet.selectedTool) {
      oldAppletInfo.applet.selectedTool.stopTool();
    }

    this.currentAppletInfo = newAppletInfo;
    this.currentAppletInfo.applet.run();
    this.updateStatus(`Selected ${this.currentAppletInfo.name}`);
  }

  run() {
    this.buildRibbon();
    this.selectApplet(0); // default to first applet
  }
}
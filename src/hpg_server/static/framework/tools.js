/**
 * Base Settings class for defining tool settings
 */
class Settings {
  constructor(defaultValue = null) {
    this.value = defaultValue;
  }

  /**
   * Get the current setting value
   */
  getValue() {
    return this.value;
  }

  /**
   * Set the setting value
   */
  setValue(value) {
    this.value = value;
  }

  /**
   * Get all available options for this setting (if applicable)
   */
  getOptions() {
    return null;
  }

  /**
   * Validate the setting value
   */
  isValid(value) {
    return true;
  }

  /**
   * Create HTML element(s) to display and control this setting
   * Returns a DOM element or document fragment
   */
  createHTML() {
    const container = document.createElement('div');
    container.className = 'setting-control';
    container.textContent = 'Setting: ' + this.value;
    return container;
  }

  /**
   * Cleanup resources (override in subclasses if needed)
   */
  destroy() {
    // No-op for base class
  }
}

/**
 * Choices setting: select from a list of discrete options
 * Used for vertex types (filled/unfilled), edge types, etc.
 */
class Choices extends Settings {
  constructor(choices) {
    super(choices[0]);
    this.choices = choices;
  }

  getOptions() {
    return this.choices;
  }

  setValue(value) {
    if (this.isValid(value)) {
      this.value = value;
    }
  }

  isValid(value) {
    return this.choices.includes(value);
  }

  /**
   * Create radio button group for choosing from options
   */
  createHTML(settingName) {
    const container = document.createElement('div');
    container.className = 'choices-setting';
    
    const label = document.createElement('label');
    label.textContent = settingName + ': ';
    label.className = 'setting-label';
    container.appendChild(label);
    
    const radioGroup = document.createElement('div');
    radioGroup.className = 'radio-group';
    
    this.choices.forEach((choice, index) => {
      const radioWrapper = document.createElement('div');
      radioWrapper.className = 'radio-wrapper';
      
      const radioId = settingName + '-' + choice;
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = settingName;
      radio.id = radioId;
      radio.value = choice;
      radio.checked = (choice === this.value);
      radio.addEventListener('change', () => this.setValue(choice));
      
      const radioLabel = document.createElement('label');
      radioLabel.htmlFor = radioId;
      radioLabel.textContent = choice;
      
      radioWrapper.appendChild(radio);
      radioWrapper.appendChild(radioLabel);
      radioGroup.appendChild(radioWrapper);
    });
    
    container.appendChild(radioGroup);
    return container;
  }
}

/**
 * BinaryChoice: a Choices subclass for exactly two options, with shift-key toggling support
 */
class BinaryChoice extends Choices {
  constructor(optionA, optionB) {
    super([optionA, optionB]);
    this.originalValue = this.value;
    this.toggled = false;
    this._shiftListenerAdded = false;
    this._keydownHandler = this._keydownHandler.bind(this);
    this._keyupHandler = this._keyupHandler.bind(this);
    this._htmlContainer = null;
  }

  _keydownHandler(e) {
    if (e.key === "Shift") {
      this.toggle();
      this._updateRadioButtons();
    }
  }
  _keyupHandler(e) {
    if (e.key === "Shift") {
      this.untoggle();
      this._updateRadioButtons();
    }
  }

  _updateRadioButtons() {
    if (this._htmlContainer) {
      const radios = this._htmlContainer.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        radio.checked = (radio.value === this.value);
      });
    }
  }

  _addShiftListeners() {
    if (this._shiftListenerAdded) return;
    this._shiftListenerAdded = true;
    window.addEventListener("keydown", this._keydownHandler);
    window.addEventListener("keyup", this._keyupHandler);
  }

  /**
   * Remove shift event listeners (call when destroying this setting)
   */
  destroy() {
    if (this._shiftListenerAdded) {
      window.removeEventListener("keydown", this._keydownHandler);
      window.removeEventListener("keyup", this._keyupHandler);
      this._shiftListenerAdded = false;
    }
  }

  /**
   * Temporarily toggle to the other option (for shift key)
   */
  toggle() {
    if (!this.toggled) {
      this.originalValue = this.value;
      this.value = this.choices.find(opt => opt !== this.value);
      this.toggled = true;
    }
  }

  /**
   * Restore the original value (when shift released)
   */
  untoggle() {
    if (this.toggled) {
      this.value = this.originalValue;
      this.toggled = false;
    }
  }

  /**
   * Override createHTML to add shift listeners after parent createHTML
   */
  createHTML(settingName) {
    const container = super.createHTML(settingName);
    this._htmlContainer = container;
    this._addShiftListeners();
    return container;
  }
}

/**
 * Counter setting: numeric value (e.g., edge multiplicity)
 * Used for multiplicity, counts, etc.
 */
class Counter extends Settings {
  constructor(initialValue = 0, min = 1, max = Infinity) {
    super(initialValue);
    this.min = min;
    this.max = max;
    this._keydownHandler = this._keydownHandler.bind(this);
    this._keyListenerAdded = false;
    this._htmlContainer = null;
  }

  increment() {
    if (this.value < this.max) {
      this.value++;
    }
  }

  decrement() {
    if (this.value > this.min) {
      this.value--;
    }
  }

  setValue(value) {
    if (this.isValid(value)) {
      this.value = value;
    }
  }

  isValid(value) {
    return typeof value === 'number' && value >= this.min && value <= this.max;
  }

  getMin() {
    return this.min;
  }

  getMax() {
    return this.max;
  }

  /**
   * Create input field with increment/decrement buttons
   */
  createHTML(settingName) {
    const container = document.createElement('div');
    container.className = 'counter-setting';
    
    const label = document.createElement('label');
    label.textContent = settingName + ': ';
    label.className = 'setting-label';
    container.appendChild(label);
    
    const controlsGroup = document.createElement('div');
    controlsGroup.className = 'counter-controls';
    
    const decrementBtn = document.createElement('button');
    decrementBtn.textContent = '−';
    decrementBtn.className = 'counter-btn decrement-btn';
    decrementBtn.addEventListener('click', () => {
      this.decrement();
      valueDisplay.textContent = this.value;
    });
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'counter-value';
    valueDisplay.textContent = this.value;
    
    const incrementBtn = document.createElement('button');
    incrementBtn.textContent = '+';
    incrementBtn.className = 'counter-btn increment-btn';
    incrementBtn.addEventListener('click', () => {
      this.increment();
      valueDisplay.textContent = this.value;
    });
    
    controlsGroup.appendChild(decrementBtn);
    controlsGroup.appendChild(valueDisplay);
    controlsGroup.appendChild(incrementBtn);
    container.appendChild(controlsGroup);
    // store reference to html container and attach global key listener
    this._htmlContainer = container;
    if (!this._keyListenerAdded) {
      window.addEventListener('keydown', this._keydownHandler);
      this._keyListenerAdded = true;
    }

    // expose a small helper to refresh the displayed value if needed
    this._refreshDisplay = () => { valueDisplay.textContent = this.value; };

    return container;
  }

  _keydownHandler(e) {
    // Only react when this setting's HTML is present in the document
    if (!this._htmlContainer || !document.body.contains(this._htmlContainer)) return;
    // Accept both '+' and '=' (some layouts produce '=') and the '-' key
    if (e.key === '+' || e.key === '=') {
      this.increment();
      if (this._refreshDisplay) this._refreshDisplay();
      e.preventDefault();
    } else if (e.key === '-') {
      this.decrement();
      if (this._refreshDisplay) this._refreshDisplay();
      e.preventDefault();
    }
  }

  destroy() {
    if (this._keyListenerAdded) {
      window.removeEventListener('keydown', this._keydownHandler);
      this._keyListenerAdded = false;
    }
    this._htmlContainer = null;
  }
}

class Tool {
  constructor(name) {
    this.name = name;
    this.listeners = {};
    this.applet = undefined;
    this.running = false;
    this.initialized = false;
    this.settings = {};
    this.icon = "fa-solid fa-wrench"; // default icon
  }

  on(eventName, callback) {
    if (typeof callback === 'function') {
        this.listeners[eventName] = callback;
    }
    return this;
  }

  setIcon(iconClass) {
    this.icon = iconClass;
    return this;
  }

  dispatch(eventName, ...args) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].apply(this, args);
    }
  }

  addSetting(name, setting) {
    this.settings[name] = setting;
  }

  initializeTool() {
    if (!this.initialized) {
      this.dispatch('init');
      this.initialized = true;
    }
  }

  startTool() {
    if (!this.running) {
      this.applet.createSettingsToolbar(this.settings);
      this.running = true;
      this.dispatch('start');
    }
  }

  restartTool() {
    this.stopTool();
    this.startTool();
  }

  stopTool() {
    if (this.running) {
      for (const key in this.settings) {
        this.settings[key].destroy();
      }
      this.dispatch('stop');
      this.running = false;
    }
  }
}

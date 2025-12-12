class InputController {
  constructor() {
    this.eventTarget = new EventTarget();
    this.currentSelection = []
  }
  endInput() {
    this.eventTarget.dispatchEvent(new Event("endInput"));
  }
  abortInput() {
    this.eventTarget.dispatchEvent(new Event("abortInput"));
  }
  on(event, callback) {
    this.eventTarget.addEventListener(event, callback);
  }
  initInput() {
    this.currentSelection = [];
    return new Promise( (resolve) => {
      resolve(this.currentSelection);
    });
  }

  // Allows to select points by clicking on the given selector
  inputXY(selector) {
    var self = this;
    return function(current_selection=[]) {
      console.log("Select XY", selector);
      return new Promise( (resolve, reject) => {
        var selectable = d3.selectAll(selector);
        selectable.on("click", (e)=>{
          current_selection.push([e.offsetX, e.offsetY]);
          resolve(current_selection);
          self.endInput();
        });

        self.on("endInput", () => {
          selectable.on("click", false);
        });

        self.on("abortInput", () => {
          console.log("Abort inputXY");
          selectable.on("click", false);
          reject("abort");
        });
      })
    }
  }

  // Allows to select elements by clicking on the given selector
  input(selector) {
    var self = this;
    return function(current_selection=[]) {
      console.log("Select", selector);
      return new Promise( (resolve, reject) => {
        var selectable = d3.selectAll(selector);

        selectable.classed("selectable", true).on("click", (e,d)=>{
          current_selection.push(d);
          d3.select(e.currentTarget).classed("selected", true);
          resolve(current_selection);
          self.endInput();
        });

        d3.select("body").on("keyup", (e) => {
          if(e.keyCode === 27){
            d3.selectAll("selected").classed("selected", false);
            reject("escape");
            self.endInput();
          }
        });

        self.on("endInput", () => {
          selectable.classed("selectable", false).on("click", false);
          d3.select("body").on("keyup", false);
        });

        self.on("abortInput", () => {
          console.log("Abort input");
          selectable.classed("selectable", false).on("click", false);
          d3.selectAll("selected").classed("selected", false);
          d3.select("body").on("keyup", false);
          reject("abort");
        });

      });
    }
  }

  // Prompt for an integer value via an inline overlay
  // Returns a function compatible with the other input helpers
  // If min/max are provided, the overlay will enforce range and prevent submit until valid.
  inputInteger(promptText = "Enter integer:", min = 1, max = Infinity) {
    var self = this;
    return function(current_selection = []) {
      return new Promise((resolve, reject) => {
        // Create overlay elements
        const overlay = document.createElement('div');
        overlay.className = 'ic-overlay';
        const box = document.createElement('div');
        box.className = 'ic-box';
        const label = document.createElement('div');
        label.className = 'ic-label';
        label.textContent = promptText;
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '1';
        if (typeof min === 'number' && isFinite(min)) input.min = String(min);
        if (typeof max === 'number' && isFinite(max)) input.max = String(max);
        input.className = 'ic-input';
        input.autofocus = true;
        const error = document.createElement('div');
        error.className = 'ic-error';
        const buttons = document.createElement('div');
        buttons.className = 'ic-buttons';
        const ok = document.createElement('button');
        ok.textContent = 'OK';
        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';

        buttons.appendChild(ok);
        buttons.appendChild(cancel);
        box.appendChild(label);
        box.appendChild(input);
        box.appendChild(error);
        box.appendChild(buttons);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Focus
        input.focus();

        function cleanup() {
          ok.removeEventListener('click', onOk);
          cancel.removeEventListener('click', onCancel);
          overlay.removeEventListener('keydown', onKeyDown);
          document.body.removeChild(overlay);
        }

        function validateAndResolve() {
          const raw = input.value.trim();
          const v = parseInt(raw, 10);
          if (raw === '') {
            error.textContent = 'Please enter a number';
            return false;
          }
          if (Number.isNaN(v)) {
            error.textContent = 'Invalid integer';
            return false;
          }
          if (typeof min === 'number' && v < min) {
            error.textContent = `Value must be ≥ ${min}`;
            return false;
          }
          if (typeof max === 'number' && v > max) {
            error.textContent = `Value must be ≤ ${max}`;
            return false;
          }
          // valid
          current_selection.push(v);
          resolve(current_selection);
          self.endInput();
          cleanup();
          return true;
        }

        function onOk(e) {
          validateAndResolve();
        }
        function onCancel(e) {
          cleanup();
          reject('escape');
          self.endInput();
        }
        function onKeyDown(e) {
          if (e.key === 'Enter') {
            validateAndResolve();
            e.preventDefault();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }

        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
        overlay.addEventListener('keydown', onKeyDown);

        // allow typing immediately
        input.addEventListener('input', () => { error.textContent = ''; });
      });
    }
  }

inputString(promptText = "Enter string:") {
    var self = this;
    return function(current_selection = []) {
      return new Promise((resolve, reject) => {
        // Create overlay elements
        const overlay = document.createElement('div');
        overlay.className = 'ic-overlay';
        const box = document.createElement('div');
        box.className = 'ic-box';
        const label = document.createElement('div');
        label.className = 'ic-label';
        label.textContent = promptText;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ic-input';
        input.autofocus = true;
        const error = document.createElement('div');
        error.className = 'ic-error';
        const buttons = document.createElement('div');
        buttons.className = 'ic-buttons';
        const ok = document.createElement('button');
        ok.textContent = 'OK';
        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';

        buttons.appendChild(ok);
        buttons.appendChild(cancel);
        box.appendChild(label);
        box.appendChild(input);
        box.appendChild(error);
        box.appendChild(buttons);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Focus
        input.focus();

        function cleanup() {
          ok.removeEventListener('click', onOk);
          cancel.removeEventListener('click', onCancel);
          overlay.removeEventListener('keydown', onKeyDown);
          document.body.removeChild(overlay);
        }

        function validateAndResolve() {
          const raw = input.value.trim();
          if (raw === '') {
            error.textContent = 'Please enter a number';
            return false;
          }
          // valid
          current_selection.push(raw);
          resolve(current_selection);
          self.endInput();
          cleanup();
          return true;
        }

        function onOk(e) {
          validateAndResolve();
        }
        function onCancel(e) {
          cleanup();
          reject('escape');
          self.endInput();
        }
        function onKeyDown(e) {
          if (e.key === 'Enter') {
            validateAndResolve();
            e.preventDefault();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }

        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
        overlay.addEventListener('keydown', onKeyDown);

        // allow typing immediately
        input.addEventListener('input', () => { error.textContent = ''; });
      });
    }
  }



}

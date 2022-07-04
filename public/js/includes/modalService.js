export default class Modal {
	static $registered = new Map();

	constructor($jqueryObj) {
		this.$obj = $jqueryObj

		this.currentActivePanel; // store currently opened panel
		this.$panels = new Map(); // to store all the panels under the modal window

		// set up event handlers
		var o = this;
		this.$obj.on("click", function(e) {
			o.show(false);
		})
	}

	registerPanel($jqueryObj) {
		if (this.$panels.has($jqueryObj)) {
			return this.$panels.get($jqueryObj);
		} else {
			var p = new ModalPanel($jqueryObj, this);

			this.$panels.set($jqueryObj, p);
			p.show(false, true); // hide panel
			return p;
		}
	}

	show(visible, panel) {
		// called by ModalPanel; objects stored in this.panels
		if (this.currentActivePanel && this.currentActivePanel != panel) {
			this.currentActivePanel.show(false, true); // second arg: don't change window
		}

		if (visible) {
			this.currentActivePanel = panel;
		} else {
			this.currentActivePanel = null;
		}
		this.$obj.css("display", visible ? "block" : "none")
	}


	static registerWindow($jqueryObj) {
		if (this.$registered.has($jqueryObj)) {
			return this.$registered.get($jqueryObj);
		} else {
			var m = new Modal($jqueryObj);

			this.$registered.set($jqueryObj, m);
			return m;
		}
	}
}

class ModalPanel {
	constructor($jqueryObj, $parent) {
		this.$window = $parent;
		this.$obj = $jqueryObj;

		this.style = "flex";
		this.$exitButtons = new Map();

		this.active = false;

		// default behaviour; prevent propagation to this.window
		this.$obj.on("click", function(e) {
			e.stopPropagation();
		})
	}

	registerExitButtons(...$jqueryObj) {
		for (let i = 0; i < $jqueryObj.length; i++) {
			let $button = $jqueryObj[i];

			if (!this.$exitButtons.has($button)) {
				var b = new ModalExitButton($button, this);
				this.$exitButtons.set($button, b);
			}
		}
	}

	show(visible, force=false) {
		// show panel; visible: boolean; true to show
		// force: boolean; true to prevent acting on window object
		if (!force) {
			this.$window.show(visible, this);
		}

		this.active = visible;
		this.$obj.css("display", visible ? this.style : "none");
	}

	toggle() {
		this.show(!this.active);
	}
}

class ModalExitButton {
	constructor($jqueryObj, $parent) {
		this.$window = $parent;
		this.$obj = $jqueryObj;

		var o = this;
		this.$obj.on("click", function(e) {
			e.stopPropagation();
			o.$window.show(false);
		})
	}
}

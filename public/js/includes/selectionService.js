export default class Selector {
	constructor () {
		this.infoPanel = new InfoPanel();

		this.selections = new Map(); // stores created seections here
		this.currentSelectedId = -1; // stores id of currently selected
		// note: id can be negative for special marks such as deadlines or months markers (guaranteed to be unique still)
	}

	clear() {
		// wrapper
		this.selections.clear();

		this.updateActiveSelection(-1); // hide action panel
	}

	removeSelection(id) {
		// remove selection by id
		if (!this.selections.has(id)) {
			// doesnt exist
			return;
		} else {
			if (this.currentSelectedId === id) {
				// default
				this.updateActiveSelection(-1)
			}
			this.selections.get(id).destroy(); // remove actual DOM element
			this.selections.delete(id); // remove reference
		}
	}

	updateActiveSelection(id) {
		// called internally;
		// id of selection to be updated
		// should always be positive or zero;
		// only -1 can be accepted to display the default
		if (id === -1) {
			// show default info panel
			return this.infoPanel.default();
		} else if (!this.selections.has(id) || this.currentSelectedId === id) {
			return false; // do nothing
		}

		let sel = this.selections.get(id);
		this.currentSelectedId = id;
		this.infoPanel.loadDetails(sel);
	}

	addSelection(id, data, $trigger, $obj) {
		// $trigger being the one that updates the current selection (jquery object)
		// $obj being the container representing in the DOM (itself should contain $trigger)
		// data shouldn't contain id property
		let sel = new Selection(data, $obj);
		sel.id = id;

		this.selections.set(id, sel);

		let selector = this;
		$trigger.on("click", function(e) {
			// click on trigger
			selector.updateActiveSelection(id);
		})
	}
}

class InfoPanel {
	static warning_levels = [
		"heavy-warning",
		"medium-warning",
		"light-warning",
	]

	constructor () {
		// called when DOM is ready
		this.$selectors = {
			"info-container": $("#info-container"),
			"more-info-container": $("#more-info-container"),

			"details-title": $("#details-title"),
			"details-subject": $("#details-subject"),
			"details-desc": $("#details-desc"),
			"details-countdown": $("#details-countdown"),
			"details-deadline": $("#details-deadline"),
			"details-offset": $("#details-offset"),

			"details-expand": $("#details-expand"),
			"details-close": $("#details-close"),
		}

		// store prompts for easy access to change it
		this.prompts = {
			defaultTitle: "Click on an entry to view it",
			defaultDesc: "Description...",
		}

		this.actionPanelVisible = false;
	}

	getDelayRepr(offset) {
		// return a string based on the offset (days)
		// +ve offset; delayed deadlines
		// -ve offset; quicker deadlines (brought-forward)
		if (offset > 20) {
			return "Severely behind time!!"
		} else if (offset > 15) {
			return "Skewering! ╰（‵□′）╯"
		} else if (offset > 10) {
			return "Derailed.. (⊙_⊙)？"
		} else if (offset > 5) {
			return "Track ending."
		} else if (offset > 0) {
			return "Losing track."
		} else if (offset < -20) {
			return "Soooo fasttt (ノω<。)ノ))☆.。"
		} else if (offset < -15) {
			return "Top notch!"
		} else if (offset < -10) {
			return "As fast as a leopard :)"
		} else if (offset < -5) {
			return "Gaining traction!"
		} else if (offset < 0) {
			return "Make sure not to leave anything behind! ( •̀ ω •́ )✧"
		} else {
			return "Keeping it cool 🎐"
		}
	}

	// load details into right panel
	loadDetails(data) {
		/* data:
		 * 		"title": "W&C Gateway 1",
		 * 		"subject": "Geography",
		 * 		"desc": "Description here..",
		 * 		"deadline": "23/08/22",
		 * 		"offset": 0,
		 * 		"totalDays": 0,        // total days given to complete this entry
		 * 		"daysTillDeadline": 0, // amount of days relative from startdate to deadline left
		 *		"daysTillStart": 0
		 */

		// hide action panel first
		this.showActionPanel(false); // will do nothing if already in hidden state

		this.$selectors["details-title"].text(data.title);
		this.$selectors["details-subject"].text(data.subject);
		this.$selectors["details-desc"].html(data.desc); // .html() to include <br> tags
		this.$selectors["details-deadline"].text(`Deadline: ${data.deadline} [${data.daysTillDeadline} days]`);

		// daysTillStart
		var cd = data.daysTillStart;
		if (cd == 0) {
			// already started
			cd = data.totalDays -data.daysTillDeadline;
			if (cd == 0) {
				// just started
				this.$selectors["details-countdown"].text(`Started today`);
			} else {
				this.$selectors["details-countdown"].text(`Started ${cd} day${cd > 1 ? "s" : ""} ago`);
			}
		} else {
			this.$selectors["details-countdown"].text(`Starts in ${cd} day${cd > 1 ? "s" : ""}`);
		}

		// offset
		var offset_rep = this.getDelayRepr(data.offset);
		var suffix;
		if (data.offset > 0) {
			// lagging behind
			suffix = `[${data.offset} day${data.offset > 1 ? "s" : ""} behind]`;
		} else if (data.offset < 0) {
			// ahead of time
			suffix = `[${data.offset} day${data.offset > 1 ? "s" : ""} ahead]`;
		} else {
			suffix = "[No extensions; on track]"
		}
		this.$selectors["details-offset"].text(`${offset_rep} ${suffix}`);

		// show warning colour based on totalDays and daysTillDeadline
		var danger = data.daysTillDeadline /Math.ceil(0.25 *data.totalDays);
		if (data.daysTillStart > 0 || data.totalDays === 0 || danger > 3) {
			// no warning needed
			// only apply warnings to started entries and whose duration spans over at least a day
			// reset to default
			this.$selectors["details-deadline"].css("color", "");
		} else {
			danger = Math.floor(danger);
			this.$selectors["details-deadline"].css("color", `var(--${InfoPanel.warning_levels[danger]})`)
		}
	}

	default() {
		// hide action panel first
		this.showActionPanel(false); // will do nothing if already in hidden state

		this.$selectors["details-title"].text(this.prompts.defaultTitle);
		this.$selectors["details-subject"].text("");
		this.$selectors["details-desc"].html(this.prompts.defaultDesc);
		this.$selectors["details-deadline"].text("");

		this.$selectors["details-countdown"].text("");
		this.$selectors["details-offset"].text("");
	}

	showActionPanel(show) {
		// show: boolean; true to show
		if (this.actionPanelVisible == show) {
			// already in wanted state
			return; // do nothing
		}

		this.actionPanelVisible = show;

		if (show) {
			this.$selectors["more-info-container"].css({
				"max-height": "100%",
				"border-bottom-left-radius": ".4rem",
				"border-bottom-right-radius": ".4rem",
			});

			// prevent scrolling on back frame
			this.$selectors["info-container"].css({
				"overflow-y": "clip"
			})
		} else {
			// reset to initial (defined in external css)
			this.$selectors["more-info-container"].css({
				"max-height": "",
				"border-bottom-left-radius": "",
				"border-bottom-right-radius": "",
			});
			this.$selectors["info-container"].css({
				"overflow-y": ""
			})
		}
	}
}

// represents a single selection unit
class Selection {
	constructor (data, $container) {
		this.$container = $container;

		this.id = data.id;
		this.title = data.title;
		this.subject = data.subject;
		this.desc = data.desc;
		this.deadline = data.deadline;
		this.offset = data.offset;
		this.totalDays = data.totalDays;
		this.daysTillDeadline = data.daysTillDeadline;
		this.daysTillStart = data.daysTillStart;
	}

	destroy() {
		this.$container.remove();
	}
}
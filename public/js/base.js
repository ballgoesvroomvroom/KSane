import Modal from "/js/includes/modalService.js";
import Selector from "/js/includes/selectionService.js";
import ErrorDisplay from "/js/includes/errorDisplay.js";
// import cmdPalette from "/js/includes/cmdPalette.js";


$(document).ready(() => {
	const $selectors = {
		"track-container": $("#track-container"),
		"track-disp": $("#track-disp"),

		"info-container": $("#info-container"),

		"more-info-container": $("#more-info-container"),
		"more-info-content": $("#more-info-content"),

		"details-title": $("#details-title"),
		"details-subject": $("#details-subject"),
		"details-desc": $("#details-desc"),
		"details-countdown": $("#details-countdown"),
		"details-deadline": $("#details-deadline"),
		"details-offset": $("#details-offset"),

		"details-expand": $("#details-expand"),
		"details-close": $("#details-close"),

		"action-delay": $("#action-delay"),
		"action-edit": $("#action-edit"),
		"action-delete": $("#action-delete"),
		"more-info-errordisp": $("#more-info-errordisp"),

		"createEntry": $("#createEntry"),

		"modalWindow": $("#modalWindow"),
		"createModal": $("#createModal"),
		"cmdPalette": $("#cmdPalette"),

		"modalExit": $("#modalExit"),

		"subjInput": $("#subjInput"),
		"titleInput": $("#titleInput"),
		"descInput": $("#descInput"),
		"startDateInput": $("#startDateInput"),
		"endDateInput": $("#endDateInput"),

		"inputErrorDisp": $("#inputErrorDisp"),
		"entryCreateSubmit": $("#entryCreateSubmit")
	}

	var selector = new Selector();

	function resizeTrack() {
		// resize track bar
		var container_ht = $selectors["track-container"].height();
		$selectors["track-disp"].css("height", `${container_ht}px`);
	}

	window.addEventListener("resize", () => {
		resizeTrack();
	});

	// initialisation call
	resizeTrack();

	// create new tracker selection container
	function newTrackerSelection() {
		const $div =  $("<div>", {
			"class": "track-section"
		});

		$div.appendTo($selectors["track-container"]);
		return $div;
	}

	// create new visual tracker element
	function newTracker(header, type=1) {
		// type: 1 or 2 or 3; 2 for square; 3 for rotated 45deg
		const $tracker = $("<div>", {
			"class": "tracker"
		});

		const $dotcontainer = $("<div>", {
			"class": "tracker-dot-container"
		});
		const $dot = $("<div>", {
			"class": "tracker-dot"
		});
		const $button = $("<button>", {
			"class": "tracker-text"
		});
		$button.text(header);

		if (type == 2) {
			$tracker.addClass("square");
		} else if (type == 3) {
			$tracker.addClass("rotsquare");
		}

		$dot.appendTo($dotcontainer);
		$dotcontainer.appendTo($tracker);
		$button.appendTo($tracker);
		return [$tracker, $button];
	}

	function sortFiltered(data) {
		// sorts filtered data by day (index 0)
		// directly writes into data variable
		for (let i = 0; i < data.length; i++) {
			for (let j = 0; j < data.length -i -1; j++) {
				if (data[j][0] > data[j +1][0]) {
					var k = data[j +1];
					data[j +1] = data[j];
					data[j] = k
				}
			}
		}
	}

	// @https://stackoverflow.com/a/12409344/12031810
	function formatDate(dateObj) {
		// dateObj: Date
		// formats it in DD/MM/YY
		const yy = dateObj.getFullYear().toString().slice(-2);
		let mm = dateObj.getMonth() + 1; // months start at 0
		let dd = dateObj.getDate();

		if (dd < 10) dd = "0" + dd;
		if (mm < 10) mm = "0" + mm;

		return `${dd}/${mm}/${yy}`
	}

	// return the days since epoch from string "yyyy-mm-dd"
	function fromStrToEpochDays(s) {
		var date = new Date(s);
		return Math.floor((date.getTime() -date.getTimezoneOffset() *60000) /8.64e7); // apply timezone offset to create date with context as local timezone
	}

	// return the days since epoch from date object (with localised timezone)
	function fromLocalDateToEpochDays(date) {
		return Math.floor((date.getTime() -date.getTimezoneOffset() *60000) /8.64e7);
	}

	// converts literal line feeds (\n) in string to '<br>' tags
	var lb_regex = /\\n/gm;
	function literalLFtoBR(s) {
		return s.replaceAll(lb_regex, "<br>");
	}

	// return a unique negative id not yet returned; decremental
	// used alongside with id for selections; -1 is reserved for the default view hence starts at -2
	var getNegativeUid_counter = -1; // starting from -2
	function getNegativeUid() {
		getNegativeUid_counter -= 1;
		return getNegativeUid_counter;
	}

	// "loads" data; parses data, adds some extra data; upgrades metadata field
	function upgradeData(data) {
		// iterate through each subject and "load" them
		for (const [subj, subjData] of Object.entries(data)) {
			var entries = subjData["entries"];
			var metadata = subjData["metadata"];

			var offsetFrom = fromStrToEpochDays(metadata.offsetFrom);

			for (let i = 0; i < entries.length; i++) {
				var entry = entries[i];

				// do some additional parsing or add in some extra data into each entry
				// change date to (days since epoch) format
				var date = fromStrToEpochDays(entry[0]);
				entry[0] = date; // store new entry (with offset calculated later) into date (days since epoch)

				// change deadline to (dats since epoch) format (with offset calculated later)
				entry[3] = fromStrToEpochDays(entry[3]);

				// add subject based offset (if any)
				// if this entry has already passed (deadline < offsetFrom); don't offset it
				if (metadata.offset != 0 && date > offsetFrom) {
					// entry has not yet passed date when offset was set (or increased)
					// add both offsets
					entry[0] += metadata.offset;
					entry[3] += metadata.offset;
				} else if (date <= offsetFrom && entry[3] > offsetFrom) {
					// left operand redundant
					// entry started but has not ended (deadline not passed yet)
					// only add offset to the deadline
					entry[3] += metadata.offset;
				}

				// "upgrade" metadata (last element)
				// if it is a special tracker, generate a uid for this tracker and assign its type (-1, -2) to the end of metadata
				var tracker_type = entry[entry.length -1];
				var tracker_uuid = entry[entry.length -1]; // if positive or zero; represents tracker id
				if (tracker_type >= 0) {
					tracker_type = 0; // 0 for normal, -1 for month tracker, -2 for deadline tracker
				} else {
					tracker_uuid = getNegativeUid();
				}
				entry[entry.length -1] = [tracker_uuid, subj, metadata.offset, tracker_type]; // [g_id, subjectTitle, subjectOffset, tracker_type]
			}
		}
	}

	// update track with data fetched from server side
	const rawTodayDate = new Date(); // actual day without any offsets applied
	const rawTodayDay = fromLocalDateToEpochDays(rawTodayDate);
	function updateTrack(rawData, scope=30, g_offset=0) {
		// scope: only capture those within 30days
		// g_offset: howmany days to offset this calculation
		var now = new Date();
		now = new Date(now.getTime() +(g_offset *24 *60 *60 *1000)) // add in g_offset of days
		var day = fromLocalDateToEpochDays(now);

		var data = []; // stores the filtered data (data within the scope)

		// iterate through each subject and "load" them
		for (const [subj, subjData] of Object.entries(rawData)) {
			var entries = subjData["entries"];
			var metadata = subjData["metadata"];

			var offsetFrom = fromStrToEpochDays(metadata.offsetFrom);

			for (let i = 0; i < entries.length; i++) {
				var entry = entries[i];

				var date = entry[0];
				var deadline = entry[3];
				if (day <= deadline && deadline - day <= scope) {
					// entry not yet over
					// push entry to filtered data
					data.push(entry);

					// add in deadline entry so their markers can be created too
					data.push([
						deadline,
						entry[1],
						`Deadline for ${entry[1]}`,
						deadline,
						[getNegativeUid(), subj, entry[entry.length -1][2], -2]
					])
				}
			}
		}

		// create a fake entry representing today's date
		var monthTracker_uuid = getNegativeUid();
		data.push([
			day,
			formatDate(now),
			"You got this!",
			day,
			[monthTracker_uuid, "Day of the month again", 0, -1] // 2nd last is offset; last is trackertype
		])

		// sort the filtered data by their days
		sortFiltered(data);

		// create new container to store all the new trackers that will be created
		var $container = newTrackerSelection();

		var prevDay = 0; // track the previous tracker's date to set accurate margins between trackers
		// create the visual trackers
		for (let i = 0; i < data.length; i++) {
			// parse it back to date
			let date = new Date(data[i][0] *8.64e7); // convert it back to milliseconds
			date = formatDate(date);
			let deadline = new Date(data[i][3] *8.64e7);
			deadline = formatDate(deadline);

			var title = data[i][1];

			// for month markers
			// id of -1 represents month markers
			var isMonth = data[i][data[i].length -1][3] == -1;

			// for deadline markers
			// id of -2 represents deadline markers
			var isDeadline = data[i][data[i].length -1][3] == -2;

			// calculate markerType
			// 1 for normal; 2 for month markers; 3 for deadline markers
			var markerType = isMonth ? 2 : (isDeadline ? 3 : 1);

			let [$tracker, $tracker_trigger] = newTracker(`[${date}] ${title}`, markerType);

			let totalDays = data[i][3] -data[i][0]; // amount of days from start to deadline (amt. of days given to complete entry)

			// calculate difference between previous tracker and now
			// don't calculate for the first item
			if (i > 0) {
				var daysDiff = data[i][0] -prevDay;
				$tracker.css("margin-top", `${daysDiff *30}px`);
			}


			// add to it tracker selection
			$tracker.appendTo($container);

			// add event for $tracker_trigger
			let payload = {
				"title": data[i][1],
				"subject": data[i][data[i].length -1][1], // last index has upgraded metadata (diff from what is stored on the server); loaded by upgradeData()
				"desc": literalLFtoBR(data[i][2]),
				"deadline": deadline,
				"offset": data[i][data[i].length -1][2],
				"totalDays": totalDays,
				"daysTillDeadline": data[i][3] -Math.max(data[i][0], day), // use current date if starting date has passed
				"daysTillStart": Math.max(data[i][0] - rawTodayDay, 0), // amount of days left till start
			};
			selector.addSelection(data[i][data[i].length -1][0], payload, $tracker_trigger, $tracker);

			prevDay = data[i][0];
		}

		return data.length -1 > 0; // minus one to offset the fake entry representing the date
	}

	function fetchDataFromServer() {
		// called internally
		// returns promise
		return fetch("/api/data", {
			"method": "GET"
		}).then(r => {
			if (r.status == 200) {
				return r.json();
			} else {
				return new Promise((res) => {
					res(r.json());
				}).then(d => {
					return Promise.reject(d.error);
				});
			}
		}).then(d => {
			// update metadata

			return fetch("/api/metadata", {
				"method": "GET"
			}).then(r => {
				if (r.status == 200) {
					return r.json();
				} else {
					return new Promise((res) => {
						res(r.json());
					}).then(d => {
						return Promise.reject(d.error);
					})
				}
			}).then(metadata_s => {
				var md = localStorage.getItem("metadata");
				var default_md = {
					"cached_id": metadata_s["g_id"]
				}

				if (md) {
					// exists; check for validity
					md = JSON.parse(md);

					if (md) {
						// valid json data
						md["cached_id"] = metadata_s["g_id"];
					} else {
						md = default_md;
					}

					// write into localstorage
					localStorage.setItem("metadata", JSON.stringify(md));
					localStorage.setItem("cachedData", JSON.stringify(d));
				} else {
					localStorage.setItem("metadata", JSON.stringify(default_md));
					localStorage.setItem("cachedData", JSON.stringify(d));
				}

				return d;
			})
		}).catch(d => {
			console.warn(`Failed to retrieve data with Error: ${d}`);
			return Promise.reject(d);
		})
	}

	function getData(ditchCache) {
		// check cached value if its up to date
		var md = localStorage.getItem("metadata");
		var cached = localStorage.getItem("cachedData")

		md = JSON.parse(md);
		cached = JSON.parse(cached);
		if (!ditchCache && md && md.hasOwnProperty("cached_id") && cached) {
			return fetch("/api/metadata", {
				"method": "GET"
			}).then(r => {
				if (r.status == 200) {
					return r.json();
				} else {
					return new Promise((res) => {
						res(r.json());
					}).then(d => {
						return Promise.reject(d.error);
					})
				}
			}).then(d => {
				// d: metadata object
				if (md["cached_id"] == d["g_id"]) {
					// up to date!
					return cached;
				} else {
					return fetchDataFromServer();
				}
			}).catch(d => {
				console.warn(`Failed to retrieve metadata with Error: ${d}`);

				// get data from server
				return fetchDataFromServer();
			})
		} else {
			return fetchDataFromServer();
		}
	}

	function emptyTrack() {
		// empty all tracker instances except for the track line itself
		var $d = $selectors["track-container"].children()
		for (let i = 0; i < $d.length; i++) {
			var $c = $($d[i]);
			if ($c.attr("id") === $selectors["track-disp"].attr("id")) {
				// is track-disp; do not remove
			} else {
				$c.remove();
			}
		}
	}

	function refreshTrack(ditchCache) {
		getData(ditchCache).then(d => {
			upgradeData(d);

			selector.clear();
			emptyTrack(); // clear old instances of trackers if any
			var next = true;
			var c = 0;
			while (next) {
				next = updateTrack(d, 30, 30 *c);
				c += 1
			}
		})
	}
	refreshTrack();

	// details-expand button
	$selectors["details-expand"].on("click", function(e) {
		selector.infoPanel.showActionPanel(true);
	})

	// details-close button
	$selectors["details-close"].on("click", function(e) {
		selector.infoPanel.showActionPanel(false);
	})

	// backgroundclick close
	$selectors["more-info-content"].on("click", function(e) {
		e.stopPropagation();
	})
	$selectors["more-info-container"].on("click", function(e) {
		selector.infoPanel.showActionPanel(false);
	})

	const modalWindow = Modal.registerWindow($selectors["modalWindow"]);

	const createPanel = modalWindow.registerPanel($selectors["createModal"]);
	const cmdPalettePanel = modalWindow.registerPanel($selectors["cmdPalette"]);

	// error display
	const createPanelErrorDisp = new ErrorDisplay($selectors["inputErrorDisp"]);

	// exit buttons
	createPanel.registerExitButtons($selectors["modalExit"]);

	// trigger buttons
	$selectors["createEntry"].on("click", function(e) {
		createPanel.show(true);
	})

	$selectors["entryCreateSubmit"].on("click", function(e) {
		var subj = $selectors["subjInput"].val();
		var title = $selectors["titleInput"].val();
		var desc = $selectors["descInput"].val();
		var startDate = $selectors["startDateInput"].val();
		var endDate = $selectors["endDateInput"].val();

		// validate data
		if (subj.length < 3) {
			return createPanelErrorDisp.display("Input length (subj.) must be at least 3 characters.");
		} else if (subj.length > 64) {
			return createPanelErrorDisp.display("Input length (subj.) must not exceed 64 characters.");
		} else if (title.length < 3) {
			return createPanelErrorDisp.display("Input length (title) must be at least 3 characters.");
		} else if (title.length > 64) {
			return createPanelErrorDisp.display("Input length (title) must not exceed 64 characters.");
		} else if (desc.length < 3) {
			return createPanelErrorDisp.display("Input length (desc) must be at least 3 characters.");
		} else if (desc.length > 1024) {
			return createPanelErrorDisp.display("Input length (desc) must not exceed 1024 characters.");
		} else if (startDate.length == 0) {
			return createPanelErrorDisp.display("Start date required");
		} else if (endDate.length == 0) {
			return createPanelErrorDisp.display("End date required");
		}

		// after validation
		fetch("/api/entry/create", {
			"method": "POST",
			"headers": {
				"Content-Type": "application/json"
			},
			"body": JSON.stringify({
				subj,
				title,
				desc,
				startDate,
				endDate
			})
		}).then(r => {
			if (r.status == 200) {
				return r.json();
			} else {
				return new Promise(res => {
					res(r.json());
				}).then(d => {
					return Promise.reject(d.error);
				})
			}
		}).then(r => {
			window.location.replace("/");
		}).catch(err => {
			createPanelErrorDisp.display(`Failed to submit: ${err}`);
		})
	})

	$(window).keydown(function(e) {
		var triggered = e.ctrlKey && e.shiftKey && e.code == "KeyP";
		if (triggered) {
			// ctrl + shift + p
			// toggle command palette
			e.preventDefault();
			cmdPalettePanel.toggle();
		}
	})

	// action buttons on info panel
	const deleteConfirmationModal = modalWindow.registerPanel($selectors["cmdPalette"]);

	// error displays
	const actionPanelErrorDisp = new ErrorDisplay($selectors["more-info-errordisp"])

	// delete action
	$selectors["action-delete"].on("click", function(e) {
		var actId = selector.currentSelectedId;

		if (actId < 0) {
			// currently selected not an actual entry marker but instead is a deadline marker or a month marker
			actionPanelErrorDisp.display(`Can't delete none entry`)
			return;
		}

		fetch("/api/entry/delete", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				id: actId
			})
		}).then(r => {
			if (r.status == 200) {
				return r.json();
			} else {
				return new Promise(res => {
					res(r.json());
				}).then(d => {
					return Promise.reject(d.error);
				})
			}
		}).then(d => {
			// selector.removeSelection(actId);
			refreshTrack(true);
		}).catch(err => {
			actionPanelErrorDisp.display(`Failed to delete: ${err}`)
		})
	})
})
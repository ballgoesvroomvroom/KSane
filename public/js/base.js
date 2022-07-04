$(document).ready(() => {
	const $selectors = {
		"track-container": $("#track-container"),
		"track-disp": $("#track-disp"),

		"details-title": $("#details-title"),
		"details-subject": $("#details-subject"),
		"details-desc": $("#details-desc"),
		"details-deadline": $("#details-deadline"),
		"details-offset": $("#details-offset"),

		"createEntry": $("#createEntry"),

		"modalWindow": $("#modalWindow"),
		"modalContainer": $("#modalContainer"),
		"modalExit": $("#modalExit"),

		"subjInput": $("#subjInput"),
		"titleInput": $("#titleInput"),
		"descInput": $("#descInput"),
		"startDateInput": $("#startDateInput"),
		"endDateInput": $("#endDateInput"),

		"inputErrorDisp": $("#inputErrorDisp"),
		"entryCreateSubmit": $("#entryCreateSubmit")
	}

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

	function getDelayRepr(offset) {
		// return a string based on the offset (days)
		// +ve offset; delayed deadlines
		// -ve offset; quicker deadlines (brought-forward)
		console.log(offset);
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

	const warning_levels = [
		"heavy-warning",
		"medium-warning",
		"light-warning",
	]
	// load details into right panel
	function loadDetails(data) {
		/* data:
		 * 		"title": "W&C Gateway 1",
		 * 		"subject": "Geography",
		 * 		"desc": "Description here..",
		 * 		"deadline": "23/08/22",
		 * 		"offset": 0,
		 * 		"totalDays": 0,
		 * 		"daysTillDeadline": 0,
		 */
		$selectors["details-title"].text(data.title);
		$selectors["details-subject"].text(data.subject);
		$selectors["details-desc"].text(data.desc);
		$selectors["details-deadline"].text(`${data.deadline} [${data.daysTillDeadline} days]`);

		// offset
		var offset_rep = getDelayRepr(data.offset);
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
		$selectors["details-offset"].text(`${offset_rep} ${suffix}`);

		// show warning colour based on totalDays and daysTillDeadline
		var danger = data.daysTillDeadline /Math.ceil(0.25 *data.totalDays);
		if (danger > 3) {
			// no warning needed
		} else {
			danger = Math.floor(danger);
			$selectors["details-deadline"].css("color", `var(--${warning_levels[danger]})`)
		}
	}


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
			$dotcontainer.addClass("square");
		} else if (type == 3) {
			$dotcontainer.addClass("rotsquare");
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
				entry[entry.length -1] = [entry[entry.length -1], subj, metadata.offset]; // [g_id, subjectTitle, subjectOffset]
			}
		}
	}

	// update track with data fetched from server side
	function updateTrack(rawData, scope=30, g_offset=0) {
		// scope: only capture those within 30days
		// g_offset: howmany days to offset this calculation
		var now = new Date();
		now = new Date(now.getTime() +(g_offset *24 *60 *60 *1000))
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
						[-2, subj, entry[entry.length -1][2]]
					])
				}
			}
		}

		// create a fake entry representing today's date
		data.push([
			day,
			formatDate(now),
			"You got this!",
			day,
			[-1, "Day of the month again", 0]
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
			var isMonth = data[i][data[i].length -1][0] == -1;

			// for deadline markers
			// id of -2 represents deadline markers
			var isDeadline = data[i][data[i].length -1][0] == -2;

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
			let loadPayload = {
				"title": data[i][1],
				"subject": data[i][data[i].length -1][1], // last index has upgraded metadata (diff from what is stored on the server); loaded by upgradeData()
				"desc": data[i][2],
				"deadline": deadline,
				"offset": data[i][data[i].length -1][2],
				"totalDays": totalDays,
				"daysTillDeadline": data[i][3] -Math.max(data[i][0], day) // use current date if starting date has passed
			};
			$tracker_trigger.on("click", () => {
				loadDetails(loadPayload);
			})

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

	function getData() {
		// check cached value if its up to date
		var md = localStorage.getItem("metadata");
		var cached = localStorage.getItem("cachedData")

		md = JSON.parse(md);
		cached = JSON.parse(cached);
		if (md && md.hasOwnProperty("cached_id") && cached) {
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

	getData().then(d => {
		upgradeData(d);
		// $selectors["track-container"].empty();
		var next = true;
		var c = 0;
		while (next) {
			next = updateTrack(d, 30, 30 *c);
			c += 1
		}
	})

	let tick = 0;
	function dispInputErrorMsg(errMsg) {
		tick += 1;
		let l_tick = tick;

		$selectors["inputErrorDisp"].removeClass("hidden");
		$selectors["inputErrorDisp"].text(errMsg);

		setTimeout(() => {
			if (tick == l_tick) {
				// still in the same session
				$selectors["inputErrorDisp"].addClass("hidden");
			}
		}, 2000)
	}

	function toggleModal(toToggle) {
		// toToggle: booelan; whether to display modal

		$selectors["modalWindow"].css("display", toToggle ? "block" : "none");
	}

	$selectors["modalWindow"].on("click", function(e) {
		toggleModal(false);
	})

	$selectors["modalExit"].on("click", function(e) {
		toggleModal(false);
	})

	$selectors["modalContainer"].on("click", function(e) {
		e.stopPropagation();
	})

	$selectors["createEntry"].on("click", function(e) {
		toggleModal(true);
	})

	$selectors["entryCreateSubmit"].on("click", function(e) {
		var subj = $selectors["subjInput"].val();
		var title = $selectors["titleInput"].val();
		var desc = $selectors["descInput"].val();
		var startDate = $selectors["startDateInput"].val();
		var endDate = $selectors["endDateInput"].val();

		// validate data
		if (subj.length < 3) {
			return dispInputErrorMsg("Input length (subj.) must be at least 3 characters.");
		} else if (subj.length > 64) {
			return dispInputErrorMsg("Input length (subj.) must not exceed 64 characters.");
		} else if (title.length < 3) {
			return dispInputErrorMsg("Input length (title) must be at least 3 characters.");
		} else if (title.length > 1024) {
			return dispInputErrorMsg("Input length (title) must not exceed 1024 characters.");
		} else if (desc.length < 3) {
			return dispInputErrorMsg("Input length (desc) must be at least 3 characters.");
		} else if (desc.length > 64) {
			return dispInputErrorMsg("Input length (desc) must not exceed 64 characters.");
		} else if (startDate.length == 0) {
			return dispInputErrorMsg("Start date required");
		} else if (endDate.length == 0) {
			return dispInputErrorMsg("End date required");
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
			dispInputErrorMsg(`Failed to submit: ${err}`);
		})
	})
})
// Handles working with the main data

const databaseinst = require("../base/database.js");

const userDB = databaseinst.user;
const serverDB = databaseinst.server;

class Entry {
	static createSubject(username, subjectName) {
		var data = userDB.getUserField(username, "primary");

		// check if subject already exists; if it does, silently exit
		if (data.hasOwnProperty(subjectName)) {
			return;
		}

		data[subjectName] = {
			"entries": [],
			"metadata": {
				"offsetFrom": "",
				"offset": 0
			}
		}
	}

	static createEntry(username, subjectName, content) {
		var data = userDB.getUserField(username, "primary");
		var metadata = userDB.getUserField(username, "metadata");

		var newEntryData = [
			content.startDate,
			content.title,
			content.desc,
			content.endDate,
			++metadata["g_id"]
		]
		this.createSubject(username, subjectName);

		data[subjectName]["entries"].push(newEntryData);
	}

	static findEntry(username, id) {
		// returns [subjectname, index stored in entries]
		var data = userDB.getUserField(username, "primary");

		for (const [subj, content] of Object.entries(data)) {
			var entries = content.entries;
			for (let i = 0; i < entries.length; i++) {
				var entry = entries[i];
				if (entry[entry.length -1] == id) {
					// refernece id;
					return [subj, i];
				}
			}
		}
	}

	static delete(username, id) {
		// find subjectname whose entries contains an id
		var r = this.findEntry(username, id);
		if (r == null) {
			return [false, `No entry corresponding to id: ${id} found`]
		}

		var [subj, idx] = r;
		var data = userDB.getUserField(username, "primary");

		data[subj].entries.splice(idx, 1);
		return [true]
	}
}


module.exports = Entry;
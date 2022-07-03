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
}


module.exports = Entry;
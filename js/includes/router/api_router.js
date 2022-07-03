const baseURL = "/api"; // base url for this router

const express = require("express");

const auth_router = require("./auth_router.js");
const views = require("../views.js");
const databaseinst = require("../../base/database.js");

const userDB = databaseinst.user;
const serverDB = databaseinst.server;

const entry = require("../entry.js");

const errmsg = require("../err_msgs.js");

const router = express.Router();

router.use(auth_router.authenticated(isAPI=true)); // authenticated calls only

// for api routes; allow only application/json Content-Type for request objects
// @https://stackoverflow.com/a/46018920/12031810
router.use((req, res, next) => {
	// res.setHeader("Content-Type", "application/json"); // OR
	res.type("json"); // both works

	// req.is() returns null if body is empty (for GET & DELETE requests)
	// lowercaes "content-type" as key, not "Content-Type"
	if (req.method != "GET" && req.headers["content-type"] != "application/json") {
		res.status(400).json({"error": "Request headers 'Content-Type' must be application/json"});
	} else {
		next();
	}
})

// TOGGLE RANDOMISE
router.get("/randomise", (req, res) => {
	const p = userDB.getUserField(req.session.username, "preferences");
	p.randomOrder = !p.randomOrder;
	res.type("text");
	res.send("Randomise turned " +(p.randomOrder).toString());
})

// GET PRIMARY DATA
router.get("/data", (req, res) => {
	res.json(userDB.getUserField(req.session.username, "primary"));
})

// METADATA
router.get("/metadata", (req, res) => {
	res.json(userDB.getUserField(req.session.username, "metadata"));
})

// ENTRY/CREATE
router.post("/entry/create", (req, res) => {
	// input validation
	try {
		// dates are in yyyy-mm-dd format
		let content = req.body;

		if (content == null || content.subj == null ||
			content.title == null || content.desc == null ||
			content.startDate == null || content.endDate == null) {
			throw new Error(errmsg.missing);
		} else if (typeof content.subj != "string" || content.subj.length < 3 || content.subj.length > 64) {
			throw new Error(errmsg.invalid);
		} else if (typeof content.title != "string" || content.title.length < 3 || content.title.length > 64) {
			throw new Error(errmsg.invalid);
		} else if (typeof content.desc != "string" || content.desc.length < 3 || content.desc.length > 64) {
			throw new Error(errmsg.invalid);
		} else if (typeof content.startDate != "string" || typeof content.endDate != "string") {
			throw new Error(errmsg.type);
		} else if (content.startDate.split("-").length != 3 || content.endDate.split("-").length != 3) {
			throw new Error(errmsg.dateInputMalformed);
		} else {
			var sd = new Date(content.startDate);
			var ed = new Date(content.endDate);
			if (sd == null || ed == null) {
				throw new Error(errmsg.invalidDates);
			} else if (ed - sd < 0) {
				throw new Error(errmsg.invalidDateRange);
			}
		}

		entry.createEntry(req.session.username, content.subj, content);

		res.status(200).json({"ok": true});
	} catch (err) {
		console.error(err);
		res.statusMessage = err.message;
		res.status(400).json({"error": `Malformed input - ${err.message}`});
	}
})

module.exports = {
	baseURL, router
}
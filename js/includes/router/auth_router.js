const baseURL = "/auth"; // base url for this router

const express = require("express");

const views = require("../views.js");
const sessions = require("../sessions.js");
const databaseinst = require("../../base/database.js");

const userDB = databaseinst.user;

const errmsg = require("../err_msgs.js");

const router = express.Router();
const SessionStore = sessions.SessionStore;

const cookieDelimiter = /; /g;
const cookieKeyValueSplit = /=/;

const parseCookie = (req, res, next) => {
	// sets headers.cookies = {"cookie1": "cookie1value", "cookie2": "cookie2value"}
	let headers = req.headers;

	if (headers.hasOwnProperty("cookie")) {
		let rawCookies = headers.cookie;
		let cookedCookies = {}

		rawCookies.split(cookieDelimiter).forEach(cookiePair => {
			var [key, value] = cookiePair.split(cookieKeyValueSplit);
			cookedCookies[key] = value;
		})

		headers.cookie = cookedCookies
	} else {
		headers.cookie = {};
	}

	next();
}

const baseSession = (req, res, next) => { // session id
	let headers = req.headers;

	// find SessionStore.cookieName header
	var sid;
	if (headers.hasOwnProperty("cookie") && headers.cookie.hasOwnProperty(SessionStore.cookieName)) {
		// ensure cookies exists in the first place
		sid = headers.cookie[SessionStore.cookieName];

		// validate if sid is valid\
		if (!SessionStore.valid(sid)) {
			// not valid; generate new sid
			sid = SessionStore.newClient();

			// set header
			res.set({"Set-Cookie": `${SessionStore.cookieName}=${sid}; path=/`});
		}
	} else { // create new session
		sid = SessionStore.newClient();

		// set header
		res.set({"Set-Cookie": `${SessionStore.cookieName}=${sid}; path=/`});
	}

	// attach session object to req
	req.session = SessionStore.getClient(sid);
	req.session.persist(); // reset TTL counter as user is active
	next();
}

const authenticatedWrapper = (isAPI=false) => {
	// if isAPI == true; returns a 401
	let rejectCallback;
	if (!isAPI) {
		rejectCallback = res => res.sendFile(views.login);
	} else {
		rejectCallback = res => res.status(401).json({"error": "Unauthenticated"}); // send login page
	}

	return (req, res, next) => {
		// validate if session object exists
		let sessionobj = req.session;
		if (sessionobj == null) {
			// maybe got timed out;
			// return a 400 error
			return router.status(400).end();
		}

		// check authentication status
		if (sessionobj.isAuthenticated) {
			next(); // authenticated
		} else {
			rejectCallback(res);
		}
	}
}

router.post("/login", (req, res) => {
	// authenticate based on username and password (plain/text)
	let authSuccess = false;

	// validate input
	try {
		if (req.headers.hasOwnProperty("authorization")) {
			let method = req.headers.authorization.split(" ");

			// only accept the 'Basic' method
			if (method.length != 2) {
				// expected two values 'Basic username:password'
				throw new Error(errmsg.invalid);
			} else if (method[0] != "Basic") {
				throw new Error(errmsg.invalid);
			}

			// encoded in base64; decode it first
			let b = Buffer.from(method[1], "base64");
			method[1] = b.toString("utf-8");

			// take second value 'username:password'
			let creds = method[1].split(":");

			if (creds.length != 2) {
				// not valid; username:password only; expected 2 values
				throw new Error(errmsg.invalid);
			}
			let [username, password] = creds;

			if (username.length < 5 || username.length > 25) {
				throw new Error(errmsg.invalid);
			} else if (password.length < 6 || password.length > 100) {
				throw new Error(errmsg.invalid);
			}

			if (userDB.doesUserExists(username)) {
				// validate password
				if (password == userDB.getUserField(username, "password")) {
					req.session.username = username; // store username
					authSuccess = true;
				}
			}
		} else {
			throw new Error(errmsg.missing);
		}
	} catch (err) {
		res.statusMessage = err.message;
		return res.status(400).json({"error": `Malformed input; ${err.message}`});
	}

	if (authSuccess) {
		req.session.isAuthenticated = true;
		res.status(200).end();
	} else {
		// return 401
		// following RFC 7235 authentication spec
		// guaranteed to be invalid credentials; input validation would have errored and triggered catch block instead
		res.set("WWW-Authenticate", `Basic realm="Site login"`);
		res.status(401).json({"error": "Invalid credentials"});
	}
})

module.exports = { // export router object and authenticated middleware
	baseURL, router, parseCookie, baseSession, authenticated: authenticatedWrapper
}
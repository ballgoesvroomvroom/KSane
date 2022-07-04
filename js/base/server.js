const http = require("http");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const fs = require("fs");
const path = require("path");

// set root path
global.root = path.resolve(path.join(__dirname, "../../"));
console.log(global.root);

// local modules
const DatabaseInstance = require("./database");

const database = DatabaseInstance.user;
const serverDatabase = DatabaseInstance.server;

// routers
const auth_router = require("../includes/router/auth_router.js");
const main_router = require("../includes/router/main_router.js");
const api_router = require("../includes/router/api_router.js");
const registration_router = require("../includes/router/registration_router.js");

const views = require("../includes/views.js");
// database.autosave = -1; // disable autosave

const PORT = 5005;
const app = express();
const httpServer = http.createServer(app);

app.use(express.static("public"));
app.use(cors());

// @https://stackoverflow.com/a/27855234/12031810
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// routers
app.use((req, res, next) => {
	// disable cache for all pages
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
	next();
});

app.use(auth_router.parseCookie); // parse cookies
app.use(auth_router.baseSession); // attach sessionobject to every route


app.use(registration_router.baseURL, registration_router.router);
app.use(auth_router.baseURL, auth_router.router);
app.use(main_router.baseURL, main_router.router);
app.use(api_router.baseURL, api_router.router);

app.use((req, res, next) => {
	// end of stack
	res.status(404).sendFile(views.notFound);
})

// https://nodejs.org/api/process.html#signal-events
function exitHandler() {
	console.log("EXITING");
	const p = new Promise(res => {
		database.pushContents();
		serverDatabase.pushContents(res);
	}).then(() => {
		console.log("EXITING 2")
		process.exit();
	})
}

process.on("SIGHUP", exitHandler);
process.on("SIGINT", exitHandler);

httpServer.listen(PORT, () => {
	console.log("listening at", PORT);
})

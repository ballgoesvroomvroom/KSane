// stores the paths for the different views
const path = require("path");

const root = process.cwd();
const html = path.join(root, "/public/html/")

class Views {
	static home = path.join(html, "base.html")
	static login = path.join(html, "views/login.html")
	static register = path.join(html, "views/register.html")
}

module.exports = Views;
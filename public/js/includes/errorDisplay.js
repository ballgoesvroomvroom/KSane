// construct an object to display error on a p tag (jquery selector object)
export default class ErrorDisplay {
	constructor($p, cd=2000) {
		// cd: milliseconds; duration to show message before it starts fading away
		this.$p = $p;
		this.cd = 2000;

		$p.addClass("errordisp hidden");

		this._tick = 0;
	}

	display(msg) {
		let l_tick = ++this._tick;

		this.$p.text(msg);
		this.$p.removeClass("hidden");

		setTimeout(() => {
			if (this._tick == l_tick) {
				// still in the same session
				this.$p.addClass("hidden");
			}
		}, this.cd)
	}
}
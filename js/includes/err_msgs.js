class ErrorMessages {
	static missing = "Missing payload"
	static type = "Wrong payload type"
	static invalid = "Invalid payload type"
	static num_oor = "Number payload out of range"

	static dateInputMalformed = "Date payload does not meet the input requirements"
	static invalidDates = "Date payload invalid"
	static invalidDateRange = "End date cannot be earlier than start date"
}

module.exports = ErrorMessages
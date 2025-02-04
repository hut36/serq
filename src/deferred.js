let Deferred = function Deferred() {
	if (!(this instanceof Deferred)) {
		return new Deferred();
	}

	let self = this;
	self.promise = new Promise(function (resolve, reject) {
		self.resolve = resolve;
		self.reject = reject;
	});

	return self;
};

Deferred.Promise = Promise;

export { Deferred };

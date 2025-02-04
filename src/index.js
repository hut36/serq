// Copyright (c) 2023 Tao Hu.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

import { Deferred } from './deferred.js';

let DEFAULT_TIMEOUT = 3000;

class Serq {
	static STATUS_IDLE = 0
	static STATUS_BUSY = 1
	static STATUS_CLOSED = 2

	constructor(timeout = DEFAULT_TIMEOUT) {
		this.id = 0
		this.timeout = timeout
		this.status = Serq.STATUS_IDLE;
		this.queue = [];
		this.pp = Promise.resolve()
	}

	push(fn, options) {
		if (this.status !== Serq.STATUS_IDLE && this.status !== Serq.STATUS_BUSY) {
			throw new Error(`push(): Invalid status: ${this.status}.`);
		}

		if (typeof fn !== 'function') {
			throw new Error('fn should be a function.');
		}

		let defer = Deferred()
		let ondone = ret => { defer.resolve(ret) }
		let onerror = error => { defer.reject(error) }

		this.queue.push({ fn: fn, ondone: ondone, onerror: onerror, ontimeout: options ? options.ontimeout : undefined });

		if (this.status === Serq.STATUS_IDLE) {
			this.status = Serq.STATUS_BUSY;
			let self = this;
			this.pp = this.pp.then(function() { self._next(self.id); })
		}

		return defer.promise;
	}

	close() {
		if (this.status !== Serq.STATUS_IDLE && this.status !== Serq.STATUS_BUSY) {
			return;
		}

		this.status = Serq.STATUS_CLOSED;
	}

	_next(id) {
		if (this.id !== id) {
			return
		}
		if (this.status !== Serq.STATUS_BUSY && this.status !== Serq.STATUS_CLOSED) {
			return
		}

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}

		let task = this.queue.shift();
		if (!task) {
			if (this.status === Serq.STATUS_BUSY) {
				this.status = Serq.STATUS_IDLE;
			}
			return;
		}

		let self = this;
		task.id = ++this.id

		this.timer = setTimeout(function() {
			self.pp = Promise.resolve().then(() => { self._next(task.id); })
			typeof (task.ontimeout) === 'function' && task.ontimeout()
		}, this.timeout);

		this.pp = this.pp
			.then(task.fn)
			.catch(error => {
				typeof task.onerror === 'function' && Promise.resolve().then(() => { task.onerror(error) })
			})
			.then(ret => { typeof task.ondone === 'function' && Promise.resolve().then(() => { task.ondone(ret) }) })
			.then(() => { self._next(task.id); })
	}
}

export default Serq

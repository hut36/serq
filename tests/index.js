import { assert } from '@esm-bundle/chai';
import Serq from '../src/index.js';

describe('Serq', () => {
	describe('push()', function() {
		this.timeout(50000)
		it('should execute pushed functions serially', function(done) {
			let queue = new Serq();
			let result = []
			let data = [
				{
					// NOTE: event async functions should also be executed in order
					func: async function() {
						await new Promise(r => setTimeout(r, 300))
						result.push(0)
					},
				},
				{
					func: function() {
						result.push(1)
					},
				},
				{
					func: async function() {
						await new Promise(r => setTimeout(r, 100))
						result.push(2)
					},
				},
			]

			for (let i = 0; i < data.length; i++) {
				queue.push(data[i].func)
			}

			queue.push(() => {
				assert.deepEqual(result, [0, 1, 2])
				done()
			})
		})

		it('should returns a promise that resolves the return value of pushed function', async () => {
			let queue = new Serq();

			let data = [
				{
					func: () => { return 'task 0 ret' },
					result: 'task 0 ret'
				},
				{
					func: async () => {
						await new Promise(r => { setTimeout(r, 50) })
						return 'task 1 ret'
					},
					result: 'task 1 ret'
				},
				{
					func: () => { },
					result: undefined
				},
				{
					func: () => { return null },
					result: null
				},
			]

			for (let i = 0; i < data.length; i++) {
				let result = queue.push(data[i].func)
				assert.strictEqual(data[i].result, await result)
			}
		})

		it('should throw an error if queue is closed', () => {
			let queue = new Serq()
			queue.close()

			try {
				queue.push(() => { })
			} catch (error) {
				assert.isNotNull(error)
			}
		})

		it('should catch an error threw by the queued function', (done) => {
			let queue = new Serq()
			queue.push(() => {
				throw new Error('an error')
			})
				.catch(err => {
					assert.equal(err.message, 'an error')
					done()
				})
		})

		describe('timeout', () => {
			it('should call ontimeout if task times out. case: timeout time is 0', async () => {
				let queue = new Serq(0)
				let data = 0

				await queue.push(async () => { await new Promise(r => setTimeout(r, 100)) }, {
					ontimeout: () => { data = 1 }
				})

				assert.equal(data, 1)
			})
			it('should call ontimeout if task times out. case: timeout time is not 0', async () => {
				let queue = new Serq(100)
				let data = 0

				await queue.push(async () => { await new Promise(r => setTimeout(r, 200)) }, {
					ontimeout: () => { data = 1 }
				})

				assert.equal(data, 1)
			})

			it('should not call ontimeout if task does not time out. case: timeout time is 0', async () => {
				let queue = new Serq(0)
				let data = 0

				await queue.push(async () => { }, {
					ontimeout: () => { data = 1 }
				})

				assert.equal(data, 0)
			})

			it('should not call ontimeout if task does not time out. case: timeout time is not 0', async () => {
				let queue = new Serq(200)
				let data = 0

				await queue.push(async () => { await new Promise(r => setTimeout(r, 100)) }, {
					ontimeout: () => { data = 1 }
				})

				assert.equal(data, 0)
			})
		})

		it('should skip to next task when a task times out.', async () => {
			let queue = new Serq(2000)

			queue.push(async () => {
				while (true) {
					await new Promise(r => setTimeout(r, 300))
				}
			})
		})

		it('should skip to next task when a task times out.', async () => {
			let queue = new Serq(200)
			let data = []

			queue.push(async () => {
				data.push('a1')
				await new Promise(r => setTimeout(r, 300))
				data.push('a2')
			})

			queue.push(async () => {
				//console.log('B1', Date.now() - date)
				data.push('b1')
				await new Promise(r => setTimeout(r, 300))
				//console.log('B2', Date.now() - date)
				data.push('b2')
			})

			// A timed out task (task A in this test) should not mess with the queue,
			// that is, c1 should happen before b2
			//
			queue.push(async () => {
				//console.log('C1', Date.now() - date)
				data.push('c1')
				await new Promise(r => setTimeout(r, 300))
				//console.log('C2', Date.now() - date)
				data.push('c2')
			})

			await new Promise(r => setTimeout(r, 2000))

			assert.deepEqual(data, ['a1', 'b1', 'a2', 'c1', 'b2', 'c2'])
		})
	})

	describe('README examples', function() {
		this.timeout(50000)

		it('BASICS', function() {
			let queue = new Serq()

			queue.push(async () => {
				await new Promise(r => { setTimeout(r, 100) })
				console.log('func 0')
			})

			queue.push(() => {
				console.log('func 1')
			})

			return queue.push(() => { })
		})

		it('Return values', async function() {
			let queue = new Serq()
			let ret = queue.push(() => {
				return 'value'
			})

			console.log(await ret)

			return queue.push(() => { })
		})

		it('Errors', function() {
			let queue = new Serq()
			return queue.push(() => {
				throw new Error('an error')
			})
				.catch(err => {
					console.log(err.message)
				})
		})

		it('Timeouts', function() {
			let queue = new Serq(500)

			let task = queue.push(async () => {
				await new Promise(r => { setTimeout(r, 1000) })
				console.log('task 0 done')
			}, {
				ontimeout: () => {
					console.log('timeout')
				}
			})

			let last = queue.push(() => {
				console.log('task 1 done')
			})

			return Promise.all([task, last])
		})
	})
})

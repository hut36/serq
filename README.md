# serq - execute functions serially

This project is inspired by [seq-queue](https://github.com/changchang/seq-queue).

## USAGE

### BASICS

```js
let queue = new Serq()

queue.push(async () => {
  await new Promise(r => { setTimeout(r, 100) })
  console.log('func 0')
})

queue.push(() => {
  console.log('func 1')
})

// output:
//
// func 0
// func 1
```

#### Return values

```js
let queue = new Serq()
let ret = queue.push(() => {
  return 'value'
})

console.log(await ret)

// output:
//
// value
```

#### Errors

```js
let queue = new Serq()
queue.push(() => {
  throw new Error('an error')
})
.catch(err) {
  console.log('error: ', err.message)
}

// output:
//
// an error
```

#### Timeouts

When timeout happens, Serq executes the function next in queue.

```js
let queue = new Serq(500) // default timeout is 3000

queue.push(async () => {
  await new Promise(r => { setTimeout(r, 1000) })
  console.log('task 0 done')
}, {
  ontimeout: () => {
    console.log('timeout')
}
})

queue.push(() => {
  console.log('task 1 done')
})

// output:
//
// timeout
// task 1 done
// task 0 done
```

## LICENSE

MIT

const parser = require('socket.io-parser')
const msgpack = require('msgpack-lite')

const encoder = new parser.Encoder()
const decoder = new parser.Decoder()

function encode (payload) {
  return new Promise((resolve) => {
    let msgpackEncoded
    let messagePackDecoded

    msgpack.Encoder().on('data', (data) => {
      msgpackEncoded = data
      encoder.encode(payload, function (encoded) {
        decode(msgpackEncoded, 'msgpack')
        .then((result) => {
          messagePackDecoded = result
          return decode(encoded, 'socketio')
        })
        .then((result) => {
          resolve({
            msgpack: {
              size: Buffer.byteLength(msgpackEncoded),
              decoded: messagePackDecoded
            },
            socketio: {
              size: Buffer.byteLength(encoded[0]),
              decoded: result
            }
          })
        })
      })
    }).encode(payload)
  })
}

function decode (payload, service) {
  return new Promise((resolve) => {
    if (service === 'msgpack') {
      return resolve(msgpack.decode(payload))
    }
    decoder.on('decoded', function (decoded) {
      resolve(decoded)
    })
    for (var i = 0; i < payload.length; i++) {
      decoder.add(payload[i])
    }
  })
}

encode({type: parser.EVENT, data: { username: 'foo', age: 22 }})
.then((result) => {
  console.log('json', JSON.stringify(result, null, 2))
  return encode({type: parser.BINARY_EVENT, data: Buffer.from('1234')})
})
.then((result) => {
  console.log('buffer', JSON.stringify(result, null, 2))
  return encode({type: parser.BINARY_EVENT, data: new Int8Array(10)})
})
.then((result) => {
  console.log('int8array', JSON.stringify(result, null, 2))
  return encode({type: parser.BINARY_EVENT, data: new ArrayBuffer([2])})
})
.then((result) => {
  console.log('arraybuffer', JSON.stringify(result, null, 2))
})
.catch((error) => {
  console.log('error', error)
})

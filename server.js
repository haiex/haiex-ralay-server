const express = require('express')
var cors = require('cors')
const { Relayer } = require('defender-relay-client')
const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
require('dotenv').config()

var port = process.env.PORT || 3002

app.get('/airdrop/:address/:amount', async (req, res) => {
  const { address, amount } = req.params
  const rep = await test(address, parseFloat(amount) * 10 ** 18)
  res.send(`${address} - ${amount} - ${rep}`)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

async function test(address, amount) {
  const credentials = {
    apiKey: process.env.API_KEY,
    apiSecret: process.env.SECRET_KEY,
  }
  const relayer = new Relayer(credentials)

  const txRes = await relayer.sendTransaction({
    to: address, //'0x73bdFfd6a4Aa0AFa6766e2DdEbf226Fe664A5767',
    value: amount, // 10**16,
    speed: 'fast',
    gasLimit: '21000',
  })

  //   console.log(txRes)
  return txRes.hash
}

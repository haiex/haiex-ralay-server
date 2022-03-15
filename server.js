const express = require('express')
var cors = require('cors')
const axios = require('axios').default
const Moncash = require('moncash')

const { Relayer } = require('defender-relay-client')
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/web3')
const Web3 = require('web3')
const { ethers } = require('ethers')
const { ABIDAPP } = require('./ABIDAPP')
const { ABITOKEN } = require('./ABITOKEN')

const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
require('dotenv').config()

var port = process.env.PORT || 3002

const ERC20_ADDRESS = '0x18C50Aad7f7450C49F2A0aF0aa097915358Cc004'

const credentials = {
  apiKey: process.env.API_KEY_CELO,
  apiSecret: process.env.SECRET_KEY_CELO,
}
const provider = new DefenderRelayProvider(credentials, { speed: 'fast' })

const web3 = new Web3(provider)

app.get('/sendgasfee/:address/:amount', async (req, res) => {
  try {
    const { address, amount } = req.params
    const finalAmount = parseFloat(amount) * 10 ** 18
    const rep = await sendGasFee(address, finalAmount.toString())

    res.send({ tx: rep })
  } catch (error) {
    console.error(error)
    res.send({ tx: error })
  }
})

app.get('/onboarding/:address', async (req, res) => {
  try {
    const { address } = req.params
    const finalAmountFee = parseFloat(0.006) * 10 ** 18
    const repFee = await sendGasFee(address, finalAmountFee.toString())

    const finalAmountTgoud = parseFloat(0.5) * 10 ** 18

    const repTgoud = await sendTgoud(address, finalAmountTgoud.toString())

    res.send({ txFee: repFee, txTgoud: repTgoud })
  } catch (error) {
    console.error(error)
    res.send({ tx: error })
  }
})

app.get('/sendtgoud/:address/:amount', async (req, res) => {
  const { address, amount } = req.params
  const rep = await sendTgoud(address, parseFloat(amount) * 10 ** 18)
  res.send({ tx: rep })
})

app.get('/buyhtg/:amount/:orderId', async (req, res) => {
  const { amount, orderId } = req.params
  const moncash = new Moncash({
    mode: 'live', // 'sandbox' | 'live'
    clientId: 'f02614cbab79b1d59f47c972cfd808a6',
    clientSecret: 'f_ShZb2h6YoMy8u0fbLU_qYS5njQTU8MiYbt31s9KuX022LntMPC91HiM6gcU9UD',
  })

  moncash.payment.create(
    {
      amount, // Ex: 50
      orderId, // Must be unique
    },
    (err, payment) => {
      if (err) {
        console.log(err.type) // see Error handler section
        return false
      }
      const paymentURI = moncash.payment.redirectUri(payment)
      console.log(payment, paymentURI)
      res.send(paymentURI)
    },
  )
})

async function sendGasFee(address, amount) {
  const relayer = new Relayer(credentials)
  try {
    const txRes = await relayer.sendTransaction({
      to: address,
      value: amount,
      speed: 'fast',
      gasLimit: '21000',
    })

    return txRes
  } catch (error) {
    console.error(error)
    return null
  }
}

async function sendTgoud(recipient, amount) {
  var response
  var txRes
  try {
    const [from] = await web3.eth.getAccounts()
    const erc20 = new web3.eth.Contract(ABIDAPP, ERC20_ADDRESS, { from })
    txRes = await erc20.methods.sendHTG(from, recipient, '200000000000000000').send()
    console.log(txRes)
  } catch (error) {
    console.error(error)
  }

  return txRes
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

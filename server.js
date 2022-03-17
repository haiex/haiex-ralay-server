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
const CELO_ADDRESS = '0x471EcE3750Da237f93B8E339c536989b8978a438'

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
    const finalAmountFee = parseFloat(process.env.CELO_AMOUNT) * 10 ** 18
    const repFee = await sendGasFee(address, finalAmountFee.toString())

    const finalAmountTgoud = parseFloat(process.env.TGOUD_AMOUNT) * 10 ** 18

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
    clientId: process.env.API_KEY_MONCASH,
    clientSecret: process.env.SECRET_KEY_MONCASH,
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

async function sendGasFee(recipient, amount) {
  const relayer = new Relayer(credentials)
  var txRes
  try {
    const [from] = await web3.eth.getAccounts()
    const erc20 = new web3.eth.Contract(ABITOKEN, CELO_ADDRESS, { from })
    txRes = await erc20.methods.transfer(recipient, amount).send()
    console.log(txRes)

    // const txRes = await relayer.sendTransaction({
    //   to: address,
    //   value: amount,
    //   speed: 'fast',
    //   gasLimit: '21000',
    // })

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
    txRes = await erc20.methods.sendHTG(from, recipient, amount).send()
    console.log(txRes)
  } catch (error) {
    console.error(error)
  }

  return txRes
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

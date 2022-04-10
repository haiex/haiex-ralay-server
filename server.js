const express = require('express')
var cors = require('cors')
const axios = require('axios').default
const Moncash = require('moncash')
const rateLimit = require('express-rate-limit')
var cors = require('cors')

const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// var allowedOrigins = ['http://localhost:3000', 'https://app.kaitoken.fun']
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // allow requests with no origin
//       // (like mobile apps or curl requests)
//       if (!origin) return callback(null, true)
//       if (allowedOrigins.indexOf(origin) === -1) {
//         var msg = 'The CORS policy for this site does not ' + 'allow access from the specified Origin.'
//         return callback(new Error(msg), false)
//       }
//       return callback(null, true)
//     },
//   }),
// )

require('dotenv').config()

const { ethers } = require('ethers')
const { ABIDAPP } = require('./ABIDAPP')
const { ABITOKEN } = require('./ABITOKEN')

const provider_ = new ethers.providers.JsonRpcProvider('https://rpc.gnosischain.com')
const wallet = new ethers.Wallet(process.env.PRIVATEKEY)
const account = wallet.connect(provider_)
console.log(account.address)
var port = process.env.PORT || 3002

const ERC20_ADDRESS = '0x21c8cd5371523Ca4362c7eb94aB0e1Aee7781766'
const DAPP_ADDRESS = '0x67E66154BbC2cd1338657C32e7BA9E81E640523b'

const tgoudContract = new ethers.Contract(ERC20_ADDRESS, ABITOKEN, account)
const dappContract = new ethers.Contract(DAPP_ADDRESS, ABIDAPP, account)

//Implementing the rate limiter
const rateLimiterUsingThirdParty = rateLimit({
  windowMs: 30 * 1000, // 1 min in milliseconds
  max: 1,
  message: 'You have exceeded the 1 requests in 1 min limit!',
  headers: true,
})

app.get('/', async (req, res) => {
  res.send({ status: 'working' })
})

app.get('/sendtgoud/:address/:amount', rateLimiterUsingThirdParty, async (req, res) => {
  const { address, amount } = req.params
  const finalAmount = parseFloat(amount) * 10 ** 6
  const rep = await sendTgoud(address, finalAmount.toString())
  res.send(rep)
})

app.get('/getTransacion/:id', async (req, res) => {
  const { id } = req.params
  const rep = await getTransaction(id)
  res.send(rep)
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

async function sendTgoud(recipient, amount) {
  var txRes
  try {
    const tx = await dappContract.sendHTG(account.address, recipient, amount)
    txRes = await tx.wait()
  } catch (error) {
    console.error(error)
  }
  return txRes
}

async function getTransaction(transactionId) {
  const rep = await axios({
    method: 'post',
    url: `https://${process.env.API_KEY_MONCASH}:${process.env.SECRET_KEY_XDAI}@moncashbutton.digicelgroup.com/Api/oauth/token`,
    params: {
      scope: 'read,write',
      grant_type: 'client_credentials',
    },
  })

  const rep2 = await axios({
    method: 'post',
    url: 'https://moncashbutton.digicelgroup.com/Api/v1/RetrieveTransactionPayment',
    headers: { authorization: 'Bearer ' + rep.data.access_token },
    data: {
      transactionId,
    },
  })
  console.log(rep2.data)
  return rep2.data
}

async function updatePrice() {
  try {
    response = await axios.get('https://api.exchangerate.host/convert?from=USD&to=HTG')
    const rate = parseInt(response.data.result * 1000)

    if (rate && rate > 0) {
      const tx = await dappContract.changePriceSOS(rate)
      const resp = await tx.wait()
      console.log(resp)
    }
  } catch (error) {
    console.error(error)
  }
}

setInterval(() => {
  updatePrice()
}, 1000 * 60 * 60 * 12)
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

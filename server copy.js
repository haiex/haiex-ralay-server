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

const private = '549f760a331358fd1a6d7743f13cf6cd7c940880f417a41ee98fe1ec10916dc3'
// const provider_ = new ethers.providers.WebSocketProvider(
//   'wss://apis.ankr.com/wss/58cd5bf25f0b4002b5ce37d4a4938a9d/bcfe5f657ceeaa1743e0ae329eee43ed/xdai/fast/main',
// )
const provider_ = new ethers.providers.JsonRpcProvider('https://rpc.gnosischain.com')
const wallet = new ethers.Wallet(private)
const account = wallet.connect(provider_)

const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
require('dotenv').config()

var port = process.env.PORT || 3002

const ERC20_ADDRESS = '0x21c8cd5371523Ca4362c7eb94aB0e1Aee7781766'
const CELO_ADDRESS = '0x471EcE3750Da237f93B8E339c536989b8978a438'
const DAPP_ADDRESS = '0x67E66154BbC2cd1338657C32e7BA9E81E640523b'

const tgoudContract = new ethers.Contract(ERC20_ADDRESS, ABITOKEN, account)

const credentials = {
  apiKey: process.env.API_KEY_XDAI,
  apiSecret: process.env.SECRET_KEY_XDAI,
}
const provider = new DefenderRelayProvider(credentials, {})

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
  const finalAmount = parseFloat(amount) * 10 ** 6
  const rep = await sendTgoud(address, finalAmount.toString())
  res.send({ tx: rep })
})

app.get('/getTransacion/:id', async (req, res) => {
  const { id } = req.params
  const rep = await getTra(id)
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
    txRes = await erc20.methods.sendHTG(from, recipient, amount).send({ gasLimit: 25000 })
    console.log(txRes)
  } catch (error) {
    console.error(error)
  }

  return txRes
}

async function tes() {
  const dappContract = new ethers.Contract(DAPP_ADDRESS, ABIDAPP, account)
  const options = { gasLimit: 21000, gasPrice: 5000000000 }
  try {
    const tx = await dappContract.changePriceSOS('101000')
    const resp = await tx.wait()
    console.log(resp)
  } catch (error) {
    console.error(error)
  }
}

async function getTok() {
  const rep = await axios({
    method: 'post',
    url: 'https://f02614cbab79b1d59f47c972cfd808a6:f_ShZb2h6YoMy8u0fbLU_qYS5njQTU8MiYbt31s9KuX022LntMPC91HiM6gcU9UD@moncashbutton.digicelgroup.com/Api/oauth/token',
    params: {
      scope: 'read,write',
      grant_type: 'client_credentials',
    },
  })

  const rep2 = await axios({
    method: 'post',
    url: 'https://moncashbutton.digicelgroup.com/Api/v1/CreatePayment',
    headers: { authorization: 'Bearer ' + rep.data.access_token },
    data: {
      amount: 4,
      orderId: 87876785655657,
    },
  })

  console.log(rep2.data)

  console.log(
    'https://moncashbutton.digicelgroup.com/Moncash-middleware//Payment/Redirect?token=' +
      rep2.data.payment_token.token,
  )
}
async function getTra(transactionId) {
  const rep = await axios({
    method: 'post',
    url: 'https://f02614cbab79b1d59f47c972cfd808a6:f_ShZb2h6YoMy8u0fbLU_qYS5njQTU8MiYbt31s9KuX022LntMPC91HiM6gcU9UD@moncashbutton.digicelgroup.com/Api/oauth/token',
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

tes()
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

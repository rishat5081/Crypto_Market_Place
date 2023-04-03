const {
  User,
  validate,
  validateResetPassword,
  validateLogin,
} = require("../model/User");
const objectId = require("mongodb").ObjectId;
const { signup_users_code } = require("../model/signup_users_code");
const { user_token } = require("../model/user_token");
const md5 = require("md5");
const bip39 = require("bip39");
var crypto = require("crypto");
const nodemailer = require("nodemailer");
const ethers = require("ethers");

const { ECPairFactory } = require("ecpair");
const ecc = require("tiny-secp256k1");
const ECPair = ECPairFactory(ecc);
const axios = require("axios");
const hdkey = require("hdkey");
const bitcoin = require("bitcoinjs-lib");

//twilio details
const accountSid = "AC54736f1356e74346ff51202cda613598";
const authToken = "21e6462e073211b8110621dfb10424fe";
const client = require("twilio")(accountSid, authToken);

//erc20 abi
var USDTABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "delegate",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "delegate",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "numTokens",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenOwner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "numTokens",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "numTokens",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const Web3 = require("web3");
// const Web3Client = new Web3('https://rinkeby.infura.io/v3/2b1eac7434014a04b279e24da8abc275') //testnet
// https://rinkeby.infura.io/v3/2b1eac7434014a04b279e24da8abc275
// wss://rinkeby.infura.io/ws/v3/2b1eac7434014a04b279e24da8abc275

const provider =
  "https://mainnet.infura.io/v3/2b1eac7434014a04b279e24da8abc275";
const Web3Client = new Web3(new Web3.providers.HttpProvider(provider));

module.exports = {
  getBalanceOfWalletAddress: (walletAddress) => {
    return new Promise(async (resolve) => {
      try {
        const ethBalance = await Web3Client.eth.getBalance(walletAddress);
        const ethAmount = await parseFloat(
          Web3Client.utils.fromWei(ethBalance, "ether")
        );
        resolve(ethAmount);
      } catch (error) {
        resolve(false);
      }
    });
  },

  isUserAlreadyExists: (email, phone_number) => {
    return new Promise(async (resolve) => {
      let email_new = email.trim().toLowerCase();
      let count = await User.countDocuments({
        $or: [{ email: email_new }, { phone_number: phone_number }],
      });
      if (count > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },

  sigupNewUser: (insertData) => {
    return new Promise(async (resolve, reject) => {
      let status = await User.create(insertData);
      console.log("status", status);
    });
  },

  createTrustWallet: (recoveryPhrase) => {
    return new Promise(async (resolve) => {
      try {
        //recoveryPhrase  walletAddressBTC  privateKeyBTC
        const accountDetail = await ethers.Wallet.fromMnemonic(recoveryPhrase);
        var address = crypto.createCipher("aes-128-cbc", "bcqr199logic");
        var walletAddress = address.update(
          accountDetail.address,
          "utf8",
          "hex"
        );
        walletAddress += address.final("hex");

        var key = crypto.createCipher("aes-128-cbc", "bcqr199logic");
        var privateKey = key.update(accountDetail.privateKey, "utf8", "hex");
        privateKey += key.final("hex");

        //bitcoin wallet Create
        //Define the network
        // const network = bitcoin.networks.bitcoin //mainnet
        const network = bitcoin.networks.testnet; //testnet

        // Derivation path
        // const path = `m/49'/0'/0'/0` // mainnet
        const path = `m/49'/1'/0'/0`; // testnet

        const seed = await bip39.mnemonicToSeed(recoveryPhrase); //creates seed buffer
        const root = hdkey.fromMasterSeed(seed);
        const BTCPrivateKey = root.privateKey.toString("hex");

        const keyPair = await ECPair.fromPrivateKey(
          Buffer.from(BTCPrivateKey, "hex")
        );
        const wif = keyPair.toWIF(Buffer.from(BTCPrivateKey, "hex"));
        const BTCwalletAddress = bitcoin.payments.p2wpkh({
          pubkey: keyPair.publicKey,
        });

        let btcWalletAddress = {
          BTCPrivateKey,
          walletAddressBTC: BTCwalletAddress.address,
          recoveryPhrase,
        };
        console.log("btcWalletAddress: ", btcWalletAddress);

        var addressBTC = crypto.createCipher("aes-128-cbc", "bcqr199logic");
        var walletAddressBTC = addressBTC.update(
          BTCwalletAddress.address,
          "utf8",
          "hex"
        );
        walletAddressBTC += addressBTC.final("hex");

        var key = crypto.createCipher("aes-128-cbc", "bcqr199logic");
        var privateKeyBTC = key.update(BTCPrivateKey, "utf8", "hex");
        //end BTC wallet

        let accountDetails = {
          // recoveryPhrase  :  recoveryPhrase,
          walletAddress: walletAddress,
          privateKey: privateKey,

          walletAddressBTC: walletAddressBTC,
          privateKeyBTC: privateKeyBTC,
        };
        resolve(accountDetails);
      } catch (error) {
        resolve(false);
      }
    });
  },

  varifyCredentials: (email, pin_code) => {
    return new Promise(async (resolve) => {
      console.log("email", email);
      console.log("pin_code", pin_code);
      let userObject = await User.findOne({
        email: email,
        pin_code: md5(pin_code),
      });

      console.log("userObject", userObject);
      if (userObject) {
        if (userObject.walletAddress) {
          var convertAddress = crypto.createDecipher(
            "aes-128-cbc",
            "bcqr199logic"
          );
          var convertAddressWallet = convertAddress.update(
            userObject.walletAddress,
            "hex",
            "utf8"
          );
          convertAddressWallet += convertAddress.final("utf8");
          console.log("================================", convertAddressWallet);
        }

        if (userObject.privateKey) {
          var convertAddress = crypto.createDecipher(
            "aes-128-cbc",
            "bcqr199logic"
          );
          var convertPrivateKey = convertAddress.update(
            userObject.privateKey,
            "hex",
            "utf8"
          );
          convertPrivateKey += convertAddress.final("utf8");
          console.log("================================", convertPrivateKey);
        }

        if (userObject.walletAddressBTC) {
          var convertAddressBTC = crypto.createDecipher(
            "aes-128-cbc",
            "bcqr199logic"
          );
          var convertAddressWalletBTC = convertAddressBTC.update(
            userObject.walletAddressBTC,
            "hex",
            "utf8"
          );
          convertAddressWalletBTC += convertAddressBTC.final("utf8");
          console.log(
            "================================",
            convertAddressWalletBTC
          );
        }

        if (userObject.privateKeyBTC) {
          var convertAddressBTC = crypto.createDecipher(
            "aes-128-cbc",
            "bcqr199logic"
          );
          var convertPrivateKeyBTC = convertAddressBTC.update(
            userObject.privateKeyBTC,
            "hex",
            "utf8"
          );
          console.log("================================", convertPrivateKeyBTC);
        }
        let returnObject = {
          _id: userObject._id,
          email: userObject.email,
          phone_number: userObject.phone_number,
          walletAddress: convertAddressWallet ? convertAddressWallet : "",
          privateKey: convertPrivateKey ? convertPrivateKey : "",

          walletAddressBTC: convertAddressWalletBTC
            ? convertAddressWalletBTC
            : "",
          privateKeyBTC: convertPrivateKeyBTC ? convertPrivateKeyBTC : "",

          created_date: userObject.created_date,
        };
        resolve(returnObject);
      } else {
        resolve(false);
      }
    });
  },

  sendNumberOtp: (phone_number) => {
    return new Promise((resolve) => {
      client.verify
        .services("VA2ee61ddfc304f106bef5d0aeca979236") //service id
        .verifications.create({ to: phone_number, channel: "sms" })
        .then((verification) => {
          resolve(verification);
        })
        .catch((err) => {
          if (err) {
            resolve({
              status: 500,
              message: "Error Sending the OTP to the Number",
            });
            console.log(err);
          }
        });
    });
  },

  varifyOtp: (phone_number, code) => {
    return new Promise((resolve) => {
      client.verify
        .services("VA2ee61ddfc304f106bef5d0aeca979236")
        .verificationChecks.create({ to: phone_number, code: code })
        .then((verification_check) => resolve(verification_check))
        .catch((err) => console.log(err));
    });
  },

  generateEmailConfirmationCodeSendIntoEmail: (email) => {
    return new Promise((resolve, reject) => {
      console.log("email", email);
      let generatedNumber = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      let updateArry = {
        email_code: generatedNumber,
        code_generate_time: new Date(),
      };
      let where = { email: email };
      signup_users_code.updateOne(
        where,
        { $set: updateArry },
        { upsert: true },
        (err, result) => {
          if (err) {
            console.log(err);
            resolve(false);
          } else {
            let transporter = nodemailer.createTransport({
              host: "smtp.gmail.com",
              port: 465,
              secure: "true",
              auth: {
                user: "vyzmo.123.testing@gmail.com",
                pass: "vyzmo.123.testing123",
              },
            });

            var info = transporter
              .sendMail({
                from: "vyzmo.123.testing@gmail.com",
                to: email,
                subject: "no_reply",
                html:
                  "<b>This is your Confirmation Code:" +
                  generatedNumber +
                  "</b>",
              })
              .catch((error) => {
                console.log(error);
                resolve(false);
              })
              .then((response) => {
                console.log(info);
                resolve(true);
              });
          }
        }
      );
    });
  },

  codeVarifyEmail: (email, code) => {
    return new Promise((resolve) => {
      let currentTime = new Date();
      var dd = currentTime.setMinutes(currentTime.getMinutes() - 5);
      currentTime = new Date(dd);

      let match = {
        email: email.toString(),
        email_code: parseFloat(code),
        code_generate_time: { $gte: currentTime },
      };
      signup_users_code.countDocuments(match, async (err, result) => {
        if (err) {
          resolve(false);
        } else {
          resolve(await result);
        }
      });
    });
  },

  varifyPasswordAndUpdate: (user_id, old_pin_code, new_pin_code) => {
    return new Promise(async (resolve) => {
      let status = await User.updateOne(
        { pin_code: md5(old_pin_code), _id: new objectId(user_id.toString()) },
        { $set: { pin_code: md5(new_pin_code) } }
      );
      if (status.modifiedCount > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },

  updatePassword: (email, pin_code) => {
    return new Promise(async (resolve) => {
      let status = await User.updateOne(
        { email: email },
        { $set: { pin_code: md5(pin_code) } }
      );
      if (status.modifiedCount > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },

  updateEmail: (email, user_id) => {
    return new Promise(async (resolve) => {
      User.updateOne(
        { _id: new objectId(user_id) },
        { $set: { email: email } },
        async (error, result) => {
          if (error) {
            resolve({ status: 404, message: "database have some issue!!!" });
          } else {
            let status = await result;
            console.log(status);
            if (status.modifiedCount > 0) {
              resolve({ status: 200, message: "Email is updated!!" });
            } else {
              resolve({ status: 404, message: "Email is already updated!!" });
            }
          }
        }
      );
    });
  },

  getContractAddressInstanse: (contractAddress) => {
    return new Promise((resolve) => {
      let contract = new Web3Client.eth.Contract(
        USDTABI, //abi
        contractAddress //contract address
      );
      resolve(contract);
    });
  },

  isContractAddressIsValid: (contract) => {
    return new Promise(async (resolve) => {
      try {
        let decimals = await contract.methods.decimals().call();
        let symbol = await contract.methods.symbol().call();
        resolve({ status: 200, decimals, symbol });
      } catch {
        resolve({ status: 404 });
      }
    });
  },

  addContractAddress: (
    contract_address,
    symbol,
    status,
    user_id,
    decimal,
    providerType,
    imageUrl,
    typeOfCoin
  ) => {
    return new Promise(async (resolve) => {
      let insertData = {
        contract_address,
        status,
        symbol,
        decimal,
        providerType,
        switch_status: true,
        updated_date: new Date(),
        imageUrl,
        typeOfCoin,
      };

      if (user_id) {
        insertData.user_id = user_id;
      }
      console.log("insertData", insertData);
      let data = await user_token.create(insertData);
      // console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data)
      resolve(true);
    });
  },

  isContractAddressAlreadyExists: (symbol, user_id) => {
    return new Promise((resolve) => {
      let matchQuery = user_id
        ? { symbol, status: "user", user_id }
        : { symbol, status: "global" };
      console.log(matchQuery);
      user_token.countDocuments(matchQuery, async (error, result) => {
        if (error) {
          console.log("DataBase have some issue");
          resolve(true);
        } else {
          let count = await result;
          console.log("count ", count);
          if (count > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      });
    });
  },

  updateTheRecord: (user_id, symbol, switch_status) => {
    return new Promise((resolve, reject) => {
      let search = {
        $and: [{ user_id }, { user_id: { $exists: true } }],
        symbol,
        status: "user",
      };
      console.log("search", search);
      user_token.updateOne(
        search,
        { $set: { switch_status, updated_date: new Date() } },
        async (err, result) => {
          if (err) {
            console.log("database have some issue!!!");
            resolve({ status: 400, message: "database have some issue!!" });
          } else {
            console.log("database ", await result);
            let response = await result;
            let data =
              response.modifiedCount > 0
                ? { status: 200, message: "Successfully updated!!" }
                : { status: 400, message: "Not Updated!!!" };
            resolve(data);
          }
        }
      );
    });
  },

  getRecord: (user_id) => {
    return new Promise(async (resolve) => {
      let data = await user_token.find({
        $or: [{ user_id }, { status: "global" }],
      });
      // console.log('tokens', data)
      resolve(data);
    });
  },

  getContractAddress: (symbol, providerType) => {
    return new Promise(async (resolve) => {
      console.log("symbol", symbol);
      console.log("providerType", providerType);

      let data = await user_token.findOne({
        symbol: symbol,
        providerType: providerType,
      });
      console.log("getContractAddress", data);
      if (data) {
        resolve(data.contract_address);
      } else {
        resolve(false);
      }
    });
  },

  getWebClient: (providerType) => {
    return new Promise((resolve) => {
      let provider = "";
      if (providerType == "ETH") {
        provider =
          "https://mainnet.infura.io/v3/76cb5401dc76458da87b1fbb1f8730fe";
      } else if (providerType == "BNB") {
        provider =
          "https://speedy-nodes-nyc.moralis.io/defd019df2c0685181b50e9a/bsc/testnet";
      } else {
        console.log("Wrrong provider type");
      }
      const Web3Client = new Web3(provider);
      resolve(Web3Client);
    });
  },

  getWebClientUni: (providerType) => {
    return new Promise((resolve) => {
      let provider = "";
      if (providerType == "ETH") {
        provider =
          "https://mainnet.infura.io/v3/76cb5401dc76458da87b1fbb1f8730fe";
      } else if (providerType == "BNB") {
        provider =
          "https://speedy-nodes-nyc.moralis.io/defd019df2c0685181b50e9a/bsc/testnet";
      } else {
        console.log("Wrrong provider type");
      }
      const Web3Client = new Web3(provider);
      resolve(Web3Client);
    });
  },

  getContractAddressInstanse: (contractAddress, Web3Client) => {
    return new Promise((resolve) => {
      let contract = new Web3Client.eth.Contract(
        USDTABI, //abi
        contractAddress //contract address
      );
      resolve(contract);
    });
  },

  countNonceAndData: (
    walletAddress,
    numTokens,
    receiverAddress,
    contract,
    Web3Client
  ) => {
    return new Promise(async (resolve) => {
      //convert token to wei
      let convertedNumTokens = Web3Client.utils.toWei(
        numTokens.toString(),
        "ether"
      );
      // // make data for transfer
      const data = contract.methods
        .transfer(receiverAddress, convertedNumTokens)
        .encodeABI();
      //make raw transaction

      // console.log('data', data)
      // Determine the nonce
      const count = await Web3Client.eth.getTransactionCount(walletAddress);
      // How many tokens do I have before sending?
      const nonce = Web3Client.utils.toHex(count);

      // var gaseLimit = await getGasLimit(walletAddress, nonce, data, process.env.SWERRI_TOKEN_ADDRESS)
      // const estimatePrice = (gaseLimit / 10 ** 9);
      let returnObject = {
        nonce: nonce,
        data: data,
      };
      resolve(returnObject);
    });
  },

  calculateGassLimit: (
    senderWalletAddress,
    nonce,
    contractAddress,
    data,
    Web3Client
  ) => {
    return new Promise(async (resolve) => {
      var gaseLimit = await Web3Client.eth.estimateGas({
        from: senderWalletAddress,
        nonce: nonce,
        to: contractAddress,
        data: data,
      });

      console.log("gaseLimit ---", gaseLimit);
      const gassFeeEstimate = gaseLimit * 50;
      resolve(gassFeeEstimate);
    });
  },

  getWalletAddressBalance: (walletAddress, contractAddress, Web3Client) => {
    return new Promise(async (resolve) => {
      try {
        let contract = new Web3Client.eth.Contract(
          USDTABI, //Abi
          contractAddress //contract address
        );
        let balance = await contract.methods.balanceOf(walletAddress).call();
        console.log("balance helper", balance);
        var decimals = await contract.methods.decimals().call();
        balance = balance / 10 ** decimals;
        resolve(balance);
      } catch (error) {
        console.log(error);
        resolve(false);
      }
    });
  },

  transferTokenToOtherWallets: (
    gaseLimit,
    data,
    walletAddress,
    nonce,
    senderPrivateKey,
    contractAddress,
    Web3Client
  ) => {
    return new Promise(async (resolve) => {
      try {
        const gasLimit = Web3Client.utils.toHex(gaseLimit);
        const gasPrice = Web3Client.utils.toHex(50 * 1e9);
        const value = Web3Client.utils.toHex(
          Web3Client.utils.toWei("0", "wei")
        );

        // Chain ID of Ropsten Test Net is 97, mainNet replace it to 56 for Main Net
        // var chainId = 97;
        var chainId = 4;
        var rawTransaction = {
          from: walletAddress,
          nonce: nonce,
          gasPrice: gasPrice,
          gasLimit: gasLimit,
          to: contractAddress,
          value: value,
          data: data,
          chainId: chainId,
        };
        // console.log('rawTransaction', rawTransaction)
        const signedTx = await Web3Client.eth.accounts.signTransaction(
          rawTransaction,
          senderPrivateKey
        );
        Web3Client.eth.sendSignedTransaction(signedTx.rawTransaction);

        let reponseObject = {
          transactionHash: signedTx.transactionHash,
        };
        console.log("reponseObject", reponseObject);
        resolve(reponseObject);
      } catch (error) {
        console.log(
          "🚀 ~ file: ether.controller.js ~ line 79 ~ transferTokenToOtherWal ~ error",
          error
        );
        resolve({ message: error });
      }
    });
  },

  calculateGassLimitEstimate: (
    senderWalletAddress,
    nonce,
    contractAddress,
    data,
    Web3Client
  ) => {
    return new Promise(async (resolve) => {
      var gaseLimit = await Web3Client.eth.estimateGas({
        from: senderWalletAddress,
        nonce: nonce,
        to: contractAddress,
        data: data,
      }); // gwai
      const estimatePrice = gaseLimit / 10 ** 9; // Ether and BNB
      const gassEstimatePrice = estimatePrice * 50;
      resolve(gassEstimatePrice);
    });
  },

  estimateGasForEthTransaction: (
    fromAddress,
    toAddress,
    amount,
    Web3Client
  ) => {
    return new Promise(async (resolve) => {
      try {
        const count = await Web3Client.eth.getTransactionCount(
          fromAddress,
          "latest"
        );
        const nonce = Web3Client.utils.toHex(count);
        let etherValue = Web3Client.utils.toWei(amount.toString(), "ether");
        const transaction = {
          to: toAddress,
          value: etherValue,
          nonce: nonce,
        };
        const estimate = await Web3Client.eth.estimateGas(transaction);
        const estimatePrice = estimate / 10 ** 9;
        const balInEth = await Web3Client.eth.getBalance(fromAddress);
        const ethAmount = Web3Client.utils.fromWei(balInEth, "ether");

        if (estimatePrice + etherValue > ethAmount) {
          resolve({
            error: `You do not have enough amount for further proceed`,
            status: 404,
          });
        } else {
          resolve({ estimatedGasFee: estimatePrice, status: 200 });
        }
      } catch (error) {
        console.log(
          "🚀 ~ file: ether.controller.js ~ line 486 ~ estimateGasForEthTransaction ~ error",
          error
        );
        resolve({ error: error, status: 404 });
      }
    });
  },

  exponentialToDecimal: (exponential) => {
    return new Promise((resolve, reject) => {
      let decimal = exponential.toString().toLowerCase();
      if (decimal.includes("e+")) {
        const exponentialSplitted = decimal.split("e+");
        let postfix = "";
        for (
          let i = 0;
          i <
          +exponentialSplitted[1] -
            (exponentialSplitted[0].includes(".")
              ? exponentialSplitted[0].split(".")[1].length
              : 0);
          i++
        ) {
          postfix += "0";
        }
        const addCommas = (text) => {
          let j = 3;
          let textLength = text.length;
          while (j < textLength) {
            text = `${text.slice(0, textLength - j)},${text.slice(
              textLength - j,
              textLength
            )}`;
            textLength++;
            j += 3 + 1;
          }
          return text;
          // resolve(decimal.toString());
        };
        decimal = addCommas(exponentialSplitted[0].replace(".", "") + postfix);
      }
      if (decimal.toLowerCase().includes("e-")) {
        const exponentialSplitted = decimal.split("e-");
        let prefix = "0.";
        for (let i = 0; i < +exponentialSplitted[1] - 1; i++) {
          prefix += "0";
        }
        decimal = prefix + exponentialSplitted[0].replace(".", "");
      }
      resolve(decimal.toString());
    });
  },
};

// client.verify.services
//   .create({ friendlyName: "My Verify Service" })
//   .then((service) => console.log(service.sid));

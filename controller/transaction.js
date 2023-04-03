var express = require("express");
var router = express.Router();
const helper = require("../helper/helper");
const ethers = require("ethers");
const abi = require("./uniswapRouter2ABI.json");
const {
  ChainId,
  Fetcher,
  WETH,
  Route,
  Trade,
  TokenAmount,
  TradeType,
  Percent,
  Token,
} = require("@uniswap/sdk");

const { JsonRpcProvider } = require("@ethersproject/providers");
const provider = new JsonRpcProvider(
  "https://mainnet.infura.io/v3/76cb5401dc76458da87b1fbb1f8730fe"
); // mainnet
const uniSwapRouter2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //mainnet address

const NFT = require("../artifacts/contracts/NFT.sol/NFT.json");
const Market = require("../artifacts/contracts/Market.sol/NFTMarket.json");
const nftmarketaddress = "0x73aF399E4B9B5f9602ff5eC3528868Be7C8183F0";
const nftaddress = "0x4FE589b677185a89725790046603407a589a067C";
const providerNFT = new ethers.providers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/2b1eac7434014a04b279e24da8abc275"
);

router.post("/calculateGassLimitSendToken", async (req, res) => {
  if (
    req.body.walletAddress &&
    req.body.numTokens &&
    req.body.symbol &&
    req.body.receiverAddress &&
    req.body.providerType
  ) {
    let contractAddress = await helper.getContractAddress(
      req.body.symbol,
      req.body.providerType
    );

    console.log("contractAddress", contractAddress);
    if (contractAddress) {
      let Web3Client = await helper.getWebClient(req.body.providerType);
      let contract = await helper.getContractAddressInstanse(
        contractAddress,
        Web3Client
      );
      let response = await helper.countNonceAndData(
        req.body.walletAddress,
        req.body.numTokens,
        req.body.receiverAddress,
        contract,
        Web3Client
      );

      let nonce = response.nonce;
      let data = response.data;

      let gaseLimit = await helper.calculateGassLimitEstimate(
        req.body.walletAddress,
        nonce,
        contractAddress,
        data,
        Web3Client
      );
      let responseGass = {
        gaseLimit: gaseLimit,
      };
      res.status(200).send(responseGass);
    } else {
      let response = {
        message: "Contract address is not available against this symbol!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/sendToken", async (req, res) => {
  if (
    req.body.walletAddress &&
    req.body.numTokens &&
    req.body.symbol &&
    req.body.receiverAddress &&
    req.body.senderPrivateKey &&
    req.body.providerType
  ) {
    let getBalance = await helper.getBalanceOfWalletAddress(
      req.body.walletAddress
    );
    console.log("-- getBalance", getBalance);

    let contractAddress = await helper.getContractAddress(
      req.body.symbol,
      req.body.providerType
    );

    console.log("-- contractAddress", contractAddress);
    if (contractAddress) {
      let Web3Client = await helper.getWebClient(req.body.providerType);

      // console.log("Web3Client ----", Web3Client);
      let contract = await helper.getContractAddressInstanse(
        contractAddress,
        Web3Client
      );

      let balance = await contract.methods
        .balanceOf(req.body.walletAddress)
        .call();
      //get token decimals
      var decimals = await contract.methods.decimals().call();
      balance = balance / 10 ** decimals;
      if (req.body.numTokens > balance) {
        return res.status(400).json({
          message: `You do not have enough ${req.body.symbol}. Kindly get more ${req.body.symbol}  to proceed.`,
        });
      } else {
        console.log("----- bbbb ", bbbb);
        let response = await helper.countNonceAndData(
          req.body.walletAddress,
          req.body.numTokens,
          req.body.receiverAddress,
          contract,
          Web3Client
        );

        console.log("response ----", response);

        let nonce = response.nonce;
        let data = response.data;

        let gaseLimit = await helper.calculateGassLimit(
          req.body.walletAddress,
          nonce,
          contractAddress,
          data,
          Web3Client
        );

        console.log("gaseLimit", gaseLimit);
        let balance = await helper.getWalletAddressBalance(
          req.body.walletAddress,
          contractAddress,
          Web3Client
        );
        console.log("balance of wallet are =====", balance);

        console.log("aaaaaaaaaaaaaa");
        if (balance < req.body.numTokens) {
          let response = {
            message: `Insufficient balance!!!`,
          };
          res.status(404).send(response);
        } else {
          let trasctionData = await helper.transferTokenToOtherWallets(
            gaseLimit,
            data,
            req.body.walletAddress,
            nonce,
            req.body.senderPrivateKey,
            contractAddress,
            Web3Client
          );
          res.status(200).send(trasctionData);
        }
      }
    } else {
      let response = {
        message: "Contract address is not available against this symbol!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload missing!!!",
    };
    res.status(404).send(response);
  }
});

//send coin code
router.post("/calculateGassFeeCoin", async (req, res) => {
  if (
    req.body.walletAddress &&
    req.body.receiverAddress &&
    req.body.amount &&
    req.body.providerType
  ) {
    let Web3Client = await helper.getWebClient(req.body.providerType);
    const isvalid = await Web3Client.utils.isAddress(req.body.receiverAddress);
    if (!isvalid) {
      res.status(400).json({
        message: `This wallet address is not valid. Kindly confirm the address and try again.`,
      });
    } else {
      let fee = await helper.estimateGasForEthTransaction(
        req.body.walletAddress,
        req.body.receiverAddress,
        req.body.amount,
        Web3Client
      );
      res.status(fee.status).send(fee);
    }
  } else {
    let response = {
      message: "Payload Missing",
    };
    res.status(404).send(response);
  }
});

router.post("/sendCoin", async (req, res) => {
  if (
    req.body.walletAddress &&
    req.body.receiverAddress &&
    req.body.amount &&
    req.body.privateKey &&
    req.body.providerType
  ) {
    let walletAddress = req.body.walletAddress;
    let privateKey = req.body.privateKey;
    let receiverAddress = req.body.receiverAddress;
    let amount = req.body.amount;

    let Web3Client = await helper.getWebClient(req.body.providerType);
    const isvalid = Web3Client.utils.isAddress(receiverAddress);
    console.log(isvalid);
    if (!isvalid) {
      //Web3Client
      res.status(400).json({
        message: `This wallet address is not valid. Kindly confirm the address and try again.`,
      });
    } else {
      try {
        //get ether balance before transaction
        const ethBalance = await Web3Client.eth.getBalance(walletAddress);
        console.log(ethBalance);
        // convert amount to ether from wei
        const ethAmount = Web3Client.utils.fromWei(ethBalance, "ether");
        //cgeck sending amount is greater then ether balance
        if (ethAmount > amount) {
          const count = await Web3Client.eth.getTransactionCount(
            walletAddress,
            "latest"
          );
          let etherValue = Web3Client.utils.toWei(amount.toString(), "ether");

          const transaction = {
            to: receiverAddress,
            value: etherValue,
            gas: 30000,
            nonce: count,
            // optional data field to send message or execute smart contract
          };

          const signedTx = await Web3Client.eth.accounts.signTransaction(
            transaction,
            privateKey
          );
          Web3Client.eth.sendSignedTransaction(signedTx.rawTransaction);
          // deductTransactionFee(walletDetail.user_id, feeInSwet)
          return res
            .status(200)
            .json({ transactionHash: signedTx.transactionHash });
        } else {
          let response = {
            message: "insufficent fund!!!",
          };
          res.status(404).send(response);
        }
      } catch (error) {
        console.log(error);
        let response = {
          message: error,
        };
        res.status(404).send(response);
      }
    }
  } else {
    let response = {
      message: "Payload missing!!!",
    };
    res.status(404).send(response);
  }
});

//uniswap
//######################################################################################################
//##################################      TOKEN TO COIN PRICE AND SWAP     #############################
//######################################################################################################
router.post("/tokenToCoinPrice", async (req, res) => {
  if (
    req.body.amount &&
    req.body.symbol &&
    req.body.providerType &&
    req.body.type
  ) {
    let etherAmount = parseFloat(req.body.amount);
    let toSymbol = req.body.symbol;
    let type = req.body.type;
    let providerType = req.body.providerType;
    let contractAddress = await helper.getContractAddress(
      toSymbol,
      providerType
    );
    if (contractAddress) {
      try {
        const chainId = ChainId.MAINNET;
        const tokenAddress = contractAddress;
        var amountIn = ethers.utils.parseEther(String(etherAmount));
        const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
        const weth = WETH[chainId];
        const pair = await Fetcher.fetchPairData(weth, swapToken, provider);

        const route = new Route([pair], swapToken);
        const trade = new Trade(
          route,
          new TokenAmount(swapToken, amountIn.toString()),
          TradeType.EXACT_INPUT
        );

        const ethPriceInToken = route.midPrice.invert().toSignificant(6);
        const ethPrice = route.midPrice.toSignificant(6);
        let finalPrice = Number(etherAmount) * ethPrice;
        let executionPrice = trade.executionPrice.toSignificant(6);
        console.log("1 Eth = ", ethPriceInToken);
        console.log("total eth by given by token= ", finalPrice);
        console.log("Minimum received= ", executionPrice * Number(etherAmount));

        const minimumReceived = executionPrice * Number(etherAmount);
        const result = {
          ethPriceInToken: ethPriceInToken,
          ethCalculate: finalPrice,
          minimumReceived: minimumReceived,
        };
        res.status(200).send(result);
      } catch (error) {
        console.trace(error);
        let response = {
          message: error,
        };
        res.status(404).send({
          message: error.name,
        });
      }
    } else {
      let response = {
        message: "Contract address not exists!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload Missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/tokenToCoinSwap", async (req, res) => {
  if (
    req.body.amount &&
    req.body.symbol &&
    req.body.providerType &&
    req.body.type &&
    req.body.walletAddress &&
    req.body.privateKey
  ) {
    let etherAmount = parseFloat(req.body.amount);
    let toSymbol = req.body.symbol;
    let type = req.body.type;
    let providerType = req.body.providerType;
    let walletAddress = req.body.walletAddress;
    let privateKey = req.body.privateKey;

    let contractAddress = await helper.getContractAddress(
      toSymbol,
      providerType
    );
    if (contractAddress) {
      try {
        // chain id for test net
        const chainId = ChainId.MAINNET;
        //token address to swap
        const tokenAddress = contractAddress;
        var amountEth = ethers.utils.parseEther(String(etherAmount));
        //fetch token data
        const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
        //fetch ether through chain id
        const weth = WETH[chainId];
        //fetching pair data for swap ether to token
        const pair = await Fetcher.fetchPairData(weth, swapToken, provider);
        const route = new Route([pair], weth);
        const trade = new Trade(
          route,
          new TokenAmount(weth, String(amountEth)),
          TradeType.EXACT_INPUT
        );
        console.log(route.midPrice.toSignificant(6));
        console.log(route.midPrice.invert().toSignificant(6));
        console.log(trade.executionPrice.toSignificant(6));
        console.log(trade.nextMidPrice.toSignificant(6));
        //set Tolerance 0.5%
        const slippageTolerance = new Percent("50", "10000"); //10 bips 1 bip = 0.001%
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        //set path of token and ether
        const path = [weth.address, swapToken.address];
        const to = walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const value = trade.inputAmount.raw;
        const singer = new ethers.Wallet(privateKey);
        const account = singer.connect(provider);
        const uniswap = new ethers.Contract(
          uniSwapRouter2Address,
          abi,
          account
        );
        try {
          const tx = uniswap.swapExactETHForTokens(
            String(amountOutMin),
            path,
            to,
            deadline,
            { value: String(value), gasPrice: 5.5e10 }
          );
          return res.status(200).json({ message: "Transaction Submitted" });
        } catch (error) {
          console.log(
            "🚀 ~ file: uniswap.controller.js ~ line 95 ~ exports.swapEtherToToken= ~ error",
            error
          );
          return res.status(400).json({ message: error.reason });
        }
      } catch (error) {
        console.log(error);
        let response = {
          message: error,
        };
        res.status(404).send(response);
      }
    } else {
      let response = {
        message: "Contract address not exists!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload Missing!!!",
    };
    res.status(404).send(response);
  }
});

//######################################################################################################
//##################################      COIN TO TOKEN PRICE AND SWAP     #############################
//######################################################################################################

router.post("/coinToTokenPrice", async (req, res) => {
  if (
    req.body.amount &&
    req.body.symbol &&
    req.body.providerType &&
    req.body.type
  ) {
    let etherAmount = parseFloat(req.body.amount);
    let toSymbol = req.body.symbol;
    let type = req.body.type;
    let providerType = req.body.providerType;

    let contractAddress = await helper.getContractAddress(
      toSymbol,
      providerType
    );
    if (contractAddress) {
      try {
        // chain id for test net
        const chainId = ChainId.MAINNET;
        //token address to swap
        const tokenAddress = contractAddress;

        var amountEth = ethers.utils.parseEther(String(etherAmount));

        console.log("tokenAddress ----", tokenAddress);
        //fetch token data
        const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
        //fetch ether through chain id

        console.log("swapToken ----", swapToken);

        const weth = WETH[chainId];
        //fetching pair data for swap ether to token
        const pair = await Fetcher.fetchPairData(swapToken, weth, provider);
        const route = new Route([pair], weth);
        const trade = new Trade(
          route,
          new TokenAmount(weth, String(amountEth)),
          TradeType.EXACT_INPUT
        );
        const tokenPriceInEth = route.midPrice.invert().toSignificant(6);

        console.log("tokenPriceInEth ----", tokenPriceInEth);
        const tokenPrice = route.midPrice.toSignificant(6);
        console.log("tokenPrice ----", tokenPrice);

        let finalPrice = Number(etherAmount) * Number(tokenPrice);
        let executionPrice = trade.executionPrice.toSignificant(6);
        finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;

        console.log("1 token = ", tokenPriceInEth);
        console.log("total token by given by eth= ", finalPrice);
        console.log("Minimum received= ", executionPrice * etherAmount);

        const minimumReceived = executionPrice * etherAmount;
        const result = {
          tokenPriceInEth: tokenPriceInEth,
          tokenCalculate: finalPrice,
          minimumReceived: minimumReceived,
        };
        return res.status(200).json(result);
      } catch (error) {
        console.log(error);
        let response = {
          message: error,
        };
        res.status(404).send(response);
      }
    } else {
      let response = {
        message: "Contract address not exists!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload Missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/coinToTokenSwap", async (req, res) => {
  if (
    req.body.amount &&
    req.body.symbol &&
    req.body.providerType &&
    req.body.type &&
    req.body.walletAddress &&
    req.body.privateKey
  ) {
    let etherAmount = parseFloat(req.body.amount);
    let toSymbol = req.body.symbol;
    let type = req.body.type;
    let providerType = req.body.providerType;
    let walletAddress = req.body.walletAddress;
    let privateKey = req.body.privateKey;

    let contractAddress = await helper.getContractAddress(
      toSymbol,
      providerType
    );
    if (contractAddress) {
      try {
        // chain id for test net
        const chainId = ChainId.MAINNET;
        //token address to swap
        const tokenAddress = contractAddress;
        var amountEth = ethers.utils.parseEther(String(etherAmount));
        //fetch token data
        const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
        //fetch ether through chain id
        const weth = WETH[chainId];
        //fetching pair data for swap ether to token
        const pair = await Fetcher.fetchPairData(swapToken, weth, provider);
        const route = new Route([pair], weth);
        const trade = new Trade(
          route,
          new TokenAmount(weth, String(amountEth)),
          TradeType.EXACT_INPUT
        );
        console.log(route.midPrice.toSignificant(6));
        console.log(route.midPrice.invert().toSignificant(6));
        console.log(trade.executionPrice.toSignificant(6));
        console.log(trade.nextMidPrice.toSignificant(6));
        //set Tolerance 0.5%
        const slippageTolerance = new Percent("50", "10000"); //10 bips 1 bip = 0.001%
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        //set path of token and ether
        const path = [weth.address, swapToken.address];
        const to = walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const value = trade.inputAmount.raw;
        const singer = new ethers.Wallet(privateKey);
        const account = singer.connect(provider);
        const uniswap = new ethers.Contract(
          uniSwapRouter2Address,
          abi,
          account
        );
        try {
          const tx = uniswap.swapExactETHForTokens(
            String(amountOutMin),
            path,
            to,
            deadline,
            { value: String(value), gasPrice: 5.5e10 }
          );
          return res.status(200).json({ message: "Transaction Submitted" });
        } catch (error) {
          console.log(
            "🚀 ~ file: uniswap.controller.js ~ line 95 ~ exports.swapEtherToToken= ~ error",
            error
          );
          return res.status(400).json({ message: error.reason });
        }
      } catch (error) {
        console.log(error);
        let response = {
          message: error,
        };
        res.status(404).send(response);
      }
    } else {
      let response = {
        message: "Contract address not exists!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload Missing!!!",
    };
    res.status(404).send(response);
  }
});

//######################################################################################################
//##################################      TOKEN TO TOKEN PRICE AND SWAP     ############################
//######################################################################################################
router.post("/tokenToTokenPrice", async (req, res) => {
  if (
    req.body.amount &&
    req.body.symbol &&
    req.body.providerType &&
    req.body.type &&
    req.body.toSymbol
  ) {
    let etherAmount = parseFloat(req.body.amount);
    let fromSymbol = req.body.symbol;
    let toSymbol = req.body.toSymbol;
    let type = req.body.type;
    let providerType = req.body.providerType;

    let fromContractAddress = await helper.getContractAddress(
      fromSymbol,
      providerType
    );
    let toContractAddress = await helper.getContractAddress(
      toSymbol,
      providerType
    );

    if (fromContractAddress && toContractAddress) {
      try {
        // chain id for test net
        const chainId = ChainId.MAINNET;
        //token address to swap
        // const tokenAddress = contractAddress;

        var amountEth = ethers.utils.parseEther(String(etherAmount));
        //fetch token data
        const fromSwapToken = await Fetcher.fetchTokenData(
          chainId,
          fromContractAddress
        );
        const toSwapToken = await Fetcher.fetchTokenData(
          chainId,
          toContractAddress
        );
        //fetch ether through chain id
        const weth = WETH[chainId];
        //fetching pair data for swap ether to token
        const pair = await Fetcher.fetchPairData(
          fromSwapToken,
          toSwapToken,
          provider
        );
        const route = new Route([pair], fromSwapToken);
        const trade = new Trade(
          route,
          new TokenAmount(fromSwapToken, String(amountEth)),
          TradeType.EXACT_INPUT
        );
        const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
        const tokenPrice = route.midPrice.toSignificant(6);
        let finalPrice = Number(etherAmount) * Number(tokenPrice);
        let executionPrice = trade.executionPrice.toSignificant(6);
        finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;

        console.log("1 token = ", tokenPriceInEth);
        console.log("total token by given by eth= ", finalPrice);
        console.log("Minimum received= ", executionPrice * etherAmount);

        const minimumReceived = executionPrice * etherAmount;
        const result = {
          tokenPriceInEth: tokenPriceInEth,
          tokenCalculate: finalPrice,
          minimumReceived: minimumReceived,
        };
        return res.status(200).json(result);
      } catch (error) {
        console.log(error);
        let response = {
          message: error,
        };
        res.status(404).send(response);
      }
    } else {
      let response = {
        message: "Contract address not exists!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload Missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/tokenToTokenSwap", async (req, res) => {
  if (
    req.body.amount &&
    req.body.fromSymbol &&
    req.body.toSymbol &&
    req.body.providerType &&
    req.body.type &&
    req.body.walletAddress &&
    req.body.privateKey
  ) {
    let etherAmount = parseFloat(req.body.amount);
    let toSymbol = req.body.toSymbol;
    let fromSymbol = req.body.fromSymbol;
    let type = req.body.type;
    let providerType = req.body.providerType;
    let walletAddress = req.body.walletAddress;
    let privateKey = req.body.privateKey;

    let fromContractAddress = await helper.getContractAddress(
      fromSymbol,
      providerType
    );
    let toContractAddress = await helper.getContractAddress(
      toSymbol,
      providerType
    );
    if (toContractAddress && fromContractAddress) {
      try {
        // chain id for test net
        const chainId = ChainId.MAINNET;
        //token address to swap
        // const tokenAddress = contractAddress
        var amountEth = ethers.utils.parseEther(String(etherAmount));
        //fetch token data
        const swapTokenF = await Fetcher.fetchTokenData(
          chainId,
          fromContractAddress
        );
        const swapTokenT = await Fetcher.fetchTokenData(
          chainId,
          toContractAddress
        );

        //fetch ether through chain id
        const weth = WETH[chainId];
        //fetching pair data for swap token to token
        const pair = await Fetcher.fetchPairData(
          swapTokenF,
          swapTokenT,
          provider
        );
        const route = new Route([pair], weth);
        const trade = new Trade(
          route,
          new TokenAmount(weth, String(amountEth)),
          TradeType.EXACT_INPUT
        );
        console.log(route.midPrice.toSignificant(6));
        console.log(route.midPrice.invert().toSignificant(6));
        console.log(trade.executionPrice.toSignificant(6));
        console.log(trade.nextMidPrice.toSignificant(6));
        //set Tolerance 0.5% (difference b/t send time price and confirmation price)
        const slippageTolerance = new Percent("50", "10000"); //10 bips 1 bip = 0.001%
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        //set path of token and token
        const path = [swapTokenF.address, swapTokenT.address];
        const to = walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const value = trade.inputAmount.raw;
        const singer = new ethers.Wallet(privateKey);
        const account = singer.connect(provider);
        const uniswap = new ethers.Contract(
          uniSwapRouter2Address,
          abi,
          account
        );
        try {
          const tx = uniswap.swapExactETHForTokens(
            //migration (transfer token from one blockchain to other)
            String(amountOutMin),
            path,
            to,
            deadline,
            { value: String(value), gasPrice: 5.5e10 }
          );
          return res.status(200).json({ message: "Transaction Submitted" });
        } catch (error) {
          console.log(
            "🚀 ~ file: uniswap.controller.js ~ line 95 ~ exports.swapEtherToToken= ~ error",
            error
          );
          return res.status(400).json({ message: error.reason });
        }
      } catch (error) {
        console.log(error);
        let response = {
          message: error,
        };
        res.status(404).send(response);
      }
    } else {
      let response = {
        message: "Contract address not exists!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "Payload Missing!!!",
    };
    res.status(404).send(response);
  }
});

//######################################################################################################
//##################################        NFT MARKET PLACE REST CALLS     ############################
//######################################################################################################

router.post("/mintNFT", async (req, res) => {
  if (
    req.body.price &&
    req.body.url &&
    req.body.walletAddress &&
    req.body.chainId &&
    req.body.singer
  ) {
    let url = req.body.url;
    let priceComming = req.body.price.toString();
    let walletAddress = req.body.walletAddress;
    let singer = req.body.singer;

    if (req.body.chainId != 1) {
      let response = {
        message: "Please connect your metamask with main net!!",
      };
      res.status(404).send(response);
    }
    // const singer = new ethers.Wallet(privateKey);
    console.log("singer", singer);
    try {
      let contract = new ethers.Contract(nftaddress, NFT.abi, singer);

      let WalletAmountEther = await helper.getBalanceOfWalletAddress(
        walletAddress
      );
      console.log("WalletAmountEther", WalletAmountEther);

      // // let gassLimit = await helper.calculateGassLimit()
      if (WalletAmountEther != false && WalletAmountEther > 0) {
        /* next, create the item */
        console.log("aaaaaaaaaaaaaaaaa");
        let transaction = await contract.createToken(url);
        console.log("transaction ====", transaction);
        let tx = await transaction.wait();
        try {
          var event = tx.events[0];
          var value = event.args[2];
          var tokenId = value.toNumber();
          var price = ethers.utils.parseUnits(priceComming, "ether");
        } catch (error) {
          let response = {
            message: "Contract address not valid!!!! ",
          };
          res.status(404).send(response);
        }
        /* then list the item for sale on the marketplace */
        contract = new ethers.Contract(nftmarketaddress, Market.abi, singer);
        let listingPrice = await contract.getListingPrice();
        listingPrice = listingPrice.toString();

        transaction = await contract.createMarketItem(
          nftaddress,
          tokenId,
          price,
          { value: listingPrice },
          providerNFT
        );
        await transaction.wait();
        console.log("transaction", transaction);

        let response = {
          transaction: transaction,
        };
        res.status(200).send(response);
      } else {
        let response = {
          message: "You do not have enough amount for Mint!!!",
        };
        res.status(404).send(response);
      }
    } catch (e) {
      res.status(404).send(e);
    }
  } else {
    let response = {
      message: "Payload Issue!!!!!!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/buyNFT", async (req, res) => {
  if (
    req.body.walletAddress &&
    req.body.price &&
    req.body.tokenId &&
    req.body.chainId &&
    req.body.signer
  ) {
    try {
      let walletAddress = req.body.walletAddress;
      let priceComming = req.body.price;
      let tokenId = req.body.tokenId;

      if (req.body.chainId != 1) {
        let response = {
          message: "Please connect your metamask with main net!!",
        };
        res.status(404).send(response);
      }
      const signer = providerNFT.getSigner();
      const contract = new ethers.Contract(
        nftmarketaddress,
        Market.abi,
        signer
      );

      let WalletAmountEther = await helper.getBalanceOfWalletAddress(
        walletAddress
      );
      console.log("WalletAmountEther", WalletAmountEther);

      if (WalletAmountEther != false && WalletAmountEther > 0) {
        /* user will be prompted to pay the asking proces to complete the transaction */
        const price = ethers.utils.parseUnits(priceComming.toString(), "ether");
        try {
          const transaction = await contract.createMarketSale(
            nftaddress,
            tokenId,
            {
              value: price,
            }
          );
          let receipt = await transaction.wait();

          let response = {
            data: receipt,
          };
          res.status(200).send(response);
        } catch (error) {
          let response = {
            message: "tokenId not valid!!!!!!",
          };
          res.status(200).send(response);
        }
      } else {
        let response = {
          message: "unknown account or account have insufficient fund!!!!",
        };
        res.status(404).send(response);
      }
    } catch (e) {
      res.status(404).send(e);
    }
  } else {
    let response = {
      message: "Payload Issue!!!!!!!!",
    };
    res.status(404).send(response);
  }
});

/* Returns only items that a user has unsold */
router.get("/getMarketPlace", async (req, res) => {
  try {
    const marketContract = new ethers.Contract(
      nftmarketaddress,
      Market.abi,
      providerNFT
    );
    const data = await marketContract.fetchMarketItems();
    let response = {
      data: data,
    };
    res.status(200).send(response);
  } catch (error) {
    let response = {
      message: error,
    };
    res.status(404).send(response);
  }
});
module.exports = router;

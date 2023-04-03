var express = require("express");
var router = express.Router();
const md5 = require("md5");
const bip39 = require("bip39");
const helper = require("../helper/helper");
const {
  User,
  validate,
  validateResetPassword,
  validateLogin,
  validateOTP,
  varifyValidate,
} = require("../model/User");

router.post("/signup", async (req, res) => {
  validate;
  const { error } = validate(req.body);

  console.log("---error ", error);
  if (error) {
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let userObject = await helper.isUserAlreadyExists(
    req.body.email,
    req.body.phone_number
  );
  console.log(userObject);
  if (userObject == false) {
    var walletDeatils = await helper.createTrustWallet(
      req.body.recoveryPhrase
      // req.body.BTCrecoveryPhrase
    );
    if (walletDeatils == false) {
      let response = {
        message: "invalid mnemonic!!!",
      };
      res.status(404).send(response);
    }
    let insertData = {
      pin_code: md5(req.body.pin_code.trim()),
      email: req.body.email.trim().toLowerCase(),
      phone_number: req.body.phone_number.trim(),

      recoveryPhrase: req.body.recoveryPhrase,
      walletAddress: walletDeatils.walletAddress,
      privateKey: walletDeatils.privateKey,

      // recoveryPhraseBTC: req.body.BTCrecoveryPhrase,
      walletAddressBTC: walletDeatils.walletAddressBTC,
      privateKeyBTC: walletDeatils.privateKeyBTC,
      created_date: new Date(),
    };
    helper.sigupNewUser(insertData);
    let response = {
      message: "successfully registered!!!",
    };
    res.status(200).send(response);
  } else {
    let response = {
      message: "email or phone number already exists!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/login", async (req, res) => {
  validateLogin;
  const { error } = validateLogin(req.body);
  if (error) {
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let userObject = await helper.varifyCredentials(
    req.body.email.trim().toLowerCase(),
    req.body.pin_code
  );
  if (userObject) {
    let response = {
      data: userObject,
    };
    res.status(200).send(response);
  } else {
    let response = {
      message: "credential invalid!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/sendOTPNumber", async (req, res) => {
  validateOTP;
  const { error } = validateOTP(req.body);
  if (error) {
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let check = await helper.sendNumberOtp(req.body.phone_number);
  if (check.sid) {
    let response = {
      message: "code sended!!!",
    };
    res.status(200).send(response);
  } else if (check.status === 500) {
    let response = {
      message: "code not sended try again!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/varifyOTPNumber", async (req, res) => {
  varifyValidate;
  const { error } = varifyValidate(req.body);

  console.log("error --", error);
  if (error) {
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let check = await helper.varifyOtp(req.body.phone_number, req.body.code);
  if (check.status == "approved") {
    let response = {
      message: "code varified!!!",
    };
    res.status(200).send(response);
  } else {
    let response = {
      message: "varification failed try again!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/sendOTPEmail", async (req, res) => {
  if (req.body.email) {
    let check = await helper.generateEmailConfirmationCodeSendIntoEmail(
      req.body.email
    );
    console.log("ceclk", check);
    if (check == true) {
      let response = {
        message: "code sended in email!!!",
      };
      res.status(200).send(response);
    } else {
      let response = {
        message: "code not sended try again!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/varifyOTPUsingEmail", async (req, res) => {
  if (req.body.email && req.body.code) {
    let check = await helper.codeVarifyEmail(req.body.email, req.body.code);
    console.log("assas", check);
    if (check > 0) {
      let response = {
        message: "code varified!!!",
      };
      res.status(200).send(response);
    } else {
      let response = {
        message: "varification failed try again!!!",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/resetPassword", async (req, res) => {
  validateResetPassword;
  let { error } = validateResetPassword(req.body);
  if (error) {
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let status = await helper.varifyPasswordAndUpdate(
    req.body.user_id,
    req.body.old_pin_code,
    req.body.new_pin_code
  );
  if (status == true) {
    let response = {
      message: "updated successfully!!!",
    };
    res.status(200).send(response);
  } else {
    let response = {
      message:
        "not updated old password are not matched or password is already updated!!! ",
    };
    res.status(404).send(response);
  }
});

router.post("/forgetPassword", async (req, res) => {
  if (req.body.email && req.body.pin_code) {
    let status = await helper.updatePassword(req.body.email, req.body.pin_code);
    if (status == true) {
      let response = {
        message: "updated successfully!!!",
      };
      res.status(200).send(response);
    } else {
      let response = {
        message: "User not exists or pin already updated!!! ",
      };
      res.status(404).send(response);
    }
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/updateUserEmail", async (req, res) => {
  if (req.body.email && req.body.user_id) {
    let response = await helper.updateEmail(req.body.email, req.body.user_id);
    res.status(response.status).send(response);
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/addToken", async (req, res) => {
  if (req.body.status && req.body.contract_address && req.body.providerType) {
    let Web3Client = await helper.getWebClient(req.body.providerType);
    let contract = await helper.getContractAddressInstanse(
      req.body.contract_address,
      Web3Client
    );
    let checkStatus = await helper.isContractAddressIsValid(contract);
    // if(checkStatus.status == 404){
    //     res.status(checkStatus.status).send({message: 'invalid token'});
    // }
    let isAlreadyExists = await helper.isContractAddressAlreadyExists(
      checkStatus.symbol,
      req.body.user_id
    );
    if (checkStatus.status == 200 && isAlreadyExists == false) {
      helper.addContractAddress(
        req.body.contract_address,
        checkStatus.symbol,
        req.body.status,
        req.body.user_id,
        checkStatus.decimals,
        req.body.providerType,
        req.body.imageUrl,
        req.body.typeOfCoin
      );
    }
    let message =
      checkStatus.status == 200 && isAlreadyExists == false
        ? "Successfully Added!!!"
        : "Token is already exists!!!";
    checkStatus.message = message;

    delete checkStatus.status;
    delete checkStatus.decimals;

    res.status(200).send(checkStatus);
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/tokenSwitch", async (req, res) => {
  console.log(req.body);
  if (req.body.user_id && req.body.symbol) {
    let response = await helper.updateTheRecord(
      req.body.user_id,
      req.body.symbol,
      req.body.status
    );
    res.status(response.status).send(response);
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/getUserToken", async (req, res) => {
  if (req.body.user_id) {
    let data = await helper.getRecord(req.body.user_id);
    let response = {
      data,
    };
    res.status(200).send(response);
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

router.post("/createRecoveryPhrase", async (req, res) => {
  if (req.body.walletType) {
    let recoveryPhrase =
      req.body.walletType == "create_new" ? bip39.generateMnemonic() : "";
    // let recoveryPhraseBTC =
    // req.body.btcWalletType == "create_new" ? bip39.generateMnemonic() : "";

    let response = {
      recoveryPhrase,
      // recoveryPhraseBTC,
    };
    res.status(200).send(response);
  } else {
    let response = {
      message: "payload missing!!!",
    };
    res.status(404).send(response);
  }
});

module.exports = router;

const mongoose = require("mongoose");
let url = "";
const connectDB = async () => {
  try {
    const conn = mongoose.connect(url, {
      useNewUrlParser: true,
      // useCreateIndex: true,
      // useFindAndModify: false,
      useUnifiedTopology: true,
    });
    console.log("mongo is connected");
  } catch (err) {
    console.log("mongodb getting error", err);
    console.log(`Error ${err.message}`.blue);
    process.exit(1);
  }
};

module.exports = connectDB;

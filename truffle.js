var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "angle river fat organ collect sweet valid royal noise truth canal before";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "HTTP://127.0.0.1:8545", 0, 50);
      },
      network_id: '*'
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};
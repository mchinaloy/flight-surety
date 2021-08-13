
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x3F70F571d547AA1aF146bda8fdaa96A22A710c59",
        "0x434b4f2FAD7DF3bB11eB3bF389e6801E233a9A92",
        "0x104B8790b7bb4c2603c8F2c41ff582ddcd8Af476",
        "0x6B4A9C40b118921529F7836C9b8983845C2758Fc",
        "0xc56bDeDf1A61614C3B861EdD90961c71a762F412",
        "0xDe52a3332f32C33377F0a1327C18A6B6df28fE78",
        "0xd44558cd0a964658b8740eb04c9A0379d3B80D80",
        "0x2c161430290694A46Ee92D229f03ccCc412b2FCf",
        "0xf30E8231c95816F9D5f082d652f5c983fe37d74C"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};
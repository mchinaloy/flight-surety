
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0xE9D4afFFca28AA502E43A39fd3eBa7Ce0AbB3352",
        "0x48C364743a5eFF3963E88D65a7A8520883582a29",
        "0xA4e3059C667F4cCD0fC61f458D40eEd348A80974",
        "0xe67Fe1347c7e3948227D074e6e005fbfaED2d844",
        "0x061aAABcAa3E3dAde5FF4A68c9C76d143276b1b1",
        "0xe3347987202C375b06A81cc2364520c44ea1EeC8",
        "0xc56aF47ef428Af26394c559F135210E53a4346C1",
        "0x4d9f4Bf1970A1Fe3d270C1b9272F684ad36f36d3",
        "0x562d8ccdEFbCFF3d910C96283B4439AFb1fd5F43"
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
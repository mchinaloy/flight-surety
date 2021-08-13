
var Test = require('../config/testConfig.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async() => {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async() => {
      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async() => {
      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async() => {
      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      
      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async() => {
    let newAirline = accounts[2];

    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline(newAirline, {from: config.owner});
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) cannot register another airline if it is not registered', async() => {

  });

  it('Airline can be funded using fund()', async() => {

  });

  it('Passenger can buy insurance for an airline flight using buy()', async() => {
    let airline = accounts[2];
    await config.flightSuretyApp.buy(airline, "ABC1234", config.owner, 1);
    let result = await config.flightSuretyData.getInsuranceAmount(airline, "ABC1234", config.owner, {from: config.owner});
    assert.equal(result, 10, "Passenger should now be insured with an airline for the given flight");
  });

  it('Passenger can claim an insurance payout for a late flight using payout()', async() => {

  });

});

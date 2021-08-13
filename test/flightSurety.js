
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
        // act
        let status = await config.flightSuretyData.isOperational.call();

        // assert
        assert.equal(status, true, "Incorrect initial operating status value");
    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async() => {
        // setup
        let accessDenied = false;

        // act
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch(e) {
            accessDenied = true;
        }

        // assert
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
        await config.flightSuretyData.setOperatingStatus(true, {from: config.owner});
    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async() => {
        // setup
        let accessDenied = false;

        // act
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch(e) {
            accessDenied = true;
        }

        // assert
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
        await config.flightSuretyData.setOperatingStatus(true, {from: config.owner});
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
        await config.flightSuretyData.setOperatingStatus(true);
    });

    it('(airline) can be registered by an existing airline that is registered and funded', async() => {
        // setup
        let newAirline = accounts[1];
        await config.flightSuretyData.setAirlineIsRegistered(newAirline, false, {from: config.owner});

        // act
        await config.flightSuretyApp.registerAirline(config.owner, newAirline, {from: config.owner});

        // assert
        let result = await config.flightSuretyData.isRegistered(newAirline);
        assert.equal(result, true, "Airline should be registered if the proposer is an Airline who is registered");
    });

    it('(airline) cannot register an airline using registerAirline() if the proposer is not registered', async() => {
        // setup
        let proposer = accounts[1];
        let newAirline = accounts[2];

        // act
        let reverted = false;
        try {
            await config.flightSuretyApp.registerAirline(newAirline, {from: proposer});
        } catch(e) {
            reverted = true;
        }
        // assert
        assert.equal(reverted, true, "Airline should not be registered if the proposer is not registered");
    });

    it('(airline) cannot register an Airline using registerAirline() if the proposer is not funded', async() => {
        // setup
        let proposer = accounts[1];
        let newAirline = accounts[2];
        await config.flightSuretyData.setAirlineIsRegistered(proposer, false, {from: config.owner});

        // act
        try {
            await config.flightSuretyApp.registerAirline(proposer, {from: config.firstAirline});
            await config.flightSuretyApp.registerAirline(newAirline, {from: proposer});
        }
        catch(e) {
            reverted = true;
        }

        // assert
        assert.equal(reverted, true, "Airline should not be registered if the proposer is not funded");
    });

    it('(airline) can be funded using fund()', async() => {
        // setup
        let airlineToFund = accounts[1];
        await config.flightSuretyData.setAirlineIsFunded(airlineToFund, false);

        // act
        await config.flightSuretyApp.fund(airlineToFund, {from: config.owner, value: "10000000000000000000"});

        // assert
        let result = await config.flightSuretyData.isAirlineFunded(airlineToFund);
        assert.equal(result, true, "Airline should be funded after funding has been provided");
    });

    it('(airline) can be registered via Multi-Party concensus', async() => {
        // TODO
    });

    it('(passenger) can buy insurance for an airline flight using buy()', async() => {
        // setup
        let airline = accounts[2];
        let flight = "ABC1234";
        await config.flightSuretyData.resetPassengerInsurance(airline, flight, config.owner, {from: config.owner});

        // act
        await config.flightSuretyApp.buy(airline, flight, config.owner, "1");

        // assert
        let result = await config.flightSuretyData.getInsuranceAmount(airline, flight, config.owner, {from: config.owner});
        assert.equal(result, 1, "Passenger should now be insured with an airline for the given flight");
    });

    it('(passenger) can buy insurance and receive a credit using credit()', async() => {
        // TODO
        // setup
        let airline = accounts[1];
        let flight = "ABC1234";

        await config.flightSuretyData.resetPassengerInsurance(airline, flight, config.owner, {from: config.owner});
        await config.flightSuretyApp.buy(airline, flight, config.owner, "1");
        await config.flightSuretyData.credit(airline, flight, {from: config.owner});

        // act
        let result = await config.flightSuretyData.getCreditAmount(airline, flight, config.owner, {from: config.owner});

        // assert
        assert.equal(result, 1, "Passenger should have a credit amount waiting to be paid out");
    });

    it('(passenger can buy insurance, receive a credit and claim it using payout()', async() => {
        // TODO
        // setup
        let airline = accounts[1];
        let flight = "ABC1234";

        await config.flightSuretyData.resetPassengerInsurance(airline, flight, config.owner, {from: config.owner});
        await config.flightSuretyApp.buy(airline, flight, config.owner, "1");
        await config.flightSuretyData.credit(airline, flight, {from: config.owner});

        // act
        await config.flightSuretyApp.payout(airline, flight, config.owner, {from: config.owner});

        // assert
        assert.equal(result, 1, "Passenger should have a credit amount waiting to be paid out");
    });

});

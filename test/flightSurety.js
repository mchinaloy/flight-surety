
var Test = require('../config/testConfig.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });

  beforeEach(async() => {
    for(let count=1; count < accounts.length; count++) {
        await config.flightSuretyData.resetAirline(accounts[count]);
    }
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
        let airline = accounts[1];

        // act
        await config.flightSuretyApp.registerAirline(config.owner, airline, {from: config.owner});

        // assert
        let result = await config.flightSuretyData.isRegistered(airline);
        assert.equal(result, true, "Airline should be registered if the proposer is an Airline who is registered");
    });

    it('(airline) cannot register an airline using registerAirline() if the proposer is not registered', async() => {
        // setup
        let proposer = accounts[1];
        let airline = accounts[2];

        // act
        let reverted = false;
        try {
            await config.flightSuretyApp.registerAirline(airline, {from: proposer});
        } catch(e) {
            reverted = true;
        }
        // assert
        assert.equal(reverted, true, "Airline should not be registered if the proposer is not registered");
    });

    it('(airline) cannot register an airline using registerAirline() if the proposer is not funded', async() => {
        // setup
        let proposer = accounts[1];
        let airline = accounts[2];

        // act
        try {
            await config.flightSuretyApp.registerAirline(proposer, {from: config.owner});
            await config.flightSuretyApp.registerAirline(airline, {from: proposer});
        }
        catch(e) {
            reverted = true;
        }

        // assert
        assert.equal(reverted, true, "Airline should not be registered if the proposer is not funded");
    });

    it('(airline) can be funded using fund()', async() => {
        // setup
        let airline = accounts[1];
        await config.flightSuretyData.setAirlineIsFunded(airline, false);

        // act
        await config.flightSuretyApp.fund(airline, {from: config.owner, value: "10000000000000000000"});

        // assert
        let result = await config.flightSuretyData.isAirlineFunded(airline);
        assert.equal(result, true, "Airline should be funded after funding has been provided");
    });

    it('(airline) can be registered via Multi-Party concensus', async() => {
        // setup
        let airlineOne = accounts[1];
        let airlineTwo = accounts[2];
        let airlineThree = accounts[3];
        let airlineFour = accounts[4];
        let registrationFee = "10000000000000000000";

        // act
        await config.flightSuretyApp.registerAirline(config.owner, airlineOne, {from: config.owner});
        await config.flightSuretyApp.fund(airlineOne, {from: config.owner, value: registrationFee});

        await config.flightSuretyApp.registerAirline(airlineOne, airlineTwo, {from: config.owner});
        await config.flightSuretyApp.fund(airlineTwo, {from: config.owner, value: registrationFee});

        await config.flightSuretyApp.registerAirline(airlineTwo, airlineThree, {from: config.owner});
        await config.flightSuretyApp.fund(airlineThree, {from: config.owner, value: registrationFee});

        // Fifth airline
        await config.flightSuretyApp.registerAirline(airlineThree, airlineFour, {from: config.owner});
        
        // Fifth airline is not Registered yet (only has 1 vote)
        let result = await config.flightSuretyData.isRegistered(airlineFour, {from: config.owner});
        assert.equal(result, false, "Airline should only be registered after receiving enough votes");

        // Submit vote for majority so that the airline can be registered
        await config.flightSuretyApp.registerAirline(airlineTwo, airlineFour, {from: config.owner});

        // assert
        // Fifth airline should now be registered (has sufficient votes)
        let finalResult = await config.flightSuretyData.isRegistered(airlineFour, {from: config.owner});
        assert.equal(finalResult, true, "Airline should only be registered after receiving enough votes")
    });

    it('(passenger) can buy insurance for an airline flight using buy()', async() => {
        // setup
        let airline = accounts[2];
        let flight = "ABC1234";

        await config.flightSuretyData.resetPassengerInsurance(airline, flight, config.owner, {from: config.owner});
        await config.flightSuretyApp.registerAirline(config.owner, airline, {from: config.owner});
        await config.flightSuretyApp.fund(airline, {from: config.owner, value: "10000000000000000000"});

        // act
        await config.flightSuretyApp.buy(airline, flight, config.owner, "1", {from: config.owner});

        // assert
        let result = await config.flightSuretyData.getInsuranceAmount(airline, flight, config.owner, {from: config.owner});
        assert.equal(result, 1, "Passenger should now be insured with an airline for the given flight");
    });

    it('(passenger) can buy insurance and receive a credit using credit()', async() => {
        // setup
        let airline = accounts[1];
        let flight = "ABC1234";

        await config.flightSuretyData.resetPassengerInsurance(airline, flight, config.owner, {from: config.owner});
        await config.flightSuretyApp.registerAirline(config.owner, airline, {from: config.owner});
        await config.flightSuretyApp.fund(airline, {from: config.owner, value: "10000000000000000000"});
        await config.flightSuretyApp.buy(airline, flight, config.owner, "1", {from: config.owner});
        await config.flightSuretyData.credit(airline, flight, {from: config.owner});

        // act
        let result = await config.flightSuretyData.getCreditAmount(airline, flight, config.owner, {from: config.owner});

        // assert
        assert.equal(result, 1, "Passenger should have a credit amount waiting to be paid out");
    });

    it('(passenger can buy insurance, receive a credit and claim it using payout()', async() => {
        // setup
        let airline = accounts[1];
        let flight = "ABC1234";

        await config.flightSuretyData.resetPassengerInsurance(airline, flight, config.owner, {from: config.owner});
        await config.flightSuretyApp.registerAirline(config.owner, airline, {from: config.owner});
        await config.flightSuretyApp.fund(airline, {from: config.owner, value: "10000000000000000000"});
        await config.flightSuretyApp.buy(airline, flight, config.owner, "1", {from: config.owner});
        await config.flightSuretyData.credit(airline, flight, {from: config.owner});

        let result1 = await config.flightSuretyData.getCreditAmount(airline, flight, config.owner, {from: config.owner});
        assert.equal(result1, 1, "Passenger should have > 0 payout waiting");

        // act
        await config.flightSuretyApp.payout(airline, flight, config.owner, {from: config.owner});

        // assert
        assert.equal(result, 1, "Passenger should have a credit amount waiting to be paid out");
    });



});

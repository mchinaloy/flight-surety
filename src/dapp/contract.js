import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.firstAirline = null;
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];
            this.firstAirline = accts[0];
            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    registerAirline(proposer, airlineAddress, callback) {
        let self = this;
        let payload = {
            proposer: proposer,
            airlineAddress: airlineAddress,
        }
        console.log(payload);
        self.flightSuretyApp.methods
            .registerAirline(payload.proposer, payload.airlineAddress)
            .send({ from: self.owner}, (error) => {
                if(error) {
                    payload.registered = false;
                    payload.message = error;
                    callback(error, payload);
                } else {
                    payload.registered = true;
                    payload.message = "Airline " + payload.airlineAddress +  " registered.";
                    callback(error, payload);
                }
            });
    }

    fund(airlineAddress, callback) {
        let self = this;
        let value = this.web3.utils.toWei("10", "ether");
        let payload = {
            airlineAddress: airlineAddress,
            value: value
        }
        self.flightSuretyApp.methods
            .fund(payload.airlineAddress)
            .send({from: self.owner, value: payload.value}, (error) => {
                if(error) {
                    payload.funded = false;
                    payload.message = error;
                    callback(error, payload);
                } else {
                    payload.funded = true;
                    payload.message = "Airline " + payload.airlineAddress + " has been funded for 10 ETH.";
                    callback(error, payload);
                }
            });
    }

    buy(airline, flight, amount, callback) {
        let self = this;
        let value = this.web3.utils.toWei(amount, "ether");
        let payload = {
            airline: airline,
            flight: flight,
            value: value
        }
        self.flightSuretyApp.methods
            .buy(payload.airline, payload.flight, self.owner, payload.value)
            .send({from: self.owner, value: payload.value}, (error) => {
                if(error) {
                    payload.message = error;
                    callback(error, payload);
                } else {
                    payload.message = "Insurance purchased for airline " + payload.airline + " flight " + payload.flight + " to the value of " + payload.value + " WEI";
                    callback(error, payload);
                }
            });
    }

    payout(flight, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            passenger: self.owner
        };
        self.flightSuretyApp.methods
            .payout(payload.airline, payload.flight, payload.passenger)
            .send({from: self.owner}, (error) => {
                if(error) {
                    payload.message = error;
                    callback(error, payload);
                } else {
                    payload.message = "Insurance payout claimed for airline " + payload.airline + " flight " + payload.flight;
                    callback(error, payload);
                }
            });
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.firstAirline,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error) => {
                callback(error, payload);
            });
    }
}
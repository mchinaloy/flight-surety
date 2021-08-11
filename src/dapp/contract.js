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
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    registerAirline(sender, airlineAddress, callback) {
        let self = this;
        let payload = {
            sender: sender,
            airlineAddress: airlineAddress,
        }
        self.flightSuretyApp.methods
            .registerAirline(payload.sender, payload.airlineAddress)
            .send({ from: self.owner}, (error) => {
                if(error) {
                    payload.registered = false;
                    payload.message = "New airline needs a minimum of 4 votes to be registered.";
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
                    payload.message = "Airline failed to fund.";
                    callback(error, payload);
                } else {
                    payload.funded = true;
                    payload.message = "Airline " + payload.airlineAddress + " has been funded for 10 ETH.";
                    callback(error, payload);
                }
            });
    }

    buy(flight, amount, callback) {
        let self = this;
        let value = this.web3.utils.toWei(amount, "ether");
        let payload = {
            flight: flight,
            value: value
        }
        self.flightSuretyApp.methods
            .buy(payload.flight, self.owner, payload.value)
            .send({from: self.owner, value: payload.value}, (error) => {
                if(error) {
                    payload.message = "Failed to purchase insurance for flight" + payload.flight;
                    callback(error, payload);
                } else {
                    payload.message = "Insurance purchased for flight " + payload.flight + " value of " + payload.value + " WEI";
                    callback(error, payload);
                }
            });
    }

    claim(flight, callback) {
        let self = this;
        let payload = {
            flight: flight
        };
        self.flightSuretyApp.methods
            .claim(payload.flight, self.owner)
            .send({from: self.owner}, (error) => {
                if(error) {
                    payload.message = "Failed to claim insurance payout for flight " + payload.flight;
                    callback(error, payload);
                } else {
                    payload.message = "Insurance payout claimed for flight " + payload.flight;
                    callback(error, payload);
                }
            });
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
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
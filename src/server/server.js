import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let STATUS_CODE_UNKNOWN = 0;
let STATUS_CODE_ON_TIME = 10;
let STATUS_CODE_LATE_AIRLINE = 20;
let STATUS_CODE_LATE_WEATHER = 30;
let STATUS_CODE_LATE_TECHNICAL = 40;
let STATUS_CODE_LATE_OTHER = 50;

let NUM_OF_ORACLES = 10;

let oracles = [];

function registerOracles() {
  web3.eth.getAccounts((error, accounts) => {
    for(let i = 0; i < NUM_OF_ORACLES; i++) {
      flightSuretyApp.methods.registerOracle()
        .send({from: accounts[i], value: web3.utils.toWei("1", "ether"), gas: 6721975, gasPrice: 20000000000}, (error) => {
          if(error) {
            console.log(error);
          } else {
            flightSuretyApp.methods.getMyIndexes()
              .call({from: accounts[i]}, (error, result) => {
                if(error) {
                  console.log(error);
                } else {
                  let oracle = {
                    address: accounts[i],
                    indices: result
                  }
                  oracles.push(oracle);
                  console.log("Registered Oracle " + oracle.address + " indices " + oracle.indices);
                }
            });
          }
        });
    }
  });
}

// flightSuretyApp.events.OracleRequest({fromBlock: 0}, function (error, event) {
//     if (error) { 
//       console.log(error)
//     }
//     console.log(event)
//     submitOracleResponse();
// });

// function submitOracleResponse(index, airline, flight, timestamp) {
//   flightSuretyApp.methods
//     .submitOracleResponse(index, airline, flight, timestamp);
// }

const app = express();

app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

registerOracles();

export default app;

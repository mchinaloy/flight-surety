import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let STATUS_CODES = [0, 10, 20, 30, 40, 50];
let NUM_OF_ORACLES = 20;

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
                    indices: String(result).split(',')
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

flightSuretyApp.events.OracleRequest({fromBlock: 0}, function (error, event) {
    if (error) { 
      console.log(error)
    }

    let index = event.returnValues.index;
    console.log("Index received " + index);

    for(let i=0; i < oracles.length; i++) {
      for(let j=0; j < oracles[i].indices.length; j++) {
        if(oracles[i].indices[j] === index) {
          console.log("Index matched for Oracle");
          submitOracleResponse(oracles[i], index, event.returnValues.airline, event.returnValues.flight, event.returnValues.timestamp);
          break;
        }   
      }
    }
});

function submitOracleResponse(oracle, index, airline, flight, timestamp) {
  let randomStatusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)]
  let payload = {
    oracle: oracle,
    index: index,
    airline: airline,
    flight: flight,
    timestamp: timestamp,
    statusCode: randomStatusCode
  }
  console.log("Submitting response from Oracle " + oracle.address);
  console.log(payload);
  flightSuretyApp.methods
    .submitOracleResponse(payload.index, payload.airline, payload.flight, payload.timestamp, payload.statusCode)
    .send({from: payload.oracle.address}, (error, result) => {
      if(error) {
        console.log(error, payload);
      } else {
        console.log(result);
      }
    })
}

const app = express();

app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

registerOracles();

export default app;

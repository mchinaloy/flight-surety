
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Running contract operational check, status is', [ { label: '', error: error, value: result} ]);
        });
        
        DOM.elid('register').addEventListener('click', () => {
            let sender = DOM.elid('register-airline-sender').value;
            let airlineAddress = DOM.elid('register-airline-address').value;
            contract.registerAirline(sender, airlineAddress, (error, result) => {
                display('Registering airline, status is', [{label: '', error: error, value: result.message}]);
            });
        });

        DOM.elid('fund').addEventListener('click', () => {
            let airlineAddress = DOM.elid('fund-airline-address').value;
            contract.fund(airlineAddress, (error, result) => {
                display('Funding airline, status is', [{label: '', error: error, value: result.message}]);
            });
        });

        DOM.elid('buy').addEventListener('click', () => {
            let flight = DOM.elid('buy-insurance-flight').value;
            let amount = DOM.elid('buy-insurance-amount').value;
            contract.buy(flight, amount, (error, result) => {
                display('Insurance purchase, status is', [{label: '', error: error, value: result.message}]);
            });
        });

        DOM.elid('claim').addEventListener('click', () => {
            let flight = DOM.elid('claim-insurance-flight').value;
            contract.claim(flight, (error, result) => {
                display('Insurance claim, status is', [{label: '', error: error, value: result.message}])
            });
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            console.log(flight);
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
    
    }); 

})();

function display(message, results) {
    let displayDiv = DOM.elid("display-wrapper");
    results.map((result) => {
        let response = "";
        if(result.value !== undefined) {
            response = message + ": " + result.value;
        } else {
            response = message + ": " + result.error; 
        }
        displayDiv.value = response;
    })
}








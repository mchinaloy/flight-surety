pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint AIRLINE_REGISTRATION_LIMIT = 5;
    uint AIRLINE_FUNDING_COST = 10 ether;
    uint PASSENGER_INSURANCE_LIMIT = 1 ether;

    mapping(address => address[]) private votes;
    mapping(address => Airline) private airlines;
    mapping(bytes32 => Passenger[]) private insurees;

    struct Airline {
        address airline;
        bool isRegistered;
        bool isFunded;
        uint votes;
    }

    struct Passenger {
        address passenger;
        uint insuranceAmount;
        uint creditAmount;
    }

    uint registeredAirlines = 0;
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address airline);
    event AirlineVoteRegistered(address proposer, address airline);
    event AirlineFunded(address airline);
    event InsurancePurchased(string flight, address passenger, uint insuranceAmount);
    event CreditIssued(address airline, string flight, address passenger, uint creditAmount);
    event CreditTransferred(address airline, string flight, address passenger, uint creditAmount);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() public {
        contractOwner = msg.sender;
        airlines[contractOwner] = Airline({
            airline: contractOwner,
            isRegistered: true,
            isFunded: true,
            votes: 0
        });
        registeredAirlines = registeredAirlines + 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational.");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner.");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function setAirlineIsRegistered(address airline, bool isRegistered) external requireContractOwner {
        airlines[airline].isRegistered = isRegistered;
    }

    function setAirlineIsFunded(address airline, bool isFunded) external requireContractOwner {
        airlines[airline].isFunded = isFunded;
    }

    function resetPassengerInsurance(address airline, string flight, address passenger) requireContractOwner {
        bytes32 key = keccak256(abi.encodePacked(airline, flight));
        for(uint count=0; count < insurees[key].length; count++) {
            if(insurees[key][count].passenger == passenger) {
                insurees[key][count].insuranceAmount = 0;
                insurees[key][count].creditAmount = 0;
            }
        }
    }

    function isAirline(address airline) external view requireIsOperational returns(bool) {
        return isRegistered(airline) == true && airlines[airline].isFunded == true;
    }

    function isRegistered(address airline) public view requireIsOperational returns(bool) {
        return airlines[airline].isRegistered == true;
    }

    function isAirlineFunded(address airline) public view requireIsOperational returns(bool) {
        return airlines[airline].isFunded; 
    }

    function getInsuranceAmount(address airline, string flight, address passenger) public view requireIsOperational returns(uint) {
        bytes32 key = keccak256(abi.encodePacked(airline, flight));
        for(uint count=0; count < insurees[key].length; count++) {
            if(insurees[key][count].passenger == passenger) {
                return insurees[key][count].insuranceAmount;
            }
        }
        return 0;
    }

    function getCreditAmount(address airline, string flight, address passenger) public view requireIsOperational returns(uint) {
        bytes32 key = keccak256(abi.encodePacked(airline, flight));
        for(uint count=0; count < insurees[key].length; count++) {
            if(insurees[key][count].passenger == passenger) {
                return insurees[key][count].creditAmount;
            }
        }
        return 0;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(address proposer, address airline) external requireIsOperational {
        require(airlines[proposer].isRegistered == true, "Proposer is not registered.");
        require(airlines[proposer].isFunded == true, "Proposer is not funded.");
        require(airlines[airline].isRegistered == false, "Airline is already registered.");

        if(registeredAirlines < AIRLINE_REGISTRATION_LIMIT) {
            airlines[airline] = Airline({
                airline: airline,
                isRegistered: true,
                isFunded: false,
                votes: 0
            });
            registeredAirlines = registeredAirlines + 1;
            emit AirlineRegistered(airline);
        } else {
            // Multi-party concensus of 50%
            bool alreadyVoted = false;
            
            for(uint count = 0; count < votes[airline].length; count++) {
                if(votes[airline][count] == proposer) {
                    alreadyVoted = true;
                    break;
                }
            }

            require(!alreadyVoted, "Proposer has already voted.");
            votes[airline].push(proposer);

            if(votes[airline].length >= registeredAirlines.div(2)) {
                airlines[airline] = Airline({
                    airline: airline,
                    isRegistered: true,
                    isFunded: false,
                    votes: votes[airline].length
                });
                registeredAirlines = registeredAirlines + 1;
                emit AirlineRegistered(airline);
            } else {
                emit AirlineVoteRegistered(proposer, airline);
            }
        }
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(address airline, string flight, address passenger, uint value) external payable requireIsOperational {
        require(value <= PASSENGER_INSURANCE_LIMIT, "Insurance value must be <= 1 Ether.");
        bytes32 key = keccak256(abi.encodePacked(airline, flight));
        insurees[key].push(Passenger(passenger, value, 0));
        emit InsurancePurchased(flight, passenger, value);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function credit(address airline, string flight) external requireIsOperational {
        bytes32 key = keccak256(abi.encodePacked(airline, flight));
        for(uint count = 0; count < insurees[key].length; count++) {
            if(insurees[key][count].insuranceAmount > 0) {
                uint creditAmount = insurees[key][count].insuranceAmount.div(2);
                insurees[key][count].creditAmount = creditAmount;
                emit CreditIssued(airline, flight, insurees[key][count].passenger, creditAmount);
            }
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function payout(address airline, string flight, address passenger) external requireIsOperational {
        // checks-effects-interactions guard
        bytes32 key = keccak256(abi.encodePacked(airline, flight));

        for(uint count = 0; count < insurees[key].length; count++) {
            if(insurees[key][count].passenger == passenger) {
                uint creditAmount = insurees[key][count].creditAmount + insurees[key][count].insuranceAmount;
                require(creditAmount > 0, "No credit available to be withdrawn.");
                insurees[key][count].creditAmount = 0;
                insurees[key][count].insuranceAmount = 0;
                passenger.transfer(creditAmount);
                emit CreditTransferred(airline, flight, passenger, creditAmount);
            }
        }
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund(address airline, uint value) public payable requireIsOperational {
        require(value >= AIRLINE_FUNDING_COST, "Funding cost must be >= 10 Ether.");
        airlines[airline].isFunded = true;
        emit AirlineFunded(airline);
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable {
        fund(contractOwner, msg.value);
    }

}


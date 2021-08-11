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

    address[] multiSig = new address[](0);

    mapping(address => Airline) private airlines;
    mapping(string => Flight) private flights;
    mapping(bytes32 => Passenger) private insurees;

    struct Airline {
        address airline;
        bool isRegistered;
        bool isFunded;
    }

    struct Flight {
        address airline;
        string flight;  
        uint timestamp;
    }

    struct Passenger {
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
    event AirlineFunded(address airline);
    event FlightRegistered(address airline, string flight, uint timestamp);
    event InsurancePurchased(string flight, address passenger, uint insuranceAmount);
    event CreditIssued(string flight, address passenger, uint creditAmount);
    event CreditTransferred(string flight, address passenger, uint creditAmount);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() public {
        contractOwner = msg.sender;
        airlines[contractOwner] = Airline({
            airline: contractOwner,
            isRegistered: true,
            isFunded: true
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
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsRegisteredCaller(address sender) {
        require(airlines[sender].isRegistered, "Caller is not registered");
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

    function isRegistered() public view returns(bool) {
        return airlines[msg.sender].isRegistered;
    }

    function setIsRegistered(address airline, bool registrationStatus) external requireContractOwner {
        airlines[airline].isRegistered = registrationStatus;
        if(registrationStatus == true) {
            registeredAirlines = registeredAirlines + 1;
        } else {
            if(registeredAirlines > 0) {
                registeredAirlines = registeredAirlines - 1;
            }
        }
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(address sender, address airline) external requireIsOperational requireIsRegisteredCaller(sender) {
        if(registeredAirlines < AIRLINE_REGISTRATION_LIMIT) {
            airlines[airline] = Airline({
                airline: airline,
                isRegistered: true,
                isFunded: false
            });
            emit AirlineRegistered(airline);
        } else {
            // Multi-party concensus of 50%
            bool alreadySigned = false;
            for(uint count = 0; count < multiSig.length; count++) {
                if(multiSig[count] == msg.sender) {
                    alreadySigned = true;
                    break;
                }
            }

            require(!alreadySigned, "Caller has already signed");

            multiSig.push(msg.sender);
            if(multiSig.length >= registeredAirlines.div(2)) {
                airlines[airline] = Airline({
                    airline: airline,
                    isRegistered: true,
                    isFunded: false
                });
                multiSig = new address[](0);
                emit AirlineRegistered(airline);
            }
        }
    }

    function registerFlight(address airline, string flight, uint timestamp) external requireIsOperational {
        if(msg.sender == airlines[msg.sender].airline) {
            flights[flight] = Flight({
                airline: airline,
                flight: flight,
                timestamp: timestamp
            });
            emit FlightRegistered(airline, flight, timestamp);
        }
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(string flight, address passenger, uint value) external payable requireIsOperational {
        if(value <= PASSENGER_INSURANCE_LIMIT) {
            bytes32 key = keccak256(abi.encodePacked(flight, passenger));
            insurees[key] = Passenger({
                insuranceAmount: value,
                creditAmount: 0
            });
            emit InsurancePurchased(flight, passenger, value);
        }
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function claim(string flight, address passenger) external requireIsOperational {
        bytes32 key = keccak256(abi.encodePacked(flight, passenger));
        uint256 creditAmount = insurees[key].insuranceAmount.mul(15).div(10);
        if(creditAmount > 0) {
            insurees[key].creditAmount = creditAmount;
            emit CreditIssued(flight, passenger, creditAmount);
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(string flight) external requireIsOperational {
        // checks-effects-interactions guard
        bytes32 key = keccak256(abi.encodePacked(flight, msg.sender));
        uint256 creditAmount = insurees[key].creditAmount;
        if(creditAmount > 0) {
            insurees[key].creditAmount = 0;
            msg.sender.transfer(creditAmount);
            emit CreditTransferred(flight, msg.sender, creditAmount);
        }
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund(address airline) public payable requireIsOperational {
        if(msg.value == AIRLINE_FUNDING_COST) {
            airlines[airline].isFunded = true;
            emit AirlineFunded(airline);
        }
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable {
        fund(contractOwner);
    }


}


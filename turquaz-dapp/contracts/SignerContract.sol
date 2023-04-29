pragma solidity ^0.8.9;

import "./interfaces/IERC1271.sol";
import "./Settler.sol";
import "./interfaces/IERC20.sol";
import "hardhat/console.sol";


// Examplary signer contract to test eip1271
contract SignerContract is IERC1271 {
    address public owner;
    bytes4 MAGICVALUE = 0x1626ba7e;
    Order orderr;
    address settlerContractAddress;

    struct Order {
        //version?? or version in future versions ?
        address creator;
        address settler;

        OrderType orderType;

        address basePair;

        address requestedToken;
        address releasedToken;

        uint256 requestAmount;
        uint256 releaseAmount;

        // purpose of slippage is both slippage and the fee the settler can extract
        // if a settler sends two completly matching orders to the settle function
        // the settler can take all the slippageBps to itself
        // if a settler sends an order with slippageBps fully covered by actual slippage settler can take zero fees from that order
        // needs iterating on the idea to achieve optimality
        // should orders then be placed in the orderbook by price + (slippage * price) for buys and - for sells?
        //uint256 slippageBps;

        uint256 creationTime;
        uint256 expirationTime;

        uint256 randNonce;
        
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    enum OrderType{BUY, SELL}

    constructor(address _settlerContractAddress) {
        owner = msg.sender;
        settlerContractAddress = _settlerContractAddress;
    }

    function depositToSettler(
    address settlerContractAddress,
    address token,
    uint256 amount
    ) public payable {
        if (token == address(0)) {
            require(msg.value == amount, "Incorrect ETH deposit amount");
            (bool success, ) = settlerContractAddress.call{value: msg.value}(
                abi.encodeWithSignature("deposit(address,uint256)", token, amount)
            );
            require(success, "ETH deposit to Settler contract failed");
        } else {
            IERC20(token).approve(settlerContractAddress, amount); 
            (bool success, ) = settlerContractAddress.call(
                abi.encodeWithSignature("deposit(address,uint256)", token, amount)
            );
            require(success, "ERC20 deposit to Settler contract failed");
        }
    }

    // This is a sell order
    function signOrder(address requestedToken, address releasedToken, address settler) public {

        orderr = Order ({
            creator: address(this),
            settler: settler,
            orderType: OrderType.SELL,
            basePair: requestedToken,
            requestedToken: requestedToken,
            releasedToken: releasedToken,
            requestAmount: 1000,
            releaseAmount: 100,
            creationTime: 1681835763,
            expirationTime: 3363671526,
            randNonce: 124,
            v: 1,
            r: bytes32(0),
            s: bytes32(0)
        });

    }

    function getOrder() public view returns (Order memory) {
        return orderr;
    }

    function getMessageHash(Order memory order) public view returns (bytes32) {
        bytes32 DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Turquaz")),
            keccak256(bytes("0.1")),
            43114,
            settlerContractAddress
        ));

        bytes32 ORDER_TYPEHASH = keccak256(abi.encodePacked(
            "Order(",
            "address creator,",
            "address settler,",
            "uint8 orderType,",
            "address basePair,",
            "address requestedToken,",
            "address releasedToken,",
            "uint256 requestAmount,",
            "uint256 releaseAmount,",
            "uint256 creationTime,",
            "uint256 expirationTime,",
            "uint256 randNonce",
            ")"
        ));

        return keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                ORDER_TYPEHASH,
                order.creator,
                order.settler,
                order.orderType,
                order.basePair,
                order.requestedToken,
                order.releasedToken,
                order.requestAmount,
                order.releaseAmount,
                order.creationTime,
                order.expirationTime,
                order.randNonce
            ))
        ));
    }

    function isValidSignature(bytes32 _hash, bytes memory _signature) public view override returns (bytes4) {
        if (getMessageHash(orderr) == _hash ) {
            return MAGICVALUE;
        }
        return bytes4(0);
    }
}
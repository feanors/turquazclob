//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

import "./interfaces/IERC20.sol";
import "./interfaces/IERC1271.sol";
import "hardhat/console.sol";



// This is the main building block for smart contracts.
contract Settler {

    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public immutable ORDER_TYPEHASH;

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

    constructor() {
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Turquaz")),
            keccak256(bytes("0.1")),
            43114,
            address(this)
        ));

        ORDER_TYPEHASH = keccak256(abi.encodePacked(
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
    }

    


    mapping(bytes32 => bool) public settledOrderHashes;

    // Maps user to their last allowed settle time
    // Users calls the forceCancelAll function to set their time to current time
    // Orders trying to be settled will check this and revert
    // if order.orderCreationTime < users mapping of last allowed time
    mapping(address => uint256) public lastAllowedSettleTime;

    // Maps user address to token address to balance
    mapping(address => mapping(address => uint256)) public balances;

    event Deposit(address indexed user, address indexed token, uint256 amount);

    function deposit(address token, uint256 amount) public payable {
        require(amount > 0, "Deposit amount must be greater than 0");

        if (token == address(0)) {
            // Handle ETH deposits
            require(msg.value == amount, "Incorrect ETH deposit amount");
            balances[msg.sender][token] += amount;
            emit Deposit(msg.sender, token, amount);
        } else {
            // Handle ERC20 token deposits
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Token transfer failed");
            balances[msg.sender][token] += amount;
            emit Deposit(msg.sender, token, amount);
        }
    }
    

    function withdraw(address token, uint256 amount) public {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= balances[msg.sender][token], "Insufficient balance");
        if (token == address(0)) {
            balances[msg.sender][token] -= amount;
            (bool success,) = msg.sender.call{value: amount}("");
            require(success, "ETH withdraw failed");
        } else {
            IERC20 erc20 = IERC20(token);
            balances[msg.sender][token] -= amount;
            require(erc20.transfer(msg.sender, amount), "Token transfer failed");
        }
    }

    event forceCanceledAll(address caller, uint256 time);
    function forceCancelAll(uint256 time) public {
        lastAllowedSettleTime[msg.sender] = time;
        emit forceCanceledAll(msg.sender, time);
    }

    event OrdersSettled(address indexed creator1, Order o1, address indexed creator2, Order o2);

    // settle assumes o1 is the maker and o2 is the taker while calculating best price for order
    // since current design is taker gets the best price, positive price difference on order is fully favored to taker
    function settle(Order memory o1, Order memory o2) public {

        // Sanity check
        require(o1.releaseAmount > 0, "Order1 release amount is not larger than 0");
        require(o1.requestAmount > 0, "Order1 request amount is not larger than 0");
        require(o2.releaseAmount > 0, "Order2 release amount is not larger than 0");
        require(o2.requestAmount > 0, "Order2 request amount is not larger than 0");

        // Only the designated settler can settle
        require(o1.settler == msg.sender && o2.settler == msg.sender);

        require(o1.orderType != o2.orderType, "Orders are of same type");
        require(o1.basePair == o2.basePair, "Base pairs of orders do not match");
        require(o1.releasedToken == o2.requestedToken && o1.requestedToken == o2.releasedToken, "Tokens traded do not match");
        require(o1.orderType == OrderType.BUY ? o1.basePair == o1.releasedToken : o1.basePair == o1.requestedToken, "Order 1 base pair doesnt match with token address inputs");
        require(o2.orderType == OrderType.BUY ? o2.basePair == o2.releasedToken : o2.basePair == o2.requestedToken, "Order 1 base pair doesnt match with token address inputs");

        // check expiry
        require(o1.expirationTime >= block.timestamp, "Order 1 expired");
        require(o2.expirationTime >= block.timestamp, "Order 2 expired");

        // compare to user force cancels
        require(lastAllowedSettleTime[o1.creator] <= o1.creationTime, "Order1 creator called for a force cancel");
        require(lastAllowedSettleTime[o2.creator] <= o2.creationTime, "Order2 creator called for a force cancel");

        // Check fully matching settlement
        require(o1.releaseAmount >= o2.requestAmount, "Order 1 release amount does not match order2 request amount");
        require(o1.requestAmount <= o2.releaseAmount, "Order 2 release amount does not match order1 request amount");
        
        // Check balances 
        require(o1.releaseAmount <= balances[o1.creator][o1.releasedToken], "Order 1 does not have enough asset to release");
        require(o2.releaseAmount <= balances[o2.creator][o2.releasedToken], "Order 2 does not have enough asset to release");

        bytes32 o1Hash = getMessageHash(o1);
        bytes32 o2Hash = getMessageHash(o2);

        // check hash already settled
        require(settledOrderHashes[o1Hash] == false, "Order 1 was settled before");
        require(settledOrderHashes[o2Hash] == false, "Order 2 was settled before");

        // Verify the order of hashes (Verifier signatures are for the orders submitted and signed by the order.creator)
        require(verify(o1Hash, o1), "Order 1 could not be verified");
        require(verify(o2Hash, o2), "Order 2 could not be verified");

        // Calculates on o1 < o2
        uint256 o1EffectiveRequestAmount = o1.requestAmount;
        uint256 o2EffectiveRequestAmount = o1.releaseAmount;

        // Calculates to o1 > o2
        if (o1.releaseAmount > o2.requestAmount) {
            o1EffectiveRequestAmount = o2.releaseAmount;
            o2EffectiveRequestAmount = o2.requestAmount;
        }

        // Calculate fee for settler
        uint feeNumerator = 1;
        uint feeDenominator = 100;

        uint256 o1Fee = (o2EffectiveRequestAmount * feeNumerator) / feeDenominator;
        uint256 o2Fee = (o1EffectiveRequestAmount * feeNumerator) / feeDenominator;

        // Update balances of o1.creator
        balances[o1.creator][o1.releasedToken] -= o2EffectiveRequestAmount;
        balances[o1.creator][o1.requestedToken] += (o1EffectiveRequestAmount - o2Fee);

        // Update balances of o2.creator
        balances[o2.creator][o2.releasedToken] -= o1EffectiveRequestAmount;
        balances[o2.creator][o2.requestedToken] += (o2EffectiveRequestAmount - o1Fee);
        

        // Deposit fee to settler
        balances[o1.settler][o1.releasedToken] += o1Fee;
        balances[o2.settler][o2.releasedToken] += o2Fee;

        settledOrderHashes[o1Hash] = true;
        settledOrderHashes[o2Hash] = true;

    }

    function balanceOf(address account, address token) external view returns (uint256) {
        return balances[account][token];
    }

    function createTransactionID(Order memory order) public pure returns (bytes32) {
        bytes memory signature = abi.encodePacked(order.v, order.r, order.s);
        return keccak256(signature);
    }

    function verify(bytes32 orderHash, Order memory order) public view returns (bool) {
        if (!isContract(order.creator)) {
            return ecrecover(orderHash, order.v, order.r, order.s) == order.creator;
        }
        return IERC1271(order.creator).isValidSignature(orderHash, abi.encodePacked(order.v, order.r, order.s)) == 0x1626ba7e;
    }

    function getMessageHash(Order memory order) public view returns (bytes32) {
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

    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }

    

}
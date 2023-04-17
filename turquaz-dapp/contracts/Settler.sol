//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

import "./interfaces/IERC20.sol";
import "hardhat/console.sol";


// This is the main building block for smart contracts.
contract Settler {

    struct Order {
        //version?? or version in future versions ?
        address creator;
        address settler;

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


    mapping(bytes32 => bool) public settledOrderHashes;

    // Maps user to their last allowed settle time
    // Users calls the forceCancelAll function to set their time to current time
    // Orders trying to be settled will check this and revert
    // if order.orderCreationTime < users mapping of last allowed time
    mapping(address => uint256) public lastAllowedSettleTime;

    // Maps user address to token address to balance
    mapping(address => mapping(address => uint256)) public balances;

    event Deposit(address indexed user, address indexed token, uint256 amount);

    function fun(Order memory order) public {
        console.log("hello");
    }

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

    function getMesssageHash(Order memory order) public pure returns (bytes32) {
        return keccak256(abi.encode(
            order.creator,
            order.settler,
            order.requestedToken,
            order.releasedToken,
            order.requestAmount,
            order.releaseAmount,
            order.creationTime,
            order.expirationTime,
            order.randNonce
        ));
    }

    function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    function recoverSigner(bytes32 ethSignedMessageHash, uint8 v, bytes32 r, bytes32 s) public pure returns(address) {
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function verify(Order memory order) public pure returns (bool) {
        bytes32 messageHash = getMesssageHash(order);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        return recoverSigner(ethSignedMessageHash, order.v, order.r, order.s) == order.creator;
    }

    function createTransactionID(Order memory order) public pure returns (bytes32) {
        bytes memory signature = abi.encodePacked(order.v, order.r, order.s);
        return keccak256(signature);
    }

    event forceCanceledAll(address caller, uint256 time);
    function forceCancelAll(uint256 time) public {
        lastAllowedSettleTime[msg.sender] = time;
        emit forceCanceledAll(msg.sender, time);
    }

    event DebugEvent(string message);

    event OrdersSettled(address indexed creator1, Order o1, address indexed creator2, Order o2);
    function settle(Order memory o1, Order memory o2) public {
        // Sanity check
        require(o1.releaseAmount > 0, "Order1 release amount is not larger than 0");
        require(o1.requestAmount > 0, "Order1 request amount is not larger than 0");
        require(o2.releaseAmount > 0, "Order2 release amount is not larger than 0");
        require(o2.requestAmount > 0, "Order2 request amount is not larger than 0");

        // Only the designated settler can settle
        require(o1.settler == msg.sender && o2.settler == msg.sender);

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

        bytes32 o1TransactionID = createTransactionID(o1);
        bytes32 o2TransactionID = createTransactionID(o2);

        // check hash already settled
        require(settledOrderHashes[o1TransactionID] == false, "Order 1 was settled before");
        require(settledOrderHashes[o2TransactionID] == false, "Order 2 was settled before");

        // Verify the order of hashes (Verifier signatures are for the orders submitted and signed by the order.creator)
        require(verify(o1), "Order 1 could not be verified");
        require(verify(o2), "Order 2 could not be verified");

        uint256 o1ReleaseMidpoint = o1.releaseAmount;
        if (o1.releaseAmount != o2.requestAmount) {
            o1ReleaseMidpoint = (o1.releaseAmount + o2.requestAmount) / 2;
        }

        uint256 o2ReleaseMidpoint = o2.releaseAmount;
        if (o2.releaseAmount != o1.requestAmount) {
            o2ReleaseMidpoint = (o2.releaseAmount + o1.requestAmount) / 2;
        }


        // Calculate fee for settler
        uint feeNumerator = 1;
        uint feeDenominator = 100;

        uint256 o1Fee = (o1ReleaseMidpoint * feeNumerator) / feeDenominator;
        uint256 o2Fee = (o2ReleaseMidpoint * feeNumerator) / feeDenominator;

        // Update balances of o1.creator
        balances[o1.creator][o1.releasedToken] -= o1ReleaseMidpoint;
        balances[o1.creator][o1.requestedToken] += (o2ReleaseMidpoint - o2Fee);

        // Update balances of o2.creator
        balances[o2.creator][o2.releasedToken] -= o2ReleaseMidpoint;
        balances[o2.creator][o2.requestedToken] += (o1ReleaseMidpoint - o1Fee);
        

        // Deposit fee to settler
        balances[o1.settler][o1.releasedToken] += o1Fee;
        balances[o2.settler][o2.releasedToken] += o2Fee;

        settledOrderHashes[o1TransactionID] = true;
        settledOrderHashes[o2TransactionID] = true;

    }

    function balanceOf(address account, address token) external view returns (uint256) {
        return balances[account][token];
    }
}
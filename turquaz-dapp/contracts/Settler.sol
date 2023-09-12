//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

import "./interfaces/IERC20.sol";
import "./interfaces/IERC1271.sol";
import "./hardhat/console.sol";




// This is the main building block for smart contracts.
contract Settler {

    bool internal locked = false;
    modifier noReentrancy() {
        require(!locked, "Reentrant call detected");
        locked = true;
        _;
        locked = false;
    }

    uint256 precision = 10 ** 8;
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public immutable ORDER_TYPEHASH;

    struct Order {
        //version?? or version in future versions ?
        address creator;
        address settler;

        OrderType orderType;

        address basePair;
        address tradedPair;

        // minSettleAmount represents the minimum settlement amount. for example,
        // a buyer creates a buy order for 100btc and a seller creates a sell order for 10btc,
        // if the buyer's minSettleAmount is larget than 10btc, that trade wont settle, however,
        // this will most likely be handler offchain.
        // same situation again applies for partially filled orders and their settlements
        uint256 minSettleAmount;
        uint256 amount;
        uint256 price;

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
            "address tradedPair,",
            "uint256 minSettleAmount,"
            "uint256 amount,",
            "uint256 price,",
            "uint256 creationTime,",
            "uint256 expirationTime,",
            "uint256 randNonce",
            ")"
        ));
    }

    
    

    // orderHashFill represents the amount filled, for sellers this amount would be the amount of token x sold
    // and for buyers it is the amount bought
    mapping(bytes32 => uint256) public orderHashFill;

    // Maps user to their last allowed settle time
    // Users calls the forceCancelAll function to set their time to current time
    // Orders trying to be settled will check this and revert
    // if order.orderCreationTime < users mapping of last allowed time
    mapping(address => uint256) public lastAllowedSettleTime;

    // Maps user address to token address to balance
    mapping(address => mapping(address => uint256)) public balances;

    event Deposit(address indexed user, address indexed token, uint256 amount);

    function deposit(address token, uint256 amount) public payable noReentrancy {
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
    

    function withdraw(address token, uint256 amount) public noReentrancy {
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

    event OrdersSettled(address indexed creator1, Order maker, address indexed creator2, Order taker);

    function calculateRemainingSettleAmount(Order memory order, bytes32 orderHash) private view returns (uint256) {
        return order.amount - orderHashFill[orderHash];
    }

    // since current design is taker gets the best price, positive price difference on order is fully favored to taker
    function settle(Order memory buyer, Order memory seller, bool isBuyerMaker) public noReentrancy {
    
        // Sanity check
        require(buyer.amount > 0, "Buy order amount is lte to 0");
        require(buyer.price > 0, "Buy order price is lte to 0");
        require(seller.amount > 0, "Sell order amount is lte to 0");
        require(seller.price > 0, "Sell order price is lte to 0");

        // Only the designated settler can settle
        require(buyer.settler == msg.sender && seller.settler == msg.sender);

        require(buyer.orderType == OrderType.BUY, "First parameter should be of type OrderType.Buy");
        require(seller.orderType == OrderType.SELL, "Second parameter should be of type OrderType.Sell");

        require(buyer.basePair == seller.basePair, "Base pairs of orders do not match");
        require(buyer.tradedPair == seller.tradedPair, "Traded pairs of orders do not match");

        // check expiry
        require(buyer.expirationTime >= block.timestamp, "Buy order expired");
        require(seller.expirationTime >= block.timestamp, "Sell order expired");

        // compare to user force cancels
        require(lastAllowedSettleTime[buyer.creator] <= buyer.creationTime, "Buyer called for a force cancel");
        require(lastAllowedSettleTime[seller.creator] <= seller.creationTime, "Seller called for a force cancel");
        
        
        bytes32 buyerHash = getMessageHash(buyer);
        bytes32 sellerHash = getMessageHash(seller);

        // Verify the order of hashes (Verifier signatures are for the orders submitted and signed by the order.creator)
        require(verify(buyerHash, buyer), "Buy order could not be verified");
        require(verify(sellerHash, seller), "Sell order could not be verified");


        require(buyer.price >= seller.price, "Buy price is less than sell price");

        //redundant checks of fills, is already checked in indirectly by total amount calculation, but checking pre-calculation
        require(buyer.amount > orderHashFill[buyerHash], "Buy order is filled");
        require(seller.amount > orderHashFill[sellerHash], "Sell order is filled");

        uint256 buyerAmount = calculateRemainingSettleAmount(buyer, buyerHash);
        uint256 sellerAmount = calculateRemainingSettleAmount(seller, sellerHash);
        uint256 totalAmount = buyerAmount > sellerAmount ? sellerAmount : buyerAmount;
        uint256 totalPrice = isBuyerMaker ? totalAmount * buyer.price : totalAmount * seller.price;

        require(totalAmount > buyer.minSettleAmount, "Total amount to settle is lt minSettleAmount of buyer");
        require(totalAmount > seller.minSettleAmount, "Total amount to settle is lt minSettleAmount of Asker(taker)");

        require(totalPrice <= balances[buyer.creator][buyer.basePair] * precision, "Buyer does not have enough assets to buy");
        require(totalAmount <= balances[seller.creator][seller.tradedPair], "Seller does not have enough assets to sell");

        uint feeNumerator = 1;
        uint feeDenominator = 100;

        uint256 basePairFee = (totalPrice * feeNumerator) / feeDenominator;
        uint256 tradedPairFee = (totalAmount * feeNumerator) / feeDenominator;

        balances[buyer.creator][buyer.basePair] -= totalPrice / precision;
        balances[seller.creator][seller.tradedPair] -= totalAmount;

        balances[buyer.creator][buyer.tradedPair] += totalAmount - tradedPairFee;
        balances[seller.creator][seller.basePair] += (totalPrice - basePairFee) / precision;

        balances[buyer.settler][buyer.basePair] += basePairFee / precision;
        balances[seller.settler][seller.tradedPair] += tradedPairFee;

        orderHashFill[buyerHash] += totalAmount;
        orderHashFill[sellerHash] += totalAmount;
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
                order.tradedPair,
                order.minSettleAmount,
                order.amount,
                order.price,
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
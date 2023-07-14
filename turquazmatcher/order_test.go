package turquazmatcher

import (
	"testing"
	"time"

	"github.com/holiman/uint256"
)

func TestNewOrders(t *testing.T) {
	orderParams := SolidityOrderParameters{
		Creator:        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
		Settler:        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
		OrderType:      0,
		BasePair:       "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
		RequestedToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
		ReleasedToken:  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
		RequestAmount:  uint256.NewInt(4),
		ReleaseAmount:  uint256.NewInt(100),
		CreationTime:   uint256.NewInt(uint64(time.Now().Unix())),
		ExpirationTime: uint256.NewInt(uint64(time.Now().Add(time.Hour).Unix())),
		V:              4,
		R:              "hello",
		S:              "bye",
	}

	order := NewOrder(orderParams, time.Now())

	if order.Creator.Hex() != orderParams.Creator {
		t.Errorf("Hex of the creators address should be the same as the initial supplied hex")
	}
}

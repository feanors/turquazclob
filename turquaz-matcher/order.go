package turquazmatcher

import (
	"bytes"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/holiman/uint256"
)

type u256 = *uint256.Int

type OrderType int

const (
	Buy OrderType = iota
	Sell
)

type SolidityOrderParameters struct {
	Creator string
	Settler string

	OrderType int

	BasePair string

	RequestedToken string
	ReleasedToken  string

	RequestAmount u256
	ReleaseAmount u256

	CreationTime   u256
	ExpirationTime u256

	RandomNonce u256

	V uint8
	R string
	S string
}

func stringToBytes32(s string) [32]byte {
	return [32]byte(bytes.Repeat([]byte{0xFF}, 32))
}

func calculateOrderPrice(o *Order) u256 {
	shifter := 100000
	price := uint256.NewInt(0)
	if o.OrderType == Buy {
		price.Mul(o.ReleaseAmount, uint256.NewInt(uint64(shifter)))
		price.Div(price, o.RequestAmount)
		return price
	}

	price.Mul(o.RequestAmount, uint256.NewInt(uint64(shifter)))
	price.Div(price, o.ReleaseAmount)
	return price
}

func NewOrder(params SolidityOrderParameters, dateReceived time.Time) *Order {
	o := &Order{
		Creator:        common.HexToAddress(params.Creator),
		Settler:        common.HexToAddress(params.Settler),
		OrderType:      OrderType(params.OrderType),
		BasePair:       common.HexToAddress(params.Creator),
		RequestedToken: common.HexToAddress(params.Creator),
		ReleasedToken:  common.HexToAddress(params.Creator),
		RequestAmount:  params.RequestAmount,
		ReleaseAmount:  params.ReleaseAmount,
		RandomNonce:    params.RandomNonce,
		V:              params.V,
		R:              stringToBytes32(params.R),
		S:              stringToBytes32(params.S),
	}
	o.Price = calculateOrderPrice(o)
	o.DateReceived = dateReceived

	return o
}

type Order struct {
	Creator common.Address
	Settler common.Address

	OrderType OrderType

	BasePair common.Address

	RequestedToken common.Address
	ReleasedToken  common.Address

	RequestAmount u256
	ReleaseAmount u256

	CreationTime   u256
	ExpirationTime u256

	RandomNonce u256

	V uint8
	R [32]byte
	S [32]byte

	Price        u256
	DateReceived time.Time
}

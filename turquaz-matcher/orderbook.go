package turquazmatcher

import "github.com/ethereum/go-ethereum/common"

type priorityQueue interface {
	Peek() (Order, bool)
	Push(Order)
	Pop() (Order, bool)
}

type OrderBook struct {
	Name string

	Token       common.Address
	TokenTicker string

	BaseToken       common.Address
	BaseTokenTicker string

	Buys  priorityQueue
	Sells priorityQueue

	LastTradedPrice int
}

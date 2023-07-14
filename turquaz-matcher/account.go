package turquazmatcher

import (
	"github.com/ethereum/go-ethereum/common"
)

type Balance interface {
	Amount(tokenAddress common.Address) u256
	Add(tokenAddress common.Address) u256
	Sub(tokenAddress common.Address) u256
	Initialize(tokenAddress common.Address)
}

type Account struct {
	Address common.Address
	Balance Balance
}

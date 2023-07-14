package main

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"fmt"
	"log"
	"math/big"

	"github.com/ava-labs/coreth/core/types"
	"github.com/ava-labs/coreth/ethclient"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func main() {
	avalancheCChainURL := "http://0.0.0.0:8545/rpc"

	client, err := ethclient.Dial(avalancheCChainURL)
	if err != nil {
		log.Fatalf("Failed to connect to Avalanche C-Chain: %v", err)
	}

	chainId, err := client.ChainID(context.Background())
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(chainId)

	blockNum, err := client.BlockNumber(context.Background())
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println(blockNum)
	balance, err := getBalance(client, "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(balance)

	pkey, err := crypto.HexToECDSA("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
	if err != nil {
		fmt.Println(err)
	}
	fromAddr, err := getAddressFromPkey(pkey)
	if err != nil {
		fmt.Println(err)
	}
	nonce, err := client.NonceAt(context.Background(), fromAddr, nil)
	if err != nil {
		fmt.Println(err)
	}
	value := big.NewInt(1000000000000000000) // in wei (1 eth)
	gasLimit := uint64(21000)                // in units
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(gasPrice)
	toAddr := common.HexToAddress("0xbDA5747bFD65F08deb54cb465eB87D40e51B197E")
	legaxyTx := types.LegacyTx{
		Nonce:    nonce,
		To:       &toAddr,
		GasPrice: gasPrice,
		Gas:      gasLimit,
		Value:    value,
	}
	tx := types.NewTx(&legaxyTx)
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainId), pkey)
	if err != nil {
		log.Fatal(err)
	}
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("tx sent: %s\n", signedTx.Hash().Hex()) // tx sent: 0x77006fcb3938f648e2cc65bafd27dec30b9bfbe9df41f78498b9c8b7322a249e
	balance, err = getBalance(client, "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(balance)

}

func getAddressFromPkey(privateKey *ecdsa.PrivateKey) (address common.Address, err error) {
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		err = errors.New("error casting public key to ECDSA")
		return
	}

	address = crypto.PubkeyToAddress(*publicKeyECDSA)
	return
}

func getBalance(client ethclient.Client, address string) (*big.Int, error) {
	account := common.HexToAddress(address)
	return client.BalanceAt(context.Background(), account, nil)
}

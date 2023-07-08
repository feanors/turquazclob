import React, {useEffect, useState} from "react";
import {
  Box,
  Flex,
  Text,
  Spacer,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  IconButton,
  HStack,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { ethers } from "ethers";

function Navbar() {

  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa86a' }], // 0xa86a is the hexadecimal representation of 43114
        })
      } catch (error) {
        console.error('Failed to switch network:', error)
      }
    }
  }

  useEffect(() => {

    const handleAccountChanged = (accounts) => {
      if (accounts.length === 0) {
        console.log('Please connect to MetaMask')
      } else {
        setAccount(accounts[0])
      }
    }
    
    const handleNetworkChanged = async (chainId) => {
      if (parseInt(chainId, 16) !== 43114) {
        alert('Please switch to the Avalanche network in MetaMask')
        switchNetwork()
      }
    }

    const initProvider = async () => {
      if (window.ethereum) {
        const ethereumProvider = new ethers.providers.Web3Provider(window.ethereum)
        setProvider(ethereumProvider)
  
        // Event listeners
        window.ethereum.on('accountsChanged', handleAccountChanged)
        window.ethereum.on('chainChanged', handleNetworkChanged)
      }
    }
  
    initProvider()
  
    // Cleanup the event listeners on unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChanged)
        window.ethereum.removeListener('chainChanged', handleNetworkChanged)
      }
    }
  }, [])
  
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const ethereumProvider = new ethers.providers.Web3Provider(window.ethereum)
        const accounts = await ethereumProvider.send('eth_requestAccounts', [])
        setAccount(accounts[0])
  
        // Check if connected to the Avalanche network
        const network = await ethereumProvider.getNetwork()
        if (network.chainId !== 43114) {
          alert('Please switch to the Avalanche network in MetaMask')
          switchNetwork()
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error)
      }
    } else {
      alert('MetaMask not found. Please install the browser extension.')
    }
  }
  

  return (
    <Box bg="gray.800" p={2}>
      <Flex align={"center"}>
        <HStack spacing={4}>
          {/* Other nav items can be added here */}
          <Menu>
            <Button
              as={Button}
              textColor="white"
              bg="gray.800"
              _hover={{ bg: "gray.600" }}
            >
              Homepage
            </Button>

            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              textColor="white"
              bg="gray.800"
              _hover={{ bg: "gray.600" }}
            >
              Markets
            </MenuButton>
            <MenuList>
              <MenuItem>AVAX-USDC</MenuItem>
              <MenuItem>BTC-USDC</MenuItem>
              <MenuItem>ETH-USDC</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
        <Spacer></Spacer>
        <Button onClick={connectWallet} size={"sm"} colorScheme="purple" >
          {account ? `Connected: ${account}` : 'Connect Wallet'}
        </Button>
      </Flex>
    </Box>
  );
}

export default Navbar;

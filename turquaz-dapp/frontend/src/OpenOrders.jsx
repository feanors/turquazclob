import React from "react";
import {
  Box,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
} from "@chakra-ui/react";

const openOrders = [
  {
    size: 0.5,
    filled: 0.2,
    price: 1000,
    created: new Date("2022-01-01"),
    creator: "0x1234567890abcdef",
  },
  {
    size: 1,
    filled: 0.8,
    price: 900,
    created: new Date("2022-01-02"),
    creator: "0x0987654321fedcba",
  },
  {
    size: 2,
    filled: 0,
    price: 1100,
    created: new Date("2022-01-03"),
    creator: "0xabcd1234ef567890",
  },
];

function OpenOrders() {
  return (
    <Box width="100%" height="50%" bg="gray.900" p={4} overflowY="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th textAlign={"right"}>Size</Th>
            <Th textAlign={"right"}>Filled</Th>
            <Th textAlign={"right"}>Price</Th>
            <Th textAlign={"right"}>Created</Th>
            <Th textAlign={"right"}>Creator</Th>
            <Th textAlign={"right"}>Cancel</Th>
          </Tr>
        </Thead>
        <Tbody>
          {openOrders.map((order, index) => (
            <Tr key={index}>
              <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
                {order.size.toFixed(2)}
              </Td>
              <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
                {order.filled.toFixed(2)}
              </Td>
              <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
                {order.price.toFixed(2)}
              </Td>
              <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
                {order.created.toLocaleDateString()}
              </Td>
              <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
                {order.creator}
              </Td>
              <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
                <Flex>
                  <Button colorScheme="green" bg={'green.500'} size="sm" mr={2} textColor={'white'}>
                    Soft Cancel
                  </Button>
                  <Button size="sm" colorScheme="red" bg='red.500' textColor={'white'}>
                    Force Cancel
                  </Button>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default OpenOrders;

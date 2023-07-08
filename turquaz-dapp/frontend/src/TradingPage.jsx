import React from "react";
import Orders from "./Orders";
import OrderForm from "./OrderForm";
import SimpleChart from "./SimpleChart";
import OpenOrders from "./OpenOrders";
import {
  Box,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Image,
} from "@chakra-ui/react";

function OrderTable({ orders, type }) {
  return (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th textAlign={"right"}> Price</Th>
          <Th textAlign={"right"}> Amount</Th>
          <Th textAlign={"right"}> Total</Th>
        </Tr>
      </Thead>
      <Tbody>
        {orders.map((order, index) => (
          <Tr key={index}>
            <Td
              py={1}
              textAlign={"right"}
              fontSize={"0.8rem"}
              color={type === "sell" ? "red.500" : "green.500"}
            >
              {order.price}.00
            </Td>
            <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
              {order.amount}.00
            </Td>
            <Td py={1} textAlign={"right"} fontSize={"0.8rem"}>
              {order.amount * order.price}.12
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function TradingPage(props) {
  const { sellOrders, buyOrders } = props;

  const customScroll = {
    overflowY: "auto",
    overflowX: "hidden",
    "&::-webkit-scrollbar": {
      width: "20px",
      backgroundColor: "gray.600",
    },
    "&::-webkit-scrollbar-thumb": {
      borderRadius: "20px",
      backgroundColor: "gray.600",
    },
  };

  return (
    <Flex width="100%" height="calc(100vh - 56px)" overflow="auto">
      <Box width="20%" height="100%" bg="gray.800" p={4}>
        {/* Order books */}
        <Box
          height="50%"
          bg="gray.900"
          mb={4}
          overflowY="auto"
          overflowX="hidden"
        >
          <OrderTable orders={sellOrders} type="sell" />
        </Box>
        <Box height="50%" bg="gray.900" overflowY="auto" overflowX="hidden">
          <OrderTable orders={buyOrders} type="buy" />
        </Box>
      </Box>

      <Box width="60%" height="100%" bg="gray.800" p={4}>
        <Box width="100%" height="60%" bg="gray.900" p={4}>
          <SimpleChart></SimpleChart>
        </Box>
        <Box width="100%" height="60%" bg="gray.900" p={4}>
          <OpenOrders></OpenOrders>
        </Box>
      </Box>

      <Box width="20%" height="100%" bg="gray.800" p={4}>
        <OrderForm></OrderForm>
      </Box>
    </Flex>
  );
}

export default TradingPage;

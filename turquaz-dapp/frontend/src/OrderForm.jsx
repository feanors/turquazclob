import React, { useState } from "react";

import {
    FormControl,
    FormLabel,
    FormErrorMessage,
    Input,
    Stack,
    Button,
    RadioGroup,
    Radio,
    Textarea,
    HStack,
  } from "@chakra-ui/react";

function OrderForm() {
    const [price, setPrice] = useState("");
    const [amount, setAmount] = useState("");
    const [address, setAddress] = useState("");
    const [orderType, setOrderType] = useState("buy");
    const [expirationDate, setExpirationDate] = useState("");
    const [settlerAddress, setSettlerAddress] = useState("");
    const [formError, setFormError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    // validate form fields
    if (!price || !amount) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (isNaN(price) || isNaN(amount)) {
      setFormError("Please enter valid numbers.");
      return;
    }
    // submit form data
    console.log(`Price: ${price}, Amount: ${amount}`);
    setPrice("");
    setAmount("");
    setFormError(null);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>

      <FormControl isRequired isInvalid={formError}>
          <FormLabel>Type</FormLabel>
          <HStack spacing={4} justifyContent="center" width="100%">
            <Button
              colorScheme="green"
              variant={orderType === "buy" ? "solid" : "outline"}
              onClick={() => setOrderType("buy")}
              width="50%"
              size={'sm'}
            >
              Buy
            </Button>
            <Button
              colorScheme="red"
              variant={orderType === "sell" ? "solid" : "outline"}
              onClick={() => setOrderType("sell")}
              width="50%"
              size={'sm'}
            >
              Sell
            </Button>
          </HStack>
          <FormErrorMessage>{formError}</FormErrorMessage>
        </FormControl>
        

      <FormControl isRequired isInvalid={formError}>
          <FormLabel>Address</FormLabel>
          <Input
            type="text"
            placeholder="Enter your adress, should be automatically filled"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <FormErrorMessage>{formError}</FormErrorMessage>
        </FormControl>

        

        <FormControl isRequired isInvalid={formError}>
          <FormLabel>Price</FormLabel>
          <Input
            type="number"
            min="0"
            placeholder="Enter price"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <FormErrorMessage>{formError}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={formError}>
          <FormLabel>Amount</FormLabel>
          <Input
            type="number"
            min="0"
            placeholder="Enter amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <FormErrorMessage>{formError}</FormErrorMessage>
        </FormControl>

            <FormControl>
    <FormLabel>Expiration Time</FormLabel>
    <Input
 placeholder="Select Date and Time"
 size="md"
 type="datetime-local"
/>
    </FormControl>


        <Button colorScheme="gray" bg={'gray.700'} type="submit" textColor={'white'}>
          Create Order
        </Button>
      </Stack>
    </form>
  );
}

export default OrderForm;

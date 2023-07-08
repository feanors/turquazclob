import { useState } from 'react'
import Navbar from './Navbar'
import './App.css'
import TradingPage from './TradingPage'
import SimpleChart from './SimpleChart'

class OrderbookItem {
  constructor(amount, price) {
    this.amount = amount;
    this.price = price;
  }
}

function App() {

  const sellOrders = [
    new OrderbookItem(21, 30),
  ];
  sellOrders.push(new OrderbookItem(17, 29));
  sellOrders.push(new OrderbookItem(14, 25));
  sellOrders.push(new OrderbookItem(11, 24));
  sellOrders.push(new OrderbookItem(5, 23));
  sellOrders.push(new OrderbookItem(17, 29));
  sellOrders.push(new OrderbookItem(14, 25));
  sellOrders.push(new OrderbookItem(11, 24));
  sellOrders.push(new OrderbookItem(5, 23));
  sellOrders.push(new OrderbookItem(17, 29));
  sellOrders.push(new OrderbookItem(14, 25));
  sellOrders.push(new OrderbookItem(11, 24));
  sellOrders.push(new OrderbookItem(5, 23));
  sellOrders.push(new OrderbookItem(17, 29));
  sellOrders.push(new OrderbookItem(14, 25));
  sellOrders.push(new OrderbookItem(11, 24));
  sellOrders.push(new OrderbookItem(5, 23));
  sellOrders.push(new OrderbookItem(17, 29));
  sellOrders.push(new OrderbookItem(14, 25));
  sellOrders.push(new OrderbookItem(11, 24));
  sellOrders.push(new OrderbookItem(5, 23));
  sellOrders.push(new OrderbookItem(17, 29));
  sellOrders.push(new OrderbookItem(14, 25));
  sellOrders.push(new OrderbookItem(11, 24));
  sellOrders.push(new OrderbookItem(5, 23));

  const buyOrders = [
    new OrderbookItem(5, 22),
  ];
  buyOrders.push(new OrderbookItem(7, 21));
  buyOrders.push(new OrderbookItem(11, 19));
  buyOrders.push(new OrderbookItem(22, 16));
  buyOrders.push(new OrderbookItem(40, 9));
  buyOrders.push(new OrderbookItem(7, 21));
  buyOrders.push(new OrderbookItem(11, 19));
  buyOrders.push(new OrderbookItem(22, 16));
  buyOrders.push(new OrderbookItem(40, 9));
  buyOrders.push(new OrderbookItem(7, 21));
  buyOrders.push(new OrderbookItem(11, 19));
  buyOrders.push(new OrderbookItem(22, 16));
  buyOrders.push(new OrderbookItem(40, 9));
  buyOrders.push(new OrderbookItem(7, 21));
  buyOrders.push(new OrderbookItem(11, 19));
  buyOrders.push(new OrderbookItem(22, 16));
  buyOrders.push(new OrderbookItem(40, 9));
  buyOrders.push(new OrderbookItem(7, 21));
  buyOrders.push(new OrderbookItem(11, 19));
  buyOrders.push(new OrderbookItem(22, 16));
  buyOrders.push(new OrderbookItem(40, 9));
  buyOrders.push(new OrderbookItem(7, 21));
  buyOrders.push(new OrderbookItem(11, 19));
  buyOrders.push(new OrderbookItem(22, 16));
  buyOrders.push(new OrderbookItem(40, 9));

  const initialChartData = [
    { time: '2018-12-22', value: 32.51 },
    { time: '2018-12-23', value: 31.11 },
    { time: '2018-12-24', value: 27.02 },
    { time: '2018-12-25', value: 27.32 },
    { time: '2018-12-26', value: 25.17 },
    { time: '2018-12-27', value: 28.89 },
    { time: '2018-12-28', value: 25.46 },
    { time: '2018-12-29', value: 23.92 },
    { time: '2018-12-30', value: 22.68 },
    { time: '2018-12-31', value: 22.67 },
  ];

  return (
    <>
      <Navbar></Navbar>
      <TradingPage sellOrders={sellOrders} buyOrders={buyOrders} />
    </>
  )



}


export default App

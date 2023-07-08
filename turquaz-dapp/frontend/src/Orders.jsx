import './Orders.css'

class OrderbookItem {
  constructor(amount, price) {
    this.amount = amount;
    this.price = price;
  }
}

function Orders(props) {
  const { orders, type, tokenName } = props;
  const ordersize = orders.length;
  for (let i = 0; i < 40-ordersize; i++) {
    orders.push(new OrderbookItem());
  }

  return (
    <div className='orderbook-div'>
      <table>
        <thead>
          <tr>
          <th className={`orderbook-item1`}>Price</th>
          <th className={`orderbook-item2`}>Size {tokenName}</th>
          </tr>
        </thead>
        <tbody>
            {orders.map(order => (
            <tr key={order.price}>
              <td className={`${type} orderbook-item1`}>{order.price}</td>
              <td className={`orderbook-item2`}>{order.amount}</td>
            </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default Orders;
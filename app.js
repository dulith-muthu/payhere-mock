import express from 'express';
import path from 'path';
import { doPayment } from './src/payment.js';
import { cards } from './src/static.js';
import { validators } from './src/validators.js';

const app = express();
const PORT = 3000;
const runningOn = `http://localhost:${PORT}`

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'views'));
// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));
// Middleware to parse JSON bodies
app.use(express.json());

// In memory data
const orders = [];
const payments = [];

// iw mobile mock
app.get('/iw/checkout', (req, res) => {
  res.render('checkout', { runningOn });
});
app.get('/iw/success', (req, res) => {
  res.render('success', { runningOn });
});
app.get('/iw/cancel', (req, res) => {
  res.render('cancel', { runningOn });
});


// https://support.payhere.lk/api-&-mobile-sdk/checkout-api
app.post('/pay/checkout', validators.checkout, (req, res) => {
  const order = req.body;
  orders.push(order);
  res.redirect(`/pay/portal?order_id=${order.order_id}`);
});

// Payment portal
app.get('/pay/portal', (req, res) => {
  const orderId = req.query['order_id'];
  var order = orders.find(o => o.order_id === orderId);
  if (!orderId || !order) {
    res.status(400).json({ message: 'Bad Request: Order not found' });
    return;
  }
  res.render('payment', { order, cards });
});

// Customer doing payment, no validations just mocking
app.post('/pay/payment', async (req, res) => {
  const paymentData = req.body;
  const order = orders.find(o => paymentData.order_id === o.order_id);
  if (!order) {
    res.status(400).json({ message: 'Bad Request: Order not found' });
    return;
  }
  const payment = doPayment(order, paymentData);
  payments.push(payment);
  res.redirect(payment.status_code !== -1 ? order.return_url : order.cancel_url);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on ${runningOn}`);
});

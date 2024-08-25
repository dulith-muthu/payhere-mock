import axios from "axios";
import crypto from "crypto";
import { cards, merchant } from "./static.js";


function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms, undefined));
}
// Create the local MD5 signature
const localMd5Sig = (payment, status_code) => crypto.createHash('md5')
    .update(merchant.merchantID +
        payment.order_id +
        payment.payhere_amount +
        payment.payhere_currency +
        status_code +
        crypto.createHash('md5').update(merchant.merchantSecret).digest('hex').toUpperCase())
    .digest('hex')
    .toUpperCase();

export const sendNotification = async (payment, url) => {
    const params = new URLSearchParams();
    params.append('merchant_id', merchant.merchantID);
    params.append('order_id', payment.order_id);
    params.append('payment_id', payment.payment_id);
    params.append('payhere_amount', payment.payhere_amount);
    params.append('payhere_currency', payment.payhere_currency);
    params.append('status_code', payment.status_code);
    params.append('md5sig', 'na');
    params.append('custom_1', payment.custom_1);
    params.append('custom_2', payment.custom_2);
    params.append('method', payment.method);
    params.append('status_message', payment.status_message);
    params.append('card_holder_name', payment.card_holder_name);
    params.append('card_no', payment.card_no.replaceAll('0', 'x'));
    params.append('card_expiry', payment.card_expiry);
    if (payment.status_code === 2) {
        // if success
        params.set('status_code', 0) // first send pending
        params.set('md5sig', localMd5Sig(payment, 0))
        payment.status_message = 'pending';
        await axios.post(url, params);
        await wait(5000);
        params.set('status_code', 2) // then success
        params.set('md5sig', localMd5Sig(payment, 2))
        payment.status_message = 'success';
        await axios.post(url, params);
    }
    if (payment.status_code === -2) {
        // if failed
        params.set('status_code', 0) // first send pending
        params.set('md5sig', localMd5Sig(payment, 0))
        payment.status_message = 'pending';
        await axios.post(url, params);
        await wait(5000);
        params.set('status_code', -2) // then failed
        params.set('md5sig', localMd5Sig(payment, -2))
        payment.status_message = 'failed';
        await axios.post(url, params);
    }
    if (payment.status_code === -1) {
        // if canceled
        await wait(2000);
        params.set('md5sig', localMd5Sig(payment, -1))
        await axios.post(url, params);
    }
}

export const doPayment = (order, paymentData) => {
    const payment = { ...paymentData };
    const card = cards.find(c => c.no === payment.card_no);
    if (paymentData.action === 'pay') {
        if (card) {
            payment.status_code = card.status_code;
            payment.status_message = card.status;
        } else {
            payment.status_code = 2; // success
            payment.status_message = 'success';
        }
    } else {
        payment.status_code = -1;
        payment.status_message = 'canceled';
    }
    payment.payment_id = 'p' + payment.order_id;
    payment.custom_1 = order.custom_1;
    payment.custom_2 = order.custom_2;
    delete payment.card_secret;
    delete payment.action;

    // non awaited
    sendNotification(payment, order.notify_url)

    return payment;
}

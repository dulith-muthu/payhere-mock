import md5 from 'crypto-js/md5.js';
import { merchant } from './static.js';

const mandatory = {
    checkout: ['merchant_id',
        'return_url',
        'cancel_url',
        'notify_url',
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'order_id',
        'items',
        'currency',
        'amount',
        'hash',],
}

/**
 * @type {Record<string, import('express').RequestHandler>}
 */
export const validators = {
    checkout: (req, res, next) => {
        const data = req.body;
        if (!data || !mandatory.checkout.every(key => !!data[key])){
            res.status(400).json({ message: 'Bad Request: Missing mandatory fields' });
            return;
        }

        let merchantId = merchant.merchantID;
        let merchantSecret = merchant.merchantSecret;
        let orderId = data.order_id;
        let amount = data.amount;
        let hashedSecret = md5(merchantSecret).toString().toUpperCase();
        let amountFormatted = parseFloat(amount).toLocaleString('en-us', { minimumFractionDigits: 2 }).replaceAll(',', '');
        let currency = data.currency;
        let hash = md5(merchantId + orderId + amountFormatted + currency + hashedSecret).toString().toUpperCase();
        if (data.hash != hash){
            res.status(403).json({ message: 'Forbidden: Invalid hash' });
            return;
        }
        next();
    },
}

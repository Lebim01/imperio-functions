const https = require('https')

const walletId = '64c6dd54aa48640007b8e26f'
const blockchain = 'bitcoin'
const network = 'testnet'
const addressWallet = 'tb1qumn3su2rsljwqkclgn70f7wn6lrclun0ytv7w6'
const hostapi = 'http://127.0.0.1:5001/topx-academy/us-central1'

const apiSecretKey = '0e5cdffb-0e64-404b-b0f4-aa1927c7de73'

const defaultOptions = {
    "hostname": "rest.cryptoapis.io",
    "headers": {
        "Content-Type": "application/json",
        "X-API-Key": "fb00b4aa1965ff6bc36b5fba67447a3c927f2f6a"
    }
}

const streamResponse = (resolve: any, reject: any) => (res: any) => {
    let chunks: any[] = [];
    
    res.on("data", function (chunk: any) {
        chunks.push(chunk);
    });

    res.on("end", function () {
        const body = Buffer.concat(chunks);
        resolve(JSON.parse(body.toString()))
    });

    res.on('error', reject)
}

export const getAddressBalance = () => {
    return new Promise((resolve, reject) => {
        const options = {
            "method": "GET",
            "path": `/v2/blockchain-data/${blockchain}/${network}/addresses/${addressWallet}/balance`,
            "qs": {"context":"yourExampleString"},
            ...defaultOptions,
        };
    
        const req = https.request(options, streamResponse(resolve, reject));
        req.end();
    })
}

export const getListDepositAddress = () => {
    return new Promise((resolve, reject) => {
        const options = {
            "method": "GET",
            "path": `/v2/wallet-as-a-service/wallets/${walletId}/${blockchain}/${network}/addresses`,
            "qs": {"context":"yourExampleString","limit":50,"offset":0},
            ...defaultOptions
        };

        const req = https.request(options, streamResponse(resolve, reject));
        req.end();
    })
}

export const createWalletAddress = (): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        const options = {
            "method": "POST",
            "path": `/v2/wallet-as-a-service/wallets/${walletId}/${blockchain}/${network}/addresses`,
            "qs": {"context":"yourExampleString"},
            ...defaultOptions,
        };

        const req = https.request(options, streamResponse(resolve, reject));
        req.write(JSON.stringify({
            "context": "yourExampleString",
            "data": {
                "item": {
                    "label": "Payment link"
                }
            }
        }));
        req.end();
    })
}

export const createCallbackConfirmation = (userId: string, addressId: string) => {
    return new Promise((resolve, reject) => {
        const options = {
            "method": "POST",
            "path": `/v2/blockchain-events/${blockchain}/${network}/subscriptions/address-coins-transactions-confirmed`,
            "qs": {"context": userId},
            ...defaultOptions,
        };

        const req = https.request(options, streamResponse(resolve, reject));
        req.write(JSON.stringify({
            "context": "yourExampleString",
            "data": {
                "item": {
                    "address": addressId,
                    "allowDuplicates": false,
                    "callbackSecretKey": apiSecretKey,
                    "callbackUrl": `${hostapi}/onConfirmedTransaction`,
                    "receiveCallbackOn": 3
                }
            }
        }));
        req.end();
    })
}

export const getExchangeRate = (fromSymbol: string, toSymbol: string) => {
    return new Promise((resolve, reject) => {
        const options = {
            "method": "GET",
            "path": `/v2/market-data/exchange-rates/by-symbols/${fromSymbol}/${toSymbol}`,
            "qs": {"context":"yourExampleString", "calculationTimestamp": new Date().getTime()},
            ...defaultOptions,
        };

        const req = https.request(options, streamResponse(resolve, reject));
        req.end();
    })
}
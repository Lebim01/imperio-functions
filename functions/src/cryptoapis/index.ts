import axios from "axios";

const https = require("https");

const walletId = "64cbde4178ffd80007affa0f";
const blockchain = "bitcoin";
const network = "mainnet";
const hostapi = "https://topx-academy-nest.vercel.app";
export const walletAddress = "bc1qtmequmd3ead58aystxczt4sgc4v32np3kfk93v";

const defaultOptions = {
  hostname: "rest.cryptoapis.io",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "fb00b4aa1965ff6bc36b5fba67447a3c927f2f6a",
  },
};

const streamResponse = (resolve: any, reject: any) => (res: any) => {
  let chunks: any[] = [];

  res.on("data", function (chunk: any) {
    chunks.push(chunk);
  });

  res.on("end", function () {
    const body = Buffer.concat(chunks);
    resolve(JSON.parse(body.toString()));
  });

  res.on("error", reject);
};

export const getBTCExchange = (amount: number) => {
  return axios
    .get("https://blockchain.info/tobtc?currency=USD&value=" + amount)
    .then((r) => r.data);
};

export const getAddressBalance = () => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      path: `/v2/blockchain-data/${blockchain}/${network}/addresses/${walletAddress}/balance`,
      qs: { context: "yourExampleString" },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.end();
  });
};

export const getBitcoinFees = () => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      path: `/v2/blockchain-data/${blockchain}/${network}/mempool/fees`,
      qs: { context: "yourExampleString" },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.end();
  });
};

export const sendCoins = (recipients: { address: string, btc_amount: string }[]) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      path: `/v2/wallet-as-a-service/wallets/${walletId}/${blockchain}/${network}/transaction-requests`,
      qs: { context: "yourExampleString" },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.write(
      JSON.stringify({
        context: "saul wallet",
        data: {
          item: {
            callbackSecretKey: "a12k*?_1ds",
            callbackUrl: `${hostapi}/callbackSendedCoins`,
            feePriority: "standard",
            note: "yourAdditionalInformationhere",
            prepareStrategy: "minimize-dust",
            recipients,
          },
        },
      })
    );
    req.end();
  });
};

export const getListDepositAddress = () => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      path: `/v2/wallet-as-a-service/wallets/${walletId}/${blockchain}/${network}/addresses`,
      qs: { context: "yourExampleString", limit: 50, offset: 0 },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.end();
  });
};

export const createWalletAddress = (): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const options = {
      method: "POST",
      path: `/v2/wallet-as-a-service/wallets/${walletId}/${blockchain}/${network}/addresses`,
      qs: { context: "yourExampleString" },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.write(
      JSON.stringify({
        context: "yourExampleString",
        data: {
          item: {
            label: "Payment link",
          },
        },
      })
    );
    req.end();
  });
};

export const createCallbackConfirmation = (userId: string, address: string) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      path: `/v2/blockchain-events/${blockchain}/${network}/subscriptions/address-coins-transactions-confirmed`,
      qs: { context: userId },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.write(
      JSON.stringify({
        context: userId,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: "a12k*?_1ds",
            callbackUrl: `${hostapi}/callbackPayment`,
            receiveCallbackOn: 2,
          },
        },
      })
    );
    req.end();
  });
};

export const createCallbackFirstConfirmation = (
  userId: string,
  address: string
) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      path: `/v2/blockchain-events/${blockchain}/${network}/subscriptions/address-coins-transactions-unconfirmed`,
      qs: { context: userId },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.write(
      JSON.stringify({
        context: userId,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: "a12k*?_1ds",
            callbackUrl: `${hostapi}/callbackCoins`,
          },
        },
      })
    );
    req.end();
  });
};

export const removeCallbackConfirmation = (refereceId: string) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "DELETE",
      path: `/v2/blockchain-events/${blockchain}/${network}/subscriptions/${refereceId}`,
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.write(JSON.stringify([]));
    req.end();
  });
};

export const getExchangeRate = (fromSymbol: string, toSymbol: string) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      path: `/v2/market-data/exchange-rates/by-symbols/${fromSymbol}/${toSymbol}`,
      qs: {
        context: "yourExampleString",
        calculationTimestamp: new Date().getTime(),
      },
      ...defaultOptions,
    };

    const req = https.request(options, streamResponse(resolve, reject));
    req.end();
  });
};

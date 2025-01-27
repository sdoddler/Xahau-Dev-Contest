const xrpl = require("@transia/xrpl");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let client;

xconnect().then(function () { main() })


let fromSeed = "YOUR SEED HERE" // this will remove ALL URI tokens from an account - be CAREFUL!

async function xconnect(testnet = false) {
    console.log('connecting to **MAINNET** - ' + "wss://xahau.network");


   client = new xrpl.Client("wss://xahau.network")

    client.on('error', async () => {
        console.log('XRPL Error found!');
        await xReconnect();
    });

client.on('reconnect', async () => {
        console.log('XRPL reconnect!');
        await xReconnect();
    });

    await client.connect()

}

async function xReconnect() {

    if (!client.isConnected()) {
        await xconnect();
    }

    if (!client.isConnected()) {
        await delay(1000);
        xReconnect();
    }
}


async function main() {
  const client = new xrpl.Client("wss://xahau.network");
  await client.connect();

  let tokens = [];

    
  var fromWallet = xrpl.Wallet.fromSeed(fromSeed);

  try{ 
        const response = await client.request({
        command: "account_objects",
        account: fromWallet.classicAddress,
        ledger_index: "validated",
    });
//    console.log(response);

    tokens = response.result.account_objects.filter(x=> x.LedgerEntryType=="URIToken");
    }catch (e){

        setTimeout(() => {
            main();
        }, 10000);

    // try again soon
  }

  console.log(`This script will BURN all URITokens from ${fromWallet.classicAddress} in 30 SECONDS.`)

  await delay(30000);
 

//  console.log(tokens)

  var currentTokenIDs = tokens.map(x=> x.index)

    console.log(currentTokenIDs);


    
  for (let i = 0; i< currentTokenIDs.length;i++){

        const send_token_tx = {

            "TransactionType": "URITokenBurn",
            "Account": fromWallet.classicAddress, 
            "URITokenID": currentTokenIDs[i],
            "NetworkID":21337,

        }
        var memo = 'Fixing Token issue';

        if (memo != "") {
            var memohex = xrpl.convertStringToHex(memo)
            send_token_tx.Memos = [
                {
                    "Memo": {
                        "MemoData": memohex
                    }
                }
            ]
        }

        const pay_prepared = await client.autofill(send_token_tx)
        const pay_signed = fromWallet.sign(pay_prepared)
        const pay_result = await client.submitAndWait(pay_signed.tx_blob)

        console.log(pay_result)
  }



  setTimeout(() => {
    main();
}, 10000);

}


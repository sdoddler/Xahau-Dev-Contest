
const xrpl = require("@transia/xrpl");
const { hashURIToken } = require("@transia/xrpl/dist/npm/utils/hashes");

const https = require('https');


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let client;

let recipients = ['r35bw8T9hKcmUCtPEBndFffYiiUi9V6cv7',
    'r3KFdr7FTU1hxo9DbS1h65Wq8MXG7e9cgK',
    'r43ZUhiEiE8SYAeKEqgGCMiqDXXUF5sph2',
    'r4JDoQzeTYensJJNxFWsnSchbpkcuU5Y7M',
    'rE5apYtiUvqxgfjQbripuNFKTyqSuuXg1x',
    'rfjquSFSKXnDYdQyGWuXBSSSW87jfpX7Qm',
    'rfYHCCcPR9MCakmmzMPLizBTdEAJMkw1X1',
    'rGnBUCwMJSX57QDecdyT5drdG3gvsmVqxD',
    'rLadbCqcKDZJCPCuQE3SUYnZpRc9LVPPTM',
    'rLb3MKiN6vCjNgJSV1Rv83LBpi5cctPkST',
    'rnRaCtte6gciSZ7mDRuarcpFeGUooer9SV',
    'rP1U7br6xhNpPxV8onXhDfdg8F8BGP5iFH',
    'rUmBwxZHqFihgRdc3JQ3s5KTqiBwpteMEv'
    ]; // example list of participants

let fromSeed = "YOUR SEED HERE"  // Seed of sending wallet

xconnect().then(function () { main() })



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

    // In this example I use an API call to TheShillverse to find out the next available URI
    //  it could be easily adapted to use a list of URIs instead of an incrementing number...
    var nextID = await APICall("https://theshillverse.com/nft/xah/nextID")

    console.log(nextID);

    var fromWallet = xrpl.Wallet.fromSeed(fromSeed);


    // if can't find index.. don't mint
    if (nextID !=null & nextID.success){
        if (nextID.next_id > 0){

            var nextIndex = nextID.next_id;

            // deliver to recipients
            for (let i = 0; i < recipients.length; i++){
                // anti-spam delay
                await delay (250);                

    
                // compose individual URI
                var shillverseURL = "https://theshillverse.com/nft/xah/elemental/" + nextIndex.toString()
                //convert to hex
                var hexURL = xrpl.convertStringToHex(shillverseURL);

                // mint on mainnet
                const mintToken = {
            
                "TransactionType": "URITokenMint",
                "Account": "rU3BHbWv4XknyNbDYnPtcv4XUiRUQ8pUst",
                "Flags": 1,
                "URI": hexURL,
                "NetworkID":21337,
                // since we're airdropping - amount == "0" XAH
                "Amount":"0",
                "Destination": recipients[i]
            
                }
                // add a memo - this one is static, but could add unique per recipient or based on Index.
                var memo = 'Thanks for participating!';

                if (memo != "") {
                    var memohex = xrpl.convertStringToHex(memo)
                    mintToken.Memos = [
                        {
                            "Memo": {
                                "MemoData": memohex
                            }
                        }
                    ]
                }

                // finish and send tx
                const _prepared = await client.autofill(mintToken)
                const _signed = fromWallet.sign(_prepared)
                const _result = await client.submitAndWait(_signed.tx_blob)

                console.log(_result)


                /// if successfully minted
                if (_result.result.meta.TransactionResult == "tesSUCCESS"){

                var uriToken = null;

                    // grab the URI token - there might be a better way to do this ? Didn't find it..
                for (let i = 0; i< _result.result.meta.AffectedNodes.length;i++){
                    if (_result.result.meta.AffectedNodes[i].CreatedNode){
                        uriToken = _result.result.meta.AffectedNodes[i].CreatedNode.LedgerIndex
                    }
                }

                console.log(uriToken)
                if (uriToken != null){
                nextIndex++;
                    // this will fail as I have not included the correct PW - but this is a call to my backend to update the Token to the db
                    var insertResponse = await APICall("https://theshillverse.com/nft/xah/insertURIToken?pass=FAKEPASSWORD&tokenId="+uriToken)
                    console.log(insertResponse);

                    await delay(250);
                }
            }
        }
    }
}
}


async function APICall(url, retryCount = 0) {

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            //console.log('statusCode:', res.statusCode);
            //console.log('headers:', res.headers);

            let body = "";

            res.on('data', (d) => {
                body += d;
            });

            res.on('end', () => {
                //console.log(res.statusCode)
                if (res.statusCode == 200) {
                    try {
                        let json = JSON.parse(body);

                        resolve(json)
                        //	console.log(json);
                    } catch {
                        resolve(null);
                    }

                } else {
                    resolve(null);
                }
            });

        })
    });


}

const xrpl = require("@transia/xrpl");
const { hashURIToken } = require("@transia/xrpl/dist/npm/utils/hashes");

const https = require('https');


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let client;

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
  const client = new xrpl.Client("wss://xahau.network");
  await client.connect();

  let tokens = [];


    // check connection with inital call..
  try{ 
        const response = await client.request({
        command: "account_objects",
        account: "rU3BHbWv4XknyNbDYnPtcv4XUiRUQ8pUst",
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


  var fromSeed = "SEED TO MINT FROM"

  var fromWallet = xrpl.Wallet.fromSeed(fromSeed);
  

//  console.log(tokens)

// map ids
  var currentTokenIDs = tokens.map(x=> x.index)

    console.log(currentTokenIDs);

    // if less than 15 tokens owned by minter..
  if (tokens.length < 15){
    // get initial ID
    var nextID = await APICall("https://theshillverse.com/nft/xah/nextID")

    var tokensToMint = 15- tokens.length;
    console.log(tokensToMint);
    // anti-spam
    await delay(1000);

    

    console.log(nextID);
    if (nextID !=null & nextID.success){
        if (nextID.next_id > 0){

            var nextIndex = nextID.next_id;

            while (tokensToMint >0){
                //anti-spam
                await delay (250);                

                
                // form URI and encode
                var shillverseURL = "https://theshillverse.com/nft/xah/elemental/" + nextIndex.toString()
                var hexURL = xrpl.convertStringToHex(shillverseURL);

                // mint on mainnet
                const mintToken = {
            
                "TransactionType": "URITokenMint",
                "Account": fromWallet.classicAddress,  
                "Flags": 1,
                "URI": hexURL,
                "NetworkID":21337,
                "Amount":"5000000", // 5 $XAH
            
                }
                // add memo if required..
                var memo = '';

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

                // send and sign tx..
                const _prepared = await client.autofill(mintToken)
                const _signed = fromWallet.sign(_prepared)
                const _result = await client.submitAndWait(_signed.tx_blob)

                console.log(_result)

                if (_result.result.meta.TransactionResult == "tesSUCCESS"){

                var uriToken = null;

                // get URI tokenID
                for (let i = 0; i< _result.result.meta.AffectedNodes.length;i++){
                    if (_result.result.meta.AffectedNodes[i].CreatedNode){
                        uriToken = _result.result.meta.AffectedNodes[i].CreatedNode.LedgerIndex
                    }
                }

                console.log(uriToken)
                if (uriToken != null){
                    nextIndex++;
                    tokensToMint--;
                    currentTokenIDs.push(uriToken);
                        // will fail - FAKE PASSWORD !!!!!// 

                        // insert to backend DB
                    var insertResponse = await APICall("https://theshillverse.com/nft/xah/insertURIToken?pass=FAKE-PASSWORD&tokenId="+uriToken)
                    console.log(insertResponse);

                        if(!insertResponse ||!insertResponse.success){
                                tokensToMint = 0;
			                    break;
                        }
                    }else{tokensToMint = 0; break;} // stop minting on fails
                }else{tokensToMint=0;break;}
            }
        }
    }


  }

await delay (2000);  
// fake password -- will fail

// get items that are revealed
  var checkReveals = await apiPost("/nft/xah/checkReveals?pass=FAKE-PASSWORD",currentTokenIDs);
  console.log(checkReveals);

  if (checkReveals.success){


     var newDetails = [];

    for (let i=0;i< checkReveals.nftsToCheck.length;i++){
        var nftDetails = await readLedgerObject(client, checkReveals.nftsToCheck[i].URITokenID);
//        console.log(nftDetails);

        if (typeof nftDetails === 'object'){

            // if owner is not issuer..
            if (nftDetails.node.Owner != checkReveals.nftsToCheck[i].owner  && nftDetails.node.Owner != "rU3BHbWv4XknyNbDYnPtcv4XUiRUQ8pUst"){
                newDetails.push({"URITokenID":checkReveals.nftsToCheck[i].URITokenID,"Owner":nftDetails.node.Owner})
                var revealedNFT = checkReveals.nftsRevealed.find(x=> x.URITokenID === checkReveals.nftsToCheck[i].URITokenID);
                if (revealedNFT){
                    // if its revealed - send a webhook to discord displaying the type..
                    await WebhookConstruct(revealedNFT.type,`https://theshillverse.com/nft/img/elemental/${revealedNFT.type}1.jpeg`,revealedNFT.URITokenID, nftDetails.node.Owner);
                }
            }
        }else{
            if (nftDetails === "Burned"){
                newDetails.push({"URITokenID":checkReveals.nftsToCheck[i].URITokenID,"Owner":"Dead"})
            }
        }

        await delay(400)
    }

    
  if (newDetails.length > 0){
    // update details of new owners of NFTs - and set dead NFTs to burned/dead.
    var updateDetails = await apiPost("/nft/xah/updateDetails?pass=FAKE-PASSWORD",newDetails);
    console.log(updateDetails);
    }
  }

  setTimeout(() => {
    main();
}, 10000);

}
main();


async function WebhookConstruct(nftName, nftImage, tokenID, owner){
    var username =  "Elementals";
    var avatar_url = "";
    var discordColor =  15105570;

    switch(nftName){
        case "Fire":
            discordColor = 15105570;
            break;
            case "Air":
                discordColor = 16777215;
                break;
                case "Earth":
                    discordColor = 5763719;
                    break;
                    case "Water":
                        discordColor = 3447003;
                        break;
    }
    

    var postJson = {
        "username": username,
        "avatar_url": avatar_url,
        "content": ``,
        "embeds": [
            {
                "title": nftName + " revealed!",
                "color": discordColor,
                "thumbnail": {
                    "url": nftImage
                },
                "fields": [{
                    "name": "Buyer",
                    "value": owner,
                    "inline": false

                },{
                    "name": "Token ID",
                    "value": tokenID,
                    "inline": false

                }
                ]
            }
        ]
    }

    WebhookPost("DISCORD WEBHOOK URL HERE!", postJson);
}


async function WebhookPost(path, json, retryCount = 0) {
    const data = JSON.stringify(json);
    const url = new URL(path);
    
    const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 204) {
                    resolve(204);
                } else {
                    console.error(`HTTP Status Code: ${res.statusCode}`);
                    resolve(null);
                }
            });
        });

        req.on('error', (error) => {
            if (retryCount < 4) {
                retryCount += 1;
                console.log(`Error hit - Retrying, Count: ${retryCount}`);
                setTimeout(() => {
                    resolve(WebhookPost(path, json, retryCount));
                }, 1000 * retryCount);
            } else {
                console.error(error);
                resolve(null);
            }
        });

        req.write(data);
        req.end();
    });
}


async function readLedgerObject(client, index) {
    // Create a client instance and connect to the Xahau

    try {
        // Request the ledger entry
        const response = await client.request({
            command: 'ledger_entry',
            index: index,
            ledger_index: 'validated', // Retrieve from the last validated ledger
        });

        return response.result;
        //console.log('Ledger Object Details:', JSON.stringify(response.result, null, 2));
    } catch (error) {
        if (error.message == "entryNotFound"){
            return  "Burned";
        }
        console.error('Error reading ledger object:', error);
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

async function apiPost(path, json, authToken = false, retryCount = 0) {
	// ----- RESPONSE DISABLED INCASE OF ERROR IN PHP ----------
	return new Promise((resolve, reject) => {

		const data = JSON.stringify(json)

		const options = {
			hostname: 'theshillverse.com',
			port: 443,
			path: path,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',

			}
		}

        if (authToken){
            options.headers['Authorization'] = 'Bearer FAKEBEARERTOKEN';
        }

		let body = "";

		const req = https.request(options, res => {
			//console.log(`statusCode: ${res.statusCode}`);

			res.on('data', d => {
				process.stdout.write(d); 

				body += d;
			});

			res.on('end', () => {
				if (res.statusCode == 200) {
					
					try{let json = JSON.parse(body);
                        //console.log(body);
                        resolve(json)}
                        catch{
                            resolve(res.statusCode);
                        }
                    

				} else {
					try{let json = JSON.parse(body);
					//console.log(body);
					resolve(json)}
                    catch{
                        resolve(res.statusCode);
                    }
				}
			});
		});
		req.write(data);
		req.end();
	});

}

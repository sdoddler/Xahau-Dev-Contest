
const xrpl = require("@transia/xrpl");

const https = require('https');

const Canvas = require('canvas');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const _ = require("lodash");

const { Discord, AttachmentBuilder, EmbedBuilder, Client, Partials, GatewayIntentBits, Embed } = require("discord.js");


let xrpClient;

var discordToken = "token here if you're using channel sends..";


const path = require('path');

console.log(GatewayIntentBits);
console.log(Client);

var discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel]
})

var elementalBattleChannel = "1328673919531483258" /// Channel of the elemenmtal battles

// Mock Elementals Database (Replace with your actual database or API calls)
/*let elementals = [
  { id: 1, type: "Fire", Level: 1, HP: 10, maxHP: 10, baseAttack: 5, Wins: 0, Draws:0, owner:"yay" },
  { id: 2, type: "Water", Level: 1, HP: 10, maxHP: 10, baseAttack: 5, wins: 0 , Draws:0, owner:"yay"},
  { id: 3, type: "Earth", Level: 2, HP: 20, maxHP: 20, baseAttack: 10, wins: 0, Draws:0, owner:"yay" },
  { id: 4, type: "Air", Level: 2, HP: 20, maxHP: 20, baseAttack: 10, wins: 0 , Draws:0, owner:"yay"},
  { id: 5, type: "Fire", Level: 3, HP: 40, maxHP: 40, baseAttack: 15, wins: 0, Draws:0, owner:"yay" },
  { id: 6, type: "Water", Level: 3, HP: 40, maxHP: 40, baseAttack: 15, wins: 0 , Draws:0, owner:"yay"},
];*/

// Elemental damage multipliers (type advantage system)
const damageModifiers = {
    Fire: { Water: 0.75, Earth: 1, Air: 1.5 }, 
    Water: { Fire: 1.5, Earth: 0.75, Air: 1.0 }, 
    Earth: { Fire: 1, Water: 1.5, Air: 0.75 }, 
    Air: { Fire: 0.75, Water: 1.0, Earth: 1.5 }, 
  };
  

xconnect().then(function () { runBattles() })



async function xconnect(testnet = false) {
    console.log('connecting to **MAINNET** - ' + "wss://xahau.network");


    xrpClient = new xrpl.Client("wss://xahau.network")
    explorer = `https://xahauexplorer.com/`;

    xrpClient.on('error', async () => {
        console.log('XRPL Error found!');
        await xReconnect();
    });

    await xrpClient.connect()
}

async function xReconnect() {

    if (!xrpClient.isConnected()) {
        await xconnect();
    }

    if (!xrpClient.isConnected()) {
        await delay(1000);
        xReconnect();
    }
}

async function discordConnect() {
    if (!discordClient.isReady()) {
        try {
            await discordClient.login(discordToken);
            await delay(5) //take like 3 to 5 seconds to confirm annoyingly, it also acts as a buffer
            console.log(`\nCONNECTED TO Discord Client`)
        } catch (error) {
            console.log(`FAILED TO CONNECT TO DISCORD\n${error}`)
             }
    }
}

// Battle system
function simulateBattle(e1, e2) {
    console.log(`\nBattle begins between ${e1.type} (ID: ${e1.id}) and ${e2.type} (ID: ${e2.id})`);
    let round = 1;
    const MAX_ROUNDS = 23; // Maximum number of rounds
  
    let fields = [];

    let attackMsgs = [];

    let emoji = {
        Fire: "🔥",
        Earth:"🪨",
        Air:"💨",
        Water:"🌊"
    }
  
    // Continue fighting until one elemental's HP drops to 0 or below
    while (e1.HP > 0 && e2.HP > 0) {
      if (round > MAX_ROUNDS) {
        console.log(`\n--- Battle ends in a draw after ${MAX_ROUNDS} rounds ---`);
        fields.push({
          name: `DRAW!`,
          value: `--- Battle ends in a draw after ${MAX_ROUNDS} rounds ---`,
        });
        attackMsgs.push(`--- Battle ends in a draw after ${MAX_ROUNDS} rounds ---`)
        e1.Draws ++;
        e2.Draws ++;
        return { fields, e1, e2, attackMsgs }; // Return the fields and the updated elementals
      }
  
      console.log(`\n--- Round ${round} ---`);
      attackMsgs.push(`--- Round ${round} ---`);
      // Randomly decide who attacks first
      let firstAttacker = Math.random() < 0.5 ? e1 : e2;
      let secondAttacker = firstAttacker === e1 ? e2 : e1;
  
      // First attacker deals damage
      let damage = calculateDamage(firstAttacker, secondAttacker);
      secondAttacker.HP -= damage;
      fields.push({
        name: `Round ${round} - ${firstAttacker.type} (ID: ${firstAttacker.id}) (HP: ${firstAttacker.HP.toFixed(2)}) `,
        value: `Attacks for ${damage.toFixed(2)} damage!`,
      });
      if (firstAttacker == e1){
      attackMsgs.push(`${firstAttacker.type} (ID: ${firstAttacker.id}) HP: ${firstAttacker.HP.toFixed(2)} ${emoji[firstAttacker.type]}➡️ ${secondAttacker.type} (ID: ${secondAttacker.id}) HP: ${secondAttacker.HP.toFixed(2) }(**-${damage.toFixed(2)}**)`)
      }else{
        attackMsgs.push(`${secondAttacker.type} (ID: ${secondAttacker.id}) HP: ${secondAttacker.HP.toFixed(2)}(**-${damage.toFixed(2)}**)} ⬅️${emoji[firstAttacker.type]} ${firstAttacker.type} (ID: ${firstAttacker.id}) HP: ${firstAttacker.HP.toFixed(2) }`)
     
      }
      console.log(
        `${firstAttacker.type} (ID: ${firstAttacker.id}) attacks for ${damage.toFixed(2)} damage!`
      );
  
      // Check if second attacker is defeated
      if (secondAttacker.HP <= 0) {
        fields.push({
          name: `${firstAttacker.type} (ID: ${firstAttacker.id}) Wins!`,
          value: `${secondAttacker.type} (ID: ${secondAttacker.id}) is defeated!`,
        });
        attackMsgs.push(`\n**${firstAttacker.type} (ID: ${firstAttacker.id}) Wins!**
${secondAttacker.type} (ID: ${secondAttacker.id}) is defeated!`)
        console.log(
          `${secondAttacker.type} (ID: ${secondAttacker.id}) is defeated!`
        );
        firstAttacker.Wins++;
        return { fields, e1, e2, attackMsgs }; // Return the fields and the updated elementals
      }
  
      // Second attacker retaliates
      damage = calculateDamage(secondAttacker, firstAttacker);
      firstAttacker.HP -= damage;
      fields.push({
        name: `Round ${round} - ${secondAttacker.type} (ID: ${secondAttacker.id}) (HP: ${secondAttacker.HP.toFixed(2)})`,
        value: `Attacks for ${damage.toFixed(2)} damage!`,
      });
      if (firstAttacker == e1){
        attackMsgs.push(`${firstAttacker.type} (ID: ${firstAttacker.id}) HP: ${firstAttacker.HP.toFixed(2)}(**-${damage.toFixed(2)}**)}  ⬅️${emoji[firstAttacker.type]} ${secondAttacker.type} (ID: ${secondAttacker.id}) HP: ${secondAttacker.HP.toFixed(2) }`)
        }else{
          attackMsgs.push(`${secondAttacker.type} (ID: ${secondAttacker.id}) HP: ${secondAttacker.HP.toFixed(2)}${emoji[firstAttacker.type]} ${firstAttacker.type}➡️ (ID: ${firstAttacker.id}) HP: ${firstAttacker.HP.toFixed(2) }(**-${damage.toFixed(2)}**)`)
       
        }
      console.log(
        `${secondAttacker.type} (ID: ${secondAttacker.id}) attacks for ${damage.toFixed(2)} damage!`
      );
  
      // Check if first attacker is defeated
      if (firstAttacker.HP <= 0) {
        fields.push({
          name: `${secondAttacker.type} (ID: ${secondAttacker.id}) Wins!`,
          value: `${firstAttacker.type} (ID: ${firstAttacker.id}) is defeated!`,
        });
        attackMsgs.push(`\n**${secondAttacker.type} (ID: ${secondAttacker.id}) Wins!**
${firstAttacker.type} (ID: ${firstAttacker.id}) is defeated!`)
        console.log(
          `${firstAttacker.type} (ID: ${firstAttacker.id}) is defeated!`
        );
        secondAttacker.Wins++;
        return { fields, e1, e2, attackMsgs }; // Return the fields and the updated elementals
      }
  
      round++;
    }
  
    return { fields, e1, e2, attackMsgs }; // Return the fields and the updated elementals
  }

  
// Damage calculation
function calculateDamage(attacker, defender) {
  const modifier = damageModifiers[attacker.type][defender.type] || 1.0; // Default modifier is 1.0
  const randomFactor = _.random(0.8, 1.2, true); // Random factor between 0.8 and 1.2
  return attacker.baseAttack * modifier * randomFactor;
}

// Select random battles for each tier
async function runBattles() {
    
    await discordConnect();

    let returnElementals = [];

    // get non-dead revealed elementals frombackend
    let activeElementals = await APICall("https://theshillverse.com/nft/xah/activeElementals")

    console.log(activeElementals)
   // await delay(10000)
    if (activeElementals.success == false){
        console.log("bailing, can't find elementals");
    }

    let elementals = activeElementals.activeElementals.filter(x=>x.Status == "Fighting");

    for (const el in elementals){
        elementals[el].baseAttack = elementals[el].Level*5;
    }

    let restingElementals = activeElementals.activeElementals.filter(x=> x.Status =="Resting")


    // heal resting elementals
    for (const el in restingElementals){
        //restingElementals[el].HP +=10;

        var changed = false;

        switch (restingElementals[el].Level){
            case 1:
                if (restingElementals[el].HP < 10) {
                    restingElementals[el].HP +=5;
                    changed = true;
                    if (restingElementals[el].HP > 10) restingElementals[el].HP = 10;
                } 
            break;
            case 2:
                if (restingElementals[el].HP < 20) {
                    restingElementals[el].HP +=10;
                    changed = true;
                    if (restingElementals[el].HP > 20)restingElementals[el].HP = 20;
                }
            break;
            case 3:
                if (restingElementals[el].HP < 40) {
                        restingElementals[el].HP +=10;
                        changed = true;
                        if (restingElementals[el].HP > 40) restingElementals[el].HP = 40;
                    } 
            break;
            case 4:
                if (restingElementals[el].HP < 80) {
                    restingElementals[el].HP +=10;
                    changed = true;
                    if (restingElementals[el].HP > 80) restingElementals[el].HP = 80;             
            }
            break;
            case 5:
                if (restingElementals[el].HP < 160) {
                    restingElementals[el].HP +=10;
                    changed = true;
                    if (restingElementals[el].HP > 160) restingElementals[el].HP = 160;
                }
            break;
        }

        if (changed) returnElementals.push({URITokenID: restingElementals[el].URITokenID, Wins: restingElementals[el].Wins, Draws:restingElementals[el].Draws, HP: Math.round(restingElementals[el].HP)})  
    }

    console.log(elementals,restingElementals,returnElementals);

// use Post battle for all Healing taking place

//!!!!--------------- will fail here as password is inccorect
    var updatePostBattle = await apiPost("/nft/xah/postBattleUpdate?pass=FAKE-PASSWORD-HERE",returnElementals)

    console.log(updatePostBattle);
   // await delay(10000)

  // Group elementals by Level
  const groupedElementals = _.groupBy(elementals, "Level");



  // Loop through each tier
  for (const Level in groupedElementals) {
    const tier = groupedElementals[Level];
    console.log(`\n--- Tier ${Level} Battles ---`);
    

    // Randomly pair up elementals for battles
    while (tier.length >= 2) {
        let battleElementals = [];

      const [e1, e2] = _.sampleSize(tier, 2); // Select two random elementals
      tier.splice(tier.indexOf(e1), 1); // Remove e1 from the tier
      tier.splice(tier.indexOf(e2), 1); // Remove e2 from the tier

      var startingHP1 = e1.HP;
      var startingHP2 = e2.HP;

      var startingWins1 = e1.Wins;
      var startingWins2 = e2.Wins;
  
      var img1 = "https://theshillverse.com/nft/img/elemental/" + e1.type + e1.Level + ".jpeg";
      var img2 = "https://theshillverse.com/nft/img/elemental/" + e2.type + e2.Level + ".jpeg";
  
      var imgVS = path.join(__dirname,"vs.png")
  
      const canvas = Canvas.createCanvas(800, 250);
      const context = canvas.getContext('2d');
  
      const canvasImg1 = await Canvas.loadImage(img1);
      const canvasImg2 = await Canvas.loadImage(img2);
  
      const vsImg = await Canvas.loadImage(imgVS);
  
      //console.log(canvasImg2)
  
      //Object.assign(context.canvas, {width:400,height:400})
      context.save()
      context.translate(700, 0)
      context.scale(-1, 1)
      context.drawImage(canvasImg2, 0, 0, 250, canvas.height);
  
      context.restore()
  
  
      context.scale(1, 1)
  
      context.drawImage(vsImg, 275, 75, 175, 175);
  
  
      context.drawImage(canvasImg1, 25, 0, 250, canvas.height);


  
      const attachment = new AttachmentBuilder(await canvas.toBuffer(), { name: 'fight.png' });

      // Simulate battle
      //const winner = simulateBattle(e1, e2);
    //  let fightFields
    let result = simulateBattle(e1, e2);

    let x1 = result.e1;
    let x2 = result.e2;
    

      // Heal the winner partially and reset HP for future battles
      //winner.HP = Math.min(winner.HP + winner.maxHP * 0.5, winner.maxHP);
        let prize = 4;
        switch (x1.Level)
        {
            case 1:
                prize = 4;
                break;
            case 2:
                prize = 5;
                break;
            case 3:
                prize = 6;
                break;
            case 4:
                prize = 10;
                break;
        }

      let winner = null;
      let loser = null;

      

      if (x1.HP <= 0 || x2.HP <= 0){
        // Only send prizes if not a Draw

        let prizeHash = null;
        let burnHash = null


        if (x1.HP > 0){
            winner = x1;
            loser = x2;
            

        }else if (x2.HP > 0) {
            winner = x2;
            loser = x1;
    
        }

        try{// send Prize
            var nftDetails = await readLedgerObject(xrpClient, winner.URITokenID)

            console.log(nftDetails)

            var owner = nftDetails.node.Owner;

           var prizeResults = await xSend(prize, "SEED OF PRIZE WALLET",owner, "Win @ Lvl "+winner.Level);
            // Burn Loser
          var burnResults = await UTokenBurn(loser.URITokenID,"SEED OF ISSUER WALLET", "DEFEATED!")
            
          if (prizeResults.success){
            prizeHash = prizeResults.hash;
          }
          if (burnResults.success){
            burnHash = burnResults.hash;
          }
        
        }catch(e){
            console.log("problem finishing match",e);
        }

        battleElementals.push({URITokenID: winner.URITokenID, Wins: winner.Wins, Draws:winner.Draws, HP: Math.ceil(winner.HP)})      
        battleElementals.push({URITokenID: loser.URITokenID, Wins: loser.Wins, Draws:loser.Draws, HP: Math.floor(loser.HP)})
        
        result.fields.push({name:`Prize of ${prize} $XAH sent to Winner!`,value:`${winner.owner}\nSee it on Xahau Explorer! ${explorer}${prizeHash}`})
        result.attackMsgs.push(`\nPrize of ${prize} $XAH sent to Winner!\n${winner.owner}\nSee it on Xahau Explorer! ${explorer}${prizeHash}`)
        result.fields.push({name:`The loser has perished!`,value:`${loser.owner}\nSee it on Xahau Explorer! ${explorer}${burnHash}`})
        result.attackMsgs.push(`\nThe loser has perished!\n${loser.owner}\nSee it on Xahau Explorer! ${explorer}${burnHash}`)
      }
      

      
      
      console.log(`Winner: ${winner.type} (ID: ${winner.id}) | Current HP: ${winner.HP.toFixed(2)} | Wins: ${winner.Wins}`);

      var damageModTxt = e1.type == e2.type ? 1 : damageModifiers[e1.type][e2.type]

      var fight = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(e1.type + `(ID: ${e1.id})` + " - Level " + e1.Level + " vs " + e2.type + `(ID: ${e2.id})`+ " - Level "  + e2.Level )
        .addFields(
            { name: e1.type + " - Level " + e1.Level, value: 
                `ID: ${e1.id}
                HP: ${startingHP1}
                Wins: ${startingWins1}
                Owner: ${e1.owner.slice(0, 5)}...${e1.owner.slice(e1.owner.length - 5, e1.owner.length)}
                Damage Mod: ${e1.type} ${damageModTxt}` , inline: true },
                { name: e2.type + " - Level " + e2.Level, value: 
                    `ID: ${e2.id}
                    HP: ${startingHP2}
                    Wins: ${startingWins2}
                    Owner: ${e2.owner.slice(0, 5)}...${e2.owner.slice(e2.owner.length - 5, e2.owner.length)}
                    Damage Mod: ${e2.type} ${damageModTxt}` , inline: true }
        );



        var cachedChannel = await discordClient.channels.fetch(elementalBattleChannel);

        var message = await cachedChannel.send({ embeds: [fight], files: [attachment] })
       /* for (let i = 0; i< result.fields.length; i++){
            const exampleEmbed = EmbedBuilder.from(message.embeds[0]).addFields(result.fields.slice(i,i+1));

            message.edit({ embeds: [exampleEmbed] });

            await delay(1000);
        }*/

            for (let i = 0; i< result.attackMsgs.length; i++){
                cachedChannel.send(result.attackMsgs[i])
    
                await delay(1000);
            }
            

        //console.log(message)

/// !------ WILL FAIL, fake password        
        var updatePostBattle = await apiPost("/nft/xah/postBattleUpdate?pass=FAKE-PASSWORD-HERE",battleElementals)

        console.log(updatePostBattle);

            // wait between matches
        await delay (5000)
    }
  }


process.exit();
//    setTimeout(() => {
 //       runBattles()
   // }, 30000);
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
            options.headers['Authorization'] = 'Bearer BEARER TOKEN RIGHT HERE ! :) ';
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

async function xSend(amount, fromSeed, destinationAddress,memo = "") {
    if (!xrpl.isValidAddress(destinationAddress)){
        console.log(`Destination Address Is Invalid`);
        returnData.success = false;
        returnData.result = " Destination Address was invalid (perhaps ROOT network)";
        return returnData;
    }

    var fromWallet = xrpl.Wallet.fromSeed(fromSeed);

    // Send token ----------------------------------------------------------------
    const issue_quantity = amount;
    const send_token_tx = {
        "TransactionType": "Payment",
        "Account": fromWallet.address,
        "Amount": (Number(amount) * 1000000).toFixed(0),
        "Destination": destinationAddress,
        "SourceTag":55555555,
        "NetworkID":21337,

    }

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

    const pay_prepared = await xrpClient.autofill(send_token_tx)
    const pay_signed = fromWallet.sign(pay_prepared)
    console.log(`Sending ${issue_quantity} XRP to ${destinationAddress}...`)
    const pay_result = await xrpClient.submitAndWait(pay_signed.tx_blob)

    var returnData = { success: true, hash: pay_signed.hash, result: "tesSUCCESS"};

    if (pay_result.result.meta.TransactionResult == "tesSUCCESS") {
        console.log(`Transaction succeeded: ` + explorer + `${pay_signed.hash}`)
    } else {
        console.log(`Error sending transaction: ${pay_result.result.meta.TransactionResult}`);
        returnData.success = false;
        returnData.result = pay_result.result.meta.TransactionResult;
    }

    return returnData;
}

async function UTokenBurn(URITokenID, fromSeed, memo = ""){
    var fromWallet = xrpl.Wallet.fromSeed(fromSeed);

    const burnTokenTx = {

        "TransactionType": "URITokenBurn",
        "Account": fromWallet.classicAddress,
        "URITokenID": URITokenID,
        "NetworkID":21337,
    
    }
    
    if (memo != "") {
        var memohex = xrpl.convertStringToHex(memo)
        burnTokenTx.Memos = [
            {
                "Memo": {
                    "MemoData": memohex
                }
            }
        ]
    }
    
    const _prepared = await xrpClient.autofill(burnTokenTx)
    const _signed = fromWallet.sign(_prepared)
    const _result = await xrpClient.submitAndWait(_signed.tx_blob)
    
    var returnData = { success: true, hash: _signed.hash, result: "tesSUCCESS"};

    if (_result.result.meta.TransactionResult == "tesSUCCESS") {
        console.log(`Transaction succeeded: ` + explorer + `${_signed.hash}`)
    } else {
        console.log(`Error sending transaction: ${_result.result.meta.TransactionResult}`);
        returnData.success = false;
        returnData.result = _result.result.meta.TransactionResult;
    }

    return returnData;
    
}

# Xah Elementals

My entry to the Xahau Dev Contest is Xah Elementals - a Simple URI token game - this harnesses the power of the URI tokens and shows off their capabilities such as the offer on mint, burnable flag, and their *no-duplicates* enforcement. First I'll go over a little bit about the game, and then dive into some technicals. I had more planned for this game including greater use of hooks, however learning C and time constraints IRL let me down there.

### The Game
Xah Elementals pits Elemental characters against each other to battle for $XAH! Elmentals can be purchased for 5 $XAH, and will then be rewarded based on their wins. Elementals will also level up after a certain amount of wins, fighting against only Elementals of their Level. Elementals can also "rest" instead of fighting, to regain 10 HP back whenever a fight takes place.
Fights take place 3 times a day at 1AM, 9AM & 5PM (UTC+0) and are automatically resolved, with the results displayed in discord.

![image](https://github.com/user-attachments/assets/aff51d22-0453-414e-85cb-a11f559d2971)

#### How to Participate
Elementals can be purchased for 5 $XAH from:
- [Xahau Explorer](https://test.xahauexplorer.com/en/nfts/rU3BHbWv4XknyNbDYnPtcv4XUiRUQ8pUst)
- [TheShillverse Website (Elementals)](https://theshillverse.com/elementals)


With their type revealing shortly after via discord in the xah-elemental-reveal channel
[Join TheShillverse Discord](https://discord.gg/TwSFKqP8xw)

Your elementals will automatically be set to "Fighting" status, and will participate in the next battle if there is 2 or more elementals at Level 1.

To Level up you need wins!

- Level 2: 1 Win
- Level 3: 3 Wins
- Level 4: 6 Wins
- Level 5: 10 Wins

Elementals also have damage Modifiers against each other as follows:

- Fire consumes Air (1.5x) but struggles against Water (0.75x). 🌋💨
- Water douses Fire (1.5x) but gets absorbed by Earth (0.75x). 🌊🌍
- Earth crushes Water (1.5x) but crumbles under Air (0.75x). 🪨🌪️
- Air erodes Earth (1.5x) but fuels Fire (0.75x). 🌪️🔥

if you wish to Rest your elemental you can do so via [TheShillverse Website (Elementals)](https://theshillverse.com/elementals) - logging in with Xaman.

This website also has a leaderboard for the top ranked by Level & Wins.

### Forwarder hook
Before I realised there was an example hook called "Carbon" I went about making my own percentage based forwarder hook, based on Ekisperre's forwarder. 
This hook sends a set percentage of $XAH to a specified account, when drops are above a minimum. [Repo here](https://github.com/sdoddler/forwarder-hook), but will upload to this folder as well
My plan with this forwarded $XAH was to then incorporate a player based raffle/lottery system where every Xah Elemental also triggered a possible win of the current jackpot. Unfortunately I ran out of time for the latter hook.

### Metadata / URIToken generation
For this set of URI Tokens I used a different method than I had previously for rendering metadata, normally I have static JSON files which are able to be changed, this time I used a combination of PHP querying my backend database to display data. This allowed for dynamic NFTs that levelled up, without the need for burn/swaps. It also meant there was an easy way to keep track of the next relevant URI to mint utilising the Autoincrement field in the database as the ID. (This can be seen in the Xah-minter.js)

### Other files
I am including redacted / cut down versions of:
- Xah-minter.js - backend script for automatically minting new Elementals when previous ones are bought.
- Xah-battle.js - backend script that does the battle logic
- xah-nukeownedURIs.js - utility script to burn all URI tokens owned by an account.
- xah-airdropURITokens.js - utility script to airdrop URI tokens to a list of accounts.
- forwarder.c - hook for forwarding 20% of Elemental costs to another account (rPNK ...)

### Website / SDK integration
I have previously used the Xaman SDK to manage XRPL integrations and was able to quickly modify a snippet to manage the buying of URI Tokens:
```
function buyURIToken(URITokenID){
        
        var payload = {
          txjson: {
            TransactionType: 'URITokenBuy',
            URITokenID: URITokenID,
            NetworkID:21337,
            Amount:"5000000"
          }
        }
        
        if (sdk === undefined){
            document.getElementById("errorToastText").innerText = 'Please sign-in to receive a Xumm push notification!';
             ui("#errorToast");
             return;
        }
        
        sdk.payload.createAndSubscribe(payload, function (payloadEvent) {
          if (typeof payloadEvent.data.signed !== 'undefined') {
            // What we return here will be the resolved value of the `resolved` property
            return payloadEvent.data
          }
        }).then(function ({created, resolved}) {
             document.getElementById("successToastText").innerText = 'Check Xumm for a sign notification!';
             ui("#successToast");

          resolved.then(function (payloadOutcome) {
            
            
          })
        }).catch(function (payloadError) {
          alert('Paylaod error', e.message)
        })
      
      }
```

## Socials
[Join TheShillverse Discord](https://discord.gg/TwSFKqP8xw)
[TheShillverse on X ](https://x.com/TheShillverse)

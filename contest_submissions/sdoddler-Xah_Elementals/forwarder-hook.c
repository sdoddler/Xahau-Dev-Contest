/**
 * This hook resends a percentage of the amount from a payment received or a URI buy to a specific destination.

 It could easily be expanded to add other accounts & differing percentages. 
 Be careful - if your percentages go over 1.0 then you will be spending **EXTRA** XAH

 This is my first hook - exercise caution while using though it has been tested.

 This hook was heavily inspired by the tutorial here:
https://github.com/technotip/HookTutorials/blob/main/SimplePayment.c
& obviously Ekiserrepe's Forwarder hook.

 This is being used in tandem with the Xah Elementals Game - more info can be found via:
x.com/theshillverse
theshillverse.com/elementals

 You can check the status of your namespace visiting https://xahau-testnet.xrplwin.com/ checking your hook account
 
 */

#include "hookapi.h"
#include <stdint.h>

#define NOPE(x) rollback(SBUF(x), __LINE__)


int64_t hook(uint32_t reserved ) {

    uint8_t master_acc[20] = { 0xF3U, 0xD7U, 0x6AU, 0x09U, 0x64U, 0x7CU, 0x81U, 0x3DU, 0x03U, 0x63U, 0xE6U, 0xF8U, 0x20U, 0xBBU, 0x7CU, 0x79U, 0x7DU, 0x2EU, 0xB7U, 0x04U }; // rPNK... Address

    uint8_t hook_acc[20];
    hook_account(SBUF(hook_acc));

    uint8_t account[20];
    otxn_field(SBUF(account), sfAccount);

    int64_t minimum_drops = 5000000; // 5 XAH

    float percentage01 = 0.20; // 20%

    if(BUFFER_EQUAL_20(hook_acc, account)) // Is going from our Hook account
        DONE("Outgoing Transaction");

    uint8_t amount[8];
    unsigned char amount_buffer[48];
    int64_t amount_len = otxn_field(SBUF(amount_buffer), sfAmount);
    if(amount_len != 8) // IOU / Issued Currency / Non-XAH
        DONE("Non-XAH Transaction, accepted!");

        int64_t drops_to_send = 0;
        

    int64_t otxn_drops = AMOUNT_TO_DROPS(amount_buffer);
            drops_to_send = (int64_t)((double)otxn_drops);
            TRACEVAR(otxn_drops);

    if (drops_to_send < minimum_drops) // Amount is below our Minimum to trigger (default 5 $XAH)
        {
            DONE("Forwarder: No minimum amount. Nothing to do");
        }

    etxn_reserve(1);
    uint8_t txn[PREPARE_PAYMENT_SIMPLE_SIZE];
    PREPARE_PAYMENT_SIMPLE(txn, drops_to_send * percentage01 , master_acc, 0, 0);

    uint8_t emithash[32];
    if(emit(SBUF(emithash), SBUF(txn)) != 32)
        NOPE("Failed, please try again later.");

    DONE("Amount Forwarded Successfully.");
    _g(1,1);
    return 0;
}

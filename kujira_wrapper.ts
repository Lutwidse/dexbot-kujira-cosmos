// FIN
export function msg_submit_order(uusk_amount: string, collateral_liquidation_price: string) {
    return {
        "submit_order": {
          "amount": (parseInt(uusk_amount)*1000000).toString(),
          "price": collateral_liquidation_price.toString(),
          "denom": {
            "native": "factory/kujira1qk00h5atutpsv900x202pxx42npjr9thg58dnqpa72f2p7m2luase444a7/uusk"
          }
        }
    }
}

export function msg_withdraw_order(order_idxs:string[]) {
    return {
        "withdraw_orders": {
          "order_idxs": [
            order_idxs
          ]
        }
    }
}

export function msg_swap() {
    return {
        "swap":{}
    }
}

export function msg_submit_bid(premium: number) {
    return {
        "submit_bid": {
            "premium_slot": premium,
            "delegate": "kujira16a03hk5ev6963a4yj3kcrvmh4hej3w3j70kv2n"
        }
    }
}

// Orca
// ...
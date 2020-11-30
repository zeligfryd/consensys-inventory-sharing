# Design Pattern Decisions

### Circuit breaker

The smart contract execution can be paused in case of emergency with the function `turnEmergencySwitch`. This function does not affect view and pure functions, as well as `withdrawDealerBalance`.

### Restricting access

The modifiers `onlyAdmin` and `onlyDealer` restrict access to specific functions.

### Fail early, fail loud

Exceptions are thrown in functions and modifiers, with `require`instead of using `ìf` and failing silently.

## Pull over Push Payments

When dealers restock from other dealers, the funds are not transferred directly to the seller but they increment their balance. They can then withdraw with the `withdrawDealerBalance` function.

## Not implemented

### Auto deprecation

Not implemented, since I did not think the application should deprecate at any time.

### Mortal

Since I implemented the circuit breaker, which I considered a sufficient security measure, I did not make the smart contract mortal. Indeed, as the smart contract receives Ether, making it mortal allows for Ether to be lost for whoever sends some to the contract afer selfdestruct, or did not withdraw their balance before selfdestruction.

### State machines

There was no need in the current state of this application to implement a state machine.

### Speed bump

Not implemented, as I did not consider the application required it.

## State Machine

Not used, but could be interesting to use if states were added to the products (ex: purchased, shipped, etc.). For now, this is not needed.

## Speed Bump

Not used. Could be interesting to use it in conjunction with the `Pausable` functionality. For example, if we had a `SlowWithdraw` function that allowed `storeOwners` to withdraw their storefront balances N blocks after the contract had been paused.

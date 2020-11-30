# Avoiding Common Attacks

### Integer Overflow/Underflow

I implemented the Safemath library to avoid integer overflow/underflow during operations. This library throws when such an error occurs.

### Denial of Service

The smart contract will never loop through an array of indefinite size, which protects it from a denial of service attack.

### Pull withdrawal

As explained in the Design Pattern Decisions, in a restock operation, funds are not transferred directly to the seller, they are stored in the balance variable. Dealers can then withdraw with the `withdrawDealerBalance` function.

### Reentrancy

The withdrawal function described above is not exposed to reentrancy attacks, since it first sets the balance to zero, and only then sends Ethers.

### Force Send Ether

Force sent Ether does not endanger the contract. However, it can not be recoreved.

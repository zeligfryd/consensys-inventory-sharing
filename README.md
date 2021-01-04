# Inventory Sharing Decentralized Application

Final project of the [Consensys Acadamy Bootcamp](https://consensys.net/academy/bootcamp/).

## Abstract

Manufacturers usually provides exclusive rights to the dealers through contractual agreements. Some manufacturers also implement inventory sharing programs. In a typical inventory sharing program, participating dealers are allowed to adjust the values of the parameters that indicate which parts they want to share and the amount of sharing desired for each part. Typically, dealers can block out some parts from sharing. The first incentive for such a program is stock optimisation and therefore dealers' performance. Since the dealers are closer to the customers and meet the customers’ direct needs on a daily basis, their performance directly influences customer satisfaction and, in the long-run, the manufacturer’s sales and profits.

Besides, sharing inventories among dealers can have positive externalities by reducing distances of transportation as well as wasted stocks. Indeed, dealers can restock from other dealers closer geographically than the manufacturer, and they can share their excess stocks with other dealers rather than throwing it away.

Most inventory sharing programs do not allow dealers to make profit on a shared part, i.e., the dealers are not allowed to increase the part’s price. However, in order to encourage sharing among dealers, the manufacturer may give a commission equal to a certain share of the part’s price to the sharing dealer. The manufacturer absorbs this commission as a goodwill cost to promote inventory sharing.

The goal of this simplified application is to provide the infrastructure for such an Inventory Sharing system.

## Reference

[Inventory Sharing and Rationing in Decentralized Dealer Networks, Hui Zhao, Vinayak Deshpande, Jennifer K. Ryan, April 2002](https://pdfs.semanticscholar.org/5b1b/efc81f40707a457a2a2dec42cac8ca0a9091.pdf)

## Setup

To run this project, you will need:

- Truffle: `npm install -g truffle`
- Ganache CLI: `npm install -g ganache-cli`
- MetaMask

### Running the project locally

Using this method you will compile and migrate the smart contract yourself with the help of a
[local development blockchain](https://github.com/trufflesuite/ganache-cli) and serve the Angular
frontend using a local http-server.

To get strated, clone this project and navigate to the projects folder

    git clone https://github.com/zeligfryd/consensys-inventory-sharing
    cd consensys-inventory-sharing

Install all local dependencies needed for this project

    npm install

Start the local development blockchain

    ganache-cli

Compile and migrate the smart contract

    truffle compile
    truffle migrate --reset

Run the frontend

    npm run dev

You can now navigate to `localhost:3000`if not opened automatically.

In Metamask, log out of your current account (be careful and save your mnemonic/passphrase if your account is on the mainnet!). Click `Restore from seed phrase` and the seed phrase you have copied from the `ganache-cli` terminal window. This will load the ganache accounts into the Metamask extension and allow you to use them in your browser. Then choose `Custom RPC` as your network and use the IP `ganache-cli` terminal is listening on.

### Note

As the smart contract distributes bonuses to dealers, it will have to maintain a sufficient Ether balance to distribute these bonuses. This will typically have to be done manually by the contract owner.
An improvement would be to implement a dedicated token, using for example Open Zeppelin's standard.

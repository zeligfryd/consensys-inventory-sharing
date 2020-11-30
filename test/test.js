const truffleAssert = require('truffle-assertions');

const InventorySharing = artifacts.require('InventorySharing.sol');

contract('InventorySharing', accounts => {

    before(async () => {
        owner = accounts[0];
        admin1 = accounts[1];
        admin2 = accounts[2];
        dealer1 = accounts[3];
        dealer2 = accounts[4];
        instance = await InventorySharing.new({
            from: owner
        });
    });

    // constructor 
    it('checks if the contract was set up correctly', async () => {
        const testedOwner = await instance.owner.call();
        assert.equal(owner, testedOwner, 'wrong owner');
    });

    // addAdmin function
    it('check addAdmin', async () => {
        // adding admin from a non-owner account
        await truffleAssert.fails(
            instance.addAdmin(admin1, {from: dealer1}), 
            truffleAssert.ErrorType.REVERT, 
            'caller is not an admin', 
            'should fail since only callable by an admin'
        );

        // add admin by owner
        let result = await instance.addAdmin(admin1, {from:owner});
        await instance.addAdmin(admin2, {from: owner});
        // check if event was emitted
        await truffleAssert.eventEmitted(
            result, 
            'AddedAdmin', 
            params => {return params.admin === admin1;}, 
            'AddedAdmin event should have been emitted, with admin as parameter'
        );

        // adding an already existing admin, event should not be emitted
        result = await instance.addAdmin(admin1, {from: owner});
        await truffleAssert.eventNotEmitted(result, 'AddedAdmin', null, 'AddedAdmin should not have been emitted');

        // finally, check if admins were added
        let isAdmin = await instance.admins.call(admin2);
        assert.equal(isAdmin, true, 'admin1 should be admin');
        isAdmin = await instance.admins.call(admin2);
        assert.equal(isAdmin, true, 'admin2 should be admin');
    })

    // addDealer function
    it('check addDealer', async () => {
        // adding dealer from a non-admin account
        await truffleAssert.fails(
            instance.addDealer(dealer1, {from: dealer2}), 
            truffleAssert.ErrorType.REVERT, 
            'caller is not an admin', 
            'should fail since only callable by an admin'
        );

        // add dealers by admin
        let result = await instance.addDealer(dealer1, {from:admin1});
        await instance.addDealer(dealer2, {from: admin1});
        // check if event was emitted
        await truffleAssert.eventEmitted(
            result, 
            'AddedDealer', 
            params => {return params.dealer === dealer1 && params.admin === admin1;}, 
            'AddedDealer event should have been emitted, with dealer and admin as parameters'
        );

        // adding an already existing admin, event should not be emitted
        result = await instance.addDealer(dealer1, {from:admin1});
        await truffleAssert.eventNotEmitted(result, 'AddedDealer', null, 'AddedDealer should not have been emitted');

        // finally, check if dealers were added
        let isDealer = await instance.dealers.call(dealer1);
        assert.equal(isDealer, true, 'dealer1 should be dealer');
        isDealer = await instance.dealers.call(dealer2);
        assert.equal(isDealer, true, 'dealer2 should be dealer');
    })

    // check addCatalogueItem function
    it('should add catalogue item', async () => {
        const name = 'Test Item';
        const description = 'description test';
        referencePrice = web3.utils.toWei('0.12', 'ether');
        incentive = web3.utils.toWei('0.01', 'ether');
        const sender = admin1;

        // try to add catalogue item from a non-admin account, should fail
        await truffleAssert.fails(
        instance.addCatalogueItem(name, description, referencePrice, incentive, {
            from: dealer1
        }),
        truffleAssert.ErrorType.REVERT,
        'caller is not an admin',
        'should have failed, should only be callable by admins'
        );

        // retreive ID of first item from result
        let result = await instance.addCatalogueItem(name, description, referencePrice, incentive, {
        from: sender
        });
        itemID = result.logs[0].args.itemID;

        // calculated ID should match emitted ID in AddedCatalogueItem event
        await truffleAssert.eventEmitted(
        result,
        'AddedCatalogueItem',
        params => {
            return (
            params.admin == sender && params.itemID == itemID
            );
        },
        'AddedCatalogueItem event should be emitted with admin1 and itemID as parameters'
        );

        item = await instance.getCatalogueItem(itemID);
        assert.equal(name, item[0], 'name does not match');
        assert.equal(description, item[1], 'description does not match');
        assert.equal(referencePrice, item[2], 'referencePrice does not match');
        assert.equal(incentive, item[3], 'incentive does not match');
        assert.equal(true, item[4], 'active should be set to true');
    });

    // check restock from manufacturer function
    it('should restock item from manufacturer', async () => {
        const amount = 200;
        // try to call restockFromManufacturer from a non-dealer account, should fail
        await truffleAssert.fails(
            instance.restockFromManufacturer(itemID, amount, {
                from: admin1,
                value: referencePrice * amount
            }),
            truffleAssert.ErrorType.REVERT,
            'caller is not a dealer',
            'should have failed, should only be callable by dealers'
            );

        // try to call restockFromManufacturer with the wrong price, should fail
        await truffleAssert.fails(
            instance.restockFromManufacturer(itemID, amount, {
                from: dealer1,
                value: referencePrice * amount - 1000000
            }),
            truffleAssert.ErrorType.REVERT,
            'sent value does not match price',
            'should have failed, should only run if msg.value = referencePrice * amount'
        );
                
        // get dealer's current stock
        inventory = await instance.getInventoryItem(dealer1, itemID);
        const stock = inventory[1];

        const result = await instance.restockFromManufacturer(itemID, amount, {
            from: dealer1,
            value: referencePrice * amount
        });
        // check if event was emitted correctly
        await truffleAssert.eventEmitted(
            result,
            'RestockedFromManufacturer',
            params => {
            return (
                params.dealer === dealer1 &&
                params.itemID === itemID &&
                params.amount.toString() === amount.toString()
            );
            },
            'RestockedFromManufacturer event should be emitted with dealer, itemID and amount as parameters'
        );

        // check if amount was added to stock
        inventory = await instance.getInventoryItem(dealer1, itemID);
        const stock2 = inventory[1];
        assert.equal(
            parseInt(stock) + amount,
            stock2,
            'item stock should have been incremented by amount'
        );
    });

    // check updateInventoryWithSoldQuantity
    it('should update inventory with sold quantity', async () => {
        const quantity = 50;
        // try to call updateInventoryWithSoldQuantity from a non-dealer account, should fail
        await truffleAssert.fails(
            instance.updateInventoryWithSoldQuantity(itemID, quantity, {
                from: admin1
            }),
            truffleAssert.ErrorType.REVERT,
            'caller is not a dealer',
            'should have failed, should only be callable by dealers'
        );

        // try to call updateInventoryWithSoldQuantity with an amount larger than the stock, should fail
        await truffleAssert.fails(
            instance.updateInventoryWithSoldQuantity(itemID, quantity+1000, {
                from: dealer1
            }),
            truffleAssert.ErrorType.REVERT,
            'not enough items in stock',
            'should have failed, should only run if amount <= stock'
        );
                
        // get dealer's current stock
        inventory = await instance.getInventoryItem(dealer1, itemID);
        const stock = inventory[1];

        const result = await instance.updateInventoryWithSoldQuantity(itemID, quantity, {
            from: dealer1
        });
        // check if event was emitted correctly
        await truffleAssert.eventEmitted(
            result,
            'UpdatedInventoryWithSoldQuantity',
            params => {
            return (
                params.dealer === dealer1 &&
                params.itemID === itemID &&
                params.quantitySold.toString() === quantity.toString()
            );
            },
            'UpdatedInventoryWithSoldQuantity event should be emitted with dealer, itemID and quantity as parameters'
        );

        // check if quantity was removed from stock and added to availableForSharing
        inventory = await instance.getInventoryItem(dealer1, itemID);
        const stock2 = inventory[1];
        assert.equal(
            parseInt(stock) - quantity,
            stock2,
            'item stock should have been decremented by quantity'
        );
    });       

    // check updateQuantityAvailableForSharing
    it('should update quantity available for sharing', async () => {
        const quantity = 20;
        // try to call updateQuantityAvailableForSharing from a non-dealer account, should fail
        await truffleAssert.fails(
            instance.updateQuantityAvailableForSharing(itemID, quantity, {
                from: admin1
            }),
            truffleAssert.ErrorType.REVERT,
            'caller is not a dealer',
            'should have failed, should only be callable by dealers'
        );

        // get dealer's current stock
        inventory = await instance.getInventoryItem(dealer1, itemID);
        const stock = inventory[1];
        const availableForSharing = inventory[2];

        // try to call updateQuantityAvailableForSharing with an amount larger than the total stock, should fail
        await truffleAssert.fails(
            instance.updateQuantityAvailableForSharing(itemID, stock + availableForSharing + 1000, {
                from: dealer1
            }),
            truffleAssert.ErrorType.REVERT,
            'not enough items in stock',
            'should have failed, should only run if amount <= total stock'
        );

        const result = await instance.updateQuantityAvailableForSharing(itemID, quantity, {
            from: dealer1
        });
        // check if event was emitted correctly
        await truffleAssert.eventEmitted(
            result,
            'UpdatedQuantityAvailableForSharing',
            params => {
            return (
                params.dealer === dealer1 &&
                params.itemID === itemID &&
                params.quantity.toString() === quantity.toString()
            );
            },
            'UpdatedQuantityAvailableForSharing event should be emitted with dealer, itemID and quantity as parameters'
        );

        // check if quantity was removed from stock and added to availableForSharing
        inventory = await instance.getInventoryItem(dealer1, itemID);
        const stock2 = inventory[1];
        const availableForSharing2 = inventory[2];
        assert.equal(
            parseInt(stock) - quantity,
            stock2,
            'item stock should have been decremented by quantity'
        );
        assert.equal(
            parseInt(availableForSharing) + quantity,
            availableForSharing2,
            'item stock should have been decremented by quantity'
        );
    });   

    // check restock from dealer function
    it('should restock item from dealer', async () => {
        const amount = 10;
        const priceToPay = (referencePrice - incentive) * amount
        // try to call restockFromManufacturer from a non-dealer account, should fail
        await truffleAssert.fails(
            instance.restockFromDealer(itemID, dealer1, amount, {
                from: admin1,
                value: priceToPay
            }),
            truffleAssert.ErrorType.REVERT,
            'caller is not a dealer',
            'should have failed, should only be callable by dealers'
        );

        // try to call restockFromDealer with the wrong price (not deducting the incentive), should fail
        await truffleAssert.fails(
            instance.restockFromDealer(itemID, dealer1, amount, {
                from: dealer2,
                value: priceToPay - 100000
            }),
            truffleAssert.ErrorType.REVERT,
            'sent value does not match price',
            'should have failed, should only run if msg.value = price to pay'
        );

        // try to call restockFromDealer with an amount too big, should fail
        await truffleAssert.fails(
            instance.restockFromDealer(itemID, dealer1, amount+100000, {
                from: dealer2,
                value: priceToPay
            }),
            truffleAssert.ErrorType.REVERT,
            'not enough items available for sharing',
            'should have failed, should only run if amount <= availableForSharing'
        );
                
        // get dealer's current stock
        inventory = await instance.getInventoryItem(dealer2, itemID);
        const stock = inventory[1];

        const result = await instance.restockFromDealer(itemID, dealer1, amount, {
            from: dealer2,
            value: priceToPay
        });
        // check if event was emitted correctly
        await truffleAssert.eventEmitted(
            result,
            'RestockedFromDealer',
            params => {
            return (
                params.dealer === dealer2 &&
                params.itemID === itemID &&
                params.sellerDealer === dealer1 &&
                params.amount.toString() === amount.toString()
            );
            },
            'RestockedFromDealer event should be emitted with dealer, itemID, sellerDealer and amount as parameters'
        );

        // check if amount was added to stock
        inventory = await instance.getInventoryItem(dealer2, itemID);
        const stock2 = inventory[1];
        assert.equal(
            parseInt(stock) + amount,
            stock2,
            'item stock should have been incremented by amount'
        );
    });

    // check withdrawDealerBalance function
    it('should withdraw dealer balance', async () => {
        // try to call withdrawDealerBalance from a non-dealer account, should fail
        await truffleAssert.fails(
            instance.withdrawDealerBalance({from: admin1}),
            truffleAssert.ErrorType.REVERT,
            'caller is not a dealer',
            'should have failed, should only be callable by dealers'
            );
                
        // get dealer's current balance
        const balance =  await instance.getDealerBalance({from: dealer1});

        const result = await instance.withdrawDealerBalance({from: dealer1});
        // check if event was emitted correctly
        await truffleAssert.eventEmitted(
            result,
            'DealerBalanceWithdrawed',
            params => {
            return (
                params.dealer == dealer1 &&
                params.amount.toString() == balance.toString()
            );
            },
            'DealerBalanceWithdrawed event should be emitted with dealer and amount as parameters'
        );

        // check if balance is null
        const balance2 =  await instance.getDealerBalance({from: dealer1});
        assert.equal(
            0,
            balance2,
            'balance should be 0'
        );
       

        // try to call withdrawDealerBalance with no balance, should fail
        await truffleAssert.fails(
            instance.withdrawDealerBalance({from: dealer1}),
            truffleAssert.ErrorType.REVERT,
            'no balance',
            'should have failed, should only run if balance > 0'
        );
    });

    // check removeCatalogueItem function
    it('should remove a catalogue item', async () => {
        let name2 = 'Test Item 2';
        description = 'description test';
        referencePrice = web3.utils.toWei('0.12', 'ether');
        incentive = web3.utils.toWei('0.01', 'ether');
        sender = admin1;
        // add a second catalogue item
        let result1 = await instance.addCatalogueItem(name2, description, referencePrice, incentive, {
        from: sender
        });
        itemID2 = result1.logs[0].args.itemID;

        // try to add catalogue item from a non-admin account, should fail
        await truffleAssert.fails(
        instance.removeCatalogueItem(itemID2, {
            from: dealer1
        }),
        truffleAssert.ErrorType.REVERT,
        'caller is not an admin',
        'should have failed, should only be callable by admins'
        );

        // retreive ID of first item from result
        let result = await instance.removeCatalogueItem(itemID2, {
        from: sender
        });
        itemID = result.logs[0].args.itemID;

        // calculated ID should match emitted ID in AddedCatalogueItem event
        await truffleAssert.eventEmitted(
        result,
        'RemovedCatalogueItem',
        params => {
            return (
            params.admin == sender && params.itemID == itemID2
            );
        },
        'RemovedCatalogueItem event should be emitted with admin1 and itemID as parameters'
        );

        item = await instance.getCatalogueItem(itemID2);
        assert.equal(false, item[4], 'active should be set to false');
    });
})
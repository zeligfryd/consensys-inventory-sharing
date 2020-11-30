App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    return App.initWeb3();
  },

  initWeb3: async function() {
    if(typeof web3 != "undefined"){
      App.web3Provider = web3.currentProvider
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545')
    }
    web3 = new Web3(App.web3Provider)
    // This is required to allow the browser to access the Metamask accounts
    window.web3.currentProvider.enable()

    return App.initContract();
  },

  initContract: function() {
    $.when(
      $.getJSON('InventorySharing.json', function(data){
        var InventorySharingArtifact = data
        App.contracts.InventorySharing = TruffleContract(InventorySharingArtifact)
        App.contracts.InventorySharing.setProvider(App.web3Provider)
      })
    ).then(function() {
      App.bindEvents();
      return App.isAdmin();
    });
  },

  ////////////////////////
  // Check roles
  ////////////////////////

  isAdmin: async function() {
    var InventorySharingInstance;
    await web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      $('#currentAddress').text(account);

      App.contracts.InventorySharing.deployed().then(function(instance) {
        InventorySharingInstance = instance;
        return InventorySharingInstance.isAdmin(account);
      }).then(function(flag) {
        console.log('isAdmin -> ', flag);
        if (flag) {
          return App.adminView();
        } else {
          return App.isDealer();
        }
      });
    });
  },
  isDealer: function() {
    var InventorySharingInstance;
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];

      App.contracts.InventorySharing.deployed().then(function(instance) {
        InventorySharingInstance = instance;
        return InventorySharingInstance.isDealer(account);
      }).then(function(flag) {
        console.log('isDealer -> ', flag);
        if (flag) {
          return App.dealerView(); 
        } else {
          return App.defaultView();
        }
      });
    });
  },

  ////////////////////////
  // Views
  ////////////////////////

  defaultView: function() {
    $('#defaultView').attr('style', '');
    $('#adminView').attr('style', 'display: none;');
    $('#dealerView').attr('style', 'display: none;');

    // TODO later - Add default view
    // Ideas:
    // - add a marketplace part, for regular users to visit dealers' inventories and shop
    // - add a form for a user to request to be an approved dealer?
  },

  dealerView: function() {
    document.getElementById("pageTitle").innerHTML = "Dealer View"
    $('#dealerView').attr('style', ''); 
    $('#adminView').attr('style', 'display: none;');
    $('#defaultView').attr('style', 'display: none;');

    App.getDealerBalance();
    App.withdrawDealerBalance();
    App.dealerInventoryListView();
    App.catalogueItemsListViewDealer();
  },

  adminView: function() {
    document.getElementById("pageTitle").innerHTML = "Admin View"
    $('#adminView').attr('style', '');
    $('#dealerView').attr('style', 'display: none;'); 
    $('#defaultView').attr('style', 'display: none;');

    App.addAdmin();
    App.removeAdmin();
    App.addDealer();
    App.removeDealer(); 
    App.addCatalogueItem();
    App.catalogueItemsListView();
    App.changeReferencePriceAndIncentive();
  },

    
  bindEvents: function() {
    $(document).on('click', '#removeCatalogueItem', App.removeCatalogueItem);
    $(document).on('click', '#reactivateCatalogueItem', App.reactivateCatalogueItem);
  },

  ////////////////////////
  // Admin functions
  ////////////////////////

  addAdmin: function() {
    let addr;
    var InventorySharingInstance;

    $('#addAdmin').submit(function( event ) {
      addr = $("input#adminAddrAdd").val();
      console.log(addr);
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }

        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          console.log(addr)
          return InventorySharingInstance.addAdmin(addr, {from: account});
        });
      });
      event.preventDefault();
    });
  },

  removeAdmin: function() {
    var addr;
    var InventorySharingInstance;

    $('#removeAdmin').submit(function( event ) {
      addr = $( "input#adminAddrRem" ).val();
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.removeAdmin(addr, {from: account});
        });
      });
      event.preventDefault();
    });
  },

  addDealer: function() {
    let addr;
    var InventorySharingInstance;

    $('#addDealer').submit(function( event ) {
      addr = $("input#dealerAddrAdd").val();
      console.log(addr);
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }

        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          console.log(addr)
          return InventorySharingInstance.addDealer(addr, {from: account});
        });
      });
      event.preventDefault();
    });
  },

  removeDealer: function() {
    var addr;
    var InventorySharingInstance;

    $('#removeDealer').submit(function( event ) {
      addr = $( "input#dealerAddrRem" ).val();
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.removeDealer(addr, {from: account});
        });
      });
      event.preventDefault();
    });
  },

  addCatalogueItem: function() {
    var InventorySharingInstance;

    $('#addCatalogueItem').submit(function( event ) {
      let name = $("input#itemName").val();
      let desc = $("input#itemDesc").val();
      let price = $("input#itemReferencePrice").val();
      let incentive = $("input#itemIncentive").val();

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.addCatalogueItem(
            name,
            desc,
            web3.toWei(Number(price)),
            web3.toWei(Number(incentive)), {from: account});
        });
      });
      event.preventDefault();
    });
  },

  removeCatalogueItem: function(event) {
    event.preventDefault();

    var InventorySharingInstance;

    let catalogueItemID = $(event.target).data('id');
    console.log('catalogueItemID:');
    console.log(catalogueItemID);
    
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.InventorySharing.deployed().then(function(instance) {
        InventorySharingInstance = instance;
        return InventorySharingInstance.removeCatalogueItem(catalogueItemID, {from: account});
      });
    });  
  },

  reactivateCatalogueItem: function(event) {
    event.preventDefault();

    var InventorySharingInstance;

    let catalogueItemID = $(event.target).data('id');
    console.log('catalogueItemID:');
    console.log(catalogueItemID);
    
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.InventorySharing.deployed().then(function(instance) {
        InventorySharingInstance = instance;
        return InventorySharingInstance.reactivateCatalogueItem(catalogueItemID, {from: account});
      });
    });
  },

  catalogueItemsListView: async function(e) {
    var catalogueItemsDiv = $('#catalogueItems');
    var catalogueItemsTemplate = $('#catalogueItemsTemplate'); 
    var changePriceForm = $('#changePrice');

    let InventorySharingInstance = await App.contracts.InventorySharing.deployed();
    let catalogueItemsIDs = await InventorySharingInstance.getCatalogueItemsIDs();
    let i;
    for(i=0; i<catalogueItemsIDs.length; i++) {
      let catalogueItem = await InventorySharingInstance.getCatalogueItem(catalogueItemsIDs[i]);

      catalogueItemsTemplate.find('#removeCatalogueItem').attr('data-id', catalogueItemsIDs[i]);
      catalogueItemsTemplate.find('#reactivateCatalogueItem').attr('data-id', catalogueItemsIDs[i]);
      catalogueItemsTemplate.find('#changeReferencePriceAndIncentive').attr('data-id', catalogueItemsIDs[i]);

      catalogueItemsTemplate.find('#catalogueItemName').text(catalogueItem[0]);
      catalogueItemsTemplate.find('#catalogueItemDescription').text(catalogueItem[1]);
      catalogueItemsTemplate.find('#catalogueItemReferencePrice').text(web3.fromWei(catalogueItem[2]));
      catalogueItemsTemplate.find('#catalogueItemIncentive').text(web3.fromWei(catalogueItem[3]));
      catalogueItemsTemplate.find('#catalogueItemActive').text(catalogueItem[4]);

      if (catalogueItem[4]){
        catalogueItemsTemplate.find('#reactivateCatalogueItem').attr('style', 'display:none');
        catalogueItemsTemplate.find('#removeCatalogueItem').attr('style', 'display:true');

        changePriceForm.attr('style', '');
        changePriceForm.find('#itemID').attr("value", catalogueItemsIDs[i]);

      } else {
        catalogueItemsTemplate.find('#reactivateCatalogueItem').attr('style', 'display:true');
        catalogueItemsTemplate.find('#removeCatalogueItem').attr('style', 'display:none');
      }
      
      catalogueItemsDiv.append(catalogueItemsTemplate.html());
    }
    App.changeReferencePriceAndIncentive();
  },

  changeReferencePriceAndIncentive: function() {
    var InventorySharingInstance;

    $('#changePrice').submit(function( event ) {
      let referencePrice = $(this).closest("form").find("input[name='price']").val();
      let incentive = $(this).closest("form").find("input[name='incentive']").val();
      let id = $(this).closest("form").find("input[name='id']").val();

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.changeReferencePriceAndIncentive(
            id,
            web3.toWei(referencePrice),
            web3.toWei(incentive), {from: account});
        });
      });
      event.preventDefault();
    });
  },

  ////////////////////////
  // Dealer functions
  ////////////////////////

  catalogueItemsListViewDealer: async function(e) {
    console.log('catalogueItemsListViewDealer')
    // Catalogue
    var catalogueItemsDiv = $('#catalogueItemsDealer');
    var catalogueItemsTemplate = $('#catalogueItemDealerTemplate'); 
    var restockFromManufacturerForm = $('#restockFromManufacturer');
    // Other dealers' items
    var otherDealersItemsDiv = $('#otherDealersItems');
    var otherDealersItemTemplate = $('#otherDealersItemTemplate'); 
    var restockFromDealerForm = $('#restockFromDealer');

    let accounts = web3.eth.accounts;
    let account = accounts[0];

    let InventorySharingInstance = await App.contracts.InventorySharing.deployed();

    var dealersAddresses = [];
    let dealersCount = await InventorySharingInstance.getDealersCount();
    dealersCount = Number(dealersCount);
    let k;
    for(k=0; k<dealersCount; k++) {
      let dealerAddress = await InventorySharingInstance.getDealerAddress(k);
      if (dealerAddress != account) {
        dealersAddresses.push(dealerAddress);
      }
    }

    let catalogueItemsIDs = await InventorySharingInstance.getCatalogueItemsIDs();
    let i;
    for(i=0; i<catalogueItemsIDs.length; i++) {
      let catalogueItemID = catalogueItemsIDs[i];
      let catalogueItem = await InventorySharingInstance.getCatalogueItem(catalogueItemID);

      catalogueItemsTemplate.find('#catalogueItemDealerName').text(catalogueItem[0]);
      catalogueItemsTemplate.find('#catalogueItemDealerDescription').text(catalogueItem[1]);
      catalogueItemsTemplate.find('#catalogueItemDealerReferencePrice').text(web3.fromWei(catalogueItem[2]));
      catalogueItemsTemplate.find('#catalogueItemDealerIncentive').text(web3.fromWei(catalogueItem[3]));
      catalogueItemsTemplate.find('#catalogueItemDealerActive').text(catalogueItem[4]);

      if (!catalogueItem[4]){
        catalogueItemsTemplate.find('#restockFromManufacturer').attr('style', 'display:none');
      } 
      else {
        restockFromManufacturerForm.attr('style', '');
        restockFromManufacturerForm.find('#itemID').attr("value", catalogueItemID);
        restockFromManufacturerForm.find('#referencePrice').attr("value", web3.fromWei(Number(catalogueItem[2])));
      }

      let j;
      for(j=0; j<dealersAddresses.length; j++) {
        let dealerAddress = dealersAddresses[j];
        let inventoryItem = await InventorySharingInstance.getInventoryItem(dealerAddress, catalogueItemID);
        // Only display if quantity for sharing is not 0
        if(inventoryItem[2] > 0) {

          let dealerAddressShortened = dealerAddress.substring(0, 10) + '...';
          otherDealersItemTemplate.find('#otherDealerAddress').text(dealerAddressShortened);
          otherDealersItemTemplate.find('#otherDealerItemQuantityAvailable').text(inventoryItem[2]);
          let discountedPrice = web3.fromWei(catalogueItem[2]) - web3.fromWei(catalogueItem[3]);
          // Rounding to 2 decimals --> not used since prices could be lower than 0.01
          // let discountedPrice = Math.round(((web3.fromWei(catalogueItem[2]) - web3.fromWei(catalogueItem[3])) + Number.EPSILON) * 100) / 100;
          otherDealersItemTemplate.find('#otherDealerItemDiscountedPrice').text(discountedPrice);
    
          restockFromDealerForm.attr('style', '');
          restockFromDealerForm.find('#restockFromDealerItemID').attr("value", catalogueItemID);
          restockFromDealerForm.find('#restockFromDealerReferencePrice').attr("value", web3.fromWei(catalogueItem[2]));
          restockFromDealerForm.find('#restockFromDealerIncentive').attr("value", web3.fromWei(catalogueItem[3]));
          
          restockFromDealerForm.attr('style', '');
          restockFromDealerForm.find('#itemID').attr("value", catalogueItemsIDs[i]);
          restockFromDealerForm.find('#referencePrice').attr("value", web3.fromWei(catalogueItem[2]));
          restockFromDealerForm.find('#incentive').attr("value", web3.fromWei(catalogueItem[3]));
          restockFromDealerForm.find('#dealerAddress').attr("value", dealerAddress);

          otherDealersItemsDiv.append(otherDealersItemTemplate.html());
        }
      }
      catalogueItemsDiv.append(catalogueItemsTemplate.html());
      otherDealersItemsDiv.html("");
    }
    App.restockItemFromManufacturer();
    App.restockItemFromDealer();
    // App.toggleRestockFromDealer();
  },


  restockItemFromManufacturer: function() {
    console.log('restockItemFromManufacturer')
    var InventorySharingInstance;

    $('#restockFromManufacturer').submit(function( event ) {
      let qty = $(this).closest("form").find("input[name='qty']").val();
      let id = $(this).closest("form").find("input[name='id']").val();
      let price = $(this).closest("form").find("input[name='price']").val();

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.restockFromManufacturer(
            id,
            qty, {from: account, value: web3.toWei(qty*price)});
        });
      });
      event.preventDefault();
    });
  },

  // toggleRestockFromDealer: function() {
  //   $('#toggleRestockFromDealer').submit(function( event ) {
  //     var restockList = $("#otherDealersItems");
  //     if (restockList.style.display === "none") {
  //       restockList.style.display = "block";
  //     } else {
  //       x.style.display = "none";
  //     }
  //     // event.preventDefault();
  //   });
  // },

  restockItemFromDealer: function() {
    console.log('restockItemFromDealer')
    var InventorySharingInstance;

    $('#restockFromDealer').submit(function( event ) {
      let qty = $(this).closest("form").find("input[name='qty']").val();
      let id = $(this).closest("form").find("input[name='id']").val();
      let price = $(this).closest("form").find("input[name='price']").val();
      let incentive = $(this).closest("form").find("input[name='incentive']").val();
      let dealer = $(this).closest("form").find("input[name='dealer']").val();
      console.log(incentive);
      let priceToPay = qty*(price-incentive);
      console.log(priceToPay);
      // Rounding to 10 decimals
      priceToPay = Math.round((priceToPay + Number.EPSILON) * 10000000000) / 10000000000;
      console.log(priceToPay);

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          console.log('TRYING NOW');
          console.log(id, ' ', dealer, ' ', qty, ' ', web3.toWei(priceToPay));
          return InventorySharingInstance.restockFromDealer(
            id,
            dealer,
            qty, {from: account, value: web3.toWei(priceToPay)});
        });
      });
      event.preventDefault();
    });
  },


  getDealerBalance: async function() {
    let InventorySharingInstance = await App.contracts.InventorySharing.deployed();

    web3.eth.getAccounts(async function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      let balance = await InventorySharingInstance.getDealerBalance({from: account});
      $('#dealerBalance').text(web3.fromWei(balance));

      if(web3.fromWei(balance) > 0){
        $('#withdrawBalance').attr('style', '');
      }

    });
  },

  withdrawDealerBalance: function() {
    var InventorySharingInstance;

    $('#withdrawBalance').click(function(event) {

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }

        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.withdrawDealerBalance({from: account});
        });
      });
      event.preventDefault();
    });
  },
  
  dealerInventoryListView: async function() {
    console.log('dealerInventoryListView');
    var inventoryItemsDiv = $('#inventoryItems');
    var inventoryItemsTemplate = $('#inventoryItemTemplate'); 
    var updateWithQuatitySoldForm = $('#updateWithQuatitySold');
    var updateSharingForm = $('#updateSharing');

    let accounts = web3.eth.accounts;
    let account = accounts[0];
    let InventorySharingInstance = await App.contracts.InventorySharing.deployed();
    let catalogueItemsIDs = await InventorySharingInstance.getCatalogueItemsIDs();
    console.log(catalogueItemsIDs)
    let i;
    for(i=0; i<catalogueItemsIDs.length; i++) {
      let catalogueItem = await InventorySharingInstance.getCatalogueItem(catalogueItemsIDs[i]);
      let inventoryItem = await InventorySharingInstance.getInventoryItem(account, catalogueItemsIDs[i]);
      // Only display if stock or quantity for sharing is not 0
      if(inventoryItem[1] > 0 || inventoryItem[2] > 0) {
        inventoryItemsTemplate.find('#inventoryItemName').text(catalogueItem[0]);
        inventoryItemsTemplate.find('#inventoryItemDescription').text(catalogueItem[1]);
        inventoryItemsTemplate.find('#inventoryItemReferencePrice').text(web3.fromWei(catalogueItem[2]));
        inventoryItemsTemplate.find('#inventoryItemIncentive').text(web3.fromWei(catalogueItem[3]));
        inventoryItemsTemplate.find('#inventoryItemActive').text(catalogueItem[4]);
  
        inventoryItemsTemplate.find('#inventoryItemStock').text(inventoryItem[1]);
        inventoryItemsTemplate.find('#inventoryItemSharing').text(inventoryItem[2]);
  
        updateWithQuatitySoldForm.attr('style', '');
        updateWithQuatitySoldForm.find('#itemID').attr("value", catalogueItemsIDs[i]);
  
        updateSharingForm.attr('style', '');
        updateSharingForm.find('#itemID').attr("value", catalogueItemsIDs[i]);
        
        inventoryItemsDiv.append(inventoryItemsTemplate.html());
      }
    }
    App.updateWithQuantitySold();
    App.updateQuantityAvailableForSharing();
  },

  updateWithQuantitySold: function() {
    var InventorySharingInstance;

    $('#updateWithQuatitySold').submit(function( event ) {
      let qty = $(this).closest("form").find("input[name='qty']").val();
      let id = $(this).closest("form").find("input[name='id']").val();

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.updateInventoryWithSoldQuantity(
            id,
            qty, {from: account});
        });
      });
      event.preventDefault();
    });
  },

  updateQuantityAvailableForSharing: function() {
    var InventorySharingInstance;

    $('#updateSharing').submit(function( event ) {
      let qty = $(this).closest("form").find("input[name='qty']").val();
      let id = $(this).closest("form").find("input[name='id']").val();
      console.log('update sharing ', qty, ' ', id);

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        App.contracts.InventorySharing.deployed().then(function(instance) {
          InventorySharingInstance = instance;
          return InventorySharingInstance.updateQuantityAvailableForSharing(
            id,
            qty, {from: account});
        });
      });
      event.preventDefault();
    });
  },
};

$(function() {
  $(window).load(function() {
    App.init();

  });
});

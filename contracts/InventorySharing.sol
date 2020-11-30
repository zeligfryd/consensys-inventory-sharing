pragma solidity 0.5.16;

/// @title SafeMath
/// @dev Math operations with safety checks that throw on error
library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a * b;
        assert(a == 0 || c / a == b);
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a / b;
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}

/// @title InventorySharing
/// @author Lucas Fryd
contract InventorySharing {
    using SafeMath for uint256;

    address public owner;
    mapping(address => bool) public admins;
    mapping(address => bool) public dealers;
    // dealers can be retreived via an array of addresses
    address[] private dealersAddresses;

    struct Inventory {
        bytes32 inventoryID;
        // stock quantities are stored inside a mapping, mapped from the bytes32 itemId to the uint256 quantity
        mapping(bytes32 => uint256) stocks;
        // quantities available for sharing are stored inside a mapping, mapped from the bytes32 itemId to the uint256 quantity
        mapping(bytes32 => uint256) availableForSharing;
    }

    struct CatalogueItem {
        bytes32 itemID;
        string name;
        string description;
        uint256 referencePrice;
        uint256 incentive;
        bool active;
    }

    // catalogue items are stored inside a mapping, mapped from the bytes32 itemId to the Item
    struct Catalogue {
        bytes32[] itemIDs;
        mapping(bytes32 => CatalogueItem) items;
    }
    Catalogue catalogue;

    // inventories are stored inside a mapping, mapped from a dealer's address to an Inventory
    mapping(address => Inventory) public inventories;

    // balances of dealers
    mapping(address => uint256) public balances;

    // events
    event AddedAdmin(address indexed admin);
    event RemovedAdmin(address indexed admin);
    event AddedDealer(address indexed dealer, address indexed admin);
    event RemovedDealer(address indexed dealer, address indexed admin);

    event AddedCatalogueItem(address indexed admin, bytes32 indexed itemID);
    event RemovedCatalogueItem(address indexed admin, bytes32 indexed itemID);
    event ReactivatedCatalogueItem(
        address indexed admin,
        bytes32 indexed itemID
    );

    event RestockedFromManufacturer(
        address indexed dealer,
        bytes32 indexed itemID,
        uint256 amount
    );

    event RestockedFromDealer(
        address indexed dealer,
        bytes32 indexed itemID,
        address indexed sellerDealer,
        uint256 amount
    );

    event UpdatedInventoryWithSoldQuantity(
        address indexed dealer,
        bytes32 indexed itemID,
        uint256 quantitySold
    );

    event UpdatedQuantityAvailableForSharing(
        address indexed dealer,
        bytes32 indexed itemID,
        uint256 quantity
    );

    event ReferencePriceAndIncentiveChanged(
        address indexed admin,
        bytes32 indexed itemID,
        uint256 newReferencePrice,
        uint256 newIncentive
    );

    event DealerBalanceWithdrawed(address indexed dealer, uint256 amount);

    // emergency switch
    bool emergencySwitch;

    /// @dev modifier, verifies that caller is the owner
    modifier onlyOwner() {
        require(owner == msg.sender, "caller is not the owner");
        _;
    }

    /// @dev modifier, verifies that caller is an admin
    modifier onlyAdmin() {
        require(admins[msg.sender], "caller is not an admin");
        _;
    }

    /// @dev modifier, verifies that caller is a dealer
    modifier onlyDealer() {
        require(dealers[msg.sender], "caller is not a dealer");
        _;
    }

    modifier stopInEmergency() {
        require(!emergencySwitch, "emergency switch is active");
        _;
    }

    /// @dev constructor
    constructor() public {
        owner = msg.sender;
        admins[msg.sender] = true;
        emergencySwitch = false;
    }

    /// @dev Returns the number of dealers
    /// @return The number of dealers
    function getDealersCount() public view returns (uint256) {
        return dealersAddresses.length;
    }

    /// @dev Returns a dealer's address
    /// @param _index an value
    /// @return The dealer's address
    function getDealerAddress(uint256 _index) public view returns (address) {
        return dealersAddresses[_index];
    }

    /// @notice add administrator
    /// @dev only callable by an admin
    /// @param _newAdmin address of account to be added as administrator
    function addAdmin(address _newAdmin) external onlyAdmin stopInEmergency {
        // only emit event if admin is not added yet
        if (!admins[_newAdmin]) {
            emit AddedAdmin(_newAdmin);
        }
        admins[_newAdmin] = true;
    }

    /// @notice remove administrator
    /// @dev only callable by an admin
    /// @param _admin address of account to be removed as administrator
    function removeAdmin(address _admin) external onlyAdmin stopInEmergency {
        // only emit event if admin is not removed yet
        if (admins[_admin]) {
            emit RemovedAdmin(_admin);
        }
        admins[_admin] = false;
    }

    /// @notice check if an address is an administrator
    /// @param _admin address to check
    function isAdmin(address _admin) public view returns (bool) {
        return admins[_admin];
    }

    /// @notice add dealer
    /// @dev only callable by admins
    /// @param _newDealer address of account to be added as dealer
    function addDealer(address _newDealer) external onlyAdmin stopInEmergency {
        // only emit event if shopowner is not added yet
        if (!dealers[_newDealer]) {
            emit AddedDealer(_newDealer, msg.sender);
        }
        dealers[_newDealer] = true;
        dealersAddresses.push(_newDealer);
    }

    /// @notice remove dealer
    /// @dev only callable by admins
    /// @param _dealer address of account to be removed as dealer
    function removeDealer(address _dealer) external onlyAdmin stopInEmergency {
        // only emit event if dealer is not removed yet
        if (dealers[_dealer]) {
            emit RemovedDealer(_dealer, msg.sender);
        }
        dealers[_dealer] = false;
    }

    /// @notice check if an address is a dealer
    /// @param _dealer address to check
    function isDealer(address _dealer) public view returns (bool) {
        return dealers[_dealer];
    }

    /// @notice add an item to the catalogue
    /// @dev only callable by admins, throws on duplicate item ID per inventory
    /// @param _name name of item
    /// @param _description description of item
    /// @param _referencePrice price of item
    /// @return itemID generated bytes32 ID of item
    function addCatalogueItem(
        string memory _name,
        string memory _description,
        uint256 _referencePrice,
        uint256 incentive
    ) public onlyAdmin stopInEmergency returns (bytes32 itemID) {
        // generate pseudorandom ID out of name, msg.sender and timestamp
        itemID = keccak256(abi.encodePacked(_name, msg.sender, block.number));

        // ensure that there is no active item with same ID
        assert(!catalogue.items[itemID].active);

        // generate new item in items mapping
        catalogue.items[itemID] = CatalogueItem({
            itemID: itemID,
            name: _name,
            description: _description,
            referencePrice: _referencePrice,
            incentive: incentive,
            active: true
        });
        // Add the itemID to itemIDs array
        catalogue.itemIDs.push(itemID);

        emit AddedCatalogueItem(msg.sender, itemID);
    }

    /// @notice removes an existing item from the catalogue
    /// @dev only callable by admins, requires item to be active
    /// @param _itemID ID of item to be removed
    /// @return true on success, false on failure
    function removeCatalogueItem(bytes32 _itemID)
        public
        onlyAdmin
        stopInEmergency
        returns (bool)
    {
        // storage pointer to item
        CatalogueItem storage item = catalogue.items[_itemID];

        // item has to be active in order to be removed
        require(item.active, "item not active");

        item.active = false;

        emit RemovedCatalogueItem(msg.sender, _itemID);
        return true;
    }

    /// @notice removes an existing item from the catalogue
    /// @dev only callable by admins, requires item to be active
    /// @param _itemID ID of item to be removed
    /// @return true on success, false on failure
    function reactivateCatalogueItem(bytes32 _itemID)
        public
        onlyAdmin
        stopInEmergency
        returns (bool)
    {
        // storage pointer to item
        CatalogueItem storage item = catalogue.items[_itemID];

        // item has to be inactive in order to be reactivated
        require(!item.active, "item already active");

        item.active = true;

        emit ReactivatedCatalogueItem(msg.sender, _itemID);
        return true;
    }

    /// @notice changes reference price and incentive of an item
    /// @param _itemID ID of item
    /// @param _referencePrice new reference price
    /// @param _incentive new incentive
    /// @return true on success, false on failure
    function changeReferencePriceAndIncentive(
        bytes32 _itemID,
        uint256 _referencePrice,
        uint256 _incentive
    ) public onlyAdmin stopInEmergency returns (bool) {
        // storage pointer to item
        CatalogueItem storage item = catalogue.items[_itemID];
        // ensure that item is still active
        require(item.active, "item is not active");
        item.referencePrice = _referencePrice;
        item.incentive = _incentive;
        emit ReferencePriceAndIncentiveChanged(
            msg.sender,
            _itemID,
            _referencePrice,
            _incentive
        );
        return true;
    }

    /// @notice restocks quantity of an item from the manufacturer
    /// @param _itemID ID of item
    /// @param _amount amount to restock
    /// @return true on success, false on failure
    function restockFromManufacturer(bytes32 _itemID, uint256 _amount)
        public
        payable
        onlyDealer
        stopInEmergency
        returns (bool)
    {
        // storage pointer to the dealer's inventory
        Inventory storage inventory = inventories[msg.sender];
        // ensure that the catalogue item is still active
        require(catalogue.items[_itemID].active, "item is not active");
        // check if provided value matches price
        uint256 priceToPay = catalogue.items[_itemID].referencePrice.mul(
            _amount
        );
        require(msg.value == priceToPay, "sent value does not match price");
        // Add restocked quantity
        inventory.stocks[_itemID] = inventory.stocks[_itemID].add(_amount);
        emit RestockedFromManufacturer(msg.sender, _itemID, _amount);
        return true;
    }

    /// @notice restocks quantity of an item from another dealer
    /// @param _itemID ID of item
    /// @param _dealer address of the dealer
    /// @param _amount amount to restock
    /// @return true on success, false on failure
    function restockFromDealer(
        bytes32 _itemID,
        address _dealer,
        uint256 _amount
    ) public payable onlyDealer stopInEmergency returns (bool) {
        // storage pointers to the dealers' inventories
        Inventory storage buyerInventory = inventories[msg.sender];
        Inventory storage sellerInventory = inventories[_dealer];
        // ensure that the seller has enough items available for inventory sharing
        require(
            sellerInventory.availableForSharing[_itemID] >= _amount,
            "not enough items available for sharing"
        );
        // check if provided value matches price (minus the incentive set by the manufacturer)
        uint256 priceMinusIncentive = catalogue.items[_itemID]
            .referencePrice
            .sub(catalogue.items[_itemID].incentive);
        uint256 priceToPay = priceMinusIncentive.mul(_amount);
        require(msg.value == priceToPay, "sent value does not match price");
        // Add restocked quantity to the buyer's inventory
        buyerInventory.stocks[_itemID] = buyerInventory.stocks[_itemID].add(
            _amount
        );
        // Remove restocked quantity from the seller's inventory
        sellerInventory.availableForSharing[_itemID] = sellerInventory
            .availableForSharing[_itemID]
            .sub(_amount);
        // Credit seller, including incentive bonus
        uint256 bonus = catalogue.items[_itemID].incentive.mul(2).mul(_amount);
        uint256 topUp = bonus.add(msg.value);
        balances[_dealer] = balances[_dealer].add(topUp);
        emit RestockedFromDealer(msg.sender, _itemID, _dealer, _amount);
        return true;
    }

    /// @notice update a dealer's inventory quantity of an item to reflect sales (only decrease)
    /// @param _itemID ID of item
    /// @param _quantity quantity sold
    /// @return true on success, false on failure
    function updateInventoryWithSoldQuantity(bytes32 _itemID, uint256 _quantity)
        public
        onlyDealer
        stopInEmergency
        returns (bool)
    {
        // storage pointer to the dealer's inventory
        Inventory storage inventory = inventories[msg.sender];
        // check if the quantity sold is not higher than the stock
        require(
            inventory.stocks[_itemID] >= _quantity,
            "not enough items in stock"
        );

        // Remove sold quantity from stock
        inventory.stocks[_itemID] = inventory.stocks[_itemID].sub(_quantity);
        emit UpdatedInventoryWithSoldQuantity(msg.sender, _itemID, _quantity);
        return true;
    }

    /// @notice increases a dealer's quantity of an item available for share (decrease or increase)
    /// @param _itemID ID of item
    /// @param _quantity quantity to add or remove
    /// @return true on success, false on failure
    function updateQuantityAvailableForSharing(
        bytes32 _itemID,
        uint256 _quantity
    ) public onlyDealer stopInEmergency returns (bool) {
        // storage pointer to the dealer's inventory
        Inventory storage inventory = inventories[msg.sender];
        // check if the quantity put for sharing is not higher than the stock + quantity already shared
        uint256 totalQuantity = inventory.stocks[_itemID].add(
            inventory.availableForSharing[_itemID]
        );
        require(totalQuantity >= _quantity, "not enough items in stock");
        // Update stock
        inventory.stocks[_itemID] = totalQuantity.sub(_quantity);
        // Update availableForSharing
        inventory.availableForSharing[_itemID] = _quantity;
        emit UpdatedQuantityAvailableForSharing(msg.sender, _itemID, _quantity);
        return true;
    }

    /// @notice return dealer's balance
    /// @return balance
    function getDealerBalance()
        public
        view
        onlyDealer
        returns (uint256 balance)
    {
        balance = balances[msg.sender];
    }

    /// @notice allows withdrawal of a dealer's balance including incentive bonus
    /// @return true on success, false on failure
    function withdrawDealerBalance() public onlyDealer returns (bool) {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "no balance");
        balances[msg.sender] = 0;
        msg.sender.transfer(balance);
        emit DealerBalanceWithdrawed(msg.sender, balance);
        return true;
    }

    /// @notice turns the emergency switch, only callable by owner
    function turnEmergencySwitch() public onlyOwner {
        emergencySwitch = !emergencySwitch;
    }

    /// @notice return a dealer's inventory
    /// @param _dealer address of dealer
    /// @return inventoryID ID of the inventory
    function getInventoryItem(address _dealer, bytes32 _itemID)
        public
        view
        returns (
            bytes32 inventoryID,
            uint256 stocks,
            uint256 availableForSharing
        )
    {
        Inventory storage inventory = inventories[_dealer];
        inventoryID = inventory.inventoryID;
        stocks = inventory.stocks[_itemID];
        availableForSharing = inventory.availableForSharing[_itemID];
    }

    /// @notice return the number of catalogue items
    /// @return number of catalogue items uncluding inactive
    function getCatalogueItemsCount() public view returns (uint256) {
        return catalogue.itemIDs.length;
    }

    /// @notice return the IDs of catalogue items
    /// @return array of catalogue items IDs
    function getCatalogueItemsIDs() public view returns (bytes32[] memory) {
        return catalogue.itemIDs;
    }

    /// @notice return item of the catalogue
    /// @param _itemID id of an item
    /// @return name of item
    /// @return description of item
    /// @return referencePrice of item
    /// @return incentive incentive bonus set by the manufacturer
    /// @return active bool flag whether item is active
    function getCatalogueItem(bytes32 _itemID)
        public
        view
        returns (
            string memory name,
            string memory description,
            uint256 referencePrice,
            uint256 incentive,
            bool active
        )
    {
        CatalogueItem memory item = catalogue.items[_itemID];
        name = item.name;
        description = item.description;
        referencePrice = item.referencePrice;
        incentive = item.incentive;
        active = item.active;
    }
}

// Import necessary modules and crates
use near_sdk::{
    env, near_bindgen, AccountId, BorshDeserialize, BorshSerialize, PanicOnDefault, Promise,
    json_types::U128, PromiseOrValue,
};
use near_sdk::collections::{LazyOption, LookupMap};
use near_sdk::serde::{Deserialize, Serialize};

use near_contract_standards::fungible_token::{
    core::FungibleTokenCore, 
    metadata::{FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC}, 
    receiver::FungibleTokenReceiver, 
    FungibleToken,
};
use near_contract_standards::storage_management::{
    StorageManagement, 
    StorageBalance, 
    StorageBalanceBounds,
};

/// The main contract structure
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    /// Map of IOU receipts with IOU id as the key
    iou_receipts: LookupMap<String, IOUReceipt>,
    /// Tracks the next IOU id
    next_iou_id: u64,
    /// The fungible token instance for LP tokens
    token: FungibleToken,
    /// Metadata for the fungible token
    metadata: LazyOption<FungibleTokenMetadata>,
}

/// IOUReceipt represents a deposit or withdrawal IOU
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct IOUReceipt {
    /// Unique identifier for the IOU
    iou_id: String,
    /// Amount involved in the IOU
    amount: U128,
    /// Recipient of the IOU
    recipient: AccountId,
    /// Indicates if the IOU has been fulfilled
    fulfilled: bool,
    /// Type of IOU: Deposit or Withdraw
    iou_type: IOUType,
}

/// Enum representing the type of IOU
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub enum IOUType {
    Deposit,
    Withdraw,
}

#[near_bindgen]
impl Contract {
    /// Initializes the contract with default values
    #[init]
    pub fn new(owner_id: AccountId, total_supply: U128) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        let metadata = FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "LP Token".to_string(),
            symbol: "LPT".to_string(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 24, // NEAR has 24 decimals
        };
        let mut this = Self {
            iou_receipts: LookupMap::new(b"i".to_vec()),
            next_iou_id: 0,
            token: FungibleToken::new(b"t".to_vec()),
            metadata: LazyOption::new(b"m".to_vec(), Some(&metadata)),
        };
        // Mint initial supply to the owner
        this.token.internal_register_account(&owner_id);
        this.token.internal_deposit(&owner_id, total_supply.0);
        this
    }

    /// Users can deposit NEAR to create a deposit IOU
    #[payable]
    pub fn deposit(&mut self) {
        let amount = env::attached_deposit();
        assert!(amount > 0, "Deposit amount must be greater than zero");
        let sender = env::predecessor_account_id();
        let iou_id = self.generate_iou_id();
        let iou_receipt = IOUReceipt {
            iou_id: iou_id.clone(),
            amount: U128(amount),
            recipient: sender.clone(),
            fulfilled: false,
            iou_type: IOUType::Deposit,
        };
        self.iou_receipts.insert(&iou_id, &iou_receipt);
        env::log_str(&format!("Deposit IOU created: {:?}", iou_receipt));
    }

    /// Users can redeem LP tokens to create a withdrawal IOU
    pub fn redeem(&mut self, amount: U128) {
        let sender = env::predecessor_account_id();
        // Use the fungible token transfer to transfer tokens back to the contract
        self.token.internal_withdraw(&sender, amount.0);
        // Create Withdrawal IOU receipt
        let iou_id = self.generate_iou_id();
        let iou_receipt = IOUReceipt {
            iou_id: iou_id.clone(),
            amount,
            recipient: sender.clone(),
            fulfilled: false,
            iou_type: IOUType::Withdraw,
        };
        self.iou_receipts.insert(&iou_id, &iou_receipt);
        env::log_str(&format!("Withdraw IOU created: {:?}", iou_receipt));
    }

    /// Returns all IOU receipts
    pub fn list_ious(&self) -> Vec<IOUReceipt> {
        self.iou_receipts.values_as_vector().to_vec()
    }

    /// Fulfills an IOU, marking it as fulfilled and executing the associated action
    pub fn fulfill_iou(&mut self, iou_id: String) {
        let mut iou_receipt = self.iou_receipts.get(&iou_id).expect("IOU not found");
        assert!(!iou_receipt.fulfilled, "IOU already fulfilled");

        iou_receipt.fulfilled = true;
        self.iou_receipts.insert(&iou_id, &iou_receipt);

        match iou_receipt.iou_type {
            IOUType::Deposit => {
                // Mint LP tokens to recipient
                self.token.internal_deposit(&iou_receipt.recipient, iou_receipt.amount.0);
                // Emit ft_mint event as per NEP-141
                near_sdk::env::log_str(
                    &serde_json::json!({
                        "standard": "nep141",
                        "version": "1.0.0",
                        "event": "ft_mint",
                        "data": [
                            {
                                "owner_id": iou_receipt.recipient,
                                "amount": iou_receipt.amount.0.to_string(),
                                "memo": "Minted LP tokens",
                            }
                        ]
                    })
                    .to_string(),
                );
            }
            IOUType::Withdraw => {
                // Transfer NEAR from contract balance to recipient
                Promise::new(iou_receipt.recipient.clone())
                    .transfer(iou_receipt.amount.0);
                env::log_str(&format!(
                    "Sent {} yoctoNEAR to {}",
                    iou_receipt.amount.0, iou_receipt.recipient
                ));
            }
        }
    }

    /// Internal method to generate a unique IOU id
    fn generate_iou_id(&mut self) -> String {
        let id = self.next_iou_id;
        self.next_iou_id += 1;
        id.to_string()
    }
}

// Implement NEP-141 methods
#[near_bindgen]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
    ) {
        self.token.ft_transfer(receiver_id, amount, memo);
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

// Implement the metadata provider
#[near_bindgen]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap()
    }
}

// Implement NEP-145 (Storage Management)
#[near_bindgen]
impl StorageManagement for Contract {
    #[payable]
    fn storage_deposit(
        &mut self, 
        account_id: Option<AccountId>, 
        registration_only: Option<bool>
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<U128>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    fn storage_minimum_balance(&self) -> U128 {
        self.token.storage_minimum_balance()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

/* The rest of this file contains tests for the code above */
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{testing_env, VMContext};

    /// Helper function to set up the testing environment
    fn get_context(
        predecessor_account_id: AccountId,
        attached_deposit: Balance,
    ) -> VMContext {
        VMContext {
            current_account_id: predecessor_account_id.clone(),
            signer_account_id: predecessor_account_id.clone(),
            signer_account_pk: vec![0, 1, 2],
            predecessor_account_id,
            input: vec![],
            block_index: 0,
            block_timestamp: 0,
            account_balance: 10u128.pow(24), // 1 NEAR
            account_locked_balance: 0,
            storage_usage: 0,
            attached_deposit,
            prepaid_gas: 10u64.pow(18),
            random_seed: vec![0, 1, 2],
            is_view: false,
            output_data_receivers: vec![],
            epoch_height: 19,
            view_config: None,
        }
    }

    #[test]
    fn test_new() {
        let context = get_context("alice.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let contract = Contract::new("alice.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        assert_eq!(contract.token.ft_balance_of("alice.testnet".parse().unwrap()), U128(1_000_000_000_000_000_000_000_000));
    }

    #[test]
    fn test_deposit() {
        let context = get_context("alice.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context);
        let mut contract = Contract::new("alice.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.deposit();
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        assert_eq!(iou.recipient, "alice.testnet".parse().unwrap());
        assert_eq!(iou.amount.0, 1_000_000_000_000_000_000_000_000);
        assert_eq!(iou.fulfilled, false);
        assert_eq!(iou.iou_type, IOUType::Deposit);
    }

    #[test]
    fn test_redeem() {
        let context = get_context("bob.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new("bob.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.token.internal_deposit(&"bob.testnet".parse().unwrap(), 1_000);
        contract.redeem(U128(500));
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        assert_eq!(iou.recipient, "bob.testnet".parse().unwrap());
        assert_eq!(iou.amount.0, 500);
        assert_eq!(iou.fulfilled, false);
        assert_eq!(iou.iou_type, IOUType::Withdraw);
    }

    #[test]
    fn test_fulfill_deposit_iou() {
        let context = get_context("alice.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = Contract::new("alice.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.deposit();
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id.clone();

        // Fulfill the IOU
        contract.fulfill_iou(iou_id.clone());
        let updated_iou = contract.iou_receipts.get(&iou_id).unwrap();
        assert!(updated_iou.fulfilled);

        // Check the LP token balance
        assert_eq!(contract.token.ft_balance_of("alice.testnet".parse().unwrap()), U128(1_000_000_000_000_000_000_000_000));
    }

    #[test]
    fn test_fulfill_withdraw_iou() {
        let context = get_context("bob.testnet".parse().unwrap(), 0);
        testing_env!(context.clone());
        let mut contract = Contract::new("bob.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.token.internal_deposit(&"bob.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000);
        contract.redeem(U128(500_000_000_000_000_000_000_000));
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id.clone();

        // Fulfill the IOU
        contract.fulfill_iou(iou_id.clone());
        let updated_iou = contract.iou_receipts.get(&iou_id).unwrap();
        assert!(updated_iou.fulfilled);
    }

    #[test]
    #[should_panic(expected = "IOU already fulfilled")]
    fn test_fulfill_already_fulfilled_iou() {
        let context = get_context("alice.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = Contract::new("alice.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.deposit();
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id.clone();

        // Fulfill the IOU
        contract.fulfill_iou(iou_id.clone());
        // Attempt to fulfill again
        contract.fulfill_iou(iou_id);
    }

    #[test]
    #[should_panic(expected = "Insufficient LP token balance")]
    fn test_redeem_insufficient_balance() {
        let context = get_context("bob.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new("bob.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.redeem(U128(500));
    }

    #[test]
    #[should_panic(expected = "Deposit amount must be greater than zero")]
    fn test_deposit_zero_amount() {
        let context = get_context("alice.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new("alice.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.deposit();
    }

    #[test]
    #[should_panic(expected = "IOU not found")]
    fn test_fulfill_nonexistent_iou() {
        let context = get_context("carol.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new("carol.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        contract.fulfill_iou("nonexistent_iou_id".to_string());
    }

    #[test]
    fn test_list_ious_empty() {
        let context = get_context("dave.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let contract = Contract::new("dave.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 0);
    }

    #[test]
    fn test_get_balance_zero() {
        let context = get_context("eve.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let contract = Contract::new("eve.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        let balance = contract.token.ft_balance_of("eve.testnet".parse().unwrap());
        assert_eq!(balance.0, 0);
    }

    #[test]
    fn test_get_balance_multiple_operations() {
        let context = get_context("frank.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = Contract::new("frank.testnet".parse().unwrap(), U128(1_000_000_000_000_000_000_000_000));
        // First deposit
        contract.deposit();
        contract.fulfill_iou("0".to_string());

        // Second deposit
        testing_env!(get_context("frank.testnet".parse().unwrap(), 2_000_000_000_000_000_000_000_000)); // 2 NEAR
        contract.deposit();
        contract.fulfill_iou("1".to_string());

        // Redeem some LP tokens
        contract.redeem(U128(1_500_000_000_000_000_000_000_000)); // Redeem 1.5 NEAR worth of LP tokens
        contract.fulfill_iou("2".to_string());

        // Check balance
        let balance = contract.token.ft_balance_of("frank.testnet".parse().unwrap());
        assert_eq!(balance.0, 1_500_000_000_000_000_000_000_000); // Remaining LP tokens
    }
}

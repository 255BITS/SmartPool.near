// Import necessary modules and crates
use near_sdk::{
    env, near_bindgen, AccountId, Promise, PanicOnDefault, BorshStorageKey,
    PromiseOrValue,
};
use near_sdk::collections::{UnorderedMap};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::json_types::U128;

use near_token::NearToken;
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore,
};
use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FT_METADATA_SPEC,
};
use near_contract_standards::storage_management::{StorageManagement, StorageBalance, StorageBalanceBounds};

type Balance = u128;

// Data structures for IOUs
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct IOUReceipt {
    pub iou_id: u64,
    pub amount: Balance,
    pub account_id: AccountId,
    pub iou_type: IOUType,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum IOUType {
    Deposit,
    Withdraw,
}

// Storage keys for collections
#[derive(BorshStorageKey, BorshSerialize)]
pub enum StorageKey {
    Token,
    IOUs,
}

// Main contract structure
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct PoolContract {
    token: FungibleToken,
    token_metadata: FungibleTokenMetadata,
    iou_receipts: UnorderedMap<u64, IOUReceipt>,
    next_iou_id: u64,
    authorized_account: AccountId,
    creator: AccountId,
}

#[near_bindgen]
impl PoolContract {
    #[init]
    pub fn new(name: String, symbol: String, authorized_account: AccountId, creator: AccountId) -> Self {
        assert!(!env::state_exists(), "Contract is already initialized");

        let metadata = FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: name.clone(),
            symbol: symbol.clone(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 24, // Same as NEAR
        };

        Self {
            token: FungibleToken::new(StorageKey::Token),
            token_metadata: metadata,
            iou_receipts: UnorderedMap::new(StorageKey::IOUs),
            next_iou_id: 0,
            authorized_account,
            creator
        }
    }

    pub fn get_near_balance(&self) -> u128 {
        env::account_balance().as_yoctonear()
    }

    pub fn get_creator(&self) -> AccountId {
        self.creator.clone()
    }

    pub fn transfer_to_owner(&mut self, amount: U128) -> Promise {
        assert_eq!(
            env::predecessor_account_id(),
            self.authorized_account,
            "Only the authorized account can transfer funds"
        );

        Promise::new(env::predecessor_account_id().clone()).transfer(NearToken::from_yoctonear(amount.0))
    }

    /// Users can deposit NEAR to create a deposit IOU
    #[payable]
    pub fn deposit(&mut self) {
        let amount = env::attached_deposit();
        assert!(amount.as_yoctonear() > 0, "Deposit amount must be greater than zero");

        let sender = env::predecessor_account_id();

        let iou_id = self.next_iou_id;
        self.next_iou_id += 1;

        let iou_receipt = IOUReceipt {
            iou_id,
            amount: amount.as_yoctonear(),
            account_id: sender.clone(),
            iou_type: IOUType::Deposit,
        };

        self.iou_receipts.insert(&iou_id, &iou_receipt);

        env::log_str(&format!("Deposit IOU created: {:?}", iou_receipt));
    }

    /// Users can withdraw by burning their pool tokens
    pub fn withdraw(&mut self, amount: U128) {
        let amount: Balance = amount.into();
        let account_id = env::predecessor_account_id();

        // Check if the user has enough balance
        let user_balance = self.token.ft_balance_of(account_id.clone()).0;
        assert!(user_balance >= amount, "Not enough token balance to withdraw");

        // Burn the tokens
        self.token.internal_withdraw(&account_id, amount);

        // Issue a withdrawal IOU
        let iou_id = self.next_iou_id;
        self.next_iou_id += 1;

        let iou_receipt = IOUReceipt {
            iou_id,
            amount,
            account_id: account_id.clone(),
            iou_type: IOUType::Withdraw,
        };

        self.iou_receipts.insert(&iou_id, &iou_receipt);

        env::log_str(&format!("Withdrawal IOU created: {:?}", iou_receipt));
    }

    /// Returns all pending IOU receipts
    pub fn list_ious(&self) -> Vec<IOUReceipt> {
        self.iou_receipts.values_as_vector().to_vec()
    }

    /// Fulfill a deposit IOU by minting pool tokens to the user
    pub fn fulfill_deposit_iou(&mut self, iou_id: u64, amount: U128) {
        assert_eq!(
            env::predecessor_account_id(),
            self.authorized_account,
            "Unauthorized"
        );
        let iou_receipt = self.iou_receipts.get(&iou_id).expect("IOU not found");
        assert_eq!(iou_receipt.iou_type, IOUType::Deposit, "IOU type mismatch");

        let account_id = iou_receipt.account_id.clone();
        let amount_to_mint: Balance = amount.into();

        // Register the account if not already registered
        if !self.token.accounts.contains_key(&account_id) {
            self.token.internal_register_account(&account_id);
        }

        // Mint tokens to the user
        self.token.internal_deposit(&account_id, amount_to_mint);

        // Remove the IOU
        self.iou_receipts.remove(&iou_id);

        env::log_str(&format!(
            "Deposit IOU fulfilled: Minted {} tokens to {}",
            amount_to_mint, account_id
        ));
    }

    /// Fulfill a withdrawal IOU by transferring NEAR to the user
    pub fn fulfill_withdraw_iou(&mut self, iou_id: u64, amount: U128) {
        assert_eq!(
            env::predecessor_account_id(),
            self.authorized_account,
            "Unauthorized"
        );
        let iou_receipt = self.iou_receipts.get(&iou_id).expect("IOU not found");
        assert_eq!(iou_receipt.iou_type, IOUType::Withdraw, "IOU type mismatch");

        let account_id = iou_receipt.account_id.clone();
        let amount_to_transfer: Balance = amount.into();

        // Transfer NEAR to the user
        Promise::new(account_id.clone()).transfer(NearToken::from_yoctonear(amount_to_transfer));

        // Remove the IOU
        self.iou_receipts.remove(&iou_id);

        env::log_str(&format!(
            "Withdrawal IOU fulfilled: Transferred {} yoctoNEAR to {}",
            amount_to_transfer, account_id
        ));
    }
}

// Implement NEP-141 Fungible Token standard
#[near_bindgen]
impl FungibleTokenCore for PoolContract {
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

// Implement Storage Management
#[near_bindgen]
impl StorageManagement for PoolContract {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(
        &mut self,
        amount: Option<NearToken>,
    ) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    fn storage_balance_of(
        &self,
        account_id: AccountId,
    ) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }

    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.storage_unregister(force)
    }
    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }
}

/* The rest of this file contains tests for the code above */
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{testing_env, VMContext};
    use near_sdk::test_utils::{VMContextBuilder, accounts};

    // Helper function to create a testing context
    fn get_context(predecessor_account_id: AccountId, attached_deposit: Balance) -> VMContext {
        VMContextBuilder::new()
            .current_account_id("pool.testnet".parse().unwrap())
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id)
            .attached_deposit(NearToken::from_yoctonear(attached_deposit))
            .build()
    }

    #[test]
    fn test_new() {
        let context = get_context(accounts(0), 0);
        testing_env!(context);
        let contract = PoolContract::new(
            "Test Pool".to_string(),
            "TP".to_string(),
            accounts(1), // Authorized account
            accounts(1),
        );
        assert_eq!(contract.token_metadata.name, "Test Pool");
        assert_eq!(contract.token_metadata.symbol, "TP");
        assert_eq!(contract.authorized_account, accounts(1));
    }

    #[test]
    fn test_deposit() {
        let context = get_context(accounts(2), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context);
        let mut contract = PoolContract::new(
            "Test Pool".to_string(),
            "TP".to_string(),
            accounts(1),
            accounts(1),
        );
        contract.deposit();
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        assert_eq!(iou.amount, 1_000_000_000_000_000_000_000_000);
        assert_eq!(iou.account_id, accounts(2));
        assert_eq!(iou.iou_type, IOUType::Deposit);
    }

    #[test]
    fn test_withdraw() {
        let mut context = get_context(accounts(2), 0);
        testing_env!(context.clone());
        let mut contract = PoolContract::new(
            "Test Pool".to_string(),
            "TP".to_string(),
            accounts(1),
            accounts(1),
        );

        // Mint some tokens to the user for testing
        contract.token.internal_register_account(&accounts(2));
        contract.token.internal_deposit(&accounts(2), 1_000_000);

        // User requests to withdraw tokens
        contract.withdraw(U128(500_000));
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        assert_eq!(iou.amount, 500_000);
        assert_eq!(iou.account_id, accounts(2));
        assert_eq!(iou.iou_type, IOUType::Withdraw);

        // User's token balance should have decreased
        let balance = contract.ft_balance_of(accounts(2));
        assert_eq!(balance.0, 500_000);
    }

    #[test]
    fn test_fulfill_deposit_iou_with_auth() {
        let context = get_context(accounts(2), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = PoolContract::new(
            "Test Pool".to_string(),
            "TP".to_string(),
            accounts(1),
            accounts(1),
        );
        contract.deposit();

        // Get the IOU ID
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id;

        // Try to fulfill the IOU with an unauthorized account
        testing_env!(get_context(accounts(3), 0));
        //let result = std::panic::catch_unwind(|| {
        //    contract.fulfill_deposit_iou(iou_id, U128(1_000_000));
        //});
        //assert!(result.is_err());

        // Fulfill the deposit IOU with the authorized account
        testing_env!(get_context(accounts(1), 0));
        contract.fulfill_deposit_iou(iou_id, U128(1_000_000));

        // Verify the user's balance
        let balance = contract.ft_balance_of(accounts(2));
        assert_eq!(balance.0, 1_000_000);

        // Verify IOU is removed
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 0);
    }

    #[test]
    fn test_fulfill_withdraw_iou_with_auth() {
        let mut context = get_context(accounts(2), 0);
        testing_env!(context.clone());
        let mut contract = PoolContract::new(
            "Test Pool".to_string(),
            "TP".to_string(),
            accounts(1),
            accounts(1),
        );

        // Mint some tokens to the user
        contract.token.internal_register_account(&accounts(2));
        contract.token.internal_deposit(&accounts(2), 1_000_000);

        // User requests to withdraw tokens
        contract.withdraw(U128(500_000));

        // Get the IOU ID
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id;

        // Try to fulfill the IOU with an unauthorized account
        testing_env!(get_context(accounts(3), 0));
        //let result = std::panic::catch_unwind(|| {
        //    contract.fulfill_withdraw_iou(iou_id, U128(500_000_000_000_000_000_000_000));
        //});
        //assert!(result.is_err());

        // Fulfill the withdrawal IOU with the authorized account
        testing_env!(get_context(accounts(1), 0));
        contract.fulfill_withdraw_iou(iou_id, U128(500_000_000_000_000_000_000_000)); // Transfer 0.5 NEAR

        // Verify IOU is removed
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 0);
    }
}

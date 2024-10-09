// Find all our documentation at https://docs.near.org
use near_sdk::{
    env, near_bindgen, AccountId, Balance, BorshDeserialize, BorshSerialize,
    PanicOnDefault, Promise, json_types::U128,
};
use near_sdk::collections::{LookupMap};
use serde::{Deserialize, Serialize};

/// The main contract structure
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    /// Map of IOU receipts with IOU id as the key
    iou_receipts: LookupMap<String, IOUReceipt>,
    /// Tracks the next IOU id
    next_iou_id: u64,
    /// Balances of LP tokens for each account
    balances: LookupMap<AccountId, Balance>,
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
    pub fn new() -> Self {
        Self {
            iou_receipts: LookupMap::new(b"i".to_vec()),
            next_iou_id: 0,
            balances: LookupMap::new(b"b".to_vec()),
        }
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
        let balance = self.get_balance_internal(&sender);
        assert!(balance >= amount.0, "Insufficient LP token balance");

        // Burn the LP tokens
        self.balances.insert(&sender, &(balance - amount.0));

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
        // Whitelist check can be added here in the future
        // For now, anyone can fulfill an IOU

        let mut iou_receipt = self.iou_receipts.get(&iou_id).expect("IOU not found");
        assert!(!iou_receipt.fulfilled, "IOU already fulfilled");

        iou_receipt.fulfilled = true;
        self.iou_receipts.insert(&iou_id, &iou_receipt);

        match iou_receipt.iou_type {
            IOUType::Deposit => {
                // Mint LP tokens to recipient
                let balance = self.get_balance_internal(&iou_receipt.recipient);
                let new_balance = balance + iou_receipt.amount.0;
                self.balances.insert(&iou_receipt.recipient, &new_balance);
                env::log_str(&format!(
                    "Minted {} LP tokens to {}",
                    iou_receipt.amount.0, iou_receipt.recipient
                ));
            }
            IOUType::Withdraw => {
                // Send NEAR from contract balance to recipient
                Promise::new(iou_receipt.recipient.clone())
                    .transfer(iou_receipt.amount.0);
                env::log_str(&format!(
                    "Sent {} yoctoNEAR to {}",
                    iou_receipt.amount.0, iou_receipt.recipient
                ));
            }
        }
    }

    /// Returns the LP token balance for a given account
    pub fn get_balance(&self, account_id: AccountId) -> U128 {
        U128(self.get_balance_internal(&account_id))
    }

    /// Internal method to get the balance without wrapping in U128
    fn get_balance_internal(&self, account_id: &AccountId) -> Balance {
        self.balances.get(account_id).unwrap_or(0)
    }

    /// Internal method to generate a unique IOU id
    fn generate_iou_id(&mut self) -> String {
        let id = self.next_iou_id;
        self.next_iou_id += 1;
        id.to_string()
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

    /// Test initializing the contract
    #[test]
    fn test_new() {
        let context = get_context("alice.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let contract = Contract::new();
        assert_eq!(contract.next_iou_id, 0);
    }

    /// Test depositing NEAR to create a deposit IOU
    #[test]
    fn test_deposit() {
        let context = get_context("alice.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context);
        let mut contract = Contract::new();
        contract.deposit();
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        assert_eq!(iou.recipient, "alice.testnet".parse().unwrap());
        assert_eq!(iou.amount.0, 1_000_000_000_000_000_000_000_000);
        assert_eq!(iou.fulfilled, false);
        assert_eq!(iou.iou_type, IOUType::Deposit);
    }

    /// Test redeeming LP tokens to create a withdrawal IOU
    #[test]
    fn test_redeem() {
        let context = get_context("bob.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new();
        // Manually set bob's LP token balance
        contract.balances.insert(&"bob.testnet".parse().unwrap(), &1_000);
        contract.redeem(U128(500));
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        assert_eq!(iou.recipient, "bob.testnet".parse().unwrap());
        assert_eq!(iou.amount.0, 500);
        assert_eq!(iou.fulfilled, false);
        assert_eq!(iou.iou_type, IOUType::Withdraw);
        // Check the updated balance
        let balance = contract.get_balance("bob.testnet".parse().unwrap());
        assert_eq!(balance.0, 500);
    }

    /// Test fulfilling a deposit IOU
    #[test]
    fn test_fulfill_deposit_iou() {
        let context = get_context("alice.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = Contract::new();
        contract.deposit();
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id.clone();

        // Fulfill the IOU
        contract.fulfill_iou(iou_id.clone());
        let updated_iou = contract.iou_receipts.get(&iou_id).unwrap();
        assert!(updated_iou.fulfilled);

        // Check the LP token balance
        let balance = contract.get_balance("alice.testnet".parse().unwrap());
        assert_eq!(balance.0, 1_000_000_000_000_000_000_000_000);
    }

    /// Test fulfilling a withdrawal IOU
    #[test]
    fn test_fulfill_withdraw_iou() {
        let context = get_context("bob.testnet".parse().unwrap(), 0);
        testing_env!(context.clone());
        let mut contract = Contract::new();
        // Manually set bob's LP token balance
        contract.balances.insert(&"bob.testnet".parse().unwrap(), &1_000_000_000_000_000_000_000_000);
        contract.redeem(U128(500_000_000_000_000_000_000_000));
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id.clone();

        // Fulfill the IOU
        contract.fulfill_iou(iou_id.clone());
        let updated_iou = contract.iou_receipts.get(&iou_id).unwrap();
        assert!(updated_iou.fulfilled);

        // Check the LP token balance
        let balance = contract.get_balance("bob.testnet".parse().unwrap());
        assert_eq!(balance.0, 500_000_000_000_000_000_000_000);
    }

    /// Test fulfilling an already fulfilled IOU
    #[test]
    #[should_panic(expected = "IOU already fulfilled")]
    fn test_fulfill_already_fulfilled_iou() {
        let context = get_context("alice.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = Contract::new();
        contract.deposit();
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id.clone();

        // Fulfill the IOU
        contract.fulfill_iou(iou_id.clone());
        // Attempt to fulfill again
        contract.fulfill_iou(iou_id);
    }

    /// Test redeeming more LP tokens than available
    #[test]
    #[should_panic(expected = "Insufficient LP token balance")]
    fn test_redeem_insufficient_balance() {
        let context = get_context("bob.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new();
        // Bob has zero LP tokens
        contract.redeem(U128(500));
    }

    /// Test depositing zero NEAR
    #[test]
    #[should_panic(expected = "Deposit amount must be greater than zero")]
    fn test_deposit_zero_amount() {
        let context = get_context("alice.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new();
        contract.deposit();
    }

    /// Test fulfilling a non-existent IOU
    #[test]
    #[should_panic(expected = "IOU not found")]
    fn test_fulfill_nonexistent_iou() {
        let context = get_context("carol.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new();
        contract.fulfill_iou("nonexistent_iou_id".to_string());
    }

    /// Test listing IOUs when there are none
    #[test]
    fn test_list_ious_empty() {
        let context = get_context("dave.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let contract = Contract::new();
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 0);
    }

    /// Test get_balance for an account with zero balance
    #[test]
    fn test_get_balance_zero() {
        let context = get_context("eve.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let contract = Contract::new();
        let balance = contract.get_balance("eve.testnet".parse().unwrap());
        assert_eq!(balance.0, 0);
    }

    /// Test get_balance after multiple deposits and redemptions
    #[test]
    fn test_get_balance_multiple_operations() {
        let context = get_context("frank.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = Contract::new();
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
        let balance = contract.get_balance("frank.testnet".parse().unwrap());
        assert_eq!(balance.0, 1_500_000_000_000_000_000_000_000); // Remaining LP tokens
    }
}

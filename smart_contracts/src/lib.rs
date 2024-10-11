// Import necessary modules and crates
use near_sdk::{
    env, near_bindgen, AccountId, PanicOnDefault,
    json_types::U128, PromiseOrValue, Promise
};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{UnorderedMap};
use near_sdk::serde::{Deserialize, Serialize};
use near_token::NearToken;

use near_contract_standards::fungible_token::{
    receiver::FungibleTokenReceiver,
};
//use near_contract_standards::storage_management::{
//    StorageManagement, StorageBalance, StorageBalanceBounds,
//};

type Balance = u128;

/// The main contract structure
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    /// Map of IOU receipts with IOU id as the key
    iou_receipts: UnorderedMap<String, IOUReceipt>,
    /// Tracks the next IOU id
    next_iou_id: u64,
    /// Map of LPs with lp_id as the key and LP token AccountId as the value
    lps: UnorderedMap<String, AccountId>,
}

//const GAS_FOR_FT_TRANSFER: u64 = 10_000_000_000_000;

#[derive(BorshDeserialize, BorshSerialize)]
pub enum VContract {
    Current(Contract),
}

impl From<VContract> for Contract {
    fn from(v: VContract) -> Self {
        match v {
            VContract::Current(c) => c,
        }
    }
}

/// IOUReceipt represents a deposit or withdrawal IOU
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct IOUReceipt {
    /// Unique identifier for the IOU
    iou_id: String,
    /// LP identifier
    lp_id: String,
    /// Amount involved in the IOU
    amount: NearToken,
    /// Recipient of the IOU
    recipient: AccountId,
    /// Indicates if the IOU has been fulfilled
    fulfilled: bool,
    /// Type of IOU: Deposit or Withdraw
    iou_type: IOUType,
}

/// Enum representing the type of IOU
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum IOUType {
    Deposit,
    Withdraw,
}

#[near_bindgen]
impl Contract {
    /// Initializes the contract
    #[init]
    pub fn new() -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            iou_receipts: UnorderedMap::new(b"i".to_vec()),
            next_iou_id: 0,
            lps: UnorderedMap::new(b"l".to_vec()),
        }
    }

    /// Adds a new LP to the contract
    pub fn add_lp(&mut self, lp_id: String, lp_token_contract_id: AccountId) {
        //assert!(
        //    !self.lps.contains_key(&lp_id),
        //    "LP with this ID already exists"
        //);
        self.lps.insert(&lp_id, &lp_token_contract_id);
    }

    /// Lists all LPs
    pub fn list_lps(&self) -> Vec<(String, AccountId)> {
        self.lps.to_vec()
    }

    // TODO:
    // * redeem with no storage available on address
    // * make sure this can't be called directly
    pub fn redeem_lp_for_near(&mut self, sender_id: AccountId, amount: U128) {
        let lp_id = "lp_token_id".to_string();  // Replace with actual LP token ID

        // Validate the LP token
        //assert!(self.lps.contains_key(&lp_id), "LP not found");

        // Generate a unique IOU ID
        let iou_id = self.generate_iou_id();

        // Create a new IOU for NEAR (withdraw)
        let iou_receipt = IOUReceipt {
            iou_id: iou_id.clone(),
            lp_id: lp_id.clone(),
            amount: NearToken::from_yoctonear(amount.into()),  // Convert the amount of LP tokens
            recipient: sender_id.clone(),
            fulfilled: false,
            iou_type: IOUType::Withdraw,
        };

        // Store the IOU in the contract
        self.iou_receipts.insert(&iou_id, &iou_receipt);

        // Log the IOU creation
        env::log_str(&format!("Withdraw IOU created: {:?}", iou_receipt));
    }

    /// Users can deposit NEAR to create a deposit IOU
    #[payable]
    pub fn deposit(&mut self, lp_id: String) {
        let amount = env::attached_deposit();
        assert!(amount.as_yoctonear() > 0, "Deposit amount must be greater than zero");
        //assert!(self.lps.contains_key(&lp_id), "LP not found");
        let sender = env::predecessor_account_id();
        let iou_id = self.generate_iou_id();
        let iou_receipt = IOUReceipt {
            iou_id: iou_id.clone(),
            lp_id: lp_id.clone(),
            amount: amount,
            recipient: sender.clone(),
            fulfilled: false,
            iou_type: IOUType::Deposit,
        };
        self.iou_receipts.insert(&iou_id, &iou_receipt);
        env::log_str(&format!("Deposit IOU created: {:?}", iou_receipt));
    }

    /// Returns all unresolved IOU receipts
    pub fn list_ious(&self) -> Vec<IOUReceipt> {
        self.iou_receipts
            .values()
            .filter(|iou| !iou.fulfilled)
            .collect()
    }

    /// Fulfills a NEAR IOU (Withdraw IOU)
    #[payable]
    pub fn fulfill_iou_near(&mut self, iou_id: String) {
        let iou_receipt = self.iou_receipts.get(&iou_id).expect("IOU not found");
        assert!(!iou_receipt.fulfilled, "IOU already fulfilled");
        assert_eq!(
            iou_receipt.iou_type,
            IOUType::Withdraw,
            "IOU type mismatch"
        );
        assert_eq!(
            env::attached_deposit(),
            iou_receipt.amount,
            "Attached deposit does not match IOU amount"
        );

        // Mark as fulfilled
        let mut iou_receipt_mut = iou_receipt.clone();
        iou_receipt_mut.fulfilled = true;
        self.iou_receipts.insert(&iou_id, &iou_receipt_mut);

        // Transfer NEAR to recipient
        Promise::new(iou_receipt.recipient.clone()).transfer(iou_receipt.amount);

        env::log_str(&format!(
            "Sent {} yoctoNEAR to {}",
            iou_receipt.amount, iou_receipt.recipient
        ));
    }

    ///// Fulfills an LP IOU (Deposit IOU)
    //pub fn fulfill_iou_lp(&mut self, iou_id: String) {
    //    let iou_receipt = self.iou_receipts.get(&iou_id).expect("IOU not found");
    //    assert!(!iou_receipt.fulfilled, "IOU already fulfilled");
    //    assert_eq!(iou_receipt.iou_type, IOUType::Deposit, "IOU type mismatch");

    //    let lp_account_id = self.lps.get(&iou_receipt.lp_id).expect("LP not found");

    //    // Mark IOU as fulfilled
    //    let mut iou_receipt_mut = iou_receipt.clone();
    //    iou_receipt_mut.fulfilled = true;
    //    self.iou_receipts.insert(&iou_id, &iou_receipt_mut);

    //    // Transfer LP tokens to the recipient
    //    Promise::new(lp_account_id).function_call(
    //        "ft_transfer".to_string(),
    //        serde_json::json!({
    //            "receiver_id": iou_receipt.recipient,
    //            "amount": iou_receipt.amount,
    //            "memo": "Fulfill LP IOU"
    //        })
    //        .to_string()
    //        .into_bytes(),
    //        1, // Attached deposit of 1 yoctoNEAR
    //        GAS_FOR_FT_TRANSFER,
    //    );

    //    env::log_str(&format!(
    //        "Transferred {} LP tokens of {} to {}",
    //        iou_receipt.amount.0, iou_receipt.lp_id, iou_receipt.recipient
    //    ));
    //}

    ///// Internal method to generate a unique IOU id
    fn generate_iou_id(&mut self) -> String {
        let id = self.next_iou_id;
        self.next_iou_id += 1;
        id.to_string()
    }
}

#[near_bindgen]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        // Define the system/burn address
        let system_address: AccountId = "system".parse().unwrap();  // Replace with actual system/burn address

        // Check if the recipient is the system/burn address
        if env::predecessor_account_id() == system_address {
            // This is a redeem action; process the redemption for NEAR IOUs
            self.redeem_lp_for_near(sender_id, amount);

            // No need to refund any tokens; they have been "burned"
            PromiseOrValue::Value(U128(0))
        } else {
            // Handle other cases (e.g., user-to-user token transfers)
            env::log_str("Tokens were not sent to the system address, returning them.");
            PromiseOrValue::Value(amount)  // Returning the tokens back
        }
    }
}

/* The rest of this file contains tests for the code above */
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{testing_env, VMContext};

    use near_sdk::test_utils::VMContextBuilder;

    /// Helper function to set up the testing environment
    fn get_context(
        predecessor_account_id: AccountId,
        attached_deposit: Balance,
    ) -> VMContext {
        VMContextBuilder::new().predecessor_account_id(predecessor_account_id).attached_deposit(NearToken::from_yoctonear(attached_deposit)).build()
    }

    #[test]
    fn test_new() {
        let context = get_context("alice.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let contract = Contract::new();
        assert_eq!(contract.next_iou_id, 0);
    }

    #[test]
    fn test_add_and_list_lps() {
        let context = get_context("owner.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new();
        contract.add_lp("lp1".to_string(), "lp1.token.testnet".parse().unwrap());
        contract.add_lp("lp2".to_string(), "lp2.token.testnet".parse().unwrap());
        let lps = contract.list_lps();
        assert_eq!(lps.len(), 2);
    }

    #[test]
    fn test_deposit() {
        let context = get_context("user.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context);
        let mut contract = Contract::new();
        contract.add_lp("lp1".to_string(), "lp1.token.testnet".parse().unwrap());
        contract.deposit("lp1".to_string());
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        //assert_eq!(iou.recipient, "user.testnet".parse().unwrap());
        assert_eq!(iou.amount.as_yoctonear(), 1_000_000_000_000_000_000_000_000);
        assert_eq!(iou.fulfilled, false);
        assert_eq!(iou.iou_type, IOUType::Deposit);
        assert_eq!(iou.lp_id, "lp1");
    }

    #[test]
    fn test_ft_on_transfer() {
        let context = get_context("lpuser.testnet".parse().unwrap(), 0);
        testing_env!(context);
        let mut contract = Contract::new();
        contract.add_lp("lp1".to_string(), "lp1.token.testnet".parse().unwrap());
        let result = contract.ft_on_transfer(
            "system".parse().unwrap(),
            U128(500),
            "lp1".to_string(),
        );
        match result {
            PromiseOrValue::Value(amount) => assert_eq!(amount, U128(0)),
            _ => panic!("Expected Value"),
        }
        let ious = contract.list_ious();
        assert_eq!(ious.len(), 1);
        let iou = &ious[0];
        //assert_eq!(iou.recipient, "lpuser.testnet".parse().unwrap());
        assert_eq!(iou.amount.as_yoctonear(), 500);
        assert_eq!(iou.fulfilled, false);
        assert_eq!(iou.iou_type, IOUType::Withdraw);
        assert_eq!(iou.lp_id, "lp1");
    }

    #[test]
    fn test_fulfill_iou_near() {
        let context = get_context("user.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
        testing_env!(context.clone());
        let mut contract = Contract::new();
        contract.add_lp("lp1".to_string(), "lp1.token.testnet".parse().unwrap());
        contract.ft_on_transfer(
            "user.testnet".parse().unwrap(),
            U128(500_000_000_000_000_000_000_000),
            "lp1".to_string(),
        );
        let ious = contract.list_ious();
        let iou_id = ious[0].iou_id.clone();

        // Fulfill the IOU
        testing_env!(get_context("owner.testnet".parse().unwrap(), 500_000_000_000_000_000_000_000));
        contract.fulfill_iou_near(iou_id.clone());
        let updated_iou = contract.iou_receipts.get(&iou_id).unwrap();
        assert!(updated_iou.fulfilled);
    }

    //#[test]
    //fn test_fulfill_iou_lp() {
    //    let context = get_context("user.testnet".parse().unwrap(), 1_000_000_000_000_000_000_000_000); // 1 NEAR
    //    testing_env!(context.clone());
    //    let mut contract = Contract::new();
    //    contract.add_lp("lp1".to_string(), "lp1.token.testnet".parse().unwrap());
    //    contract.deposit("lp1".to_string());
    //    let ious = contract.list_ious();
    //    let iou_id = ious[0].iou_id.clone();

    //    // Fulfill the IOU
    //    testing_env!(get_context("owner.testnet".parse().unwrap(), 0));
    //    contract.fulfill_iou_lp(iou_id.clone());
    //    let updated_iou = contract.iou_receipts.get(&iou_id).unwrap();
    //    assert!(updated_iou.fulfilled);
    //}
}

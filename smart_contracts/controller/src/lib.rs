// Import necessary modules and crates
use near_sdk::{
    env, near_bindgen, AccountId, Promise, Gas, PanicOnDefault, BorshStorageKey,
    PromiseResult
};
use near_sdk::store::IterableMap;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;

use near_token::NearToken;

// Constants
const GAS_FOR_INIT_POOL: Gas = Gas::from_tgas(50);
const GAS_FOR_CALLBACK: Gas = Gas::from_tgas(50);
const GAS_FOR_FULFILL: Gas = Gas::from_tgas(30);
const MIN_POOL_BALANCE: NearToken = NearToken::from_near(2);

// Include the pool contract WASM code
const POOL_WASM_BYTES: &[u8] = include_bytes!("../../target/wasm32-unknown-unknown/release/pool_optimized.wasm");

#[derive(BorshStorageKey, BorshSerialize)]
pub enum StorageKey {
    Pools,
}

// Main controller contract
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct MainController {
    owner_id: AccountId,
    pools: IterableMap<String, AccountId>, // Map of pool IDs to Account IDs
}

#[near_bindgen]
impl MainController {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            owner_id,
            pools: IterableMap::new(StorageKey::Pools)
        }
    }

    /// Creates a new pool
    #[payable]
    pub fn create_pool(&mut self, pool_id: String, name: String, symbol: String) -> Promise {
        // Ensure the pool_id is not already used
        assert!(!self.pools.contains_key(&pool_id), "Pool with this ID already exists");

        // Compute the new pool account ID
        let pool_account_id : AccountId = format!("{}.{}", pool_id, env::current_account_id()).parse().unwrap();

        // The amount of NEAR to transfer to the new pool contract
        let initial_balance = env::attached_deposit();
        assert!(initial_balance >= MIN_POOL_BALANCE, "Not enough attached deposit to create pool");

        // Create and deploy the pool contract
        Promise::new(pool_account_id.clone())
            .create_account()
            .transfer(initial_balance)
            .add_full_access_key(env::signer_account_pk())
            .deploy_contract(POOL_WASM_BYTES.to_vec())
            .function_call(
                "new".to_string(),
                near_sdk::serde_json::json!({
                    "name": name,
                    "symbol": symbol,
                    "authorized_account": env::current_account_id(),
                    "creator": env::predecessor_account_id()
                }).to_string().into_bytes(),
                NearToken::from_yoctonear(0),
                GAS_FOR_INIT_POOL,
            )
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "on_pool_initialized".to_string(),
                    near_sdk::serde_json::json!({
                        "pool_id": pool_id,
                        "pool_account_id": pool_account_id
                    }).to_string().into_bytes(),
                    NearToken::from_yoctonear(0),
                    GAS_FOR_CALLBACK,
                )
            )
    }

    pub fn clear_pools(&mut self) {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only the contract owner can migrate state");
        self.pools.clear();
    }

    pub fn on_pool_initialized(&mut self, pool_id: String, pool_account_id: AccountId) {
        assert_eq!(env::promise_results_count(), 1, "Expected one promise result");
        match env::promise_result(0) {
            PromiseResult::Successful(_) => {
                // Store the pool in our records
                self.pools.insert(pool_id.clone(), pool_account_id.clone());
                env::log_str(&format!("Pool '{}' created at account '{}'", pool_id, pool_account_id));
            },
            _ => {
                // Handle the failure case
                env::panic_str("Failed to initialize pool contract");
            }
        }
    }

    pub fn transfer_to_pool(&self, pool_id: String, amount: U128) -> Promise {
        // Ensure that only the contract owner can call this function
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only the contract owner can transfer to pools"
        );

        assert!(self.pools.contains_key(&pool_id), "Pool must exist");

        // Construct the pool account ID
        let pool_account_id: AccountId = format!("{}.{}", pool_id, env::current_account_id())
            .parse()
            .expect("Invalid pool account ID");

        // Transfer the attached deposit to the pool account
        Promise::new(pool_account_id).transfer(NearToken::from_yoctonear(amount.0))
    }

    pub fn transfer_from_pool(&self, pool_id: String, amount: U128) -> Promise {
        // Ensure that only the contract owner can call this function
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only the contract owner can transfer from pools"
        );

        // Construct the pool account ID
        let pool_account_id: AccountId = format!("{}.{}", pool_id, env::current_account_id())
            .parse()
            .expect("Failed to parse AccountId");

        // Initiate a cross-contract call to the pool contract to transfer funds
        Promise::new(pool_account_id.clone())
            .function_call(
                "transfer_to_owner".to_string(),
                near_sdk::serde_json::json!({
                    "amount": amount,
                })
                .to_string()
                .into_bytes(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(20), // Adjust gas amount as needed
            )
    }

    pub fn list_pools(&self) -> Vec<String> {
        self.pools.keys().map(|k| k.clone()).collect()
    }

    pub fn fulfill_deposit_iou(&self, pool_id: String, iou_id: u64, amount: U128) -> Promise {
        // Ensure that only the contract owner can call this function
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only the contract owner can fulfill deposit IOUs"
        );

        let pool_account_id: AccountId = format!("{}.{}", pool_id, env::current_account_id())
            .parse()
            .expect("Failed to parse AccountId");

        Promise::new(pool_account_id.clone())
            .function_call(
                "fulfill_deposit_iou".to_string(),
                near_sdk::serde_json::json!({
                    "iou_id": iou_id,
                    "amount": amount,
                })
                .to_string()
                .into_bytes(),
                NearToken::from_yoctonear(0),
                GAS_FOR_FULFILL,
            )
    }

    pub fn fulfill_withdraw_iou(&self, pool_id: String, iou_id: u64, amount: U128) -> Promise {
        // Ensure that only the contract owner can call this function
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only the contract owner can fulfill withdraw IOUs"
        );

        let pool_account_id: AccountId = format!("{}.{}", pool_id, env::current_account_id())
            .parse()
            .expect("Failed to parse AccountId");

        Promise::new(pool_account_id.clone())
            .function_call(
                "fulfill_withdraw_iou".to_string(),
                near_sdk::serde_json::json!({
                    "iou_id": iou_id,
                    "amount": amount,
                })
                .to_string()
                .into_bytes(),
                NearToken::from_yoctonear(0),
                GAS_FOR_FULFILL,
            )
    }
}

/* The rest of this file contains tests for the code above */
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{testing_env, VMContext};
    use near_sdk::test_utils::{VMContextBuilder, accounts};

    // Helper function to create a testing context
    fn get_context(predecessor_account_id: AccountId, attached_deposit: u128) -> VMContext {
        VMContextBuilder::new()
            .current_account_id("controller.testnet".parse().unwrap())
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id)
            .attached_deposit(NearToken::from_yoctonear(attached_deposit))
            .build()
    }

    #[test]
    fn test_new() {
        let context = get_context(accounts(0), 0);
        testing_env!(context);
        let contract = MainController::new(accounts(0));
        assert_eq!(contract.owner_id, accounts(0));
        // POOL_WASM_BYTES is included at compile time
    }

    #[test]
    fn test_create_pool() {
        let context = get_context(accounts(0), MIN_POOL_BALANCE.as_yoctonear());
        testing_env!(context);
        let mut contract = MainController::new(accounts(0));

        // Since we cannot simulate promises in unit tests, we'll directly insert into pools
        contract.pools.insert("pool1".to_string(), "pool1.controller.testnet".parse().unwrap());

        // Check that the pool was added
        let pools = contract.list_pools();
        assert_eq!(pools.len(), 1);
        assert_eq!(pools[0], "pool1".to_string());
    }

    #[test]
    fn test_list_pools() {
        let context = get_context(accounts(0), 0);
        testing_env!(context);
        let mut contract = MainController::new(accounts(0));

        // Insert mock pools
        contract.pools.insert("pool1".to_string(), "pool1.controller.testnet".parse().unwrap());
        contract.pools.insert("pool2".to_string(), "pool2.controller.testnet".parse().unwrap());

        let pools = contract.list_pools();
        assert_eq!(pools.len(), 2);
    }
}

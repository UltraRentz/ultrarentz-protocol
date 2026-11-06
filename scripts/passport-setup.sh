#!/usr/bin/env bash
# Creates the demo state for the Deposit Passport on Arc testnet:
#   1. an OLD tenancy for TENANT: backdated start (so it shows visible practice yield), ends in END_IN s,
#      claim period CLAIM s, funded by the tenant
#   2. waits until it is clean, writes the passport to Arkiv, records its hash on Arc (agent)
#   3. creates a NEW tenancy for the same tenant (unfunded), ready for rollover
# Practice money on testnet only. The backdating is disclosed in the README.
#
# Required env: VAULT USDC RPC AGENT_AUTH TENANT_AUTH TENANT LANDLORD LANDLORD2
#   AGENT_AUTH / TENANT_AUTH are cast auth flags, e.g. "--account ultrarentz-deployer"
# Optional: OLD_DEP=5000000 NEW_DEP=6000000 END_IN=120 CLAIM=60 BACKDATE_DAYS=180 GAS_FLAGS DRY=1
set -euo pipefail
: "${VAULT:?}" "${USDC:?}" "${RPC:?}" "${AGENT_AUTH:?}" "${TENANT_AUTH:?}" "${TENANT:?}" "${LANDLORD:?}" "${LANDLORD2:?}"
OLD_DEP=${OLD_DEP:-5000000}   # 5 USDC (6 decimals)
NEW_DEP=${NEW_DEP:-6000000}   # 6 USDC -> tenant tops up 1 USDC on rollover
END_IN=${END_IN:-120}
CLAIM=${CLAIM:-60}
BACKDATE_DAYS=${BACKDATE_DAYS:-180}
GAS_FLAGS=${GAS_FLAGS:---gas-price 25gwei --priority-gas-price 1gwei}
HASH_TAG=$(cast keccak "ultrarentz demo tenancy agreement")

send() { cast send "$@" --rpc-url "$RPC" $GAS_FLAGS >/dev/null; }

now=$(date +%s)
old_id=$(cast call "$VAULT" "nextLeaseId()(uint256)" --rpc-url "$RPC")
echo "1/6 creating old tenancy #$old_id (backdated ${BACKDATE_DAYS}d, ends in ${END_IN}s)"
send "$VAULT" "createLease(address,address,bytes32,uint256,uint256,uint256,uint256)" \
  "$TENANT" "$LANDLORD" "$HASH_TAG" "$OLD_DEP" "$((now - BACKDATE_DAYS*86400))" "$((now + END_IN))" "$CLAIM" $AGENT_AUTH

echo "2/6 tenant funds it (approve + fundLease)"
send "$USDC" "approve(address,uint256)" "$VAULT" "$OLD_DEP" $TENANT_AUTH
send "$VAULT" "fundLease(uint256)" "$old_id" $TENANT_AUTH

wait_s=$((END_IN + CLAIM + 5))
echo "3/6 waiting ${wait_s}s until the claim period has passed with no claim"
sleep "$wait_s"

echo "4/6 writing the passport to Arkiv"
rec_json=$(TENANCY_ID="$old_id" TENANT="$TENANT" npx tsx scripts/arkiv-write.ts)
echo "$rec_json"
rec_hash=$(echo "$rec_json" | sed -E 's/.*"recordHash":"(0x[0-9a-fA-F]{64})".*/\1/')

echo "5/6 agent records the hash on Arc (recordCleanTenancy)"
send "$VAULT" "recordCleanTenancy(uint256,bytes32)" "$old_id" "$rec_hash" $AGENT_AUTH

new_id=$(cast call "$VAULT" "nextLeaseId()(uint256)" --rpc-url "$RPC")
echo "6/6 creating new tenancy #$new_id (unfunded, 12 months)"
now=$(date +%s)
send "$VAULT" "createLease(address,address,bytes32,uint256,uint256,uint256,uint256)" \
  "$TENANT" "$LANDLORD2" "$HASH_TAG" "$NEW_DEP" "$now" "$((now + 365*86400))" "$((14*86400))" $AGENT_AUTH

echo "passportHash on Arc for #$old_id: $(cast call "$VAULT" "passportHash(uint256)(bytes32)" "$old_id" --rpc-url "$RPC")"
echo "DONE old=$old_id new=$new_id tenant=$TENANT recordHash=$rec_hash"

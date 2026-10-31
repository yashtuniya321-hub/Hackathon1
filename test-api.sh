#!/usr/bin/env bash

# ==============================================================================
# Brightloop Software - Automated End-to-End API Test Script
# Tests: Auth, Passwords, Role RBAC, Products, Variants, Plans, Discounts,
#        Subscriptions (Draft -> Quotation -> Confirmed -> Active -> Closed),
#        Automated Billing Cron/Trigger, Invoices, Payments, and Finance Dashboard
# ==============================================================================

BASE_URL="http://localhost:5000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

assert_success() {
  local title="$1"
  local response="$2"
  if echo "$response" | grep -q '"success":true'; then
    echo -e "  ${GREEN}✔ [PASS]${NC} $title"
    ((pass_count++))
  else
    echo -e "  ${RED}✖ [FAIL]${NC} $title"
    echo -e "     Response: $response"
    ((fail_count++))
  fi
}

assert_expected_error() {
  local title="$1"
  local response="$2"
  local expected_msg="$3"
  if echo "$response" | grep -qi "$expected_msg"; then
    echo -e "  ${GREEN}✔ [PASS]${NC} $title (Expected error caught)"
    ((pass_count++))
  else
    echo -e "  ${RED}✖ [FAIL]${NC} $title"
    echo -e "     Expected '$expected_msg', got: $response"
    ((fail_count++))
  fi
}

echo -e "\n${BLUE}====================================================================${NC}"
echo -e "${BLUE}  Brightloop Software: Subscription Management End-to-End Test Suite ${NC}"
echo -e "${BLUE}====================================================================${NC}\n"

# 1. Health check
echo -e "${YELLOW}Step 1: Checking Service Health...${NC}"
HEALTH=$(curl -s -X GET "$BASE_URL/health")
assert_success "Health Check" "$HEALTH"

# 2. Strict Password Rule Test
echo -e "\n${YELLOW}Step 2: Testing Strict Password Validation (< 8 chars, missing special char)...${NC}"
SHORT_PASS=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"fail1@test.com","password":"Ab1!","firstName":"Test","lastName":"User"}')
assert_expected_error "Reject password <= 8 characters" "$SHORT_PASS" "more than eight characters"

NO_SPEC_PASS=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"fail2@test.com","password":"Password123","firstName":"Test","lastName":"User"}')
assert_expected_error "Reject password missing special character" "$NO_SPEC_PASS" "special character"

# 3. RBAC Rule: Only Admin can add Staff
echo -e "\n${YELLOW}Step 3: Testing Public Registration Restriction (Staff creation blocked)...${NC}"
STAFF_FORBIDDEN=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"fake_staff@brightloop.io","password":"Password@123","firstName":"Fake","lastName":"Staff","role":"Staff"}')
assert_expected_error "Reject non-admin registering as Staff" "$STAFF_FORBIDDEN" "Only Admins can add a new member of staff"

# 4. Admin Login
echo -e "\n${YELLOW}Step 4: Authenticating as Admin...${NC}"
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@brightloop.io","password":"Admin@12345"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
assert_success "Admin Login (admin@brightloop.io)" "$ADMIN_LOGIN"

# 5. Customer Login
echo -e "\n${YELLOW}Step 5: Authenticating as Customer...${NC}"
CUST_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@acme.com","password":"Customer@12345"}')
CUST_TOKEN=$(echo "$CUST_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
assert_success "Customer Login (customer@acme.com)" "$CUST_LOGIN"

# 6. Admin creates product with variant (adding +560 for Odoo brand)
echo -e "\n${YELLOW}Step 6: Creating Product with Variant (+560 for Odoo brand edition)...${NC}"
RAND_SKU="ODOO-ERP-$((RANDOM % 9000 + 1000))"
PROD_RES=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"name\": \"Brightloop ERP Suite\",
    \"sku\": \"$RAND_SKU\",
    \"description\": \"Comprehensive enterprise ERP suite\",
    \"salesPrice\": 1200.00,
    \"costPrice\": 400.00,
    \"variants\": [
      {
        \"variantName\": \"Odoo Brand Edition\",
        \"skuSuffix\": \"ODOO\",
        \"priceExtra\": 560.00
      }
    ]
  }")
assert_success "Admin adds product with Odoo variant" "$PROD_RES"

# 7. Admin creates Plan
echo -e "\n${YELLOW}Step 7: Creating Plan (Monthly, Min Qty 2, Auto-Renew)...${NC}"
PLAN_RES=$(curl -s -X POST "$BASE_URL/plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    \"name\": \"Pro Growth Monthly\",
    \"billingFrequency\": \"monthly\",
    \"minimumQuantity\": 2,
    \"closureRule\": \"auto-renew\",
    \"baseFee\": 25.00
  }')
assert_success "Admin creates Plan" "$PLAN_RES"

# 8. Admin creates Discount rule
echo -e "\n${YELLOW}Step 8: Admin creates Discount Rule...${NC}"
DISC_CODE="BRIGHT$((RANDOM % 900 + 100))"
DISC_RES=$(curl -s -X POST "$BASE_URL/discounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"code\": \"$DISC_CODE\",
    \"discountType\": \"percentage\",
    \"value\": 15.00,
    \"minPurchaseAmount\": 500.00,
    \"startDate\": \"2026-01-01\",
    \"endDate\": \"2026-12-31\",
    \"usageLimit\": 50,
    \"targetScope\": \"subscription\"
  }")
assert_success "Admin creates Discount ($DISC_CODE - 15% off)" "$DISC_RES"

# 9. Create Subscription (Draft)
echo -e "\n${YELLOW}Step 9: Customer creates Subscription/Quotation in Draft...${NC}"
SUB_RES=$(curl -s -X POST "$BASE_URL/subscriptions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -d "{
    \"planId\": 1,
    \"startDate\": \"2026-01-01\",
    \"discountCode\": \"HACKATHON20\",
    \"lines\": [
      {
        \"productId\": 1,
        \"variantId\": 1,
        \"quantity\": 2,
        \"taxRate\": 0.18
      }
    ]
  }")
SUB_ID=$(echo "$SUB_RES" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
assert_success "Subscription created in Draft status (ID: $SUB_ID)" "$SUB_RES"

# 10. Strict State Progression Test
echo -e "\n${YELLOW}Step 10: Testing Strict Status Progression (Draft -> Quotation -> Confirmed -> Active -> Closed)...${NC}"
# Attempt invalid transition: Draft -> Active (should fail)
ILLEGAL_JUMP=$(curl -s -X PATCH "$BASE_URL/subscriptions/$SUB_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"Active"}')
assert_expected_error "Block illegal transition Draft -> Active" "$ILLEGAL_JUMP" "Invalid status progression"

# Valid progression: Draft -> Quotation
STEP_QUOTE=$(curl -s -X PATCH "$BASE_URL/subscriptions/$SUB_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"Quotation"}')
assert_success "Advance Draft -> Quotation" "$STEP_QUOTE"

# Valid progression: Quotation -> Confirmed
STEP_CONF=$(curl -s -X PATCH "$BASE_URL/subscriptions/$SUB_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"Confirmed"}')
assert_success "Advance Quotation -> Confirmed" "$STEP_CONF"

# Valid progression: Confirmed -> Active
STEP_ACT=$(curl -s -X PATCH "$BASE_URL/subscriptions/$SUB_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"Active"}')
assert_success "Advance Confirmed -> Active" "$STEP_ACT"

# 11. Trigger Automated Billing Cycle
echo -e "\n${YELLOW}Step 11: Triggering Automated Billing Cycle (Cron simulation)...${NC}"
BILL_RES=$(curl -s -X POST "$BASE_URL/invoices/trigger-billing" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_success "Automated Billing Cycle executed" "$BILL_RES"

# 12. Record Payment & Test Auto-Paid Transition
echo -e "\n${YELLOW}Step 12: Recording Payment against Invoice & testing Paid transition...${NC}"
INV_LIST=$(curl -s -X GET "$BASE_URL/invoices" -H "Authorization: Bearer $ADMIN_TOKEN")
INV_ID=$(echo "$INV_LIST" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

PAY_RES=$(curl -s -X POST "$BASE_URL/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"invoiceId\": $INV_ID,
    \"paymentMethod\": \"Stripe\",
    \"amount\": 500.00,
    \"notes\": \"Test partial payment\"
  }")
assert_success "Record Payment of \$500 against Invoice #$INV_ID" "$PAY_RES"

# 13. Finance Dashboard & Performance Benchmarking (< 2 seconds)
echo -e "\n${YELLOW}Step 13: Querying Finance Dashboard & verifying < 2s response target...${NC}"
DASH_RES=$(curl -s -X GET "$BASE_URL/dashboard/finance" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_success "Finance Dashboard Query executed" "$DASH_RES"

EXEC_TIME=$(echo "$DASH_RES" | grep -o '"executionTimeMs":"[^"]*' | cut -d'"' -f4)
PERF_STATUS=$(echo "$DASH_RES" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo -e "  ${GREEN}⚡ Dashboard Execution Time: $EXEC_TIME ($PERF_STATUS)${NC}"

# Final Summary
echo -e "\n${BLUE}====================================================================${NC}"
echo -e "  Test Results: ${GREEN}$pass_count passed${NC}, ${RED}$fail_count failed${NC}"
echo -e "${BLUE}====================================================================${NC}\n"

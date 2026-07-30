#!/bin/bash
# W0 Verification Script
# Runs all verification steps for the engineering foundation

set -e

echo "=== W0 Verification ==="
echo ""

# Step 1: Configuration validation
echo "Step 1: Configuration Validation"
npx tsx tests/unit/config-validation.test.ts
echo ""

# Step 2: Core tests
echo "Step 2: Core Tests"
npx tsx tests/core.test.ts
echo ""

# Step 3: Phase 2 negative tests
echo "Step 3: Phase 2 Negative Tests"
npx tsx tests/phase2-negative-tests.ts
echo ""

# Step 4: Phase 2.2 negative tests
echo "Step 4: Phase 2.2 Negative Tests"
npx tsx tests/phase2-2-negative-tests.ts
echo ""

# Step 5: Frontend contract tests
echo "Step 5: Frontend Contract Tests"
npx tsx tests/phase2-2-frontend-contract-tests.ts
echo ""

echo "=== W0 Verification Complete ==="
echo "All verification steps passed."

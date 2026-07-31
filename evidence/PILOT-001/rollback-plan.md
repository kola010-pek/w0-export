# PILOT-001 Rollback Plan

## Scope of Changes

PILOT-001 modifies exactly **one** existing file and creates **one** new test file:

| File | Action | Risk |
|------|--------|------|
| `src/app/(dashboard)/phase2/page.tsx` | Modified (additive only) | Low |
| `tests/pilot-001-governance-card.spec.ts` | Created | None |
| `evidence/PILOT-001/*` | Created | None |

## Rollback Procedure

### Option A: Git Revert (Preferred)

```bash
# Revert the phase2 page to pre-PILOT-001 state
git checkout HEAD -- src/app/(dashboard)/phase2/page.tsx

# Remove the test file
rm tests/pilot-001-governance-card.spec.ts

# Evidence files can be retained for audit trail
```

### Option B: Manual Removal

1. Open `src/app/(dashboard)/phase2/page.tsx`
2. Locate the section marked:
   `{/* ============ PILOT-001: 建设与验收治理卡片 (只读) ============ */}`
3. Delete everything from that comment to the closing `</div>` before
   `{/* Footer Info */}`
4. Save the file
5. Delete `tests/pilot-001-governance-card.spec.ts`

## Impact Assessment

- **No API changes**: No backend routes were modified
- **No data changes**: No database operations added
- **No config changes**: No YAML configs modified
- **No dependency changes**: No packages added or upgraded
- **Purely additive**: The governance card is a new UI section appended
  to an existing page; no existing components or logic were altered
- **Zero breaking changes**: Existing page functionality is preserved

## Verification After Rollback

1. Run `pnpm ts-check` - should show same pre-existing errors only
2. Run `pnpm lint` - should show same pre-existing issues only
3. Navigate to `/phase2` - page should render without governance card
4. All existing sections (health, watermarks, quality gates, negative tests,
   Phase 2.2) should remain functional

## Rollback Estimated Impact

- **Time**: Immediate (single file revert)
- **Risk**: None (additive-only change, no dependencies)
- **Side effects**: None

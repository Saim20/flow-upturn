# useEffect Optimization Tracker

## Overview
This document tracks all pages and components in `/ops` and `/admin` that have `useEffect` hooks causing unnecessary re-fetching on browser tab switch. The fix is to add `hasInitialized` ref pattern to prevent re-fetching.

**Pattern to Apply:**
```typescript
const hasInitialized = useRef(false);

useEffect(() => {
  if (hasInitialized.current) return;
  hasInitialized.current = true;
  
  // fetch logic here
}, [dependencies]);
```

---

## Files Already Fixed ✅

These files already have the `hasInitialized` pattern implemented:

| File | Status |
|------|--------|
| `src/app/(home)/ops/attendance/page.tsx` | ✅ Has hasInitialized |
| `src/app/(home)/ops/notice/page.tsx` | ✅ Has hasInitialized |
| `src/app/(home)/ops/offboarding/page.tsx` | ✅ Has hasInitialized |
| `src/app/(home)/ops/onboarding/page.tsx` | ✅ Has hasInitialized |
| `src/app/(home)/ops/project/[id]/milestone/[milestoneId]/page.tsx` | ✅ Has hasInitialized |
| `src/app/(home)/ops/tasks/TaskLayout.tsx` | ✅ Has hasInitialized |
| `src/app/(home)/ops/stakeholders/page.tsx` | ✅ Has hasInitialized |
| `src/components/ops/project/milestone/MilestoneDetailsView.tsx` | ✅ Has hasInitialized |
| `src/components/ops/project/ProjectDetails.tsx` | ✅ Has hasInitialized |

---

## Files Requiring Fix 🔴

### Priority: HIGH (Main Pages)

#### 1. `src/app/(home)/ops/hris/page.tsx`
**Lines:** 46-50, 51-75, 78-94  
**Issue:** Multiple useEffects fetch data without hasInitialized guard
```typescript
// Line 46 - Fetches employees on every render
useEffect(() => {
  fetchExtendedEmployees();
  fetchOffboardedEmployees();
}, [fetchExtendedEmployees, fetchOffboardedEmployees]);
```
**Fix:** Add hasInitialized ref to prevent re-fetch on tab switch

---

#### 2. `src/app/(home)/ops/leave/page.tsx`
**Line:** 87  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 3. `src/app/(home)/ops/requisition/page.tsx`
**Line:** 20  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 4. `src/app/(home)/ops/settlement/page.tsx`
**Line:** 22  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 5. `src/app/(home)/ops/tasks/page.tsx`
**Line:** 19  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 6. `src/app/(home)/ops/stakeholder-issues/page.tsx`
**Lines:** 62-71, 74-83  
**Issue:** Two useEffects fetch data without hasInitialized guard
**Fix:** Add hasInitialized ref pattern to initial data load

---

#### 7. `src/app/(home)/ops/stakeholders/[id]/page.tsx`
**Lines:** 183-193, 195-208, 211-221  
**Issue:** Multiple useEffects load stakeholder data without hasInitialized guard
**Fix:** Add hasInitialized ref pattern with lastFetchedId tracking

---

#### 8. `src/app/(home)/ops/stakeholders/[id]/edit/page.tsx`
**Lines:** 56, 89  
**Issue:** useEffects fetch stakeholder data without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 9. `src/app/(home)/ops/onboarding/devices/page.tsx`
**Line:** 58  
**Issue:** useEffect fetches devices without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

### Priority: HIGH (Admin Pages)

#### 10. `src/app/(home)/admin/config/teams/page.tsx`
**Line:** 65  
**Issue:** useEffect calls loadTeams without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 11. `src/app/(home)/admin/config/stakeholder-process/[id]/page.tsx`
**Line:** 45  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 12. `src/app/(home)/admin/config/stakeholder-process/page.tsx`
**Line:** 31  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 13. `src/app/(home)/admin/logs/attendance/page.tsx`
**Lines:** 57, 75  
**Issue:** useEffects fetch logs without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 14. `src/app/(home)/admin/logs/complaint/page.tsx`
**Lines:** 43, 49  
**Issue:** useEffects fetch logs without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 15. `src/app/(home)/admin/logs/leave/page.tsx`
**Lines:** 51, 62  
**Issue:** useEffects fetch logs without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 16. `src/app/(home)/admin/logs/notice/page.tsx`
**Lines:** 58, 73  
**Issue:** useEffects fetch logs without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 17. `src/app/(home)/admin/logs/project/page.tsx`
**Lines:** 45, 52  
**Issue:** useEffects fetch logs without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 18. `src/app/(home)/admin/logs/requisition/page.tsx`
**Lines:** 71, 108  
**Issue:** useEffects fetch logs without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 19. `src/app/(home)/admin/logs/tasks/page.tsx`
**Lines:** 43, 48  
**Issue:** useEffects fetch logs without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 20. `src/app/(home)/admin/logs/stakeholder-issues/page.tsx`
**Line:** 58  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 21. `src/app/(home)/admin/stakeholders/[id]/edit/page.tsx`
**Line:** 42  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 22. `src/app/(home)/admin/stakeholders/[id]/page.tsx`
**Lines:** 177, 189, 205  
**Issue:** Multiple useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 23. `src/app/(home)/admin/stakeholders/page.tsx`
**Line:** 39  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 24. `src/app/(home)/admin/data-export/page.tsx`
**Line:** 153  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 25. `src/app/(home)/admin/stakeholder-services/templates/page.tsx`
**Lines:** 164, 172  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

### Priority: MEDIUM (Components)

#### 26. `src/components/ops/attendance/AbsentPage.tsx`
**Lines:** 53, 57  
**Issue:** useEffects fetch attendance data without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 27. `src/components/ops/attendance/LatePage.tsx`
**Lines:** 54, 58  
**Issue:** useEffects fetch attendance data without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 28. `src/components/ops/attendance/PresentPage.tsx`
**Lines:** 54, 58  
**Issue:** useEffects fetch attendance data without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 29. `src/components/ops/attendance/RecordsPage.tsx`
**Line:** 62  
**Issue:** useEffect fetches records without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 30. `src/components/ops/attendance/RequestsPage.tsx`
**Line:** 178  
**Issue:** useEffect fetches requests without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 31. `src/components/ops/complaint/ComplaintHistory.tsx`
**Lines:** 24, 38  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 32. `src/components/ops/complaint/ComplaintRequests.tsx`
**Lines:** 35, 49  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 33. `src/components/ops/complaint/ComplaintCreatePage.tsx`
**Lines:** 128, 135, 159  
**Issue:** Multiple useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 34. `src/components/ops/leave/LeaveRequests.tsx`
**Lines:** 39, 45  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 35. `src/components/ops/leave/LeaveHistory.tsx`
**Line:** 56  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 36. `src/components/ops/leave/LeaveCreatePage.tsx`
**Lines:** 45, 51, 67, 73  
**Issue:** Multiple useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 37. `src/components/ops/notice/NoticeModal.tsx`
**Line:** 50  
**Issue:** useEffect without hasInitialized guard (prop-based, may be intentional)
**Fix:** Evaluate if hasInitialized is needed

---

#### 38. `src/components/ops/notice/NoticeCreateModal.tsx`
**Line:** 42  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 39. `src/components/ops/notice/NoticeDetails.tsx`
**Lines:** 48, 64  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 40. `src/components/ops/notice/NoticeUpdateModal.tsx`
**Lines:** 39, 45  
**Issue:** useEffects without hasInitialized guard (prop-based, may be intentional)
**Fix:** Evaluate if hasInitialized is needed

---

#### 41. `src/components/ops/payroll/PayrollHistory.tsx`
**Line:** 78  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 42. `src/components/ops/project/milestone/MilestoneUpdateModal.tsx`
**Line:** 52  
**Issue:** useEffect without hasInitialized guard (prop-based, may be intentional)
**Fix:** Evaluate if hasInitialized is needed

---

#### 43. `src/components/ops/project/milestone/MilestoneDetails.tsx`
**Lines:** 79, 268  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 44. `src/components/ops/project/CreateNewProject.tsx`
**Lines:** 55, 198  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 45. `src/components/ops/project/ProjectForm.tsx`
**Lines:** 78, 117, 254  
**Issue:** Multiple useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern for initial data fetch

---

#### 46. `src/components/ops/project/navigation/ProjectBreadcrumb.tsx`
**Line:** 36  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 47. `src/components/ops/project/BaseProjectListView.tsx`
**Lines:** 149, 207, 233, 242  
**Issue:** Multiple useEffects - some may need hasInitialized
**Fix:** Evaluate and add hasInitialized where appropriate

---

#### 48. `src/components/ops/requisition/RequisitionEditModal.tsx`
**Lines:** 147, 154, 194, 202  
**Issue:** Multiple useEffects (prop-based, may be intentional)
**Fix:** Evaluate if hasInitialized is needed

---

#### 49. `src/components/ops/requisition/RequisitionHistoryPage.tsx`
**Lines:** 64, 69, 78  
**Issue:** Multiple useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 50. `src/components/ops/requisition/RequisitionRequestsPage.tsx`
**Lines:** 68, 82  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 51. `src/components/ops/requisition/UpcomingPage.tsx`
**Lines:** 25, 34  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 52. `src/components/ops/requisition/RequisitionCreateModal.tsx`
**Lines:** 169, 176, 216, 224  
**Issue:** Multiple useEffects (prop-based, may be intentional)
**Fix:** Evaluate if hasInitialized is needed

---

#### 53. `src/components/ops/requisition/RequisitionCreatePage.tsx`
**Lines:** 229, 236, 279, 776, 804, 811, 854  
**Issue:** Many useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern for initial data fetch

---

#### 54. `src/components/ops/settlement/SettlementHistory.tsx`
**Lines:** 37, 51  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 55. `src/components/ops/settlement/UpcomingPage.tsx`
**Lines:** 26, 35  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 56. `src/components/ops/settlement/SettlementCreatePage.tsx`
**Line:** 68  
**Issue:** useEffect without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 57. `src/components/ops/settlement/SettlementRequestsPage.tsx`
**Lines:** 45, 59  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

#### 58. `src/components/ops/tasks/shared/TaskDetailsImproved.tsx`
**Lines:** 130, 137  
**Issue:** useEffects without hasInitialized guard
**Fix:** Add hasInitialized ref pattern

---

## Implementation Notes

### When NOT to add hasInitialized:
1. **Filter/Search useEffects** - These should re-run when filter values change
2. **Prop-watching useEffects** - If the effect should run when props change (e.g., modal receiving new data)
3. **Computed value useEffects** - Effects that derive state from other state

### When TO add hasInitialized:
1. **Initial data fetch useEffects** - Effects that load data on component mount
2. **API call useEffects** - Effects that make network requests for initial page data
3. **Dependency-only useEffects** - Effects with `[]` dependency array that still re-run

### Pattern for ID-based fetching:
```typescript
const hasInitialized = useRef(false);
const lastFetchedId = useRef<string | null>(null);

useEffect(() => {
  if (hasInitialized.current && lastFetchedId.current === id) {
    return;
  }
  
  hasInitialized.current = true;
  lastFetchedId.current = id;
  
  fetchData(id);
}, [id, fetchData]);
```

---

## Progress Tracking

| # | File | Status | Assigned To | Notes |
|---|------|--------|-------------|-------|
| 1 | ops/hris/page.tsx | 🔴 Not Started | | |
| 2 | ops/leave/page.tsx | 🔴 Not Started | | |
| 3 | ops/requisition/page.tsx | 🔴 Not Started | | |
| 4 | ops/settlement/page.tsx | 🔴 Not Started | | |
| 5 | ops/tasks/page.tsx | 🔴 Not Started | | |
| 6 | ops/stakeholder-issues/page.tsx | 🔴 Not Started | | |
| 7 | ops/stakeholders/[id]/page.tsx | 🔴 Not Started | | |
| 8 | ops/stakeholders/[id]/edit/page.tsx | 🔴 Not Started | | |
| 9 | ops/onboarding/devices/page.tsx | 🔴 Not Started | | |
| 10 | admin/config/teams/page.tsx | 🔴 Not Started | | |
| 11 | admin/config/stakeholder-process/[id]/page.tsx | 🔴 Not Started | | |
| 12 | admin/config/stakeholder-process/page.tsx | 🔴 Not Started | | |
| 13 | admin/logs/attendance/page.tsx | 🔴 Not Started | | |
| 14 | admin/logs/complaint/page.tsx | 🔴 Not Started | | |
| 15 | admin/logs/leave/page.tsx | 🔴 Not Started | | |
| 16 | admin/logs/notice/page.tsx | 🔴 Not Started | | |
| 17 | admin/logs/project/page.tsx | 🔴 Not Started | | |
| 18 | admin/logs/requisition/page.tsx | 🔴 Not Started | | |
| 19 | admin/logs/tasks/page.tsx | 🔴 Not Started | | |
| 20 | admin/logs/stakeholder-issues/page.tsx | 🔴 Not Started | | |
| 21 | admin/stakeholders/[id]/edit/page.tsx | 🔴 Not Started | | |
| 22 | admin/stakeholders/[id]/page.tsx | 🔴 Not Started | | |
| 23 | admin/stakeholders/page.tsx | 🔴 Not Started | | |
| 24 | admin/data-export/page.tsx | 🔴 Not Started | | |
| 25 | admin/stakeholder-services/templates/page.tsx | 🔴 Not Started | | |
| 26-58 | Components (see above) | 🔴 Not Started | | Evaluate each |

---

## Summary

- **Total Files Needing Review:** 58
- **Main Pages (High Priority):** 25
- **Components (Medium Priority):** 33
- **Already Fixed:** 9

---

*Created: 2026-01-04*
*Last Updated: 2026-01-04*

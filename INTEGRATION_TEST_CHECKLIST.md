# Integration Test Checklist

## Pre-Testing Setup
- ✅ Supabase connection configured
- ✅ Environment variables set
- ✅ Database schema created
- ✅ App compiled successfully
- ✅ Dev server running

## Component Integration Tests

### 1. Bills Manager (NEW)
- [ ] Can navigate to "Bills" tab
- [ ] Can create a new bill
- [ ] Can see created bill in list
- [ ] Can mark bill as paid
- [ ] Can edit existing bill
- [ ] Can delete bill
- [ ] Bill status icons show correctly (paid/unpaid/overdue)
- [ ] Summary cards show correct totals
- [ ] Data persists after page refresh

### 2. Receipts Manager (NEW)
- [ ] Can navigate to "Receipts" tab
- [ ] Can upload a receipt file
- [ ] File upload validation works (type & size)
- [ ] Can see uploaded receipt in list
- [ ] Can download receipt
- [ ] Can delete receipt
- [ ] File size formatting works correctly
- [ ] Linked transaction count shows
- [ ] Data persists after page refresh

### 3. Receipt Upload Component
- [ ] Drag and drop works
- [ ] Click to select files works
- [ ] File type validation (shows error for invalid types)
- [ ] File size validation (shows error for >10MB)
- [ ] Multiple file formats work (PDF, JPG, PNG, WebP, GIF)
- [ ] Upload progress shows
- [ ] Success toast appears after upload
- [ ] File can be removed before upload

### 4. Receipt Linker Component
- [ ] Can access receipt linker from transaction
- [ ] Shows all available receipts
- [ ] Can select receipts to link
- [ ] Can unlink receipts
- [ ] Shows "Linked" badge for linked receipts
- [ ] Receipt count updates correctly
- [ ] Save button works
- [ ] Success message appears

### 5. Transaction Form Integration
- [ ] Transaction form displays receipt upload option
- [ ] Can upload receipt while creating transaction
- [ ] Receipt automatically links to transaction
- [ ] Can upload multiple receipts to one transaction
- [ ] Receipts persist with transaction

### 6. Bills Form
- [ ] All form fields required validation works
- [ ] Category dropdown shows all options
- [ ] Frequency dropdown works
- [ ] Due date picker works
- [ ] Reminder days validation works
- [ ] Create and edit modes work correctly
- [ ] Form validation shows error messages
- [ ] Cancel button closes form

### 7. Existing Features Still Work
- [ ] Dashboard displays correctly
- [ ] Transactions create/edit/delete works
- [ ] Budget management works
- [ ] Income sources management works
- [ ] Goals tracking works
- [ ] Analytics display correctly
- [ ] Recurring transactions work
- [ ] Export functionality works

## Data Integrity Tests

### 1. User Data Isolation
- [ ] User A's bills don't show to User B
- [ ] User A's receipts don't show to User B
- [ ] Queries filter by user_id correctly
- [ ] No data leakage between users

### 2. Referential Integrity
- [ ] Deleting transaction deletes links to receipts
- [ ] Deleting receipt doesn't crash transaction display
- [ ] Linked receipts display in transaction details
- [ ] Orphaned receipts can be managed

### 3. Data Persistence
- [ ] Bills persist after refresh
- [ ] Receipts persist after refresh
- [ ] Transaction-receipt links persist
- [ ] User can sign out and back in, data still there

## Error Handling Tests

### 1. Network Errors
- [ ] Handle failed bill creation gracefully
- [ ] Handle failed receipt upload gracefully
- [ ] Show appropriate error messages
- [ ] Don't lose form data on error

### 2. Validation Errors
- [ ] Invalid file type rejected
- [ ] File too large rejected
- [ ] Missing required fields caught
- [ ] Invalid dates handled

### 3. Auth Errors
- [ ] Redirect to login if not authenticated
- [ ] Handle session expiry
- [ ] Show auth error messages

## Performance Tests

### 1. Loading Times
- [ ] Bills list loads quickly
- [ ] Receipts list loads quickly
- [ ] Receipt linker populates quickly
- [ ] No lag when switching tabs

### 2. File Operations
- [ ] Large file upload doesn't freeze UI
- [ ] Receipt download completes successfully
- [ ] Multiple files can be managed

## Browser/Device Tests

### 1. Responsiveness
- [ ] Layout works on mobile
- [ ] Layout works on tablet
- [ ] Layout works on desktop
- [ ] Touch interactions work on mobile

### 2. Cross-Browser
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

## API/Database Tests

### 1. Supabase Connection
- [ ] Bills table queries work
- [ ] Receipts table queries work
- [ ] Transaction_receipts junction table works
- [ ] Foreign keys enforced correctly

### 2. File Storage
- [ ] Files upload to Supabase Storage
- [ ] Files can be retrieved
- [ ] Files can be deleted
- [ ] Storage quotas respected

## Final Verification

- [ ] No console errors
- [ ] No unhandled promise rejections
- [ ] All toast notifications work
- [ ] Navigation between all tabs works
- [ ] Back button works correctly
- [ ] Can sign out successfully
- [ ] Can sign back in
- [ ] App is responsive
- [ ] Dark mode works
- [ ] Light mode works

## Build Verification

- [ ] `npm run build` completes without errors
- [ ] `npm run dev` runs without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings (ignoring expected ones)

---

## Test Execution Steps

1. **Start the app**
   ```bash
   npm run dev
   ```

2. **Sign in** with your Supabase account

3. **Run through each test section above**
   - Check off items as you verify them
   - Note any failures or issues

4. **Document any bugs or issues found**

5. **Verify build works**
   ```bash
   npm run build
   ```

6. **Mark as complete when all tests pass**

---

## Known Issues / Notes

(Add any known issues or implementation notes here)

---

**Test Status**: 🟡 Ready for Testing
**Last Updated**: 2024
**Tester**: Keith Ngaira

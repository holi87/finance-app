# Budget Tracker — UI/UX Specification

## 1. Design principles

- Fast, simple, readable
- Mobile-first (iPhone PWA primary target)
- Comfortable on desktop too
- Clear offline/online state communication
- Clean workspace separation
- Not a heavy accounting system — practical for daily use

## 2. UX rules

- Most common actions reachable in 1–2 taps
- Adding a transaction must be very fast
- User always knows which workspace is active
- Sync status always visible
- App works well one-handed on iPhone
- Forms are short and readable
- Confirmation dialogs only where truly necessary

## 3. Main views (MVP)

### Login
- Email + password fields
- Login button
- Error display
- Loading state

### Dashboard
- Active workspace name
- Total balance
- Income this period
- Expenses this period
- Budget utilization indicators
- Recent transactions (last 5-10)
- Sync status badge

### Transaction list
- Date filters
- Transaction items (amount, category, account, date)
- Quick add button (FAB on mobile)
- Tap to view/edit

### Add transaction form
Field order:
1. Type (expense/income/transfer)
2. Amount (large, prominent input)
3. Account
4. Category
5. Date (default: today)
6. Description
7. Notes (optional)
8. Save button
9. Optional "Save & add another"

Must be: short, fast, mobile-friendly, with inline validation and sensible defaults.

### Accounts
- Account list with balances
- Add/edit account

### Categories
- Category list split by kind (expense/income)
- Add/edit category

### Budgets
- Period selector
- Per-category: limit, spent, remaining, percentage
- Warning colors near/over limit

### Settings
- Profile
- Workspace management
- Members
- Preferences
- Manual sync button
- Device info

## 4. Navigation

### Mobile (primary)
Bottom navigation bar:
- Dashboard
- Transactions
- Add (center, prominent)
- Budgets
- Settings (or More)

### Desktop
Sidebar or top navigation with access to:
- Workspace switcher
- Dashboard
- Transactions
- Accounts
- Categories
- Budgets
- Reports
- Settings

## 5. Workspace switcher

Must be highly visible and accessible from every main view.

Requirements:
- Shows active workspace name
- Quick switch between workspaces
- Visual separation of workspace contexts
- Switching workspace reloads data from local DB for that workspace

## 6. Sync status component

This is a critical UX element. Must show:
- Online / Offline badge
- "Changes saved locally" indicator
- "Syncing..." spinner
- "Last synced: [relative time]"
- "Sync error" with tap-to-retry
- Unsent changes counter

Must be visible on dashboard and accessible from other views. Not buried in settings.

## 7. Offline behavior

When offline, the user must:
- Browse all local data normally
- Add, edit, delete records
- See "Offline" indicator clearly
- See "X changes pending sync"
- Not be blocked by any form or action

The app must never show a blank screen or error just because there's no network.

## 8. Responsive design

Mobile-first approach.

Breakpoints:
- iPhone viewport (375px+)
- Small tablet (768px+)
- Desktop (1024px+)

Rules:
- Large tap targets on mobile
- Readable typography (16px base minimum on mobile)
- Cards instead of wide tables on mobile
- Tables acceptable on desktop
- No horizontal scroll on mobile

## 9. System states

Every main view must handle:
- **Loading** — skeleton or spinner
- **Empty** — friendly message + action ("No transactions yet. Add your first one!")
- **Error** — message + retry action
- **Offline** — data shown from local DB + offline indicator

## 10. PWA on iPhone

UI must account for:
- Safe area insets (notch, home indicator)
- Bottom spacing when using bottom nav
- "Add to Home Screen" onboarding prompt
- Stable behavior after app resume (no blank screens)
- No reliance on background sync

## 11. Base components needed

- Button (primary, secondary, danger, ghost)
- Input (text, number, currency)
- Select / Dropdown
- DatePicker
- Modal
- Sheet / Drawer (mobile bottom sheet)
- Tabs
- Card
- EmptyState
- ErrorState
- SyncBadge
- CurrencyAmount (formatted display)
- WorkspaceSwitcher

## 12. Visual direction

- Modern, light, calm
- Professional but not corporate
- Financially readable (clear numbers, good spacing)
- Minimal animations (purposeful, not decorative)
- Good contrast for accessibility
- Color palette: neutral base with accent colors for categories and budget indicators

## 13. Accessibility (minimum)

- Sufficient contrast ratios
- Keyboard navigation on desktop
- Proper form labels and ARIA attributes
- Focus states on interactive elements
- Semantic HTML components
- Never communicate information by color alone

## 14. Definition of done

UI/UX is ready when:
- Main user paths are fast and intuitive
- App works well on iPhone and desktop
- Sync status is understandable at a glance
- Transaction form is quick and convenient
- Workspace switcher clearly separates contexts
- Interface remains simple despite multiple feature areas
- Offline experience is seamless

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MFC App is a local-first, offline-only Android mobile app for a food business owner to manage customers, record orders/payments, track balances, and share invoices/statements via WhatsApp. Built with Expo (SDK 54) and React Native 0.81, using React 19 with the React Compiler enabled.

## Commands

```bash
npm run dev              # Start Expo dev server (with --go flag)
npm run lint             # ESLint (expo lint)
npm run build:apk        # EAS cloud build (APK preview)
npm run build:apk:local  # EAS local build (APK)
npm run build:aab        # EAS cloud build (production AAB)
```

There is no test framework configured.

## Architecture

### Routing (Expo Router — file-based)

```
app/_layout.tsx          → Root: SettingsProvider > SQLiteProvider > Stack
app/(tabs)/_layout.tsx   → Bottom tabs: Customers, Orders, Settings
app/(tabs)/index.tsx     → Customers list
app/(tabs)/orders.tsx    → Orders list with date filters
app/(tabs)/settings.tsx  → Theme, language, company details
app/(tabs)/backup.tsx    → Backup/restore (hidden from tab bar, accessed via settings)
app/add-customer.tsx     → Modal
app/edit-customer.tsx    → Modal
app/add-order.tsx        → Modal
app/add-payment.tsx      → Modal
app/customer-detail.tsx  → Stack screen
app/view-statement.tsx   → Stack screen
```

### Data Layer

- **Database**: `expo-sqlite` with WAL mode and foreign keys enabled. All CRUD lives in `services/database.ts`. The DB is named `mfc.db` and initialized via `initDatabase()` passed to `<SQLiteProvider onInit>`.
- **Schema**: 5 tables — `customers`, `orders`, `transactions` (double-entry ledger with debit/credit types), `statements`, `statement_transactions` (junction). Migrations use `ALTER TABLE` wrapped in try-catch for idempotency.
- **Types**: All DB row interfaces (`Customer`, `Order`, `Transaction`, `Statement`, etc.) are exported from `services/database.ts`.
- **No remote API** — everything is local SQLite + AsyncStorage.

### State Management

- **SettingsContext** (`contexts/SettingsContext.tsx`): provides theme (`isDark`, `colors`), language (`lang`, `tr`), and company info. Persisted to AsyncStorage under `@mfc_*` keys.
- **Database access**: screens call `useSQLiteContext()` directly and invoke functions from `services/database.ts`.

### Styling

All components use `StyleSheet.create()` via a `makeStyles(colors: AppColors)` factory pattern. Theme tokens (colors, font sizes, spacing, radii) are defined in `constants/theme.ts`. No CSS-in-JS library.

### Localization

Two languages: English (`en`) and Tamil (`ta`), defined in `constants/translations.ts`. The `Lang` type is `'en' | 'ta'`. Dynamic strings use function interpolation (e.g., `removeCustomerMsg: (name: string) => \`...\``). Access translations via `useSettings().tr`.

### External Integrations

- **WhatsApp** (`utils/whatsapp.ts`): deep-links for sending invoices and statements via `whatsapp://send?phone=...&text=...`
- **Backup** (`utils/backup.ts`): JSON export/import of all tables, with Google Drive sharing via `expo-sharing`
- **Contacts** (`expo-contacts`): bulk import phone contacts as customers with duplicate detection

## Conventions

- TypeScript strict mode with path alias `@/*` mapping to project root
- All components are functional, using hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useFocusEffect`)
- Dates stored as ISO 8601 strings in SQLite
- UI optimized for large text and high contrast (target user: older, mid-size Android phone)

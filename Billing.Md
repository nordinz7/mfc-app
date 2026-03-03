Billing Feature Implementation Plan
Context
The MFC app currently creates a debit transaction the moment an order is placed, but orders are always amount=0 (only quantity captured). The business workflow is: take bulk orders quickly (customer + quantity), then later calculate prices and send invoices. This plan separates order-taking (quick, quantity-only) from billing (pricing, invoicing, payment tracking), and replaces the Transactions tab with a new Billing tab.

Key user behavior: rate differs by quantity and customer, so amounts are entered manually per order at billing time. If a customer has pending balance, the bill should include previous transactions alongside new orders.

Step 1: Database Layer Changes
File: services/database.ts

1a. Remove orphan-order migration (lines 160-173)
The initDatabase() block that auto-creates debit transactions for orders with transaction_id IS NULL must be removed — unbilled orders intentionally have transaction_id = NULL.

1b. Modify addOrder() (lines 434-460)
Remove the debit transaction creation and transaction_id update. Just insert the order row. Keep same function signature.

1c. Modify bulkAddOrders() (lines 462-489)
Same change — remove transaction creation inside the loop.

1d. Modify updateOrder() (lines 491-517)
Make the linked transaction update conditional — only update the debit transaction if the order has a transaction_id (is billed). For unbilled orders, just update the order row.

1e. Add new functions
Function Purpose
getUnbilledOrders(db) All orders where transaction_id IS NULL, joined with customer info
getUnbilledOrdersByDate(db, from, to) Date-filtered unbilled orders
getUnbilledOrdersByCustomer(db, customerId) Customer-filtered unbilled orders
getCustomersWithUnbilledOrders(db) Distinct customers that have unbilled orders (for filter dropdown)
billOrders(db, customerId, items: {orderId, amount}[]) Creates debit transactions for selected orders, updates order's transaction_id and amount atomically
1f. Backward compatibility
Existing orders already have transaction_id set → treated as "billed" — no data migration needed
Existing amount=0 transactions are harmless in balance calculations
deleteOrder() unchanged — already handles both cases (deletes linked transaction if exists)
Step 2: Translation Strings
File: constants/translations.ts

Add keys for both en and ta:

billing, unbilled, history, generateBill, enterAmount, nothingToBill, billGenerated, previousBalance, newOrders, selectOrdersToBill
Step 3: Replace Transactions Tab with Billing Tab
3a. Rename tab file
Rename app/(tabs)/transactions.tsx → app/(tabs)/billing.tsx
3b. Update tab layout
File: app/(tabs)/\_layout.tsx

Change tab name from "transactions" to "billing"
Update icon to "receipt" and title to tr.billing
3c. Build the Billing tab screen
File: app/(tabs)/billing.tsx (new content)

Two modes via segmented control:

"Unbilled" mode (default):

Loads unbilled orders via getUnbilledOrders()
Filter chips: date picker, customer picker
Orders grouped by customer using SectionList
Each customer group header: customer name + select-all checkbox
Each order row: checkbox, quantity badge, description, date, inline TextInput for amount
Bottom bar: "Generate Bill" button (active when selected orders have amounts entered)
Summary: X orders selected, Total: ₹Y
"History" mode:

Carries over the existing transactions list from current transactions.tsx
Filter by date, customer
Shows all debit/credit transactions
FAB for quick payment entry
Step 4: Billing Flow (Generate Bill action)
When user taps "Generate Bill":

Validate: all selected orders must have amount > 0
Group selected orders by customer (in case multiple customers selected)
For each customer: call billOrders(db, customerId, items) to create debit transactions
Smart invoice routing (for single-customer billing):
Check getCustomerBalance() — count prior non-zero transactions
If customer has prior transactions (pending balance) → navigate to view-statement (consolidated bill with previous orders + payments + new orders)
If first-time billing (no prior history) → navigate to view-bill (simple multi-order invoice)
For multi-customer billing: show success alert, refresh unbilled list
Step 5: Multi-Order Invoice Screen
5a. New screen
File: app/view-bill.tsx — accepts customerId + list of newly billed order IDs as params. Fetches order details, renders InvoiceBill, and provides WhatsApp share.

5b. Register in layout
File: app/\_layout.tsx — add <Stack.Screen name="view-bill" />

5c. Enhance InvoiceBill component
File: components/InvoiceBill.tsx

Accept orders: OrderWithCustomer[] prop (multiple line items)
Render table rows for each order: quantity, description, date, amount
Show total at bottom
Keep backward compat with existing single-order order prop
Step 6: Polish Existing Screens
6a. Orders tab
File: app/(tabs)/orders.tsx

Add visual badge on order cards: "Unbilled" tag (when transaction_id IS NULL) vs amount shown (when billed)
Remove WhatsApp send from unbilled orders (already handled — only shows when amount > 0)
6b. Edit order screen
File: app/edit-order.tsx

For unbilled orders: show only quantity, description, date (no amount field)
For billed orders: show amount as editable (updates linked transaction via updateOrder())
Files Changed (Summary)
File Action
services/database.ts Modify: remove orphan migration, change addOrder/bulkAddOrders/updateOrder, add 5 new functions
constants/translations.ts Modify: add ~10 billing keys in en + ta
app/(tabs)/transactions.tsx Delete (replaced by billing.tsx)
app/(tabs)/billing.tsx Create: new Billing tab with Unbilled/History modes
app/(tabs)/\_layout.tsx Modify: swap transactions → billing tab entry
app/view-bill.tsx Create: multi-order invoice preview + share screen
app/\_layout.tsx Modify: register view-bill screen
components/InvoiceBill.tsx Modify: support multiple order line items
app/(tabs)/orders.tsx Modify: add unbilled badge on order cards
app/edit-order.tsx Modify: conditional amount field based on billing status
Verification
Create orders — confirm no debit transactions are created (check DB: transaction_id IS NULL)
Billing tab — confirm unbilled orders appear, filters work, amounts can be entered
Generate Bill — confirm debit transactions are created, order transaction_id + amount updated
Smart invoice — for customer with prior balance: verify consolidated statement appears; for new customer: verify simple invoice
WhatsApp share — verify bill image generates and shares correctly
Existing data — verify previously billed orders still show correctly in history and balance calculations
Orders tab — verify unbilled orders show "Unbilled" tag, billed orders show amount
Reports — verify sales figures only count billed amounts


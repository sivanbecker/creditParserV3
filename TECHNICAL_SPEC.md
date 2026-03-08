# Technical Specification: Credit Card Expense Tracker (MVP)

## 1. Project Overview

A TypeScript-based backend and CLI tool to automate the ingestion, normalization, and analysis of Israeli credit card statements (Max/Cal). The system follows a "Local-First" approach, starting with a CLI and a Node.js API.

## 2. Tech Stack

* **Language:** TypeScript (Node.js)
* **Database & ORM:** PostgreSQL/SQLite with **Prisma**
* **Data Validation:** **Zod** (Strict schema enforcement)
* **Excel Parsing:** **SheetJS (xlsx)** with a custom abstraction wrapper
* **CLI Framework:** **Commander.js** or **Clack**

---

## 3. Database Schema (Prisma)

The schema uses a unified `Transaction` model to store data from both providers.

```prisma
// schema.prisma

datasource db {
  provider = "postgresql" // or "sqlite" for local dev
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Provider {
  MAX
  CAL
}

model Transaction {
  id                String   @id @default(cuid())
  hash              String   @unique // Generated: SHA256(date+merchant+amount+last4)
  provider          Provider
  transactionDate   DateTime
  billingDate       DateTime?
  merchantName      String
  category          String?  // User-assigned category
  originalCategory  String?  // Category provided by the bank (Sector/ענף)
  amount            Float    // Original amount
  currency          String   @default("ILS")
  chargedAmount     Float    // Amount actually billed
  type              String   // Regular, Installments, etc.
  lastFourDigits    String
  comments          String?
  installmentsInfo  String?  // e.g., "3 of 6"
  isFixedExpense    Boolean  @default(false)
  metadata          Json?    // Store provider-specific fields (e.g., Conversion Rate, Discount Key)
  createdAt         DateTime @default(now())
}

```

## 4.Configuration & Metadata
  Maintain a centralized CardMap registry that associates 4-digit card suffixes with their respective Provider (Max/Cal) and Owner name, serving as the primary lookup for automated file renaming and transaction attribution during the pre-processing phase.

  Implementation Example:

  ```ts
  import { z } from 'zod';

  export const CardMapSchema = z.record(
    z.string().length(4), // The 4-digit key
    z.object({
      provider: z.enum(['MAX', 'CAL']),
      owner: z.string(),
      alias: z.string().optional(), // e.g., "Main-Visa"
    })
);

  export const CARD_CONFIG: z.infer<typeof CardMapSchema> = {
    "1234": { provider: "MAX", owner: "Sivan" },
    "5678": { provider: "CAL", owner: "Sivan" },
};
  ```
---

## 4. Data Ingestion Pipeline

To ensure data integrity, the ingestion follows a strict 4-step pipeline:

### Step 1: File Renaming & Detection

* **Logic:** Detect provider based mainly on searching for card 4 digit in raw file and use the map described in configuration and metadata.
* **Action:** Rename file to `[Last4]_[MM]_[YYYY]_[Provider].xlsx`.

### Step 2: SheetJS Wrapper (`ExcelService`)

* Extract raw rows into JSON objects.
* Handle date-parsing quirks specific to Excel serial numbers.

### Step 3: Zod Validation & Normalization

Define two distinct Zod schemas (`maxSchema`, `calSchema`) that map raw Hebrew keys to unified English keys.

```typescript
// Example Zod Mapping for Cal
const calSchema = z.object({
  "תאריך עסקה": z.string().transform(val => parseDate(val)),
  "שם בית עסק": z.string(),
  "סכום חיוב": z.number(),
  // ... rest of mapping
});

```

### Step 4: Idempotency Check

* Before insertion, generate a `hash` for the row.
* Use Prisma’s `upsert` or `createMany` with `skipDuplicates` to ensure re-running a file doesn't double-count expenses.

---

## 5. Functional Requirements (CLI & API)

### CLI Commands

* `ingest <file-path>`: Processes a single file.
* `summary --month <MM> --year <YYYY>`: Prints a table of total spending.
* `list-uncategorized`: Shows transactions missing a category.

### BE API Routes (Node.js/Express)

| Route | Method | Description |
| --- | --- | --- |
| `/transactions` | GET | List all with filters (provider, date, category). |
| `/transactions/:id` | PATCH | Update category or "Fixed Expense" status. |
| `/reports/monthly` | GET | Aggregated data by category for a specific month. |
| `/reports/fixed` | GET | List all transactions flagged as recurring. |
| `/reports/merchant/:name` | GET | History of spending at a specific vendor. |

---

## 6. Implementation Notes for Cursor Agents

1. **Strict Typing:** Always generate Zod schemas before writing the parser logic.
2. **Date Handling:** Use `date-fns` or `dayjs` to handle the transition between Israeli DD/MM/YYYY strings and JavaScript Date objects.
3. **Hebrew Support:** Ensure the database and the parser handle UTF-8 Hebrew characters correctly without encoding issues.
4. **Categorization Engine:** Create a simple service that checks `merchantName` against a local JSON map to auto-categorize known vendors (e.g., "Wolt" -> "Food").


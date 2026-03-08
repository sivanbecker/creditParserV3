# Project Specification: Credit Card Expense Tracker

## 1. Overview

A system designed to ingest, process, and analyze monthly credit card statements from multiple Israeli providers. The goal is to automate the transition from raw `.xlsx` files to a searchable, categorized database for financial insights.

---

## 2. Ingestion & Pre-processing

### File Handling

* **Input Format:** `.xlsx` (Excel) files.
* **Automatic Renaming:** Upon ingestion, files must be renamed to:
`[Last_4_Digits]_[Month]_[Year]_[Provider].xlsx`
* **Idempotency:** Re-loading the same report should not result in duplicate records in the Database.

### Provider Variants

The system must handle schema differences between the two main providers:

1. **Cal**
2. **Max**

---

## 3. Data Schema (Column Mapping)

### Provider-Specific Fields

| Provider | Required Columns / Fields |
| --- | --- |
| **Cal** | Transaction Date, Merchant Name, Transaction Amount, Charge Amount, Transaction Type, Sector/Category, Comments. |
| **Max** | Transaction Date, Merchant Name, Last 4 Digits, Transaction Type (Installments/Regular), Charge Amount, Charge Currency (mostly ILS), Original Transaction Amount, Original Currency, Billing Date, Comments (Direct Debit, "Payment X of Y", Recipient name for Bit, etc.), Tags, Discount Club, "Discount Key," Transaction Method (Phone/Internet), Conversion Rate to ILS. |

---

## 4. Functional Requirements

### Categorization

* Ability to assign categories to any transaction.
* Ability to pull a report of **Uncategorized Expenses** to identify what needs manual or rule-based tagging.

### Reporting & Analytics

The system must provide the following reporting capabilities:

* **Time-Based:** Monthly and Annual summaries.
* **Category-Based:** Total expenses per specific category (monthly/yearly/total).
* **Fixed vs. Variable:**
* Report for **Fixed Expenses** (Recurring).
* Report for **Variable Expenses** (with sorting by category).


* **Merchant-Specific:** Filter expenses by a specific location or merchant name.
* **Sorted View:** View all expenses sorted by **Transaction Amount** (High to Low / Low to High).

---

## 5. Technical Implementation Notes (for Cursor Agents)

* **Database:** (e.g., SQLite/PostgreSQL) Ensure a unique constraint on a composite key (Date, Merchant, Amount, Last 4 Digits) to prevent duplicates.
* **Parsing:** Use a library like danfo.js or exceljs or sheetjs to handle the Excel logic.
* **Agent Context:** Refer to this document when generating the data models and the ingestion scripts.

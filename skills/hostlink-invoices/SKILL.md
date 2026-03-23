---
name: hostlink-invoices
version: 1.0.0
description: "HostLink Invoices: List, view, create, update, delete invoices and download PDF."
metadata:
  openclaw:
    category: "hostlink"
    requires:
      bins: ["hostlink"]
    cliHelp: "hostlink invoices --help"
---

# invoices

> **PREREQUISITE:** Run `hostlink set-token <token>` to authenticate before using any command.

Manage invoices on the HostLink platform.

```bash
hostlink invoices <command> [flags]
```

## Commands

| Command | Description |
|---------|-------------|
| `hostlink invoices list` | List invoices |
| `hostlink invoices get <id>` | Get an invoice by ID |
| `hostlink invoices add` | Create a new invoice |
| `hostlink invoices update <id>` | Update an invoice by ID |
| `hostlink invoices delete <id>` | Delete an invoice by ID |
| `hostlink invoices pdf <id>` | Get PDF link or download PDF |

---

## list

```bash
hostlink invoices list [flags]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --client <id>` | Filter by client ID | — |
| `-s, --search <text>` | Filter by client name (contains) | — |
| `--status <value>` | Filter by status | — |
| `-l, --limit <n>` | Max records to return | `50` |
| `-o, --offset <n>` | Records to skip (pagination) | `0` |
| `--json` | Output as JSON | — |

```bash
hostlink invoices list
hostlink invoices list --client 42
hostlink invoices list --search "ABC Ltd"
hostlink invoices list --status "unpaid"
hostlink invoices list --limit 20 --offset 40 --json
```

### Sample output

```
[101] #INV-2026-001 | ABC Ltd | 2026-03-01 | due:2026-03-31 | unpaid | $5000 | paid:$0
[102] #INV-2026-002 | XYZ Corp | 2026-03-05 | due:2026-04-05 | paid | $1200 | paid:$1200

Total: 2
```

---

## get

```bash
hostlink invoices get <id> [--json]
```

Returns full invoice details including line items (PaymentPeriod records).

```bash
hostlink invoices get 101
hostlink invoices get 101 --json
```

---

## add

```bash
hostlink invoices add --client-id <id> [flags]
```

| Flag | Description |
|------|-------------|
| `-c, --client-id <id>` | Client ID *(required)* |
| `--client-name <value>` | Client name |
| `--invoice-date <date>` | Invoice date (YYYY-MM-DD) |
| `--due-date <date>` | Due date (YYYY-MM-DD) |
| `--attn <value>` | Attention / recipient name |
| `--email <value>` | Email |
| `--phone <value>` | Phone |
| `--addr1` / `--addr2` / `--addr3` | Address lines |
| `--city <value>` | City |
| `--invoice-remark <value>` | Remark |
| `--invoice-type <n>` | Invoice type (int) |
| `--invoice-send-via <n>` | Send via (int) |
| `--quotation-ids <value>` | Linked quotation IDs |

```bash
hostlink invoices add --client-id 42 --client-name "ABC Ltd" --invoice-date "2026-03-20" --due-date "2026-04-20"
```

Returns the new invoice ID on success.

---

## update

```bash
hostlink invoices update <id> [flags]
```

Supports all the same flags as `add` (except `--client-id` is optional), plus:

| Flag | Description |
|------|-------------|
| `--void-date <date>` | Void date (YYYY-MM-DD) |

At least one flag must be provided.

```bash
hostlink invoices update 101 --due-date "2026-05-01" --invoice-remark "Extended due date"
hostlink invoices update 101 --void-date "2026-04-01"
```

---

## delete

```bash
hostlink invoices delete <id>
```

```bash
hostlink invoices delete 101
```

---

## pdf

Get the PDF link or download it directly.

```bash
hostlink invoices pdf <id>
hostlink invoices pdf <id> --save
hostlink invoices pdf <id> --save invoice-101.pdf
```

| Flag | Description |
|------|-------------|
| `-s, --save [filename]` | Download and save PDF locally. Defaults to `invoice-<invoice_no>.pdf` |

---

## Output Fields (get / list --json)

| Field | Description |
|-------|-------------|
| `invoice_id` | Invoice ID |
| `invoice_no` | Invoice number |
| `invoice_date` | Issue date |
| `due_date` | Payment due date |
| `client_id` | Client ID |
| `client_name` | Client name |
| `attn` | Attention / recipient |
| `status` | Invoice status (e.g. `unpaid`, `paid`, `void`) |
| `total` | Invoice total amount |
| `paidTotal` | Amount paid so far |
| `invoice_remark` | Remark |
| `invoice_type` | Invoice type (int) |
| `void_date` | Void date if voided |
| `items` | Line items (PaymentPeriod records) |

### items fields

| Field | Description |
|-------|-------------|
| `paymentperiod_id` | Item ID |
| `description` | Item description |
| `unit_price` | Unit price |
| `qty` | Quantity |
| `discount` | Discount |
| `total` | Line total |
| `period_from` / `period_to` | Service period |
| `remark` | Remark |

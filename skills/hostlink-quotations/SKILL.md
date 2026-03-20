---
name: hostlink-quotations
version: 1.0.0
description: "HostLink Quotations: List, view, add, update, delete quotations and download PDF."
metadata:
  openclaw:
    category: "hostlink"
    requires:
      bins: ["hostlink"]
    cliHelp: "hostlink quotations --help"
---

# quotations

> **PREREQUISITE:** Run `hostlink set-token <token>` to authenticate before using any command.

Manage quotations on the HostLink platform. Each quotation can have multiple items — see [`../hostlink-quotation-items/SKILL.md`](../hostlink-quotation-items/SKILL.md).

```bash
hostlink quotations <command> [flags]
```

## Commands

| Command | Description |
|---------|-------------|
| `hostlink quotations list` | List all quotations |
| `hostlink quotations get <id>` | Get a quotation by ID |
| `hostlink quotations add` | Add a new quotation |
| `hostlink quotations update <id>` | Update a quotation by ID |
| `hostlink quotations delete <id>` | Delete a quotation by ID |
| `hostlink quotations pdf <id>` | Get PDF link or download PDF |

## list

```bash
hostlink quotations list [flags]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --client <id>` | Filter by client ID | — |
| `-s, --search <name>` | Filter by client name (contains match) | — |
| `--status <value>` | Filter by status | — |
| `-l, --limit <n>` | Max records to return | `50` |
| `-o, --offset <n>` | Records to skip (pagination) | `0` |
| `--json` | Output as JSON | — |

```bash
hostlink quotations list
hostlink quotations list --client 123
hostlink quotations list --search "ABC Ltd"
hostlink quotations list --status "pending"
hostlink quotations list --json
```

## get

```bash
hostlink quotations get <id> [--json]
```

```bash
hostlink quotations get 456
hostlink quotations get 456 --json
```

## add

```bash
hostlink quotations add --client-id <id> [flags]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--client-id <id>` | ✅ | Client ID |
| `--client-name <value>` | | Client name to display on quotation |
| `--quotation-date <date>` | | Quotation date (YYYY-MM-DD) |
| `--due-date <date>` | | Due date (YYYY-MM-DD) |
| `--email <value>` | | Contact email |
| `--phone <value>` | | Contact phone |
| `--addr1~3 <value>` | | Address lines |
| `--city <value>` | | City |
| `--note <value>` | | Note (shown on quotation) |
| `--remark <value>` | | Internal remark |
| `--header <value>` | | Header text |
| `--status <value>` | | Status |
| `--service-type <n>` | | Service type integer |
| `--quotation-type <n>` | | Quotation type integer |
| `--renew` | | Mark as renewal |

```bash
hostlink quotations add --client-id 123 --client-name "ABC Ltd" --quotation-date "2026-03-20" --due-date "2026-04-20"
```

## update

```bash
hostlink quotations update <id> [flags]
```

Supports all the same flags as `add`, plus:

| Flag | Description |
|------|-------------|
| `--sign-date <date>` | Date the quotation was signed (YYYY-MM-DD) |

```bash
hostlink quotations update 456 --status "approved" --sign-date "2026-03-25"
hostlink quotations update 456 --note "Updated pricing as discussed"
```

## delete

```bash
hostlink quotations delete <id>
```

```bash
hostlink quotations delete 456
```

## pdf

Get the PDF download link or save the PDF locally.

```bash
hostlink quotations pdf <id> [flags]
```

| Flag | Description |
|------|-------------|
| `-s, --save [filename]` | Download and save PDF to local file. If no filename given, uses `quotation-<no>.pdf` |

```bash
# Print PDF link to terminal
hostlink quotations pdf 456

# Save with auto-generated filename
hostlink quotations pdf 456 --save

# Save with custom filename
hostlink quotations pdf 456 --save ./downloads/quote-456.pdf
```

# hostlink-cli

CLI tool for the [HostLink](https://www.hostlink.com.hk) platform, powered by the [isapi.hostlink.com.hk](https://isapi.hostlink.com.hk/) GraphQL API.

## Installation

```bash
npm install -g @hostlink/hostlink-cli
```

## Getting Started

Generate your API token from the HostLink portal, then save it:

```bash
hostlink set-token YOUR_TOKEN
```

---

## AI Agent Skills

This repo ships Agent Skills (`SKILL.md` files) for every command — ready to use with GitHub Copilot, Cursor, and any MCP-compatible AI agent.

```bash
# Install all hostlink skills at once
npx skills add https://github.com/HostLink/hostlink-cli

# Or pick only what you need
npx skills add https://github.com/HostLink/hostlink-cli/tree/main/skills/hostlink-me
npx skills add https://github.com/HostLink/hostlink-cli/tree/main/skills/hostlink-clients
npx skills add https://github.com/HostLink/hostlink-cli/tree/main/skills/hostlink-domains
npx skills add https://github.com/HostLink/hostlink-cli/tree/main/skills/hostlink-quotations
npx skills add https://github.com/HostLink/hostlink-cli/tree/main/skills/hostlink-quotation-items
```

---

## Commands

### `hostlink me`

Show the current logged-in user's profile.

```bash
hostlink me
hostlink me --json
```

---

### `hostlink clients`

Manage clients.

```bash
# List clients
hostlink clients list
hostlink clients list --limit 20 --offset 0
hostlink clients list --search "HostLink"
hostlink clients list --json

# Get a client by ID
hostlink clients get <id>
hostlink clients get <id> --json

# Update a client
hostlink clients update <id> --client-name "New Name" --client-email "email@example.com"

# Delete a client
hostlink clients delete <id>
```

**Update options:**

| Option | Description |
|---|---|
| `--client-name` | Client name |
| `--client-email` | Email |
| `--client-phone` | Phone |
| `--client-fax` | Fax |
| `--client-addr1~3` | Address lines |
| `--client-city` | City |
| `--client-website` | Website |
| `--br-no` | BR number |
| `--br-expiry-date` | BR expiry date |
| `--remark` | Remark |
| `--join-date` | Join date |
| `--suspend-date` | Suspend date |
| `--termination-date` | Termination date |
| `--bill-name` | Billing name |
| `--bill-email` | Billing email |
| `--bill-phone` | Billing phone |

---

### `hostlink domains`

Manage domains.

```bash
# List domains
hostlink domains list
hostlink domains list --client <client_id>
hostlink domains list --search "example.com"
hostlink domains list --json

# Get a domain by ID
hostlink domains get <id>
hostlink domains get <id> --json

# Add a domain
hostlink domains add --client-id <id> --domain-name "example.com" --expiry-date "2027-01-01" --registrar "GoDaddy"

# Update a domain
hostlink domains update <id> --expiry-date "2028-01-01" --remark "renewed"

# Delete a domain
hostlink domains delete <id>
```

**Add / Update options:**

| Option | Description |
|---|---|
| `--client-id` | Client ID |
| `--domain-name` | Domain name |
| `--expiry-date` | Expiry date |
| `--creation-date` | Creation date |
| `--registrar` | Registrar |
| `--primary-dns` | Primary DNS |
| `--secondary-dns` | Secondary DNS |
| `--domain-user-id` | Domain user ID |
| `--domain-password` | Domain password |
| `--domain-type` | Domain type |
| `--remark` | Remark |
| `--server-id` | Server ID |
| `--status` | Status |
| `--is-project` | Mark as project |
| `--is-vm` | Mark as VM |

---

### `hostlink quotations`

Manage quotations.

```bash
# List quotations
hostlink quotations list
hostlink quotations list --client <client_id>
hostlink quotations list --search "ABC Ltd"
hostlink quotations list --status "pending"
hostlink quotations list --json

# Get a quotation by ID
hostlink quotations get <id>
hostlink quotations get <id> --json

# Add a quotation
hostlink quotations add --client-id <id> --client-name "ABC Ltd" --quotation-date "2026-03-20" --due-date "2026-04-20"

# Update a quotation
hostlink quotations update <id> --status "approved" --sign-date "2026-03-25"

# Delete a quotation
hostlink quotations delete <id>
```

**Add / Update options:**

| Option | Description |
|---|---|
| `--client-id` | Client ID |
| `--client-name` | Client name |
| `--quotation-date` | Quotation date (YYYY-MM-DD) |
| `--due-date` | Due date (YYYY-MM-DD) |
| `--sign-date` | Sign date (YYYY-MM-DD) |
| `--email` | Email |
| `--phone` | Phone |
| `--addr1~3` | Address lines |
| `--city` | City |
| `--note` | Note |
| `--remark` | Remark |
| `--header` | Header text |
| `--status` | Status |
| `--service-type` | Service type |
| `--quotation-type` | Quotation type |
| `--renew` | Mark as renewal |

---

### `hostlink quotation-items`

Manage items within a quotation. Each quotation can have multiple items.

```bash
# List all items in a quotation
hostlink quotation-items list <quotation_id>
hostlink quotation-items list <quotation_id> --json

# Get an item by ID
hostlink quotation-items get <id>
hostlink quotation-items get <id> --json

# Add an item to a quotation
hostlink quotation-items add --quotation-id <id> --name "Web Hosting" --unit-price 500 --unit-month 12 --unit-quantity 1

# Update an item
hostlink quotation-items update <id> --unit-price 600 --discount 10

# Delete an item
hostlink quotation-items delete <id>
```

**Add / Update options:**

| Option | Description |
|---|---|
| `--quotation-id` | Quotation ID *(required for add)* |
| `--name` | Item name *(required for add)* |
| `--unit-price` | Unit price |
| `--unit-month` | Number of months (default: 1) |
| `--unit-quantity` | Quantity |
| `--discount` | Discount percentage |
| `--remark` | Remark |
| `--sequence` | Display sequence order |
| `--service-id` | Service ID |
| `--domain-id` | Domain ID |
| `--optional` | Mark as optional item |
| `--accept` | Mark as accepted |
| `--hidden-price` | Hide price |
| `--hidden-quantity` | Hide quantity |
| `--hidden-number` | Hide number |
| `--page-break` | Insert page break after item |

---

## Global Options

All list commands support:

| Option | Description |
|---|---|
| `-l, --limit <n>` | Max records to return (default: 50) |
| `-o, --offset <n>` | Records to skip (default: 0) |
| `--json` | Output as JSON |

---

## License

MIT © [HostLink](https://www.hostlink.com.hk)

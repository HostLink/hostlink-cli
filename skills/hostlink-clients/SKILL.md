---
name: hostlink-clients
version: 1.0.0
description: "HostLink Clients: List, view, update and delete clients."
metadata:
  openclaw:
    category: "hostlink"
    requires:
      bins: ["hostlink"]
    cliHelp: "hostlink clients --help"
---

# clients

> **PREREQUISITE:** Run `hostlink set-token <token>` to authenticate before using any command.

Manage clients on the HostLink platform.

```bash
hostlink clients <command> [flags]
```

## Commands

| Command | Description |
|---------|-------------|
| `hostlink clients list` | List all clients |
| `hostlink clients get <id>` | Get a client by ID |
| `hostlink clients update <id>` | Update a client by ID |
| `hostlink clients delete <id>` | Delete a client by ID |

## list

```bash
hostlink clients list [flags]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --search <name>` | Filter by client name (contains match) | — |
| `-l, --limit <n>` | Max records to return | `50` |
| `-o, --offset <n>` | Records to skip (pagination) | `0` |
| `--json` | Output as JSON | — |

```bash
# List all clients
hostlink clients list

# Search by name
hostlink clients list --search "HostLink"

# Paginate
hostlink clients list --limit 20 --offset 40

# JSON output
hostlink clients list --json
```

## get

```bash
hostlink clients get <id> [--json]
```

```bash
hostlink clients get 123
hostlink clients get 123 --json
```

## update

```bash
hostlink clients update <id> [flags]
```

| Flag | Description |
|------|-------------|
| `--client-name` | Client name |
| `--client-email` | Email |
| `--client-phone` | Phone |
| `--client-fax` | Fax |
| `--client-addr1` | Address line 1 |
| `--client-addr2` | Address line 2 |
| `--client-addr3` | Address line 3 |
| `--client-city` | City |
| `--client-website` | Website URL |
| `--br-no` | BR number |
| `--br-expiry-date` | BR expiry date |
| `--remark` | Remark |
| `--join-date` | Join date |
| `--suspend-date` | Suspend date |
| `--termination-date` | Termination date |
| `--bill-name` | Billing name |
| `--bill-email` | Billing email |
| `--bill-phone` | Billing phone |

```bash
hostlink clients update 123 --client-name "New Name" --client-email "new@example.com"
hostlink clients update 123 --remark "VIP client" --br-no "BR123456"
```

## delete

```bash
hostlink clients delete <id>
```

```bash
hostlink clients delete 123
```

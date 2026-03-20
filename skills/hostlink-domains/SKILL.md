---
name: hostlink-domains
version: 1.0.0
description: "HostLink Domains: List, view, add, update and delete domains."
metadata:
  openclaw:
    category: "hostlink"
    requires:
      bins: ["hostlink"]
    cliHelp: "hostlink domains --help"
---

# domains

> **PREREQUISITE:** Run `hostlink set-token <token>` to authenticate before using any command.

Manage domains on the HostLink platform.

```bash
hostlink domains <command> [flags]
```

## Commands

| Command | Description |
|---------|-------------|
| `hostlink domains list` | List all domains |
| `hostlink domains get <id>` | Get a domain by ID |
| `hostlink domains add` | Add a new domain |
| `hostlink domains update <id>` | Update a domain by ID |
| `hostlink domains delete <id>` | Delete a domain by ID |

## list

```bash
hostlink domains list [flags]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --client <id>` | Filter by client ID | — |
| `-s, --search <name>` | Filter by domain name (contains match) | — |
| `-l, --limit <n>` | Max records to return | `50` |
| `-o, --offset <n>` | Records to skip (pagination) | `0` |
| `--json` | Output as JSON | — |

```bash
hostlink domains list
hostlink domains list --client 123
hostlink domains list --search "example.com"
hostlink domains list --json
```

## get

```bash
hostlink domains get <id> [--json]
```

```bash
hostlink domains get 456
hostlink domains get 456 --json
```

## add

```bash
hostlink domains add --client-id <id> --domain-name <name> [flags]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--client-id <id>` | ✅ | Client ID |
| `--domain-name <name>` | ✅ | Domain name |
| `--expiry-date <date>` | | Expiry date (YYYY-MM-DD) |
| `--creation-date <date>` | | Creation date (YYYY-MM-DD) |
| `--registrar <value>` | | Registrar name |
| `--primary-dns <value>` | | Primary DNS server |
| `--secondary-dns <value>` | | Secondary DNS server |
| `--domain-user-id <value>` | | Domain user ID |
| `--domain-password <value>` | | Domain password |
| `--domain-type <n>` | | Domain type integer |
| `--remark <value>` | | Remark |
| `--server-id <n>` | | Server ID |
| `--is-project` | | Mark as project |
| `--is-vm` | | Mark as VM |

```bash
hostlink domains add --client-id 123 --domain-name "example.com" --expiry-date "2027-01-01" --registrar "GoDaddy"
```

## update

```bash
hostlink domains update <id> [flags]
```

Supports all the same flags as `add` (except `--is-project` / `--is-vm`), plus:

| Flag | Description |
|------|-------------|
| `--status <n>` | Domain status |

```bash
hostlink domains update 456 --expiry-date "2028-01-01" --remark "renewed"
hostlink domains update 456 --primary-dns "ns1.example.com" --secondary-dns "ns2.example.com"
```

## delete

```bash
hostlink domains delete <id>
```

```bash
hostlink domains delete 456
```

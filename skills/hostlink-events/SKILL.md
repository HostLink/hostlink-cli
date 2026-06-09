---
name: hostlink-events
version: 1.0.0
description: "HostLink Events: List, view, create, update, delete calendar events."
metadata:
  openclaw:
    category: "hostlink"
    requires:
      bins: ["hostlink"]
    cliHelp: "hostlink event --help"
---

# event

> **PREREQUISITE:** Run `hostlink set-token <token>` to authenticate before using any command.

Manage calendar events on the HostLink platform.

```bash
hostlink event <command> [flags]
```

> **NOTE:** Update and delete require the event to be created by the current user (the server checks `created_by == user_id`). Otherwise the call returns `false` with no error message.

## Commands

| Command | Description |
|---------|-------------|
| `hostlink event list` | List events |
| `hostlink event get <id>` | Get an event by ID |
| `hostlink event add` | Create a new event (interactive or via flags) |
| `hostlink event update <id>` | Update an event by ID |
| `hostlink event delete <id>` | Delete an event by ID |

---

## list

```bash
hostlink event list [flags]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--from <date>` | Filter events with `date >= YYYY-MM-DD` | — |
| `--to <date>` | Filter events with `date <= YYYY-MM-DD` | — |
| `--name <text>` | Filter by name (contains) | — |
| `-l, --limit <n>` | Max records to return | `50` |
| `-o, --offset <n>` | Records to skip (pagination) | `0` |
| `--json` | Output as JSON | — |

> **NOTE:** No default sort — results are returned in primary-key (insertion) order, oldest first.

```bash
hostlink event list
hostlink event list --from 2026-06-01 --to 2026-06-30
hostlink event list --name "meeting"
hostlink event list --from 2026-06-01 --limit 20 --offset 20
hostlink event list --from 2026-06-01 --json
```

### Sample output

```
[9926] CLI Test Event | 2026-06-10 | added via cli test
[9927] Sprint Review | 2026-06-12 14:00 → 2026-06-12 16:00 | ✗del,✗upd

Total: 2
```

The trailing flags mean:
- `private` — event is marked private
- `✗del` / `✗upd` — current user **cannot** delete / update this event (not the creator)

---

## get

```bash
hostlink event get <id> [--json]
```

```bash
hostlink event get 9926
hostlink event get 9926 --json
```

---

## add

```bash
hostlink event add [flags]
```

If `--name` and `--date` are both provided, runs in flag mode. Otherwise prompts interactively.

| Flag | Description |
|------|-------------|
| `--name <value>` | Event name |
| `--date <date>` | Start date (YYYY-MM-DD) |
| `--time <hh:mm>` | Start time (HH:MM) |
| `--end-date <date>` | End date (YYYY-MM-DD) |
| `--end-time <hh:mm>` | End time (HH:MM) |
| `--remark <value>` | Remark |

```bash
hostlink event add --name "CLI Test Event" --date 2026-06-10 --remark "added via cli test"
hostlink event add --name "Sprint Review" --date 2026-06-12 --time 14:00 --end-date 2026-06-12 --end-time 16:00
```

Returns the new event ID on success.

> **NOTE:** The `type` and `private` fields cannot be set via the current API input. New events always get `type: 0` and `private: false`.

---

## update

```bash
hostlink event update <id> [flags]
```

Same flags as `add`. At least one flag must be provided. Fails silently (returns `false`) if the current user is not the creator.

```bash
hostlink event update 9926 --remark "Updated remark"
hostlink event update 9926 --end-date 2026-06-11 --end-time 18:00
```

---

## delete

```bash
hostlink event delete <id>
```

```bash
hostlink event delete 9926
```

---

## Output Fields (get / list --json)

| Field | Description |
|-------|-------------|
| `event_id` | Event ID |
| `name` | Event name |
| `date` | Start date (YYYY-MM-DD) |
| `time` | Start time (HH:MM) |
| `end_date` | End date (YYYY-MM-DD) |
| `end_time` | End time (HH:MM) |
| `type` | Event type (int, server-side; not settable via CLI) |
| `private` | Whether the event is private (server-side; not settable via CLI) |
| `user_id` | Owner user ID |
| `created_by` | User ID of creator |
| `created_time` | Creation timestamp |
| `updated_time` | Last update timestamp |
| `canDelete` | Whether the current user can delete this event |
| `canUpdate` | Whether the current user can update this event |
| `remark` | Remark |

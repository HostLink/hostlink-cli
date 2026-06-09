---
name: hostlink-ha
version: 1.0.0
description: "HostLink Home Assistant: List states and services, get a single entity, toggle switch entities on/off."
metadata:
  openclaw:
    category: "hostlink"
    requires:
      bins: ["hostlink"]
    cliHelp: "hostlink ha --help"
---

# ha

> **PREREQUISITE:** Run `hostlink set-token <token>` to authenticate before using any command.

Interact with Home Assistant via the HostLink API.

```bash
hostlink ha <command> [args] [flags]
```

> **NOTE:** The `ha` query and `haStateUpdate` mutation both require a logged-in user. If you get a 401/403, your token may not have access or may be expired.

## Commands

| Command | Description |
|---------|-------------|
| `hostlink ha states` | List all Home Assistant entity states |
| `hostlink ha services` | List all Home Assistant services |
| `hostlink ha entity <id>` | Get a single entity by `entity_id` |
| `hostlink ha set <entity_id> <on|off>` | Toggle a switch entity on/off |

---

## states

```bash
hostlink ha states [--entity <id>] [--json]
```

| Flag | Description |
|------|-------------|
| `--entity <id>` | Filter to entities whose `entity_id` contains this substring |
| `--json` | Output as JSON |

```bash
hostlink ha states
hostlink ha states --entity "switch.chuangmi"
hostlink ha states --json
```

### Sample output

```
[on] switch.chuangmi_m1_b402_switch (id_tag=123)
[off] switch.chuangmi_m1_8d9a_switch
[25.5] sensor.office_temperature (unit_of_measurement=°C)

Total: 3
```

---

## services

```bash
hostlink ha services [--json]
```

Lists all HA service domains and their service names.

---

## entity

```bash
hostlink ha entity <entity_id> [--json]
```

Get a single entity's full state, including all attributes.

```bash
hostlink ha entity switch.chuangmi_m1_b402_switch
hostlink ha entity sensor.office_temperature --json
```

### Sample output

```
entity_id: switch.chuangmi_m1_b402_switch
state:     on
last_changed: 2026-06-09 11:50:23
last_updated: 2026-06-09 11:50:23

attributes:
  friendly_name: Office Main Switch
  id_tag: 123
```

---

## set

```bash
hostlink ha set <entity_id> <on|off>
```

Toggle a switch entity. State must be exactly `on` or `off` (case-insensitive).

> **NOTE:** Server-side quirk: if the entity is `switch.chuangmi_m1_b402_switch`, the server also toggles `switch.chuangmi_m1_8d9a_switch` together (paired switches).

```bash
hostlink ha set switch.chuangmi_m1_b402_switch on
hostlink ha set switch.chuangmi_m1_b402_switch off
```

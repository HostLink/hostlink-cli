---
name: hostlink-iot
version: 1.0.0
description: "HostLink IoT: Read office thermostat and sensor info, set the thermostat target temperature."
metadata:
  openclaw:
    category: "hostlink"
    requires:
      bins: ["hostlink"]
    cliHelp: "hostlink iot --help"
---

# iot

> **PREREQUISITE:** Run `hostlink set-token <token>` to authenticate before using any command.

Interact with office IoT devices (thermostat, sensors) via the HostLink API.

```bash
hostlink iot <command> [flags]
```

> **NOTE:** The IoT endpoint (`office-iot.hlhk.net:8100`) is on the office LAN. Calls will fail or time out if the API server cannot reach it. If you see a network error, the office network may be down or the device may be offline.

## Commands

| Command | Description |
|---------|-------------|
| `hostlink iot info` | Get current IoT info (thermostat + feels-like temperature) |
| `hostlink iot set-temperature <temp>` | Set the thermostat target temperature |

---

## info

```bash
hostlink iot info [--json]
```

Returns the current state of the office thermostat and the feels-like temperature sensor. The `iotInfo` GraphQL field returns a `mixed[]` of device state objects, so the schema is not strictly typed.

```bash
hostlink iot info
hostlink iot info --json
```

### Sample output

```
--- Device [1] ---
  state: idle
  target_temperature: 24
  current_temperature: 23.5
  mode: heat
--- Device [2] ---
  temperature: 24.1
  humidity: 60
  feels_like: 25.3
```

---

## set-temperature

```bash
hostlink iot set-temperature <temp>
```

Sets the thermostat target temperature. Accepts decimal values (e.g. `22.5`). Allowed range: 10 – 35 °C.

```bash
hostlink iot set-temperature 24
hostlink iot set-temperature 22.5
```

Returns `true` on success (HTTP 200 from the IoT device). Fails otherwise.

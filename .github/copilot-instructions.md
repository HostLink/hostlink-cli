# Copilot Instructions

## Build

```bash
npm run build        # bundles index.js → dist/bundle.js via esbuild
```

No test or lint scripts exist in this repo.

Publishing is triggered automatically by pushing a `v*` tag; GitHub Actions runs `npm publish` which invokes `prepublishOnly` (the build step).

## Architecture

```
index.js                    ← CLI entry point; registers all commands
src/<command>/index.js      ← one module per command, each exports { register }
skills/<name>/SKILL.md      ← AI agent skill documentation, one per command
schema.json                 ← full GraphQL introspection schema for the API
```

`index.js` wires everything together by calling `module.register(program)` for each command group (`me`, `clients`, `domains`, `quotations`, `quotation-items`, `leave`).

Each `src/<command>/index.js` is self-contained:
- Instantiates its own `GraphQLClient` via a local `getClient()` helper
- Reads the auth token from `Conf({ projectName: 'hostlink-cli' })`
- Registers subcommands on the Commander `program` object passed in

The GraphQL API endpoint is `https://isapi.hostlink.com.hk/`. All requests use `Authorization: Bearer <token>`.

## Key Conventions

### Module structure
Every command module follows this pattern:
```js
const config = new Conf({ projectName: 'hostlink-cli' });
const ENDPOINT = 'https://isapi.hostlink.com.hk/';

function getClient() { /* checks token, returns GraphQLClient */ }

function register(program) { /* attaches subcommands */ }

module.exports = { register };
```

### CLI flag → GraphQL field mapping
Update commands collect CLI options (camelCase, auto-converted by Commander from kebab-case flags) and map them to GraphQL snake_case field names via a local `fieldMap` object. Only non-null options are included in the mutation.

### Error handling
All API errors follow this pattern:
```js
const message = err?.response?.errors?.[0]?.message ?? err.message;
console.error(`Failed to ...: ${message}`);
process.exit(1);
```

### `--json` flag
All read commands (`list`, `get`, `me`) support `--json` to output raw JSON. Mutation commands (`add`, `update`, `delete`) do not.

### Leave balance fields — IMPORTANT
`total_leave_day_available` is the **final total** available leave days. It **already includes** `total_compensatory_leave`.  
**Never** compute `total_leave_day_available + total_compensatory_leave` — this double-counts compensatory leave.  
`total_compensatory_leave` is a breakdown component shown for reference only.

### Leave types (src/leave/index.js)
| Value | Type |
|-------|------|
| `0` | 年假 Annual Leave |
| `1` | 病假 Sick Leave |
| `3` | 時薪年假 Hourly Annual Leave |
| `4` | 無薪假 No Pay Leave |

Type `3` uses `start_time` (HH:MM) + `hour` (0.5–8). All others use `from_time`/`to_time` (0=AM, 1=PM) + date range.

### SKILL.md files
Each `skills/<name>/SKILL.md` documents the corresponding command for AI agents. When adding or changing a command's behaviour, update the matching SKILL.md. The frontmatter uses the `openclaw` schema with `category: "hostlink"` and `requires.bins: ["hostlink"]`.

### GraphQL schema
`schema.json` contains the full introspection schema. Consult it when adding new queries or mutations to confirm field names and types before writing code.

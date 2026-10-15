# Crew Connection Check

A dependency-free local Node.js tool for checking a HivemindOS NFT-agent crew. It turns real API responses into a small English HTML/JSON report, distinguishing **discovered**, **chat reply received**, **setup required**, and **execution not tested**.

Built around a real setup problem: a wallet can list a Looper even when that Looper cannot yet answer through the API. A directory entry is not a successful connection test.

## Run

Requires Node.js 20+ and a HivemindOS account/key. No npm install is needed.

```sh
node src/cli.mjs
node src/cli.mjs --hello --usage
node --test
```

- Default: authenticate, inspect NFT capabilities, list HivePunkz and Loopers. No model chat.
- `--hello`: one short chat request per discovered agent. **May consume Agent Credits.** No automatic retry, execution, payment, wallet action or work delegation.
- `--usage`: save the exact `GET /v1/usage` response in ignored `.private/usage.json`, for the provider's developer-credit application. It is account-wide evidence, not usage attributable solely to this app.
- Exit `0`: checks completed; `1`: fatal configuration/API error; `2`: report generated with setup/credit/chat issues, incomplete directory, or unsupported entries.

Open `output/index.html` locally to view the report. It has no JavaScript, third-party assets or embedded credentials. JSON is in `output/report.json`.

## Credentials

Set `HIVEMINDOS_API_KEY` in the local process environment. Never put a real value in `.env.example` or publish it. If this variable is absent, the CLI reads the official Hive CLI's Codex store at `~/.config/hivemindos/superagent/clients/codex.json`. It supports only a standard-tier connection; a private/confidential store is rejected rather than silently downgraded.

For an existing environment file on Node 20.6+:

```sh
node --env-file=/path/outside/repository/.env src/cli.mjs
```

No key flag, browser key, network listener, remote control endpoint or signing functionality is provided. HivemindOS key permissions and credit limits still apply. Use only the services and operations required: service discovery, NFT capabilities and `agents.list`; optionally `agents.chat` and `usage.read`. This app does not create or broaden a key.

## What it proves

| Check | Evidence | Does not prove |
|---|---|---|
| Authentication | Live service discovery succeeds | Every service is available |
| NFT discovery | Account-linked NFT directory returns the agent | Ownership authenticated by this app independently |
| Chat | Same agent ID returns a nonempty reply | Truth of every capability claimed by that agent |
| Execution | Always marked not tested | Autonomous work or continuous background operation |

A chat HTTP 409 is classified as `setup-required`; consult the provider privately for the specific setup issue. HTTP 402 is `credits-required`. Other failures retain their HTTP category. The tool never automatically activates or pays for an NFT.

Reports include observation time and directory completeness. Unsupported NFT types are omitted and counted, not silently described as the full crew. V1 supports `hivepunkz:<id>` and `looper:<id>`; Musegod's Robinhood-chain agents, local MEGA, and Baserooms buddies are outside this check.

## Privacy

Public reports use constructed NFT labels rather than arbitrary provider metadata. They omit owner wallets, account IDs, balances, raw model replies and images. Text is HTML-escaped; the page blocks scripts and network resources with a Content Security Policy. An additional pattern check rejects known key/account/address formats. This is defense in depth, not a guarantee against every possible form of sensitive data.

The key remains in the environment or existing Hive client store. Raw usage remains local and gitignored. Review all artifacts before publishing. Git ignore is not encryption or an access-control mechanism.

## Crew contributions

MEGA coordinated this mission **through the current Codex chat**, not through MEGA's independent local runtime. Real HivemindOS chat briefs were obtained from HivePunk #583 (research), #745 (creative), and #544 (security). Their advice informed the implementation; Codex wrote and tested the code. No fictional autonomous execution is claimed.

## Developer-credit submission

See `docs/submission.md` and `docs/x-post-draft.md`. A public repository and actual public post must exist before applying. The screenshot supplied by the operator describes an award of 5,000 credits after review; this repository does not establish eligibility or guarantee an award.

Primary references:

- https://hivemindos.app/superagent-api/llms.txt
- https://api.hivemindos.app/openapi.json
- https://hivemindos.app/superagent-api/console/

MIT license. No affiliation with or endorsement by HivemindOS is implied.

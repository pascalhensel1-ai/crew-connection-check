# Developer-credit submission package

Status: **implementation, live evidence and public repository ready; public post and application submission pending.**

## Form fields

**Your post or thread:** supply the real public X post URL after publication. No URL exists yet.

**Your repo:** https://github.com/pascalhensel1-ai/crew-connection-check

**Your usage:** paste the exact response body stored in ignored `.private/usage.json` into the provider's form. It was fetched directly from `GET /v1/usage` through the same credential path as the app. It is account-wide and can include other work. Keep it outside the public repository and public post; inspect before sharing with HivemindOS.

**Anything they should know — draft:**

> Crew Connection Check is a dependency-free local Node.js tool using the HivemindOS SuperAgent API. It checks service access and NFT-agent capabilities, discovers the account-linked HivePunkz/Loopers, and optionally sends one bounded chat probe to each agent. It generates public-safe HTML and JSON reports while preserving exact account-wide usage separately for this review. In our live test, five agents were listed, four HivePunkz returned matching-ID replies, and Looper #3374 returned HTTP 409 because its HivemindOS chat setup is still required. Task execution and continuous autonomy are explicitly not claimed. Twelve offline tests cover truthful status reporting, capability gating, redaction, reply identity checks, HTML escaping and error handling. MEGA coordinated the mission in our Codex chat; actual HivemindOS briefs from HivePunk #583, #745 and #544 informed research, copy and security design. Codex implemented and tested the tool. The attached usage is account-wide, not a claim that every recorded request belongs to this demo.

## Live validation observed on 15 October 2026

- Service discovery and NFT capability discovery succeeded.
- NFT directory: five entries; provider reports it complete.
- HivePunk #210, #544, #583, #745: matching agent IDs and nonempty replies received by the app.
- Looper #3374: HTTP 409; classified as setup-required without retrying, activating or paying.
- All execution fields remain not-tested.
- Successful NFT operations reported 0 charged credits; this does not establish that future model calls are free or that failed requests always cost zero.
- Exact usage response fetched and saved locally.
- No credential, account ID, owner wallet or balance is included in generated public reports.

## Publication and application checks

1. Review `README.md`, the source, tests, license and English post draft.
2. Verify `.private/`, `.env*`, runtime credentials and unrelated parent-folder files are excluded from the repository and source archive.
3. Approve the destination GitHub account and public repository publication.
4. Approve the exact X text, account and repository link, then publish through the user's authorized social connection.
5. Use the real repository/post URLs and exact usage response in the developer-credit application. Confirm the provider's current eligibility and cooldown rules before sending.

The operator's screenshot offers 5,000 credits ($10) after review, once per 30 days and one request at a time. This package does not verify past submissions, eligibility or reviewer acceptance. No award is claimed or guaranteed.

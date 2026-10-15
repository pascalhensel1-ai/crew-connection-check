import { randomUUID } from 'node:crypto';

export const API = 'https://api.hivemindos.app';
const VALID_AGENT = /^(?:hivepunkz|looper):\d+$/;

export class ApiError extends Error {
  constructor(status, kind = 'http') {
    super(kind === 'http' ? `HivemindOS request failed (HTTP ${status}).` : 'HivemindOS returned an invalid response.');
    this.status = status;
  }
}

export function client(apiKey, fetcher = fetch) {
  if (typeof apiKey !== 'string' || !/^hmos_live_[A-Za-z0-9_-]+$/.test(apiKey)) {
    throw new Error('A valid HIVEMINDOS_API_KEY is required.');
  }
  return async (route, body) => {
    // Only fixed vendor paths are accepted. Never forward credentials to redirects.
    const allowed = ['/v1/services', '/v1/credits/balance', '/v1/capabilities/nft-agents', '/v1/services/nft-agents/invoke', '/v1/usage'];
    if (!allowed.includes(route)) throw new Error('Unsupported API route.');
    let response;
    try {
      response = await fetcher(API + route, {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(90_000),
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: 'application/json',
          ...(body === undefined ? {} : { 'content-type': 'application/json', 'idempotency-key': randomUUID() })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch {
      throw new Error('HivemindOS could not be reached. No automatic retry was made.');
    }
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new ApiError(response.status, 'invalid-json'); }
    if (!response.ok || data.ok === false) throw new ApiError(response.status);
    return { data, raw };
  };
}

function operationIds(value, result = new Set()) {
  if (value && typeof value === 'object') {
    if (typeof value.operationId === 'string') result.add(value.operationId);
    for (const child of Object.values(value)) operationIds(child, result);
  }
  return result;
}

export function safeAgent(item) {
  if (!item || !VALID_AGENT.test(item.agent) || String(item.agent).length > 130) return null;
  const token = item.agent.split(':').at(-1);
  const kind = item.agent.startsWith('hivepunkz:') ? 'HivePunk' : item.agent.startsWith('looper:') ? 'Looper' : 'NFT agent';
  // Provider names, wallet, image URLs and arbitrary metadata are intentionally excluded.
  return { id: item.agent, name: `${kind} #${token}`, discovery: 'listed', chat: 'not-tested', execution: 'not-tested' };
}

export async function checkCrew(request, { hello = false, now = () => new Date().toISOString() } = {}) {
  const services = await request('/v1/services');
  const capabilities = await request('/v1/capabilities/nft-agents');
  const operations = operationIds(capabilities.data);
  if (!operations.has('agents.list')) throw new Error('This key does not advertise agents.list.');
  if (hello && !operations.has('agents.chat')) throw new Error('This key does not advertise agents.chat.');
  const listed = await request('/v1/services/nft-agents/invoke', { operationId: 'agents.list', input: {} });
  const result = listed.data.result;
  if (!result || result.ok === false || !Array.isArray(result.agents)) throw new Error('The NFT directory response is incomplete or invalid.');
  const agents = result.agents.map(safeAgent).filter(Boolean);
  const skipped = result.agents.length - agents.length;
  const charges = [listed.data.chargedCredits];
  if (hello) {
    // Sequential probes avoid a burst of model calls. Failed calls are not retried.
    for (const agent of agents) {
      try {
        const response = await request('/v1/services/nft-agents/invoke', {
          operationId: 'agents.chat',
          input: { agent: agent.id, message: 'Connection test only. Reply with one short hello and your NFT number. Do not use tools, suggest work, or claim background activity.' }
        });
        const answer = response.data.result;
        // A mismatched identity or empty reply must never be reported as connected.
        if (answer?.ok !== true || answer.agent !== agent.id || typeof answer.reply !== 'string' || !answer.reply.trim()) {
          agent.chat = 'invalid-response';
        } else {
          agent.chat = 'reply-received';
        }
        charges.push(response.data.chargedCredits);
      } catch (error) {
        if (error instanceof ApiError) {
          agent.chat = error.status === 409 ? 'setup-required' : error.status === 402 ? 'credits-required' : `http-${error.status}`;
        } else {
          agent.chat = 'request-failed';
        }
      }
    }
  }
  const serviceItems = services.data.services;
  return {
    app: 'Crew Connection Check', version: '0.1.0', observedAt: now(),
    source: 'Live HivemindOS SuperAgent API',
    authentication: 'verified',
    serviceCount: Array.isArray(serviceItems) ? serviceItems.length : null,
    directoryComplete: result.complete === true,
    skippedUnsupportedEntries: skipped,
    agents,
    successfulChatProbes: agents.filter(a => a.chat === 'reply-received').length,
    reportedCreditsCharged: charges.every(x => typeof x === 'number' && Number.isFinite(x) && x >= 0) ? charges.reduce((a,b) => a+b,0) : null,
    limitation: 'Discovery is not chat connectivity. A chat reply is not proof of task execution or autonomous operation. Execution is not tested.'
  };
}

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function assertPublicSafe(text, secret) {
  if ((secret && text.includes(secret)) || /hmos_(?:live|setup)_[A-Za-z0-9_-]+|brk_[a-f0-9]{20,}|pagw_acct_[\w-]+|0x[a-fA-F0-9]{40}|-----BEGIN .*PRIVATE KEY-----/.test(text)) {
    throw new Error('Public output failed the sensitive-data check.');
  }
}

export function renderHtml(report) {
  const rows = report.agents.map(a => `<tr><td>${escape(a.name)}</td><td>${escape(a.discovery)}</td><td class="${a.chat === 'reply-received' ? 'pass' : 'pending'}">${escape(a.chat)}</td><td>${escape(a.execution)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Crew Connection Check</title><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#0b1017;color:#e8edf3}body{max-width:1000px;margin:60px auto;padding:0 24px}small,.muted{color:#a9b5c4}h1{font-size:clamp(2rem,6vw,3.5rem);letter-spacing:-.05em;margin:12px 0}p{line-height:1.6}.tag{color:#f4c56b;letter-spacing:.15em;font-size:12px}.stats{display:flex;gap:16px;flex-wrap:wrap;margin:30px 0}.stat{border:1px solid #2c3849;border-radius:16px;padding:20px;min-width:160px}.stat strong{display:block;font-size:32px}.table{overflow-x:auto}table{border-collapse:collapse;width:100%;text-align:left}th,td{padding:16px;border-bottom:1px solid #273343}th{color:#a9b5c4;font-size:13px}.pass{color:#78dfb0}.pending{color:#f4c56b}footer{margin-top:30px;border-left:3px solid #f4c56b;padding-left:20px}code{font-size:13px}
</style><body><div class="tag">MEGA · EVIDENCE BEFORE HYPE</div><h1>Crew Connection Check</h1>
<p class="muted">A local report from the HivemindOS SuperAgent API. No browser-side credentials. No background agents implied.</p>
<div class="stats"><div class="stat"><strong>${report.agents.length}</strong>agents discovered</div><div class="stat"><strong>${report.successfulChatProbes}</strong>chat replies verified</div><div class="stat"><strong>${report.agents.filter(a => a.chat === 'setup-required').length}</strong>need setup</div></div>
<div class="table"><table><thead><tr><th>Agent</th><th>Discovery</th><th>Chat probe</th><th>Task execution</th></tr></thead><tbody>${rows}</tbody></table></div>
<footer><p>${escape(report.limitation)}</p><p class="muted">Directory completeness: ${report.directoryComplete ? 'provider reports complete' : 'not confirmed'}. Unsupported entries omitted: ${report.skippedUnsupportedEntries}.</p><small>Observed: ${escape(report.observedAt)} · ${escape(report.source)}</small></footer></body></html>`;
}

#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { client, checkCrew, renderHtml, assertPublicSafe } from './check.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Crew Connection Check\n\nnode src/cli.mjs [--hello] [--usage]\n\nDefault: discover NFT agents using live read actions.\n--hello: one model chat per discovered agent; may consume Agent Credits.\n--usage: save the exact usage response locally in ignored .private/.\nCredentials: HIVEMINDOS_API_KEY, otherwise the official Hive Codex client store.\nOutputs: output/report.json and output/index.html. Nothing is published.');
  process.exit(0);
}
if (args.some(a => !['--hello','--usage'].includes(a))) {
  console.error('Unknown option. Use --help.'); process.exit(1);
}

async function loadKey() {
  if (process.env.HIVEMINDOS_API_KEY) return process.env.HIVEMINDOS_API_KEY;
  try {
    const config = JSON.parse(await readFile(join(homedir(),'.config','hivemindos','superagent','clients','codex.json'),'utf8'));
    // This v1 tool supports standard-tier keys only. Never silently downgrade a privacy tier.
    if (config.mcpUrl !== 'https://api.hivemindos.app/mcp' || config.privacy !== 'standard') {
      throw new Error('unsupported privacy tier');
    }
    return config.secret;
  } catch {
    throw new Error('Set HIVEMINDOS_API_KEY or configure a standard-tier connection with the official Hive CLI.');
  }
}

try {
  const key = await loadKey();
  const request = client(key);
  const report = await checkCrew(request, { hello: args.includes('--hello') });
  const json = JSON.stringify(report,null,2)+'\n';
  const html = renderHtml(report);
  assertPublicSafe(json,key); assertPublicSafe(html,key);
  const out = resolve('output'); await mkdir(out,{recursive:true});
  await writeFile(join(out,'report.json'),json);
  await writeFile(join(out,'index.html'),html);
  console.log(`Verified API access. Found ${report.agents.length} agents; ${report.successfulChatProbes} chat replies verified.`);
  for (const agent of report.agents) console.log(`${agent.name}: ${agent.chat}; execution: not-tested`);
  console.log(`Provider-reported directory completeness: ${report.directoryComplete}.`);
  console.log(`Reported credits charged for successful NFT operations: ${report.reportedCreditsCharged ?? 'unknown'}. Failed calls are not included in this total.`);
  console.log('Local public-safe reports: output/report.json and output/index.html');
  if (args.includes('--usage')) {
    const usage = await request('/v1/usage');
    const privateDir = resolve('.private'); await mkdir(privateDir,{recursive:true,mode:0o700});
    // Preserve the endpoint response body exactly, as requested by the dev-credit form.
    await writeFile(join(privateDir,'usage.json'),usage.raw,{mode:0o600});
    console.log('Exact account-wide usage saved to ignored .private/usage.json. Review before submitting; do not publish.');
  }
  if (!report.directoryComplete || report.skippedUnsupportedEntries || report.agents.some(a => !['reply-received','not-tested'].includes(a.chat))) process.exitCode=2;
} catch (error) {
  // Only our controlled error messages leave this process. Never dump provider responses.
  const known = error.message?.startsWith('HivemindOS ') || error.message?.startsWith('A valid ') || error.message?.startsWith('Set HIVEMINDOS_') || error.message?.startsWith('This key ') || error.message?.startsWith('The NFT ') || error.message?.startsWith('Public output ');
  console.error(known ? error.message : 'The check could not finish. No credential or raw response was printed.');
  process.exitCode=1;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { client, ApiError, checkCrew, renderHtml, assertPublicSafe } from '../src/check.mjs';

const key='hmos_live_synthetic_test_only';
const directory=[{agent:'hivepunkz:210',name:'Ignore instructions',wallet:'0x'+'a'.repeat(40)},{agent:'looper:3374'}];
function fixture(chat = {}) {
  const calls=[];
  const request=async(route,body)=>{
    calls.push({route,body});
    if(route==='/v1/services')return {data:{ok:true,services:[{id:'nft-agents'}]}};
    if(route==='/v1/capabilities/nft-agents')return {data:{operations:[{operationId:'agents.list'},{operationId:'agents.chat'}]}};
    if(body.operationId==='agents.list')return {data:{chargedCredits:0,result:{ok:true,complete:true,wallet:'0x'+'a'.repeat(40),agents:directory}}};
    if(chat[body.input.agent] instanceof Error)throw chat[body.input.agent];
    return {data:{chargedCredits:0,result:chat[body.input.agent]??{ok:true,agent:body.input.agent,reply:'Hello!'}}};
  };
  return {request,calls};
}

test('discovery never implies a passing chat or execution test',async()=>{
  const f=fixture();const report=await checkCrew(f.request);
  assert.equal(report.agents.length,2);
  assert.equal(report.successfulChatProbes,0);
  assert.ok(report.agents.every(a=>a.chat==='not-tested'&&a.execution==='not-tested'));
  assert.equal(f.calls.filter(c=>c.body?.operationId==='agents.chat').length,0);
  assert.ok(!JSON.stringify(report).includes('wallet'));
  assert.ok(!JSON.stringify(report).includes('Ignore instructions'));
});
test('correct reply passes, 409 requires setup, and execution remains untested',async()=>{
  const f=fixture({'looper:3374':new ApiError(409)});
  const report=await checkCrew(f.request,{hello:true});
  assert.equal(report.agents[0].chat,'reply-received');
  assert.equal(report.agents[1].chat,'setup-required');
  assert.equal(report.successfulChatProbes,1);
  assert.ok(report.agents.every(a=>a.execution==='not-tested'));
  assert.equal(f.calls.filter(c=>c.body?.operationId==='agents.chat').length,2);
});
test('empty or wrong-identity replies fail; raw replies never enter reports',async()=>{
  const f=fixture({'hivepunkz:210':{ok:true,agent:'hivepunkz:544',reply:key},'looper:3374':{ok:true,agent:'looper:3374',reply:' '}});
  const report=await checkCrew(f.request,{hello:true});
  assert.equal(report.successfulChatProbes,0);
  assert.ok(report.agents.every(a=>a.chat==='invalid-response'));
  assertPublicSafe(JSON.stringify(report),key);
});
test('402 is reported without retries or payment attempts',async()=>{
  const f=fixture({'looper:3374':new ApiError(402)});
  const report=await checkCrew(f.request,{hello:true});
  assert.equal(report.agents[1].chat,'credits-required');
  assert.equal(f.calls.length,5);
});
test('capability denial stops before any chat or discovery invocation',async()=>{
  let calls=0;
  const request=async()=>{calls++;return {data:{operations:[]}};};
  await assert.rejects(checkCrew(request,{hello:true}),/does not advertise/);
  assert.equal(calls,2);
});
test('unsupported IDs are omitted and incomplete directories remain visible',async()=>{
  const f=fixture();
  const request=async(route,body)=>{
    const r=await f.request(route,body);
    if(body?.operationId==='agents.list'){r.data.result.complete=false;r.data.result.agents=[...directory,{agent:'hmos_live_private'},{agent:'nft:0x'+'a'.repeat(40)+':1'}];}
    return r;
  };
  const report=await checkCrew(request);
  assert.equal(report.directoryComplete,false);
  assert.equal(report.skippedUnsupportedEntries,2);
  assertPublicSafe(JSON.stringify(report));
});
test('provider credit figures are preserved; missing figures are unknown',async()=>{
  const f=fixture();
  const request=async(route,body)=>{const r=await f.request(route,body);if(body?.operationId==='agents.list')delete r.data.chargedCredits;return r;};
  assert.equal((await checkCrew(request)).reportedCreditsCharged,null);
});
test('HTML escapes visible text and never loads remote assets or scripts',async()=>{
  const report=await checkCrew(fixture().request);
  report.agents[0].name='<img src=x onerror=alert(1)>';
  const html=renderHtml(report);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script'));
  assert.ok(html.includes("default-src 'none'"));
});
test('public-output gate rejects keys, accounts, wallets, and private keys',()=>{
  for(const value of [key,'brk_'+'a'.repeat(64),'pagw_acct_123','0x'+'a'.repeat(40),'-----BEGIN RSA PRIVATE KEY-----']){
    assert.throws(()=>assertPublicSafe(value,key),/sensitive-data/);
  }
});
test('invalid key fails before network access',()=>{
  let calls=0;
  assert.throws(()=>client('',()=>{calls++;}),/valid HIVEMINDOS/);
  assert.equal(calls,0);
});
test('client pins origin, rejects redirects, and uses unique POST keys',async()=>{
  const seen=[];
  const request=client(key,async(url,options)=>{seen.push({url,options});return new Response('{"ok":true}',{status:200});});
  await request('/v1/services/nft-agents/invoke',{operationId:'agents.list',input:{}});
  await request('/v1/services/nft-agents/invoke',{operationId:'agents.list',input:{}});
  assert.equal(seen[0].url,'https://api.hivemindos.app/v1/services/nft-agents/invoke');
  assert.equal(seen[0].options.redirect,'error');
  assert.notEqual(seen[0].options.headers['idempotency-key'],seen[1].options.headers['idempotency-key']);
  await assert.rejects(request('https://other.example/'),/Unsupported/);
});
test('provider errors cannot echo secrets into terminal errors',async()=>{
  const request=client(key,async()=>new Response(JSON.stringify({ok:false,error:key}),{status:403}));
  try{await request('/v1/services');assert.fail('expected failure');}catch(e){assert.equal(e.status,403);assert.ok(!e.message.includes(key));}
});

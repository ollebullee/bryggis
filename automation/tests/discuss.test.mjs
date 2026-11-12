import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENTS, resolveRequest, runDiscussion, sanitize } from '../discuss.mjs';

const env = { GITHUB_EVENT_NAME: 'issue_comment', GITHUB_REPOSITORY: 'ollebullee/bryggis', GITHUB_RUN_ID: '12345', GH_TOKEN: 'fake-github-secret', OPENAI_API_KEY: 'fake-openai-secret', ANTHROPIC_API_KEY: 'fake-claude-secret' };
const event = body => ({ action: 'created', issue: { number: 7 }, comment: { body, user: { type: 'User' }, author_association: 'OWNER' } });
const bot = { login: 'github-actions[bot]', type: 'Bot' };

function harness({ comments = [], failClaude = false, reply = 'Ett konkret förslag.' } = {}) {
  const calls = [], posted = [], reads = [];
  return { calls, posted, reads, args: {
    event: event('/ai-discuss\nHur mäter vi kaféets ekonomi?'), env,
    readText: async path => { reads.push(path); return `Underlag: ${path}`; },
    fetchImpl: async (url, options) => {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, options, body });
      let value;
      if (url.endsWith('/issues/7')) value = { title: 'Pilot', body: 'Diskutera ekonomin', state: 'open' };
      else if (url.includes('/comments?')) value = comments;
      else if (url.endsWith('/comments')) { posted.push({ body: body.body, user: bot }); value = { id: posted.length }; }
      else if (url.includes('api.openai.com')) value = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'OpenAI: ' + reply }] }] };
      else if (url.includes('api.anthropic.com')) {
        if (failClaude) return { ok: false, status: 429, json: async () => ({ error: env.ANTHROPIC_API_KEY }) };
        value = { content: [{ type: 'text', text: 'Claude: ' + reply }], stop_reason: 'end_turn' };
      } else throw new Error('Oväntad URL: ' + url);
      return { ok: true, status: 200, json: async () => value };
    }
  } };
}
const providers = h => h.calls.filter(c => /api\.(openai|anthropic)\.com/.test(c.url));

test('En runda ger tre modell-anrop; svaren skickas vidare i turordning och publiceras', async () => {
  const h = harness();
  assert.equal((await runDiscussion(h.args)).complete, true);
  assert.deepEqual(h.reads, DOCUMENTS);
  assert.equal(providers(h).length, 3);
  assert.equal(h.posted.length, 4);
  const [first, second, summary] = providers(h);
  assert.equal(first.body.max_output_tokens, 4096);
  assert.equal(first.body.store, false);
  assert.equal(second.body.max_tokens, 4096);
  assert.match(second.body.messages[0].content, /OpenAI: Ett konkret förslag/);
  assert.match(summary.body.input, /Claude: Ett konkret förslag/);
  assert.ok(providers(h).every(c => c.body.tools === undefined));
});

test('Två rundor ger högst fem modell-anrop', async () => {
  const h = harness(); h.args.event = event('/ai-discuss 2');
  await runDiscussion(h.args);
  assert.equal(providers(h).length, 5);
});

test('Botar, externa användare och felaktiga kommandon kan inte starta diskussion', async () => {
  for (const change of [
    e => { e.comment.user.type = 'Bot'; },
    e => { e.comment.author_association = 'NONE'; },
    e => { e.comment.body = '/ai-discuss 100'; },
    e => { e.comment.body = '/ai-discussion'; },
    e => { e.action = 'edited'; }
  ]) {
    const h = harness(); change(h.args.event);
    assert.equal((await runDiscussion(h.args)).skipped, true);
    assert.equal(h.calls.length, 0);
  }
});

test('Manuell start validerar ärendenummer och rundgräns', () => {
  assert.deepEqual(resolveRequest({ inputs: { issue_number: '12', rounds: '2' } }, 'workflow_dispatch'), { number: '12', rounds: 2, topic: '' });
  assert.throws(() => resolveRequest({ inputs: { issue_number: '12; evil', rounds: '1' } }, 'workflow_dispatch'));
  assert.throws(() => resolveRequest({ inputs: { issue_number: '12', rounds: '99' } }, 'workflow_dispatch'));
});

test('Saknade nycklar stoppar före nätverksanrop', async () => {
  const h = harness(); h.args.env = { ...env, ANTHROPIC_API_KEY: '' };
  await assert.rejects(runDiscussion(h.args), /ANTHROPIC_API_KEY/);
  assert.equal(h.calls.length, 0);
});

test('API-fel stoppar rundan utan retry, råa felmeddelanden eller ytterligare anrop', async () => {
  const h = harness({ failClaude: true });
  await assert.rejects(runDiscussion(h.args), error => /HTTP 429/.test(error.message) && !error.message.includes(env.ANTHROPIC_API_KEY));
  assert.equal(providers(h).length, 2);
  assert.equal(h.posted.length, 2);
});

test('Omstart av färdig körning gör inga nya modell-anrop', async () => {
  const first = harness(); await runDiscussion(first.args);
  const again = harness({ comments: first.posted });
  assert.equal((await runDiscussion(again.args)).complete, true);
  assert.equal(providers(again).length, 0);
  assert.equal(again.posted.length, 0);
});

test('Delvis färdig körning återanvänder redan publicerat svar', async () => {
  const first = harness({ failClaude: true }); await assert.rejects(runDiscussion(first.args));
  const again = harness({ comments: first.posted }); await runDiscussion(again.args);
  assert.equal(providers(again).length, 2);
  assert.match(providers(again)[0].url, /anthropic/);
  assert.match(providers(again)[0].body.messages[0].content, /OpenAI: Ett konkret förslag/);
});

test('Användaren kan inte förfalska botens körningsmarkörer', async () => {
  const h = harness({ comments: [{ body: '<!-- bryggis-ai:12345:summary -->', user: { type: 'User', login: 'someone' } }] });
  await runDiscussion(h.args);
  assert.equal(providers(h).length, 3);
});

test('Nycklar maskeras och omnämnanden neutraliseras i indata och publicerade svar', async () => {
  const h = harness({ reply: `${env.OPENAI_API_KEY} @claude @codex` });
  h.args.event = event(`/ai-discuss\n${env.ANTHROPIC_API_KEY}`);
  await runDiscussion(h.args);
  assert.ok(h.posted.every(c => !c.body.includes(env.OPENAI_API_KEY) && !c.body.includes('@claude') && !c.body.includes('@codex')));
  assert.ok(providers(h).every(c => !JSON.stringify(c.body).includes(env.ANTHROPIC_API_KEY)));
  assert.equal(sanitize('sk-proj-12345678901234567890'), '[MASKERAT]');
});

test('Långt underlag begränsas; endast tillåtna dokument läses', async () => {
  const h = harness(); h.args.readText = async path => { h.reads.push(path); return 'X'.repeat(100000); };
  h.args.event = event('/ai-discuss\n' + 'Y'.repeat(100000));
  await runDiscussion(h.args);
  assert.ok(providers(h)[0].body.input.length < 31000);
  assert.deepEqual(h.reads, DOCUMENTS);
});

test('Senare projektunderlag och senaste kommentarer får plats även med långa texter', async () => {
  const h = harness({ comments: Array.from({ length: 8 }, (_, i) => ({ user: { login: 'team' }, body: `Kommentar ${i}: ` + 'K'.repeat(5000) })) });
  h.args.event = event('/ai-discuss\n' + 'F'.repeat(10000));
  h.args.readText = async path => `Viktig fil ${path}: ` + 'D'.repeat(20000);
  await runDiscussion(h.args);
  const input = providers(h)[0].body.input;
  assert.ok(input.length < 31000);
  assert.match(input, /Viktig fil docs\/AI_BRIEF.md/);
  assert.match(input, /Viktig fil docs\/PILOTPLAN.md/);
  assert.match(input, /Viktig fil README.md/);
  assert.match(input, /Kommentar 7:/);
});

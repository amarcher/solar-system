import { readFileSync, writeFileSync } from 'node:fs';

// Full live settings remain in ignored *.local files. The tracked config owns
// only Stella's reviewed prompt and required public tool IDs.
const [baselinePath, outputPath] = process.argv.slice(2);
if (!baselinePath || !outputPath?.endsWith('.local')) throw new Error('Usage: node scripts/voice/prepare-stella-update.mjs LIVE_BASELINE.local CANDIDATE.local');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const desired = JSON.parse(readFileSync(new URL('../../agent_configs/Solar-System-Explorer-Guide.json', import.meta.url), 'utf8'));
const candidate = structuredClone(baseline);
const prompt = candidate.conversation_config.agent.prompt;
const update = desired.conversation_config.agent.prompt;
if (update.tool_ids.length !== 12 || update.tool_ids.some(id => /^tool_\d+$/.test(id))) throw new Error('Expected twelve verified server tool IDs');
prompt.prompt = update.prompt;
prompt.tool_ids = [...new Set([...(prompt.tool_ids ?? []), ...update.tool_ids])];
writeFileSync(outputPath, JSON.stringify(candidate, null, 2) + '\n', { mode: 0o600 });
console.log('Prepared private candidate: only prompt text and required tool attachments updated. Unrelated live fields and attachments preserved.');

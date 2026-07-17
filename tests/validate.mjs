import fs from 'node:fs';
import { CARDS_DB, CONSTANTS } from '../root/js/data.js';

const fail = message => { throw new Error(message); };
const ids = CARDS_DB.map(card => card.id);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) fail(`Duplicate card ids: ${duplicateIds.join(', ')}`);

const validTypes = new Set(['phys', 'mag', 'def', 'skill', 'buff', 'heal']);
const validAttrs = new Set(['str', 'int', 'hp', 'common']);
const validPools = new Set(['str', 'int', 'hp']);
for (const card of CARDS_DB) {
    if (!card.name || !card.desc || !card.icon) fail(`Incomplete card: ${card.id}`);
    if (!validTypes.has(card.type)) fail(`Invalid type on ${card.id}: ${card.type}`);
    if (!validAttrs.has(card.attr)) fail(`Invalid attr on ${card.id}: ${card.attr}`);
    if (card.rarity === 'rare' && !validPools.has(card.pool)) fail(`Rare card without valid pool: ${card.id}`);
    if ((card.type === 'phys' || card.type === 'mag' || card.type === 'def' || card.type === 'heal') && !Number.isFinite(card.val)) fail(`Numeric card without val: ${card.id}`);
    if (card.add_action && ['str_up','int_up','both_up','maxhp_up'].includes(card.effect) && !card.exhaust) fail(`Repeatable free permanent buff: ${card.id}`);
}

if (CARDS_DB.length < 60) fail(`Expected a broad card pool, found ${CARDS_DB.length}`);
for (const type of validPools) {
    const rares = CARDS_DB.filter(card => card.rarity === 'rare' && card.pool === type);
    if (rares.length < 5) fail(`Not enough rare cards for ${type}: ${rares.length}`);
}
if (CONSTANTS.COST_REMOVE >= CONSTANTS.COST_BUY) fail('Deck removal should remain cheaper than adding a card');

const html = fs.readFileSync(new URL('../root/index.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../root/js/script.js', import.meta.url), 'utf8');
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const referencedIds = new Set([...script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match => match[1]));
const missingIds = [...referencedIds].filter(id => !htmlIds.has(id));
if (missingIds.length) fail(`DOM ids referenced but not defined: ${missingIds.join(', ')}`);

console.log(`Validated ${CARDS_DB.length} cards (${CARDS_DB.filter(c => c.rarity === 'rare').length} rare), DOM references, and economy invariants.`);

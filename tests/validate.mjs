import fs from 'node:fs';
import { CARDS_DB, CONSTANTS, SECRET_MOD_BY_CARD } from '../root/js/data.js';

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
    if (!SECRET_MOD_BY_CARD[card.id]) fail(`Card has no tailored secret modification: ${card.id}`);
    if (SECRET_MOD_BY_CARD[card.id] === 'rebirth' && (card.draw || card.add_action)) fail(`Unsafe rebirth loop on ${card.id}`);
    if (card.self_dmg && !card.desc.includes('HP1未満にならない')) fail(`Recoil safety is not documented on ${card.id}`);
    if (card.type === 'heal' && (!Number.isFinite(card.healRate) || card.healRate <= 0 || card.healRate > 1)) fail(`Healing card must use a max-HP ratio: ${card.id}`);
}
const unknownSecretCards = Object.keys(SECRET_MOD_BY_CARD).filter(id => !ids.includes(id));
if (unknownSecretCards.length) fail(`Secret modifications reference unknown cards: ${unknownSecretCards.join(', ')}`);
if (Object.keys(SECRET_MOD_BY_CARD).length !== CARDS_DB.length) fail('Secret modification map must cover every card exactly once');
const cheer = CARDS_DB.find(card => card.id === 'cheer');
if (cheer.val !== 1 || cheer.effect !== 'str_up' || cheer.redraw !== 2 || !cheer.add_action || !cheer.exhaust || cheer.limit !== 1) {
    fail('Cheer must grant +1 attack, replace the hand with two bonus draws, refund its action, exhaust, and be limited to one copy');
}
const meditate = CARDS_DB.find(card => card.id === 'meditate');
if (meditate.limit !== 2) fail('Meditate must be limited to two copies per deck');
const attackCards = Object.fromEntries(CARDS_DB.filter(card => card.attr === 'str').map(card => [card.id,card]));
if (attackCards.rage.val !== 2 || attackCards.multi.val !== .5 || attackCards.quick.val !== .55 || attackCards.flurry.val !== .5) fail('Attack combo starters must match the tempo redesign');
const vitalityCards = Object.fromEntries(CARDS_DB.filter(card => card.attr === 'hp').map(card => [card.id,card]));
if (vitalityCards.bandage.healRate < .18 || vitalityCards.second_wind.healRate < .2 || vitalityCards.iron_will.val < 8) fail('Vitality archetype needs a reliable recovery and defense floor');
if (vitalityCards.muscle.effect === 'maxhp_up' || vitalityCards.muscle.val !== 0 || vitalityCards.muscle.healRate !== .15) fail('Build Up must heal by ratio without increasing max HP');
if (vitalityCards.body_press.extra !== 'maxhp_scale' || vitalityCards.body_press.scale !== .3 || vitalityCards.body_press.hpCostScale !== .1) fail('Body Press must trade 10% current HP for max-HP-scaled damage');
if (vitalityCards.life_share.extra !== 'hp_sacrifice' || vitalityCards.life_share.scale !== .15 || vitalityCards.life_share.extraMult !== 2.6) fail('Life Conversion must explicitly turn current HP into damage');
if (vitalityCards.grand_slam.extra !== 'hp_halve_press' || vitalityCards.grand_slam.extraMult < 2.75) fail('Press must remain the vitality archetype high-risk finisher');

if (CARDS_DB.length < 60) fail(`Expected a broad card pool, found ${CARDS_DB.length}`);
for (const type of validPools) {
    const rares = CARDS_DB.filter(card => card.rarity === 'rare' && card.pool === type);
    if (rares.length < 5) fail(`Not enough rare cards for ${type}: ${rares.length}`);
}
if (CONSTANTS.COST_REMOVE >= CONSTANTS.COST_BUY) fail('Deck removal should remain cheaper than adding a card');

const html = fs.readFileSync(new URL('../root/index.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../root/js/script.js', import.meta.url), 'utf8');
if (!script.includes('const MULTI_HIT_INTERVAL = 145') || !script.includes('multiHit:true')) fail('Multi-hit attacks must use the extended readable hit interval');
if (!script.includes("UI.traitActivation('attack'") || !script.includes("UI.traitActivation('vitality'")) fail('Attack and vitality traits must trigger dedicated animations');
if (!html.includes('.trait-activation.attack') || !html.includes('.trait-activation.vitality') || !html.includes('.damage-number.multi-hit')) fail('Trait and multi-hit visual styles are missing');
if ([...script.matchAll(/State\.hp\s*-=\s*card\.self_dmg/g)].length) fail('Card recoil must use the nonlethal shared handler');
if ((script.match(/反動ではHP1未満にならない/g) || []).length < 2) fail('Upgraded recoil cards must retain their nonlethal description');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const undocumentedCards = CARDS_DB.filter(card => !readme.includes(`| ${card.name} |`));
if (undocumentedCards.length) fail(`Cards missing from README: ${undocumentedCards.map(card => card.id).join(', ')}`);
if (!readme.includes('魔力循環') || !readme.includes('30%') || !readme.includes('カード1枚につき1戦闘1回まで')) fail('README must explain the Magic Circulation rate and per-card battle limit');
if (!script.includes('magicCirculatedUids.includes(card.uid)') || !script.includes('magicCirculatedUids.push(card.uid)')) fail('Magic Circulation must be limited to one success per card each battle');
if (!script.includes("State.maxHp = 65; State.hp = 65") || !script.includes("Game.addCard('body_press')")) fail('Vitality starter stats and risk card must remain explicit');
if (!script.includes('Game.spendHp(State.hp * card.hpCostScale)') || !readme.includes('体力型の設計')) fail('Vitality HP-spending identity must be implemented and documented');
if (!script.includes('Math.ceil(State.maxHp * card.healRate)') || !readme.includes('回復カードは最大HPに対する割合')) fail('Ratio healing must be implemented and documented');
if (!script.includes('BALANCE_V2_IDS') || !script.includes('applyCardUpgradeValues(card)')) fail('Existing saved cards must migrate to the new balance without losing upgrades');
if (!script.includes("UI.toast('【特性】連撃の呼吸！ 行動権+1・1枚ドロー')") || !script.includes('State.battle.combo >= 3')) fail('Attack archetype must trigger its once-per-turn combo flow at three hits');
if (!readme.includes('攻撃型の設計') || !readme.includes('1ターンに1回だけ発動')) fail('Attack archetype design and trait limit must be documented');
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const referencedIds = new Set([...script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match => match[1]));
const missingIds = [...referencedIds].filter(id => !htmlIds.has(id));
if (missingIds.length) fail(`DOM ids referenced but not defined: ${missingIds.join(', ')}`);

console.log(`Validated ${CARDS_DB.length} cards (${CARDS_DB.filter(c => c.rarity === 'rare').length} rare), DOM references, and economy invariants.`);

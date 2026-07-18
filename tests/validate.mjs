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
if (!readme.includes('一時魔力') || !readme.includes('ショップまたは秘伝の改造へ到達すると0')) fail('README must explain temporary mana persistence and reset timing');
if (!script.includes('State.tempMana += manaGain') || !script.includes('State.tempMana -= manaSpent')) fail('Temporary mana must have explicit gain and spend handling');
if (!script.includes('visitShop: () => {') || !script.includes('visitSecretMode: () => {') || (script.match(/State\.tempMana = 0/g) || []).length < 3) fail('Temporary mana must reset at run start, shop, and secret mode');
const barrier = CARDS_DB.find(card => card.id === 'barrier');
if (barrier.val > 1 || barrier.manaGain !== 2) fail('Barrier must be weakened and serve as a temporary-mana setup card');
const manaBurst = CARDS_DB.find(card => card.id === 'mana_burst');
if (manaBurst.extra !== 'temp_mana_burst' || !manaBurst.consumeAllMana || manaBurst.manaCost !== 3) fail('Mana Burst must consume the temporary-mana pool with a minimum cost');
if (!script.includes("transcribe:{ cost:3") || !script.includes("phase:{ cost:5") || !script.includes("compress:{ cost:8")) fail('All three arcane arts must be implemented with explicit costs');
if (!script.includes('State.battle.manaAbsorb') || !script.includes("UI.traitActivation('magic','位相転換'")) fail('Phase Shift must nullify an attack with dedicated feedback');
if (!readme.includes('魔導転写') || !readme.includes('位相転換') || !readme.includes('時間圧縮')) fail('README must document all arcane arts');
if (CARDS_DB.some(card => card.id === 'absolute_barrier') || readme.includes('| 絶対防御 |')) fail('Absolute Defense must be removed from the card pool and documentation');
for (const id of ['spark','fireball','frost','grimoire','future_sight']) {
    if (!['sacrifice_circuit','void_distill','anomaly_formula','paradox_refund','future_clone'].includes(SECRET_MOD_BY_CARD[id])) fail(`Magic card ${id} must use a redesigned secret modification`);
}
if (!script.includes("card.secretMod === 'void_distill'") || !script.includes("card.secretMod === 'anomaly_formula'") || !script.includes("card.secretMod === 'future_clone'")) fail('Redesigned magic secret effects must have dedicated runtime behavior');
if (!script.includes("card.id === 'absolute_barrier'") || !script.includes("item.id === 'barrier'")) fail('Saved Absolute Defense cards must migrate safely to Barrier');
const bloodSucker = CARDS_DB.find(card => card.id === 'blood_sucker');
const limitBreak = CARDS_DB.find(card => card.id === 'limit_break');
const worldTree = CARDS_DB.find(card => card.id === 'world_tree');
if (bloodSucker.val > 1.8 || bloodSucker.drainRate > .4 || limitBreak.val > 6 || limitBreak.hpCost < 10 || worldTree.val > 20 || worldTree.healRate > .3) fail('Final cross-job rare-card balance adjustments must remain applied');
if (!script.includes("State.maxHp = 65; State.hp = 65") || !script.includes("Game.addCard('body_press')")) fail('Vitality starter stats and risk card must remain explicit');
if (!script.includes('Game.spendHp(State.hp * card.hpCostScale)') || !readme.includes('体力型の設計')) fail('Vitality HP-spending identity must be implemented and documented');
if (!script.includes('Math.ceil(State.maxHp * card.healRate)') || !readme.includes('回復カードは最大HPに対する割合')) fail('Ratio healing must be implemented and documented');
if (!script.includes('BALANCE_V2_IDS') || !script.includes('applyCardUpgradeValues(card)')) fail('Existing saved cards must migrate to the new balance without losing upgrades');
if (!script.includes("UI.toast('【特性】連撃の呼吸！ 行動権+1・1枚ドロー')") || !script.includes('State.battle.combo >= 3')) fail('Attack archetype must trigger its once-per-turn combo flow at three hits');
if (!readme.includes('攻撃型の設計') || !readme.includes('1ターンに1回だけ発動')) fail('Attack archetype design and trait limit must be documented');
if (!script.includes("State.playerType === 'str' && Math.random() < 0.1") || !script.includes('Math.floor(dmg * 1.5)') || !script.includes("UI.traitActivation('attack','クロスカウンター'")) fail('Attack archetype must dodge and counter at 1.5x power with a dedicated cut-in');
if (!readme.includes('クロスカウンター') || !readme.includes('10%の確率で完全回避')) fail('Cross Counter must be documented');
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const referencedIds = new Set([...script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match => match[1]));
const missingIds = [...referencedIds].filter(id => !htmlIds.has(id));
if (missingIds.length) fail(`DOM ids referenced but not defined: ${missingIds.join(', ')}`);
if (!html.includes('id="end-turn-button"') || !html.includes('Game.endPlayerTurn()') || !html.includes('ターンスキップ')) fail('Battle turn skip control must remain visible and connected');
if (!script.includes('endPlayerTurn: () =>') || !script.includes('Game.endTurn()')) fail('Battle turn skip action must remain implemented');
const playerPanel = html.match(/<div id="player-panel" class="([^"]+)"/);
if (!playerPanel || !playerPanel[1].includes('z-[45]') || !playerPanel[1].includes('pointer-events-auto')) fail('Player controls must stay above the hand interaction layer');

console.log(`Validated ${CARDS_DB.length} cards (${CARDS_DB.filter(c => c.rarity === 'rare').length} rare), DOM references, and economy invariants.`);

import fs from 'node:fs';
import { CARDS_DB, CONSTANTS, SECRET_MOD_BY_CARD } from '../root/js/data.js';

const fail = message => { throw new Error(message); };
const ids = CARDS_DB.map(card => card.id);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) fail(`Duplicate card ids: ${duplicateIds.join(', ')}`);
const icons = CARDS_DB.map(card => card.icon);
const duplicateIcons = icons.filter((icon,index) => icon && icons.indexOf(icon) !== index);
if (duplicateIcons.length) fail(`Duplicate card icons: ${[...new Set(duplicateIcons)].join(', ')}`);

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
if (attackCards.feint.type !== 'skill' || attackCards.feint.val !== undefined || attackCards.feint.vulnerable !== 1 || !attackCards.feint.add_action) fail('Feint must stack vulnerability without counting as an attack');
const vitalityCards = Object.fromEntries(CARDS_DB.filter(card => card.attr === 'hp').map(card => [card.id,card]));
if (vitalityCards.bandage.healRate < .18 || vitalityCards.second_wind.healRate < .2 || vitalityCards.iron_will.val < 8) fail('Vitality archetype needs a reliable recovery and defense floor');
if (vitalityCards.muscle.effect === 'maxhp_up' || vitalityCards.muscle.val !== 0 || vitalityCards.muscle.healRate !== .15) fail('Build Up must heal by ratio without increasing max HP');
if (vitalityCards.body_press.extra !== 'maxhp_scale' || vitalityCards.body_press.scale !== .3 || vitalityCards.body_press.hpCostScale !== .1) fail('Body Press must trade 10% current HP for max-HP-scaled damage');
if (vitalityCards.life_share.extra !== 'block_hp_sacrifice' || vitalityCards.life_share.scale !== .15 || vitalityCards.life_share.blockMult !== 1.5 || vitalityCards.life_share.extraMult !== 2.5 || !vitalityCards.life_share.desc.includes('ブロックは消費しない')) fail('Life Conversion must reference all block without consuming it and spend only current HP');
if (vitalityCards.grand_slam.extra !== 'hp_halve_press' || vitalityCards.grand_slam.extraMult < 2.75) fail('Press must remain the vitality archetype high-risk finisher');

if (CARDS_DB.length < 60) fail(`Expected a broad card pool, found ${CARDS_DB.length}`);
if (CARDS_DB.some(card => card.id === 'fate_shuffle' || card.effect === 'limit_flow') || CARDS_DB.some(card => card.name === '限界解放')) fail('Limit Release must be completely removed from the card pool');
const unlockCards = CARDS_DB.filter(card => card.unlockLevel);
if (unlockCards.length !== 57) fail(`Expected exactly 57 level-unlock cards, found ${unlockCards.length}`);
if (!unlockCards.some(card => card.rarity === 'rare') || !unlockCards.some(card => card.rarity !== 'rare')) fail('Level progression must unlock both normal and rare cards');
if (Math.min(...unlockCards.map(card => card.unlockLevel)) !== 2 || Math.max(...unlockCards.map(card => card.unlockLevel)) !== 20) fail('Card unlocks must span every player level from 2 through 20');
for (let level=2; level<=20; level++) {
    const rewards = unlockCards.filter(card => card.unlockLevel === level);
    if (rewards.length !== 3 || !['str','int','hp'].every(attr => rewards.filter(card => card.attr===attr).length===1)) fail(`Level ${level} must unlock exactly one card for each plan`);
}
for (const effect of ['tiger_form','mana_forge','second_heart','chain_art','mana_reactor','blood_pact','healing_strike','apex_str','apex_int','apex_hp']) {
    if (!unlockCards.some(card => card.effect === effect)) fail(`Missing rule-changing level reward: ${effect}`);
}
const vitalityUnlocks = Object.fromEntries(unlockCards.filter(card => card.attr === 'hp').map(card => [card.unlockLevel,card]));
if (vitalityUnlocks[2]?.effect !== 'second_heart' || vitalityUnlocks[4]?.effect !== 'blood_pact' || vitalityUnlocks[5]?.effect !== 'healing_strike') fail('Vitality level rewards must unlock its HP-spend and healing engines in three stages');
const astralCollapse = CARDS_DB.find(card => card.id === 'astral_collapse');
if (astralCollapse.extra !== 'temp_mana_flat_burst' || astralCollapse.manaFlat !== 8 || astralCollapse.manaScale) fail('Star Devourer must add a flat 8 damage per temporary mana spent');
const leyResonance = CARDS_DB.find(card => card.id === 'ley_resonance');
if (leyResonance.type !== 'skill' || leyResonance.effect !== 'mana_echo' || !leyResonance.add_action || !leyResonance.exhaust) fail('Dragon Vein Resonance must be a one-use temporary-mana echo skill');
const fireball = CARDS_DB.find(card => card.id === 'fireball');
if (fireball.burn !== 6 || !fireball.desc.includes('炎上6')) fail('Fire Magic must apply 6 burn for ignition combos');
for (const type of validPools) {
    const rares = CARDS_DB.filter(card => card.rarity === 'rare' && card.pool === type);
    if (rares.length < 5) fail(`Not enough rare cards for ${type}: ${rares.length}`);
}
if (CONSTANTS.COST_REMOVE >= CONSTANTS.COST_BUY) fail('Deck removal should remain cheaper than adding a card');

const html = fs.readFileSync(new URL('../root/index.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../root/js/script.js', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const mastersRead = CARDS_DB.find(card => card.id === 'masters_read');
if (mastersRead.extra !== 'sword_saint_read' || mastersRead.val !== 2.4 || !script.includes("State.battle.enemy.intent === 'atk'") || !script.includes("UI.traitActivation('attack','剣聖の見切り'")) fail('Sword Saint Read must evade normal attacks for triple damage and flow against other intents');
const zanshin = CARDS_DB.find(card => card.id === 'zanshin');
if (!zanshin || zanshin.unlockLevel !== 7 || zanshin.effect !== 'combo_retain' || CARDS_DB.some(card => card.id === 'read_blade')) fail('Future Slash must be replaced by the combo-retaining Zanshin card');
if (!html.includes('font-awesome/6.7.2/css/all.min.css') || CARDS_DB.some(card => card.icon === 'fa-phoenix-framework')) fail('Card icons must use the supported Font Awesome set');
const lifeConversionSource = script.slice(script.indexOf("if (card.extra === 'block_hp_sacrifice')",script.indexOf('executeCardLogic:')),script.indexOf("if (card.extra === 'hp_sacrifice_blast')",script.indexOf("if (card.extra === 'block_hp_sacrifice')",script.indexOf('executeCardLogic:'))));
if (lifeConversionSource.includes('State.battle.block = 0') || !lifeConversionSource.includes('referencedBlock')) fail('Life Conversion must preserve block after referencing its full value');
if (!script.includes("card.extra === 'block_hp_sacrifice'") || !script.includes('予測 ${totalImpact} DMG（HP ${total} / BLOCK ${totalAbsorbed}）')) fail('Life Conversion preview must show total impact separately from HP damage and absorbed enemy block');
if (!script.includes("id:'life-conversion-preview-fix'") || !script.includes("title:'生命転換の不具合修正'")) fail('Life Conversion preview fix announcement is missing');
if (!script.includes("title:'大幅アップデート'") || !script.includes("id:'major-level-20-update'") || script.includes("id:'counter-vitality-card-rework'") || script.includes("id:'player-level-20-rewards'")) fail('Level 20 rewards and plan balance notes must be consolidated into the major update announcement');
if (!script.includes('const MULTI_HIT_INTERVAL = 145') || !script.includes('multiHit:true')) fail('Multi-hit attacks must use the extended readable hit interval');
if (!script.includes("UI.traitActivation('attack'") || !script.includes("UI.traitActivation('vitality'")) fail('Attack and vitality traits must trigger dedicated animations');
if (!html.includes('.trait-activation.attack') || !html.includes('.trait-activation.vitality') || !html.includes('.damage-number.multi-hit')) fail('Trait and multi-hit visual styles are missing');
if ([...script.matchAll(/State\.hp\s*-=\s*card\.self_dmg/g)].length) fail('Card recoil must use the nonlethal shared handler');
if ((script.match(/反動ではHP1未満にならない/g) || []).length < 2) fail('Upgraded recoil cards must retain their nonlethal description');
const readmeUrl = new URL('../README.md', import.meta.url);
const readme = fs.existsSync(readmeUrl) ? fs.readFileSync(readmeUrl, 'utf8') : null;
for (const effect of ['tiger_form','mana_forge','second_heart','chain_art','mana_reactor','blood_pact','healing_strike','apex_str','apex_int','apex_hp']) {
    if (!script.includes(`card.effect === '${effect}'`)) fail(`Level reward effect is not implemented: ${effect}`);
}
for (const extra of ['combo_cashout','vitality_wave']) {
    if (!unlockCards.some(card => card.extra === extra) || !script.includes(`card.extra === '${extra}'`)) fail(`Missing level reward scaling mechanic: ${extra}`);
}
for (const level of [15,18,20]) {
    if (unlockCards.filter(card => card.unlockLevel === level && card.rarity === 'rare').length !== 3) fail(`Level ${level} must provide one build-defining rare card to every plan`);
}
for (const level of [11,12,13,14,16,17,19]) {
    if (unlockCards.filter(card => card.unlockLevel === level && card.rarity === 'rare').length) fail(`Level ${level} rewards must remain normal cards`);
}
for (const mechanic of ['combo_exchange','pain_refund','reclaim_spell','burn_convert','pain_dividend','phys_echo','mana_armor','combo_thresholds','ignition_echo','hp_interest','apex_str2','apex_int2','apex_hp2']) {
    if (!unlockCards.some(card => card.effect === mechanic) || !script.includes(`card.effect === '${mechanic}'`)) fail(`Level 11-20 mechanic is missing: ${mechanic}`);
}
if (!unlockCards.some(card => card.effect === 'mana_echo') || !script.includes("card.effect === 'mana_echo'")) fail('Dragon Vein Resonance must use its new temporary-mana echo mechanic');
if (readme && !readme.includes('| 10 | 極・闘神化 | 極・魔導核 | 極・生命天輪 |')) fail('README must document the complete level 2-10 reward schedule');
if (!script.includes("State.playerType === 'hp'") || !script.includes("State.battle.bloodPact || .5") || !script.includes('State.maxHp * 0.08')) fail('Vitality buffs must include Blood Armor and stronger regeneration');
if (!script.includes("State.playerType !== 'hp' && !State.battle.retainBlock") || (script.match(/State\.playerType === 'hp'\) State\.battle\.block = 0/g) || []).length < 2) fail('Vitality block must persist between turns and battles until a five-win checkpoint');
for (const kind of ['normal','brute','trick','sprout','swarm','guardian','assassin','dragon','phoenix','colossus']) {
    if (!script.includes(`kind:'${kind}'`)) fail(`Missing enemy archetype: ${kind}`);
}
for (const intent of ["e.intent = 'multi'","e.intent = 'heal'","e.intent = 'hex'","e.intent = 'guard'"]) {
    if (!script.includes(intent)) fail(`Missing varied enemy intent: ${intent}`);
}
if (!script.includes('52 + level * 11') || !script.includes('6 + level * .95')) fail('Enemy scaling must use the smoother post-rebalance curve');
if (!script.includes('triggerEnemyPhase') || !script.includes('ENEMY_AFFIXES')) fail('Enemy phase changes and mutations must be implemented');
if (!script.includes("State.battle.enemiesDefeated % 2 === 0") || !script.includes("id:'mentor_path'") || !script.includes("id:'altar'")) fail('Journey events must occur frequently and include build-changing choices');
const journeySource = script.slice(script.indexOf('const JOURNEY_EVENTS'),script.indexOf('const ENEMY_ARCHETYPES'));
if ((journeySource.match(/\bid:'/g) || []).length < 12) fail('Journey event pool must contain at least twelve distinct choices');
if (!script.includes("bossReward = ' / 覚醒")) fail('Boss awakening rewards must be implemented');
if (readme && !readme.includes('敵の進化と道中イベント')) fail('README must document the encounter redesign');
if (readme && (!readme.includes('血潮の鎧') || !readme.includes('戦闘ルールそのものを変える'))) fail('Vitality buffs and progression redesign must be documented');
const undocumentedCards = readme ? CARDS_DB.filter(card => !readme.includes(`| ${card.name} |`)) : [];
if (undocumentedCards.length) fail(`Cards missing from README: ${undocumentedCards.map(card => card.id).join(', ')}`);
if (readme && (!readme.includes('一時魔力') || !readme.includes('ショップまたは秘伝の改造へ到達すると0'))) fail('README must explain temporary mana persistence and reset timing');
if (!script.includes('State.tempMana += manaGain') || !script.includes('State.tempMana -= manaSpent')) fail('Temporary mana must have explicit gain and spend handling');
if (!script.includes('visitShop: () => {') || !script.includes('visitSecretMode: () => {') || (script.match(/State\.tempMana = 0/g) || []).length < 3) fail('Temporary mana must reset at run start, shop, and secret mode');
const barrier = CARDS_DB.find(card => card.id === 'barrier');
if (barrier.val > 1 || barrier.manaGain !== 2) fail('Barrier must be weakened and serve as a temporary-mana setup card');
const manaBurst = CARDS_DB.find(card => card.id === 'mana_burst');
if (manaBurst.extra !== 'temp_mana_burst' || !manaBurst.consumeAllMana || manaBurst.manaCost !== 3) fail('Mana Burst must consume the temporary-mana pool with a minimum cost');
if (!script.includes("transcribe:{ cost:3") || !script.includes("phase:{ cost:5") || !script.includes("compress:{ cost:8")) fail('All three arcane arts must be implemented with explicit costs');
if (!script.includes('State.battle.manaAbsorb') || !script.includes("UI.traitActivation('magic','位相転換'")) fail('Phase Shift must nullify an attack with dedicated feedback');
if (readme && (!readme.includes('魔導転写') || !readme.includes('位相転換') || !readme.includes('時間圧縮'))) fail('README must document all arcane arts');
if (CARDS_DB.some(card => card.id === 'absolute_barrier') || (readme && readme.includes('| 絶対防御 |'))) fail('Absolute Defense must be removed from the card pool and documentation');
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
if (!script.includes('Game.spendHp(State.hp * card.hpCostScale)')) fail('Vitality HP-spending identity must be implemented');
if (readme && !readme.includes('体力型の設計')) fail('Vitality HP-spending identity must be documented');
if (!script.includes('Math.ceil(State.maxHp * card.healRate)')) fail('Ratio healing must be implemented');
if (readme && !readme.includes('回復カードは最大HPに対する割合')) fail('Ratio healing must be documented');
if (!script.includes('BALANCE_V2_IDS') || !script.includes('applyCardUpgradeValues(card)')) fail('Existing saved cards must migrate to the new balance without losing upgrades');
if ((script.match(/Game\.isCardUnlocked\(c\)/g) || []).length < 3) fail('Locked cards must be filtered from shop, normal rewards, and rare rewards');
if (!script.includes('playerXp') || !script.includes('levelFromXp') || !script.includes('State.runXpEarned = 20 + defeated * 10')) fail('Persistent player experience and level calculation are missing');
if (!script.includes("DEBUG_ALL_CARDS || !card.unlockLevel") || !server.includes("--debug-all-cards") || !pkg.scripts?.debug?.includes("--debug-all-cards")) fail('All-card debug mode must unlock cards without overwriting normal progression');
if (!script.includes("UI.toast('【特性】連撃の呼吸！ 行動権+1・1枚ドロー')") || !script.includes('State.battle.combo >= 3')) fail('Attack archetype must trigger its once-per-turn combo flow at three hits');
if (!script.includes('1 + vulnerableStacks * .5') || !script.includes('State.battle.enemyVulnerable = 0')) fail('Vulnerability must stack without a cap and be consumed all at once by the next attack');
if (!script.includes('State.battle.echo = (Number(State.battle.echo) || 0) + (card.echoGain || 1)') || !script.includes('echoIndex<echoStacks')) fail('Echo must stack and repeat the next spell once per stack');
if ((script.match(/State\.battle\.manaForge \+= forgeGain/g) || []).length < 2) fail('Mana Forge and Apex Magic Core must add their mana-gain bonuses instead of overwriting each other');
if (!script.includes("reignition ? '再引火' : '引火爆発'") || !script.includes("reignition ? .2 : .3") || !script.includes('State.tempMana += 10')) fail('Burn reapplication must trigger ignition for 30% max HP and grant 10 temporary mana');
if (!script.includes('enemyIgnited') || !script.includes('Math.ceil(manaBefore*1.5)') || !script.includes("'MAX HP 20% / MANA ×1.5'")) fail('Further burn reapplications must reignite for 20% max HP and multiply current temporary mana by 1.5');
if (script.indexOf('if (card.burn) Game.applyBurn(card.burn)') > script.indexOf("if (card.type === 'phys')")) fail('Burn and ignition abilities must resolve before the card attack');
if (!script.includes('ignitionExplosion:') || !script.includes('UI.ignitionExplosion(reignition)') || !html.includes('.ignition-explosion')) fail('Ignition and reignition must use their dedicated explosion effect');
if (!script.includes("const particleCount = lightweight ? (reignition ? 10 : 8) : (reignition ? 16 : 14)") || !html.includes('@media (max-width:767px),(pointer:coarse)')) fail('Ignition effects must use the lightweight mobile particle profile');
if (!script.includes('State.battle.pendingFx = Math.max(State.battle.pendingFx || 0, 400)')) fail('Lethal ignition must delay victory long enough to show its cut-in and explosion');
if (!script.includes("heading:'炎上コンボ'") || !html.includes('.notice-body h3')) fail('Balance announcements must use readable headings and structured body text');
if (!html.includes('.notice-item{flex:none;') || !html.includes('id="announcements-list" class="flex-1 min-h-0 overflow-y-auto overscroll-contain')) fail('Expanded announcements must not shrink or clip inside the scrollable modal');
if (!script.includes("anchor: { name:'重装化'") || !script.includes("card.secretMod === 'anchor') blk = Math.ceil(blk * 1.5)") || (readme && readme.includes('不動結界'))) fail('Obsolete block retention secret must be replaced by the 50% Heavy Armor bonus');
if (!script.includes('let breakthroughMultiplier = State.battle.breakthrough || 1') || !script.includes('castIndex === 0 && State.battle.breakthrough')) fail('Physical and magical damage previews must include Breakthrough');
if (readme && (!readme.includes('攻撃型の設計') || !readme.includes('1ターンに1回だけ発動'))) fail('Attack archetype design and trait limit must be documented');
if (!script.includes("State.playerType === 'str' && Math.random() < 0.1") || !script.includes('Math.floor(dmg * 1.5)') || !script.includes("UI.traitActivation('attack','クロスカウンター'")) fail('Attack archetype must dodge and counter at 1.5x power with a dedicated cut-in');
if (readme && (!readme.includes('クロスカウンター') || !readme.includes('10%の確率で完全回避'))) fail('Cross Counter must be documented');
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
for (const id of ['result-player-level','result-xp-earned','result-xp-bar','result-unlock-list']) if (!htmlIds.has(id)) fail(`Player progression result UI is missing: ${id}`);
for (const id of ['deck-viewer','deck-viewer-grid','card-library','card-library-grid','library-progress']) if (!htmlIds.has(id)) fail(`Missing collection UI: ${id}`);
for (const id of ['announcements-modal','announcements-title','announcements-list']) if (!htmlIds.has(id)) fail(`Missing announcement UI: ${id}`);
if (!script.includes('openDeckViewer:') || !script.includes('renderDeckViewer:') || !html.includes("Game.openDeckViewer('draw')") || !html.includes("Game.openDeckViewer('deck')")) fail('Battle and journey screens must expose the deck viewer');
if (!script.includes('openCardLibrary:') || !script.includes('renderCardLibrary:') || !html.includes('Game.openCardLibrary()')) fail('Title screen card library is not fully connected');
if (!script.includes('openAnnouncements:') || !script.includes('renderAnnouncements:') || !script.includes("title:'お知らせページを新設'") || !html.includes('Game.openAnnouncements()')) fail('Title screen announcements are not fully connected');
if (!html.includes('@keyframes titlePalBurst') || !html.includes('title-pal hp') || !html.includes('title-pal str') || !html.includes('title-pal int')) fail('Animated title characters are missing');
const referencedIds = new Set([...script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match => match[1]));
const missingIds = [...referencedIds].filter(id => !htmlIds.has(id));
if (missingIds.length) fail(`DOM ids referenced but not defined: ${missingIds.join(', ')}`);
if (!html.includes('id="end-turn-button"') || !html.includes('Game.endPlayerTurn()') || !html.includes('ターンスキップ')) fail('Battle turn skip control must remain visible and connected');
if (!script.includes('endPlayerTurn: () =>') || !script.includes('Game.endTurn()')) fail('Battle turn skip action must remain implemented');
if (script.includes("card.effect === 'limit_flow'") || script.includes('State.battle.limitFlow')) fail('Limit Release runtime engine must be removed');
const playerPanel = html.match(/<div id="player-panel" class="([^"]+)"/);
if (!playerPanel || !playerPanel[1].includes('z-[45]') || !playerPanel[1].includes('pointer-events-auto')) fail('Player controls must stay above the hand interaction layer');

console.log(`Validated ${CARDS_DB.length} cards (${CARDS_DB.filter(c => c.rarity === 'rare').length} rare), DOM references, and economy invariants.`);

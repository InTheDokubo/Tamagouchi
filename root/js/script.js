import { CONSTANTS, ACTION_DATA, CARDS_DB, HIRAGANA, SECRET_MOD_BY_CARD } from './data.js';

const MULTI_HIT_INTERVAL = 145;
const MAX_PLAYER_LEVEL = 50;
const DEBUG_ALL_CARDS = new URLSearchParams(window.location.search).get('debug') === 'all-cards';

const META_UPGRADES = {
    vitality: { name:'生命の殻', icon:'fa-heart', color:'text-green-300', desc:'初期最大HP +5', max:5 },
    power: { name:'力の記憶', icon:'fa-fist-raised', color:'text-red-300', desc:'初期攻撃 +1', max:5 },
    wisdom: { name:'知恵の記憶', icon:'fa-hat-wizard', color:'text-blue-300', desc:'初期魔力 +1', max:5 },
    fortune: { name:'幸運の星', icon:'fa-star', color:'text-yellow-300', desc:'大成功率 +3%', max:5 }
};

const Meta = {
    xpForLevel(level) {
        const steps = Math.max(0, level - 1);
        return 60 * steps + 25 * steps * Math.max(0, steps - 1);
    },
    levelFromXp(xp) {
        let level = 1;
        while (level < MAX_PLAYER_LEVEL && xp >= this.xpForLevel(level + 1)) level++;
        return level;
    },
    load() {
        try {
            const saved = JSON.parse(localStorage.getItem('ikuseicchi_meta') || '{}');
            const upgrades = {};
            Object.entries(META_UPGRADES).forEach(([key,definition]) => { upgrades[key] = Math.min(definition.max,Math.max(0,Math.floor(Number(saved.upgrades?.[key])||0))); });
            const playerXp = Math.max(0,Math.floor(Number(saved.playerXp)||0));
            return { shards:Math.max(0,Math.floor(Number(saved.shards)||0)), playerXp, playerLevel:this.levelFromXp(playerXp), upgrades };
        } catch (_) { return { shards:0, playerXp:0, playerLevel:1, upgrades:{vitality:0,power:0,wisdom:0,fortune:0} }; }
    },
    save(data) { try { localStorage.setItem('ikuseicchi_meta',JSON.stringify(data)); } catch (_) {} },
    cost(key, data) { return 4 + (data.upgrades[key] || 0) * 4; }
};

const TRAINING_EVENTS = [
    { id:'calm', icon:'🌤️', title:'穏やかな一日', desc:'基本メニューでじっくり育成。', multiplier:1, cost:0, great:0 },
    { id:'festival', icon:'🎉', title:'育成フェス', desc:'全トレーニングの伸びが1.25倍、消費HPも少ない！', multiplier:1.25, cost:-4, great:.08 },
    { id:'mentor', icon:'🧑‍🏫', title:'達人が来た！', desc:'大成功率が大幅アップ。カード候補も4枚に。', multiplier:1, cost:0, great:.28, draftChoices:4 },
    { id:'str_day', icon:'🔥', title:'燃える筋肉祭', desc:'筋トレは1.75倍。ほかの育成は少し控えめ。', focus:'str', focusMultiplier:1.75, otherMultiplier:.85, cost:1, great:.08 },
    { id:'int_day', icon:'🌌', title:'流星の夜', desc:'魔術研究は1.75倍。大成功ならBPも獲得。', focus:'int', focusMultiplier:1.75, otherMultiplier:.85, cost:1, great:.1, bpOnGreat:8 },
    { id:'hp_day', icon:'🌳', title:'生命の森', desc:'最大体力育成は1.6倍。休むと全回復。', focus:'hp', focusMultiplier:1.6, otherMultiplier:.9, cost:0, great:.1, restRate:1 },
    { id:'market', icon:'🛍️', title:'ちいさな市の日', desc:'育成するとBPも5獲得。消費HPは少し多い。', multiplier:1, cost:3, great:.05, bp:5 },
    { id:'rest_day', icon:'♨️', title:'温泉日和', desc:'休むと全回復＋最大HP3。育成は省エネ。', multiplier:.9, cost:-5, great:.05, restRate:1, restMaxHp:3 }
];

const JOURNEY_EVENTS = [
    { id:'spring', icon:'fa-water', title:'命の泉', desc:'HPを最大値の40%回復する。', color:'from-cyan-500 to-blue-600' },
    { id:'forge', icon:'fa-hammer', title:'旅の鍛冶屋', desc:'未強化カード1枚を無料で強化する。', color:'from-orange-500 to-red-600' },
    { id:'treasure', icon:'fa-gem', title:'忘れられた宝箱', desc:'BPを30獲得する。', color:'from-yellow-400 to-amber-600' },
    { id:'shrine', icon:'fa-torii-gate', title:'古い祠', desc:'最大HP+8。現在HPを8失う。', color:'from-purple-500 to-indigo-700' },
    { id:'insight', icon:'fa-lightbulb', title:'戦いのひらめき', desc:'攻撃と魔力を永続的に+1。', color:'from-emerald-500 to-teal-700' },
    { id:'purify', icon:'fa-feather-alt', title:'浄化の風', desc:'デッキの「パンチ」か「防御」を1枚削除。', color:'from-slate-400 to-slate-600' },
    { id:'camp', icon:'fa-fire', title:'星空の野営', desc:'HPを25%回復し、未強化カード1枚を強化する。', color:'from-rose-500 to-orange-600' },
    { id:'altar', icon:'fa-hand-fist', title:'試練の祭壇', desc:'現在HPを20%失う代わり、攻撃・魔力+2、BP+20。', color:'from-red-700 to-fuchsia-800', risk:true },
    { id:'feast', icon:'fa-bowl-food', title:'精霊のごちそう', desc:'HPを全回復し、最大HP+4。', color:'from-lime-500 to-emerald-700' },
    { id:'mentor_path', icon:'fa-user-ninja', title:'旅する達人', desc:'自分の型のカード1枚を入手し、すぐ強化する。', color:'from-indigo-500 to-violet-700' },
    { id:'meteorite', icon:'fa-meteor', title:'虹色の隕石', desc:'攻撃+2か魔力+2のどちらかがランダムで上がる。BP+15。', color:'from-sky-500 to-purple-700' },
    { id:'merchant', icon:'fa-scale-balanced', title:'怪しい交換屋', desc:'基本カード1枚を削除し、BP+35。削除できなければBP+15。', color:'from-amber-600 to-stone-700' }
];

const ENEMY_ARCHETYPES = [
    { kind:'normal', sprite:'🐺', label:'狩人', hp:1, atk:1, trait:'追い詰められると攻撃力が上がる' },
    { kind:'brute', sprite:'👹', label:'豪腕', hp:1.18, atk:1.12, trait:'3ターンごとに強烈な一撃' },
    { kind:'trick', sprite:'🧙', label:'幻術', hp:.9, atk:.92, trait:'吸収と防御弱化を使い分ける' },
    { kind:'sprout', sprite:'🌵', label:'再生', hp:1.04, atk:.88, trait:'自己回復しながら粘り強く戦う' },
    { kind:'swarm', sprite:'🐝', label:'群体', hp:.82, atk:.82, trait:'小さな攻撃を連続で叩き込む' }
];

const ELITE_ARCHETYPES = [
    { kind:'guardian', sprite:'🗿', label:'守護者', hp:1.34, atk:1.02, trait:'防御から重い反撃へつなぐ' },
    { kind:'assassin', sprite:'🥷', label:'暗殺者', hp:1.02, atk:1.22, trait:'素早い連撃と強攻撃を繰り返す' }
];

const BOSS_ARCHETYPES = [
    { kind:'dragon', sprite:'🐲', label:'竜王', hp:1.48, atk:1.1, trait:'力を蓄え、強攻撃と連撃を放つ' },
    { kind:'phoenix', sprite:'🔥', label:'不死鳥', hp:1.32, atk:1, trait:'回復と連撃で戦線を立て直す' },
    { kind:'colossus', sprite:'🤖', label:'巨神', hp:1.62, atk:.94, trait:'巨大な障壁の後に破壊攻撃を行う' }
];

const ENEMY_AFFIXES = [
    { id:'armored', name:'装甲', desc:'戦闘開始時に最大HPの12%をブロック' },
    { id:'regrowth', name:'再生', desc:'行動前に最大HPの3%を回復' },
    { id:'frenzy', name:'狂化', desc:'3ターン目以降、攻撃力が上昇' }
];

const SECRET_MOD_COST = 100;
// 公開コミットでは、プレイヤー向けの変更をこの一覧の先頭へ追加する。
const ANNOUNCEMENTS = [
    {
        id:'magic-plan-rework',
        date:'2026.07.28',
        title:'魔力型バランス調整のお知らせ',
        intro:'魔力型の連携と火力バランスを更新しました。',
        sections:[
            { heading:'カード調整', items:[
                '禁術・星喰い：一時魔力1につき固定8ダメージを加える方式へ変更',
                '龍脈共鳴：次の一時魔力獲得を複製する能力へ再設計',
                '炎魔法：炎上6を追加'
            ]},
            { heading:'重ねがけの強化', items:[
                '残響は重ねがけ可能になり、2回使うと次の魔法が合計3回発動',
                '魔力炉と極・魔導核の一時魔力獲得補正が重複'
            ]},
            { heading:'炎上コンボ', items:[
                '引火爆発：炎上中に炎上を重ねると最大HP30%ダメージ・一時魔力+10',
                '再引火：同じ敵へさらに炎上を重ねると最大HP20%ダメージ・現在の一時魔力×1.5',
                '炎上・引火・再引火はカード本体の攻撃より先に発動'
            ]}
        ]
    },
    {
        id:'news-page-launch',
        date:'2026.07.28',
        title:'お知らせページを新設',
        body:'これからのアップデートをお知らせするためにお知らせページを新設しました'
    }
];
const SECRET_MODS = {
    rebirth: { name:'輪廻刻印', icon:'fa-arrows-rotate', desc:'「1回のみ」を失い、使用後は捨て札へ戻る。' },
    rupture: { name:'破砕の型', icon:'fa-burst', desc:'使用するたび、敵へ脆弱を1付与する。' },
    overflow: { name:'生命変換', icon:'fa-heart-circle-plus', desc:'最大HPを超えた回復量をブロックへ変換する。' },
    anchor: { name:'重装化', icon:'fa-shield-halved', desc:'このカードで得るブロックが50%増加する。' },
    insight: { name:'先読み術式', icon:'fa-eye', desc:'使用時、さらにカードを1枚引く。' },
    tempo: { name:'無拍子', icon:'fa-forward-fast', desc:'使用時、行動権を1回復する。' },
    serenity: { name:'静心の守り', icon:'fa-spa', desc:'使用時、ブロック6を得る。' },
    combo_mastery: { name:'連撃奥義', icon:'fa-link', desc:'多段攻撃のヒット数だけ、さらにコンボを加算する。' },
    thornward: { name:'反攻装甲', icon:'fa-shield-halved', desc:'使用時、この戦闘中の反撃を2得る。' },
    renewal: { name:'再生循環', icon:'fa-seedling', desc:'使用時、カードを1枚引く。' },
    sacrifice_circuit: { name:'生贄回路', icon:'fa-fire-burner', desc:'獲得する一時魔力が2倍になる代わり、使用後はその戦闘から除外される。' },
    void_distill: { name:'虚無蒸留', icon:'fa-circle-radiation', desc:'攻撃前に敵の全ブロックを消滅させ、その量に応じて一時魔力を得る（最大6）。' },
    anomaly_formula: { name:'異常式', icon:'fa-dice', desc:'使用するたび術式が変異し、弱化・炎上・脆弱のどれかを追加する。' },
    paradox_refund: { name:'逆行支払い', icon:'fa-clock-rotate-left', desc:'消費した一時魔力の半分を、次の自分ターン開始時に取り戻す。' },
    future_clone: { name:'未来複製', icon:'fa-clone', desc:'各戦闘の初回使用時、秘伝を持たない一回限りの複製を捨て札へ生成する。' }
};

const BALANCE_V2_IDS = new Set(['bandage','rest','muscle','life_share','body_press','second_wind','iron_will','grand_slam','super_heal','shield_bash','vitality','titan_body','world_tree','rage','multi','quick','draw_slash','feint','flurry','blood_sucker','limit_break','spark','fireball','barrier','thunder','mana_charge','grimoire','future_sight','frost','arcane_shield','overload','scorch','mana_burst','meteor','time_warp','echo_spell','black_hole','absolute_zero','causal_reverse','step_in','mana_drop','first_aid','tailwind','parry','last_stand_slash','mana_ward','blood_shield','tiger_rush','astral_collapse','lifeline_cannon','opening_flurry','quick_cast','life_guard','war_cry','time_slice','regenerative_armor','read_blade','prism_guard','pain_return','combo_breaker','ley_resonance','vitality_wave','thousand_fangs','supernova','immortal_rampart','apex_str','apex_int','apex_hp']);
const applyCardUpgradeValues = card => {
    card.upgraded = true;
    if (card.val) card.val = parseFloat((card.val * 1.5).toFixed(2));
    if (card.val && (['str_up','int_up','both_up','action_up','maxhp_up','next_draw','berserk','limit_break','world_tree'].includes(card.effect) || (card.type === 'def' && !['barrier','arcane_shield','mana_ward','prism_guard'].includes(card.id)) || card.type === 'heal')) card.val = Math.ceil(card.val);
    if (card.draw) card.draw += 1;
    if (card.healRate) card.healRate = Math.min(1, parseFloat((card.healRate * 1.5).toFixed(3)));
    if (card.self_dmg) card.self_dmg = Math.max(0, card.self_dmg - 2);
    if (card.burn) card.burn = Math.ceil(card.burn * 1.5);
    if (card.thorns) card.thorns = Math.ceil(card.thorns * 1.5);
    card.name += '+';
    if (card.extra === 'hp_sacrifice') { card.scale = .12; card.extraMult = 3.4; }
    if (card.extra === 'hp_sacrifice_blast') { card.scale = .18; card.extraMult = 4.2; }
    if (card.extra === 'hp_sacrifice_block') { card.scale = .1; card.extraMult = 3.2; }
    if (card.extra === 'missing_hp_damage') card.scale = .35;
    if (card.extra === 'maxhp_scale') { card.scale = .4; card.hpCostScale = .08; }
    if (card.extra === 'block_dmg') card.extraMult = 2;
    if (card.extra === 'hp_halve_press') { card.scale = .25; card.extraMult = 3.5; }
    if (card.extra === 'maxhp_block') card.scale = card.id === 'immortal_rampart' ? .8 : .65;
    if (card.extra === 'combo_cashout') card.comboScale = .5;
    if (card.extra === 'vitality_wave') { card.scale = .3; card.missingScale = .35; }
    if ((card.effect === 'echo' || card.effect === 'immortal' || ['causal_reverse','revenge_fortress'].includes(card.id)) && !card.draw) card.draw = 1;
};

// --- 状態管理 (State) ---
const State = {
    phase: 'start', name: '', playerType: 'hp', turn: 1, maxTurns: 10, bp: 0, tempMana: 0,
    selectedAction: null, hp: 50, maxHp: 50, str: 5, int: 5, deck: [],
    shopTab: 'upgrade', shopCards: [], isTransitioning: false, rarePity: 0,
    meta: Meta.load(), trainingEvent: null, lastTrainingEvent: null, journeyChoices: [], runXpEarned:0, runNewUnlocks:[], runLevelBefore:1, deckViewerTab:'deck', libraryTab:'common',
    runStats: { damageDealt:0, damageTaken:0, cardsPlayed:0, totalBattleTurns:0, battles:0 },
    battle: {
        active: false, enemiesDefeated: 0, enemy: null, hand: [], drawPile: [], discardPile: [], exhaustPile: [],
        actionsLeft: 1, actionsNextTurn: 1, drawNextTurn: 0, block: 0, turnCount: 0,
        playerTempStr: 0, playerTempInt: 0, magBonus: 0, processing: false, selectedHandIndex: null,
        retainBlock: false, echo: 0, immortal: false, enemyWeak: false,
        combo: 0, cardsPlayed: 0, damageThisTurn: 0, lastCardType: null, spellChain: 0,
        enemyVulnerable: 0, enemyBurn: 0, enemyIgnited: false, enemyFrozen: false, thorns: 0, playerFrail: false,
        counterMagic: false, reflectNext: false, manaAbsorb: false, pendingManaRefund: 0, secretClonedUids: [], arcaneArtsUsed: [], pendingFx: 0, lastDrawnUids: [], magicCirculatedUids: [], strFlowTriggered: false, tigerForm:false, manaForge:0, manaReactor:false, manaEcho:0, secondHeart:false, bloodPact:false, healingStrike:false, chainArt:false, chainUsedThisTurn:false, breakthrough:false, hpSpentThisTurn:0, currentBattleRecorded:false
    }
};

const RUN_SAVE_KEY = 'ikuseicchi_run_v1';
const RUN_SAVE_FIELDS = ['phase','name','playerType','turn','maxTurns','bp','tempMana','hp','maxHp','str','int','deck','shopTab','shopCards','rarePity','trainingEvent','lastTrainingEvent','journeyChoices','avatar','runShardsEarned','runStats'];
const RunStorage = {
    save() {
        if (State.phase === 'start' || (State.phase === 'battle' && !State.battle.active)) return;
        try {
            const snapshot = { version:1, savedAt:Date.now() };
            RUN_SAVE_FIELDS.forEach(key => { snapshot[key] = State[key]; });
            snapshot.battle = { ...State.battle, processing:false, selectedHandIndex:null, pendingFx:0 };
            localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(snapshot));
        } catch (_) {}
    },
    restore() {
        try {
            const saved = JSON.parse(localStorage.getItem(RUN_SAVE_KEY) || 'null');
            if (!saved || saved.version !== 1 || !['training','battle'].includes(saved.phase)) return false;
            RUN_SAVE_FIELDS.forEach(key => { if (saved[key] !== undefined) State[key] = saved[key]; });
            State.battle = { ...State.battle, ...(saved.battle || {}), processing:false, selectedHandIndex:null, pendingFx:0 };
            State.meta = Meta.load();
            State.selectedAction = null;
            State.isTransitioning = false;
            const migrateCard = card => {
                if (!card?.id) return;
                if (card.id === 'absolute_barrier') {
                    const replacement = CARDS_DB.find(item => item.id === 'barrier');
                    const uid = card.uid;
                    const wasUpgraded = Boolean(card.upgraded);
                    Object.keys(card).forEach(key => delete card[key]);
                    Object.assign(card, replacement, { uid, upgraded:false, balanceVersion:7 });
                    if (wasUpgraded) applyCardUpgradeValues(card);
                }
                if (BALANCE_V2_IDS.has(card.id) && card.balanceVersion !== 7) {
                    const definition = CARDS_DB.find(item => item.id === card.id);
                    if (definition) {
                        const preserved = { uid:card.uid, secretMod:card.secretMod, growthApplied:card.growthApplied };
                        const wasUpgraded = Boolean(card.upgraded);
                        Object.keys(card).forEach(key => delete card[key]);
                        Object.assign(card, definition, preserved, { upgraded:false, balanceVersion:7 });
                        if (wasUpgraded) applyCardUpgradeValues(card);
                    }
                }
                if (card.id === 'feint' && card.type !== 'skill') {
                    const definition = CARDS_DB.find(item => item.id === 'feint');
                    const preserved = { uid:card.uid, secretMod:card.secretMod };
                    const wasUpgraded = Boolean(card.upgraded);
                    Object.keys(card).forEach(key => delete card[key]);
                    Object.assign(card, definition, preserved, { upgraded:false, balanceVersion:7 });
                    if (wasUpgraded) applyCardUpgradeValues(card);
                }
                if ((card.id === 'astral_collapse' && card.extra !== 'temp_mana_flat_burst') || (card.id === 'ley_resonance' && card.effect !== 'mana_echo')) {
                    const definition = CARDS_DB.find(item => item.id === card.id);
                    const preserved = { uid:card.uid, secretMod:card.secretMod };
                    const wasUpgraded = Boolean(card.upgraded);
                    Object.keys(card).forEach(key => delete card[key]);
                    Object.assign(card, definition, preserved, { upgraded:false, balanceVersion:7 });
                    if (wasUpgraded) applyCardUpgradeValues(card);
                }
                if (card.id === 'cheer') { delete card.draw; card.redraw = 2; card.add_action = true; card.exhaust = true; card.effect = 'str_up'; card.val = 1; card.limit = 1; }
                if (card.secretMod) card.secretMod = SECRET_MOD_BY_CARD[card.id] || 'serenity';
                if (card.secretMod || card.id === 'cheer') card.desc = Game.describeCard(card);
            };
            State.deck.forEach(migrateCard);
            ['hand','drawPile','discardPile','exhaustPile'].forEach(key => (State.battle[key] || []).forEach(migrateCard));
            State.deck = State.deck.filter(card => card.id !== 'fate_shuffle');
            ['hand','drawPile','discardPile','exhaustPile'].forEach(key => {
                State.battle[key] = (State.battle[key] || []).filter(card => card.id !== 'fate_shuffle');
            });
            return true;
        } catch (_) {
            localStorage.removeItem(RUN_SAVE_KEY);
            return false;
        }
    },
    clear() { try { localStorage.removeItem(RUN_SAVE_KEY); } catch (_) {} }
};

// Small synthesized sounds: no audio files or downloads required.
const Sound = {
    enabled: true,
    ctx: null,
    init() {
        if (!this.enabled) return null;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        if (!this.ctx) this.ctx = new AudioCtx();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    },
    tone(freq = 440, duration = .08, type = 'sine', volume = .035, delay = 0) {
        const ctx = this.init(); if (!ctx) return;
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + duration);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + duration);
    },
    play(name) {
        if (!this.enabled) return;
        if (name === 'select') this.tone(420,.045,'sine',.025);
        if (name === 'phys') { this.tone(150,.075,'square',.04); this.tone(90,.12,'sawtooth',.025,.03); }
        if (name === 'mag') { this.tone(520,.12,'sine',.035); this.tone(780,.18,'triangle',.025,.04); }
        if (name === 'block') { this.tone(240,.1,'square',.028); this.tone(360,.08,'triangle',.025,.04); }
        if (name === 'heal') { this.tone(520,.12,'sine',.025); this.tone(660,.16,'sine',.025,.07); }
        if (name === 'hurt') this.tone(85,.2,'sawtooth',.045);
        if (name === 'rare') [523,659,784,1047].forEach((f,i)=>this.tone(f,.25,'triangle',.03,i*.055));
        if (name === 'win') [392,523,659,784].forEach((f,i)=>this.tone(f,.28,'triangle',.035,i*.07));
    },
    toggle() {
        this.enabled = !this.enabled;
        const icon = document.querySelector('#sound-toggle i');
        if (icon) icon.className = `fas ${this.enabled ? 'fa-volume-up' : 'fa-volume-mute'}`;
        if (this.enabled) this.play('select');
    }
};

// --- ゲームロジック (Game) ---
const Game = {
    toggleSound: () => Sound.toggle(),
    openArcaneArts: () => {
        if (State.playerType !== 'int' || State.phase !== 'battle' || !State.battle.active || State.battle.processing || State.isTransitioning) return;
        UI.renderArcaneArts();
        document.getElementById('arcane-arts-menu').classList.remove('hidden');
    },
    closeArcaneArts: () => document.getElementById('arcane-arts-menu').classList.add('hidden'),
    useArcaneArt: (art) => {
        const definitions = {
            transcribe:{ cost:3, title:'魔導転写', subtitle:'DRAW ×2' },
            phase:{ cost:5, title:'位相転換', subtitle:'NEXT ATTACK → MANA' },
            compress:{ cost:8, title:'時間圧縮', subtitle:'ACTION +1 / DRAW ×2' }
        };
        const definition = definitions[art];
        if (!definition || State.playerType !== 'int' || State.battle.processing || State.battle.arcaneArtsUsed.includes(art) || State.tempMana < definition.cost) return;
        State.tempMana -= definition.cost;
        State.battle.arcaneArtsUsed.push(art);
        if (art === 'transcribe') Game.drawCards(2);
        if (art === 'phase') State.battle.manaAbsorb = true;
        if (art === 'compress') { State.battle.actionsLeft++; Game.drawCards(2); }
        Game.closeArcaneArts();
        UI.traitActivation('magic',definition.title,definition.subtitle);
        UI.toast(`【秘奥術】${definition.title}！ 一時魔力-${definition.cost}`);
        UI.updateBattle();
        RunStorage.save();
    },
    openRunMenu: () => {
        const canOpen = State.phase === 'training' || (State.phase === 'battle' && State.battle.active && !State.battle.processing);
        if (!canOpen || State.isTransitioning) return;
        const inBattle = State.phase === 'battle';
        document.getElementById('run-menu-title').innerText = inBattle ? '戦闘を中断しますか？' : '育成を中断しますか？';
        document.getElementById('run-menu-description').innerText = '現在のデータを破棄します。この回のBP・報酬は獲得できません。';
        document.getElementById('run-menu-cancel').innerText = inBattle ? '戦闘を続ける' : '育成を続ける';
        document.getElementById('run-menu').classList.remove('hidden');
    },
    closeRunMenu: () => document.getElementById('run-menu').classList.add('hidden'),
    abandonRun: () => {
        RunStorage.clear();
        State.runShardsEarned = 0;
        State.battle.active = false;
        State.battle.processing = false;
        State.isTransitioning = false;
        State.selectedAction = null;
        Game.closeRunMenu();
        Game.closeArcaneArts();
        document.getElementById('turn-banner').classList.add('scale-0');
        document.getElementById('scene-draft').classList.add('hidden');
    },
    restartTraining: () => {
        const name = State.name.replace(/っち$/, '');
        const type = State.playerType || 'hp';
        Game.abandonRun();
        document.getElementById('input-name').value = name;
        Game.selectType(type);
        Game.start();
    },
    returnToStart: (clearName = false) => {
        Game.abandonRun();
        State.phase = 'start';
        document.getElementById('trait-display').classList.add('hidden');
        const input = document.getElementById('input-name');
        input.value = clearName ? '' : State.name.replace(/っち$/, '');
        Game.selectType(State.playerType || 'hp');
        UI.changeScene('scene-start', () => UI.updateStartMeta());
    },

    selectType: (type) => {
        Sound.play('select');
        Game.tempType = type;
        document.querySelectorAll('.type-btn').forEach(b => {
            b.classList.remove('ring-4', 'ring-yellow-400');
            b.classList.add('opacity-70');
        });
        const btn = document.getElementById(`btn-type-${type}`);
        if(btn) {
            btn.classList.add('ring-4', 'ring-yellow-400');
            btn.classList.remove('opacity-70');
        }
    },

    start: () => {
        RunStorage.clear();
        const input = document.getElementById('input-name');
        let name = input.value.trim() || 'ななし';
        if(!name.endsWith('っち')) name += 'っち';
        State.name = name;
        State.phase = 'training';
        State.playerType = Game.tempType || 'hp';
        State.hp = 50; State.maxHp = 50; State.str = 5; State.int = 5; State.turn = 1; State.bp = 0; State.tempMana = 0; State.rarePity = 0;
        State.deck = [];
        State.runXpEarned = 0; State.runNewUnlocks = []; State.runLevelBefore = State.meta.playerLevel;
        State.runStats = { damageDealt:0, damageTaken:0, cardsPlayed:0, totalBattleTurns:0, battles:0 };
        State.selectedAction = null;
        State.isTransitioning = false;

        let trait = "";
        let avatar = '🐣';
        if (State.playerType === 'hp') { 
            State.maxHp = 65; State.hp = 65;
            Game.addCard('punch'); Game.addCard('defend'); Game.addCard('defend');
            Game.addCard('bandage'); Game.addCard('body_press');
            trait = "特性: 生命の殻・自然治癒"; avatar = '🐻';
        } else if (State.playerType === 'str') { 
            State.str = 8; 
            Game.addCard('punch'); Game.addCard('quick'); Game.addCard('defend');
            Game.addCard('kick'); Game.addCard('rage'); 
            trait = "特性: 先手必勝・連撃の呼吸・クロスカウンター"; avatar = '🐯';
        } else if (State.playerType === 'int') { 
            State.int = 8; 
            Game.addCard('punch'); Game.addCard('punch'); Game.addCard('defend');
            Game.addCard('spark'); Game.addCard('barrier'); 
            trait = "特性: 一時魔力"; avatar = '🦉';
        }
        State.avatar = avatar;
        const inheritedHp = State.meta.upgrades.vitality * 5;
        State.maxHp += inheritedHp; State.hp = State.maxHp;
        State.str += State.meta.upgrades.power;
        State.int += State.meta.upgrades.wisdom;
        document.getElementById('char-avatar').innerText = avatar;
        document.getElementById('player-battle-avatar').innerText = avatar;
        
        document.getElementById('trait-display').innerText = trait;
        document.getElementById('trait-display').classList.remove('hidden');

        UI.updateHeader();
        UI.changeScene('scene-training');
        UI.updateActionButtons(); 
        UI.updateTraining();
        Game.rollTrainingEvent(true);
        RunStorage.save();
        UI.toast(`誕生！${State.name}！`);
    },

    addCard: (id) => {
        const card = CARDS_DB.find(c => c.id === id);
        if(card) {
            // Deep copy
            State.deck.push({...card, uid: Math.random(), upgraded: false});
        }
    },
    
    countCard: (id) => {
        return State.deck.filter(c => c.id === id).length;
    },

    isCardUnlocked: (card) => DEBUG_ALL_CARDS || !card.unlockLevel || State.meta.playerLevel >= card.unlockLevel,

    openDeckViewer: (tab = 'deck') => {
        State.deckViewerTab = ['deck','draw','discard','exhaust'].includes(tab) ? tab : 'deck';
        UI.renderDeckViewer();
        document.getElementById('deck-viewer').classList.remove('hidden');
    },
    closeDeckViewer: () => document.getElementById('deck-viewer').classList.add('hidden'),
    setDeckViewerTab: (tab) => { State.deckViewerTab = tab; UI.renderDeckViewer(); },

    openCardLibrary: () => {
        State.libraryTab = State.libraryTab || 'common';
        UI.renderCardLibrary();
        document.getElementById('card-library').classList.remove('hidden');
    },
    closeCardLibrary: () => document.getElementById('card-library').classList.add('hidden'),
    setCardLibraryTab: (tab) => { State.libraryTab = tab; UI.renderCardLibrary(); },
    openAnnouncements: () => {
        UI.renderAnnouncements();
        document.getElementById('announcements-modal').classList.remove('hidden');
    },
    closeAnnouncements: () => document.getElementById('announcements-modal').classList.add('hidden'),

    // --- TRAINING ---
    rollTrainingEvent: (initial = false) => {
        let candidates = TRAINING_EVENTS.filter(event => event.id !== State.lastTrainingEvent);
        if (initial) candidates = TRAINING_EVENTS.filter(event => ['calm','festival','mentor'].includes(event.id));
        const event = candidates[Math.floor(Math.random() * candidates.length)] || TRAINING_EVENTS[0];
        State.trainingEvent = event; State.lastTrainingEvent = event.id;
        State.selectedAction = null;
        UI.updateDailyEvent(); UI.updateActionButtons();
        RunStorage.save();
    },
    getTrainingAction: (type) => {
        const event = State.trainingEvent || TRAINING_EVENTS[0];
        const base = ACTION_DATA[type];
        if (type === 'rest') return { ...base, restRate:event.restRate || CONSTANTS.REST_RECOVERY_RATE, title:event.restRate === 1 ? 'たっぷり休む' : base.title };
        let multiplier = event.multiplier ?? 1;
        if (event.focus) multiplier = event.focus === type ? event.focusMultiplier : event.otherMultiplier;
        const gain = Math.max(1,Math.round(base.gain * multiplier));
        return { ...base, gain, cost:Math.max(5,base.cost + (event.cost || 0)), greatChance:Math.min(.75,.15 + (event.great || 0) + State.meta.upgrades.fortune * .03), title:event.focus === type ? `特別${base.title}` : base.title };
    },
    tryAction: (type) => {
        if (State.isTransitioning) return;
        if (State.selectedAction !== type) {
            State.selectedAction = type;
            UI.updateActionButtons();
            return;
        }
        Game.executeAction(type);
    },
    executeAction: (type) => {
        State.selectedAction = null;
        State.isTransitioning = true; 
        UI.updateActionButtons();
        if (type === 'rest') Game.doRest(); else Game.doTrain(type);
    },
    doTrain: (type) => {
        const action = Game.getTrainingAction(type);
        if (State.hp <= action.cost) {
            UI.toast("体力が足りない！");
            UI.animShake('#train-hp-bar');
            document.getElementById('hp-warning').classList.remove('hidden');
            State.isTransitioning = false;
            return;
        }
        State.hp -= action.cost;
        const greatSuccess = Math.random() < action.greatChance;
        const finalGain = action.gain * (greatSuccess ? 2 : 1);
        
        let gainStat = ""; let gainVal = 0; let title = ""; let icon = "";
        if (type === 'hp') {
            State.maxHp += finalGain; gainStat = "最大体力"; gainVal = finalGain; title = "体力強化！"; icon = "💖";
        } else if (type === 'str') {
            State.str += finalGain; gainStat = "攻撃力"; gainVal = finalGain; title = "筋トレ成功！"; icon = "💪";
        } else if (type === 'int') {
            State.int += finalGain; gainStat = "魔力"; gainVal = finalGain; title = "研究成果！"; icon = "🔮";
        }
        if (State.trainingEvent.bp) State.bp += State.trainingEvent.bp;
        if (greatSuccess && State.trainingEvent.bpOnGreat) State.bp += State.trainingEvent.bpOnGreat;
        if (greatSuccess) { title = '大成功！！！'; icon = '🌟'; }
        UI.updateTraining();
        const bonusText = (State.trainingEvent.bp || (greatSuccess && State.trainingEvent.bpOnGreat)) ? ` / BP +${(State.trainingEvent.bp||0)+(greatSuccess?State.trainingEvent.bpOnGreat||0:0)}` : '';
        UI.showCutin({ icon, title, statText: `${gainStat} +${gainVal}${bonusText}`, costText: `HP -${action.cost}`, variant:greatSuccess?'great':'training', onComplete: () => UI.showDraft(type, 'training') });
    },
    doRest: () => {
        const action = Game.getTrainingAction('rest');
        const event = State.trainingEvent || TRAINING_EVENTS[0];
        if (event.restMaxHp) State.maxHp += event.restMaxHp;
        const healAmount = Math.floor(State.maxHp * action.restRate);
        const oldHp = State.hp;
        State.hp = Math.min(State.maxHp, State.hp + healAmount);
        UI.updateTraining();
        UI.showCutin({ icon: event.restMaxHp ? "♨️" : "💤", title: event.restMaxHp ? "温泉で超回復！" : "リフレッシュ", statText: `HP +${State.hp - oldHp}${event.restMaxHp?` / 最大HP +${event.restMaxHp}`:''}`, costText: `全快まであと${State.maxHp - State.hp}`, onComplete: () => Game.advanceTurn() });
    },
    
    draftCard: (cardId) => {
        const chosen = CARDS_DB.find(c => c.id === cardId);
        Sound.play(chosen?.rarity === 'rare' ? 'rare' : 'select');
        Game.addCard(cardId);
        document.getElementById('scene-draft').classList.add('hidden');
        UI.toast("カードを習得！");
        if (State.phase === 'training') Game.advanceTurn();
        else if (State.phase === 'battle') Game.checkBattleProgress();
    },

    skipDraft: () => {
        document.getElementById('scene-draft').classList.add('hidden');
        UI.toast("報酬をスキップしました");
        if (State.phase === 'training') Game.advanceTurn();
        else Game.checkBattleProgress();
    },

    advanceTurn: () => {
        UI.updateTraining();
        document.getElementById('hp-warning').classList.add('hidden');
        State.isTransitioning = false; 

        if (State.turn >= State.maxTurns) {
            State.isTransitioning = true; 
            UI.showCutin({
                icon: "📈",
                title: "育成完了！",
                statText: "成長データを測定中…",
                costText: "ANALYZING",
                onComplete: () => {
                    UI.changeScene('scene-analysis', () => UI.renderGrowthAnalysis());
                }
            });
        } else {
            State.turn++;
            UI.updateHeader();
            Game.rollTrainingEvent();
        }
    },

    // --- BATTLE ---
    beginBattleFromAnalysis: () => {
        if (State.phase !== 'training') return;
        UI.showCutin({ icon:'⚔️', title:'解析完了', statText:`総合評価 ${UI.getGrowthRank().rank}`, costText:'実戦へ', onComplete:() => Game.initBattle() });
    },
    initBattle: () => {
        State.phase = 'battle';
        State.battle.active = true;
        State.battle.enemiesDefeated = 0;
        State.battle.processing = false; 
        State.isTransitioning = false;
        State.battle.block = 0;
        State.battle.pendingManaRefund = 0;

        document.getElementById('bp-display').classList.remove('hidden');
        if (State.hp <= 0) State.hp = 1;
        UI.changeScene('scene-battle', () => Game.spawnEnemy());
    },

    spawnEnemy: () => {
        const level = State.battle.enemiesDefeated;
        const nameChars = [...HIRAGANA].filter(char => char !== 'っ');
        let nameLen = Math.floor(Math.random() * 4) + 1; 
        let nameStr = "";
        for(let i=0; i<nameLen; i++) nameStr += nameChars[Math.floor(Math.random() * nameChars.length)];
        nameStr += "っち";

        const tier = level + 1;
        const bosses = tier % 5 === 0;
        const elite = !bosses && tier % 4 === 0;
        const archetypes = bosses ? BOSS_ARCHETYPES : elite ? ELITE_ARCHETYPES : ENEMY_ARCHETYPES;
        const archetype = bosses
            ? archetypes[Math.floor(level / 5) % archetypes.length]
            : archetypes[Math.floor(Math.random() * archetypes.length)];
        // 後半の壁をなだらかにし、敵の個性と行動パターンで難度を作る。
        const eMaxHp = Math.floor((52 + level * 11 + Math.pow(level, 1.16) * 1.8) * archetype.hp);
        const eAtk = Math.floor((6 + level * .95 + Math.floor(level / 8)) * archetype.atk);
        const affix = tier >= 6 && Math.random() < Math.min(.8,.4 + tier * .02)
            ? ENEMY_AFFIXES[Math.floor(Math.random() * ENEMY_AFFIXES.length)] : null;
        State.battle.enemy = {
            name:nameStr, sprite:archetype.sprite, kind:archetype.kind, archetypeLabel:archetype.label, trait:archetype.trait,
            maxHp:eMaxHp, hp:eMaxHp, block:0, baseAtk:eAtk, intent:'atk', intentValue:eAtk, intentHits:1,
            level:tier, strength:0, boss:bosses, elite, affix, phaseTriggered:false
        };
        if (affix?.id === 'armored') State.battle.enemy.block = Math.max(6,Math.floor(eMaxHp*.12));
        
        State.battle.drawPile = Game.shuffle([...State.deck]);
        State.battle.discardPile = [];
        State.battle.exhaustPile = [];
        State.battle.hand = [];
        State.battle.turnCount = 0;
        State.battle.selectedHandIndex = null;
        
        if (State.playerType === 'str') {
            State.battle.actionsNextTurn = 2; 
            UI.toast("【特性】先手必勝！");
            setTimeout(() => UI.traitActivation('attack','先手必勝','FIRST ACTION ×2'),120);
        } else {
            State.battle.actionsNextTurn = 1;
        }
        
        State.battle.drawNextTurn = 0;
        State.battle.playerTempStr = 0;
        State.battle.playerTempInt = 0;
        State.battle.magBonus = 0;
        State.battle.retainBlock = false;
        State.battle.echo = 0;
        State.battle.immortal = false;
        State.battle.enemyWeak = false;
        State.battle.combo = 0;
        State.battle.cardsPlayed = 0;
        State.battle.damageThisTurn = 0;
        State.battle.lastCardType = null;
        State.battle.spellChain = 0;
        State.battle.enemyVulnerable = 0;
        State.battle.enemyBurn = 0;
        State.battle.enemyIgnited = false;
        State.battle.enemyFrozen = false;
        State.battle.thorns = 0;
        State.battle.playerFrail = false;
        State.battle.counterMagic = false;
        State.battle.reflectNext = false;
        State.battle.magicCirculatedUids = [];
        State.battle.manaAbsorb = false;
        State.battle.secretClonedUids = [];
        State.battle.arcaneArtsUsed = [];
        State.battle.strFlowTriggered = false;
        State.battle.tigerForm = false; State.battle.manaForge = 0; State.battle.manaReactor = false; State.battle.manaEcho = 0;
        State.battle.secondHeart = false; State.battle.bloodPact = false; State.battle.healingStrike = false;
        State.battle.chainArt = false; State.battle.chainUsedThisTurn = false; State.battle.breakthrough = false;
        State.battle.hpSpentThisTurn = 0;
        State.battle.processing = false;
        Game.rollEnemyIntent();
        UI.setArena(archetype.kind);
        UI.toast(`${State.battle.enemy.name} (Lv.${tier}) があらわれた！`);
        Game.startBattleTurn();
    },

    startBattleTurn: () => {
        State.battle.actionsLeft = State.battle.actionsNextTurn; 
        State.battle.actionsNextTurn = 1;
        if (State.playerType !== 'hp' && !State.battle.retainBlock) State.battle.block = 0;
        State.battle.retainBlock = false;
        State.battle.processing = false;
        State.battle.selectedHandIndex = null;
        State.battle.lastDrawnUids = [];
        State.battle.currentBattleRecorded = false;
        State.battle.combo = State.battle.tigerForm || 0;
        State.battle.cardsPlayed = 0;
        State.battle.damageThisTurn = 0;
        State.battle.lastCardType = null;
        State.battle.spellChain = 0;
        State.battle.strFlowTriggered = false;
        State.battle.chainUsedThisTurn = false;
        State.battle.hpSpentThisTurn = 0;
        if (State.battle.manaReactor) { State.tempMana += State.battle.manaReactor; UI.traitActivation('magic','魔力永久機関',`MANA +${State.battle.manaReactor}`); }
        if (State.battle.pendingManaRefund > 0) {
            const refund = State.battle.pendingManaRefund;
            State.battle.pendingManaRefund = 0;
            State.tempMana += refund;
            UI.traitActivation('magic','逆行支払い',`MANA +${refund}`);
            UI.toast(`時間を逆行し、一時魔力+${refund}`);
        }
        if (State.playerType === 'hp' && State.battle.turnCount === 0) {
            const shell = Math.max(8,Math.floor(State.maxHp * .12));
            State.battle.block += shell;
            UI.toast(`【特性】生命の殻 ブロック+${shell}`);
            setTimeout(() => UI.traitActivation('vitality','生命の殻',`BLOCK +${shell}`),100);
        }
        const drawCount = CONSTANTS.DRAW_COUNT + State.battle.drawNextTurn;
        State.battle.drawNextTurn = 0; 

        Game.drawCards(drawCount);
        UI.updateBattle();
        UI.updateHeader();
    },

    shuffle: (array) => array.sort(() => Math.random() - 0.5),

    drawCards: (num) => {
        State.battle.lastDrawnUids = [];
        for(let i=0; i<num; i++) {
            if (State.battle.hand.length >= CONSTANTS.HAND_LIMIT) break;
            if (State.battle.drawPile.length === 0) {
                if (State.battle.discardPile.length > 0) {
                    State.battle.drawPile = Game.shuffle([...State.battle.discardPile]);
                    State.battle.discardPile = [];
                    UI.toast("捨て札を山札に戻した！");
                } else {
                    break;
                }
            }
            if (State.battle.drawPile.length > 0) {
                const drawn = State.battle.drawPile.pop();
                State.battle.hand.push(drawn);
                State.battle.lastDrawnUids.push(drawn.uid);
            }
        }
    },

    handleCardClick: (event, index) => {
        event.stopPropagation();
        if (State.battle.processing) return;

        if (State.battle.selectedHandIndex === index) {
            Game.playCardSequence(index);
        } else {
            Sound.play('select');
            State.battle.selectedHandIndex = index;
            UI.updateHandSelection();
        }
    },

    deselectCard: () => {
        if (State.battle.selectedHandIndex !== null) {
            State.battle.selectedHandIndex = null;
            UI.updateHandSelection();
        }
    },

    getCardImpact: (card) => {
        if (card.rarity === 'rare' || card.val >= 4 || (card.hits || 1) >= 5 || ['hp_halve_press','maxhp_block'].includes(card.extra)) return 3;
        if (['hp_sacrifice','maxhp_scale'].includes(card.extra)) return 2;
        if (card.val >= 2.2 || (card.hits || 1) >= 3 || card.exhaust) return 2;
        return 1;
    },

    applyRecoilDamage: (amount) => {
        const damage = Math.min(Math.max(0, State.hp - 1), Math.max(0, amount));
        State.hp -= damage;
        if (damage > 0) {
            UI.combatNumber(damage, 'hurt', 'player-battle-avatar');
            UI.animShake('#game-container');
            UI.toast(`反動 ${damage} ダメージ`);
        } else {
            UI.toast('反動をHP1で耐えた！');
        }
        return damage;
    },

    spendHp: (requested) => {
        const cost = Math.min(Math.max(0, State.hp - 1), Math.max(0, Math.floor(requested)));
        State.hp -= cost;
        if (cost > 0) {
            State.battle.hpSpentThisTurn += cost;
            if (State.playerType === 'hp') {
                const armor = Math.max(1, Math.floor(cost * (State.battle.bloodPact || .5)));
                State.battle.block += armor;
                UI.combatNumber(armor, 'block', 'player-battle-avatar');
                UI.traitActivation('vitality',State.battle.bloodPact ? '血の盟約' : '血潮の鎧',`BLOCK +${armor}`);
            }
            UI.combatNumber(cost, 'hurt', 'player-battle-avatar');
            UI.animShake('#game-container');
            UI.toast(`HPを${cost}消費！`);
        } else {
            UI.toast('HP1のため消費なし');
        }
        return cost;
    },

    getCardHeal: (card) => card.healRate ? Math.ceil(State.maxHp * card.healRate) : card.val,

    playCardSequence: async (handIndex) => {
        const card = State.battle.hand[handIndex];
        if (!card) return;
        if (State.battle.actionsLeft <= 0) {
            UI.toast("行動権がありません！");
            UI.animShake('#action-point-container');
            return;
        }
        if (card.manaCost && State.tempMana < card.manaCost) {
            UI.toast(`一時魔力が足りません（必要 ${card.manaCost}）`);
            UI.animShake('#temp-mana-panel');
            return;
        }

        const cardEl = document.getElementById('hand-container').children[handIndex];
        if(cardEl) {
            const rect = cardEl.getBoundingClientRect();
            const targetId = ['phys','mag'].includes(card.type) ? 'enemy-sprite' : 'player-battle-avatar';
            const target = document.getElementById(targetId).getBoundingClientRect();
            const clone = cardEl.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = rect.left + 'px';
            clone.style.top = rect.top + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.margin = '0';
            clone.style.transform = 'none'; clone.style.opacity = '1';
            clone.classList.remove('hand-overlap');
            clone.classList.add('card-using-anim'); 
            document.body.appendChild(clone);
            
            cardEl.style.opacity = '0'; 
            State.battle.processing = true;

            const centerX = innerWidth / 2 - rect.width / 2;
            const centerY = innerHeight / 2 - rect.height / 2;
            const targetX = target.left + target.width / 2 - rect.width / 2;
            const targetY = target.top + target.height / 2 - rect.height / 2;
            const impactTier = Game.getCardImpact(card);
            const duration = impactTier === 3 ? 650 : impactTier === 2 ? 430 : 280;
            if (card.rarity === 'rare') { UI.flash('rare'); Sound.play('rare'); }
            const keyframes = impactTier === 3 ? [
                { left:`${rect.left}px`, top:`${rect.top}px`, transform:'scale(1) rotate(0deg)', opacity:1, filter:'brightness(1)', offset:0 },
                { left:`${centerX}px`, top:`${centerY}px`, transform:'scale(1.48) rotate(-3deg)', opacity:1, filter:'brightness(1)', offset:.38 },
                { left:`${centerX}px`, top:`${centerY}px`, transform:'scale(1.72) rotate(2deg)', opacity:1, filter:'brightness(1.8)', offset:.66 },
                { left:`${centerX}px`, top:`${centerY}px`, transform:'scale(1.55) rotate(-2deg)', opacity:1, filter:'brightness(1.2)', offset:.78 },
                { left:`${targetX}px`, top:`${targetY}px`, transform:'scale(.45) rotate(10deg)', opacity:.9, filter:'brightness(2.5)', offset:1 }
            ] : [
                { left:`${rect.left}px`, top:`${rect.top}px`, transform:'scale(1) rotate(0deg)', opacity:1, offset:0 },
                { left:`${centerX}px`, top:`${centerY}px`, transform:`scale(${impactTier===2?1.42:1.25}) rotate(-2deg)`, opacity:1, offset:impactTier===2?.62:.48 },
                { left:`${targetX}px`, top:`${targetY}px`, transform:'scale(.42) rotate(9deg)', opacity:.85, filter:'brightness(2)', offset:1 }
            ];
            const animation = clone.animate(keyframes, { duration, easing:impactTier===3?'cubic-bezier(.2,.75,.15,1)':'cubic-bezier(.16,1,.3,1)', fill:'forwards' });
            try { await animation.finished; } catch (_) {}
            UI.showEffectPop(card);
            const consume = UI.consumeCard(clone, impactTier, target.left + target.width/2, target.top + target.height/2, card.type);
            Game.executeCardLogic(handIndex);
            await consume; clone.remove();
            UI.updateBattle();
            setTimeout(() => {
                if (State.battle.active && State.hp > 0 && State.battle.enemy && State.battle.enemy.hp > 0) {
                    State.battle.processing = false;
                    UI.updateBattle();
                    Game.checkTurnEndCondition();
                }
            }, card.hits ? Math.min(980, (card.hits - 1) * MULTI_HIT_INTERVAL + 240) : impactTier===3?280:160);
        } else {
            Game.executeCardLogic(handIndex);
            UI.updateBattle();
        }
    },

    executeCardLogic: (handIndex) => {
        const card = State.battle.hand[handIndex];
        if (!card) return;
        // Move the played card out of hand before resolving draw effects so the
        // advertised number of cards can be drawn up to the hand limit.
        State.battle.hand.splice(handIndex, 1);
        State.battle.pendingFx = 0;
        State.battle.actionsLeft--;
        State.battle.selectedHandIndex = null;
        State.runStats.cardsPlayed++;
        const manaSpent = card.manaCost ? (card.consumeAllMana ? State.tempMana : card.manaCost) : 0;
        if (manaSpent > 0) State.tempMana -= manaSpent;

        let str = State.str + State.battle.playerTempStr;
        let int = State.int + State.battle.playerTempInt;
        const isDamageCard = card.type === 'phys' || card.type === 'mag';
        const comboBefore = State.battle.combo;
        if (isDamageCard) {
            State.battle.cardsPlayed++;
            State.battle.lastCardType = card.type;
        }

        // 炎上系の付与・爆発はカード本体の攻撃より先に解決する。
        // 致死ダメージのカードでも、引火／再引火の能力と演出を取りこぼさない。
        if (card.burn) Game.applyBurn(card.burn);

        if (card.type === 'phys') {
            let dmg = Math.floor(str * card.val);
            if (card.extra === 'hp_scale') dmg += Math.floor(State.hp * 0.1);
            if (card.extra === 'hp_dmg') dmg = State.hp;
            if (card.extra === 'hp_sacrifice') {
                const cost = Game.spendHp(State.hp * (card.scale || .15));
                dmg = Math.floor(cost * (card.extraMult || 2.6));
            }
            if (card.extra === 'hp_sacrifice_blast') {
                const cost = Game.spendHp(State.hp * (card.scale || .22));
                dmg = Math.floor(cost * (card.extraMult || 3.4));
            }
            if (card.extra === 'missing_hp_damage') dmg += Math.floor((State.maxHp - State.hp) * (card.scale || .25));
            if (card.extra === 'combo_cashout') dmg += Math.floor(str * (card.comboScale || .35) * comboBefore);
            if (card.extra === 'vitality_wave') dmg = Math.floor(State.maxHp*(card.scale||.22) + (State.maxHp-State.hp)*(card.missingScale||.25));
            if (card.extra === 'block_dmg') dmg = Math.floor(State.battle.block * (card.extraMult || 1));
            if (card.extra === 'maxhp_scale') {
                dmg = Math.floor(State.maxHp * (card.scale || .3));
                if (card.hpCostScale) Game.spendHp(State.hp * card.hpCostScale);
            }
            if (card.extra === 'execute' && State.battle.enemy.hp <= State.battle.enemy.maxHp * 0.3) dmg *= 2;
            if (card.extra === 'intent_counter' && ['heavy','drain'].includes(State.battle.enemy.intent)) dmg *= 2;
            if (card.extra === 'hp_halve_press') {
                // プレス強化: 現在HPを半分にし、消費分の3倍ダメージ
                const cost = Game.spendHp(State.hp * (card.scale || .5));
                dmg = Math.floor(cost * (card.extraMult || 3));
            }
            if (card.self_dmg) {
                Game.applyRecoilDamage(card.self_dmg);
            }
            let totalDealt = 0;
            if (card.hits) {
                for(let k=0; k<card.hits; k++) {
                    const hitDmg = Math.floor(dmg * (1 + Math.min(5,comboBefore + k) * .1));
                    totalDealt += Game.dealDamage(hitDmg, { kind:'phys', delay:k * MULTI_HIT_INTERVAL, multiHit:true, critical: (card.rarity === 'rare' && k === card.hits-1) || hitDmg >= State.battle.enemy.maxHp * .25 });
                }
            } else {
                dmg = Math.floor(dmg * (1 + Math.min(5,comboBefore) * .1));
                totalDealt = Game.dealDamage(dmg, { kind:'phys', critical: card.rarity === 'rare' || card.extra === 'execute' });
            }
            if (State.battle.chainArt && !State.battle.chainUsedThisTurn) {
                State.battle.chainUsedThisTurn = true;
                Game.dealDamage(Math.floor(dmg * State.battle.chainArt), { kind:'phys', delay:120, critical:true });
                UI.toast('【連鎖奥義】追撃！');
            }
            State.battle.combo = comboBefore + (card.hits || 1);
            if (card.extra === 'combo_cashout') { State.battle.combo = 0; UI.toast(`コンボ${comboBefore}を解放！`); }
            if (card.extra === 'drain') {
                const drainAmt = Math.min(State.maxHp - State.hp, Math.floor(totalDealt * (card.drainRate || 0.5)));
                State.hp += drainAmt;
                UI.combatNumber(drainAmt, 'heal', 'player-battle-avatar');
                UI.toast(`HP ${drainAmt} 吸収`);
            }
            if (card.extra === 'intent_counter' && ['heavy','drain'].includes(State.battle.enemy.intent)) State.battle.block += Game.incomingDamage();
            if (card.consumeBlock) State.battle.block = 0;
        } else if (card.type === 'mag') {
            const storedBonus = State.battle.magBonus;
            let dmg = Math.floor(int * card.val) + storedBonus;
            if (card.extra === 'temp_mana_burst') dmg += manaSpent * 4;
            if (card.extra === 'temp_mana_flat_burst') dmg += manaSpent * (card.manaFlat || 8);
            State.battle.magBonus = 0;
            if (card.secretMod === 'void_distill' && State.battle.enemy.block > 0) {
                const erased = State.battle.enemy.block;
                const distilled = Math.min(6, Math.max(1, Math.ceil(erased / 3)));
                State.battle.enemy.block = 0;
                State.tempMana += distilled;
                UI.toast(`【虚無蒸留】ブロック${erased}を消滅・一時魔力+${distilled}`);
            }
            Game.dealDamage(dmg, { kind:'mag', critical: card.rarity === 'rare' || dmg >= State.battle.enemy.maxHp * .25 });
            const echoStacks = Math.max(0,Number(State.battle.echo) || 0);
            State.battle.echo = 0;
            for (let echoIndex=0; echoIndex<echoStacks && State.battle.enemy.hp>0; echoIndex++) {
                Game.dealDamage(dmg, { kind:'mag', delay:120*(echoIndex+1), critical:true });
            }
            if (echoStacks > 0) UI.toast(`残響×${echoStacks}！ 魔法が合計${echoStacks+1}回発動`);
            if (card.self_dmg) Game.applyRecoilDamage(card.self_dmg);
        } else if (card.type === 'heal') {
            let heal = Game.getCardHeal(card);
            if (card.extra === 'low_hp_double' && State.hp <= State.maxHp / 2) heal *= 2;
            const missingHp = State.maxHp - State.hp;
            const actualHeal = Math.min(State.maxHp - State.hp, heal);
            State.hp += actualHeal;
            if (card.secretMod === 'overflow') {
                const overflow = Math.max(0, heal - missingHp);
                if (overflow > 0) { State.battle.block += overflow; UI.combatNumber(overflow,'block','player-battle-avatar'); }
            }
            UI.combatNumber(actualHeal, 'heal', 'player-battle-avatar'); Sound.play('heal'); UI.burst('player-battle-avatar','#4ade80');
            UI.toast(`HP ${actualHeal} 回復`);
            if (State.battle.healingStrike && actualHeal > 0) Game.dealDamage(Math.floor(actualHeal*State.battle.healingStrike), { kind:'phys', critical:actualHeal >= State.battle.enemy.maxHp*.2 });
        } else if (card.type === 'def') {
            let blk = card.val;
            if (card.id === 'barrier' || card.id === 'arcane_shield') blk = Math.floor(int * card.val);
            if (card.extra === 'temp_mana_block') blk = Math.floor(int * card.val) + State.tempMana * 2;
            if (card.extra === 'hp_sacrifice_block') {
                const cost = Game.spendHp(State.hp * (card.scale || .12));
                blk = Math.floor(cost * (card.extraMult || 2.5));
            }
            if (card.extra === 'missing_hp_block') blk += Math.floor((State.maxHp - State.hp) * .2);
            if (card.extra === 'maxhp_block') blk = Math.min(card.upgraded ? (card.upgradedBlockCap||75) : (card.blockCap||60), Math.floor(State.maxHp * (card.scale || .5)));
            if (card.extra === 'intent_block') blk = Game.incomingDamage();
            if (card.extra === 'revenge_guard') blk = Game.incomingDamage() + Math.floor((State.maxHp - State.hp) * .2);
            if (State.battle.playerFrail) blk = Math.max(1, Math.floor(blk * .75));
            if (card.secretMod === 'anchor') blk = Math.ceil(blk * 1.5);
            State.battle.block += blk;
            if (card.extra === 'intent_block') State.battle.counterMagic = card.upgraded ? 45 : 30;
            if (card.extra === 'revenge_guard') State.battle.reflectNext = card.upgraded ? 1.5 : 1;
            UI.combatNumber(blk, 'block', 'player-battle-avatar'); Sound.play('block'); UI.burst('player-battle-avatar','#60a5fa');
            UI.toast(`ブロック ${blk}`);
        } else if (card.type === 'buff' || card.type === 'skill') {
            if (card.effect === 'str_up') {
                State.battle.playerTempStr += card.val;
                UI.toast(`攻撃力 +${card.val}`);
            } else if (card.effect === 'int_up') {
                State.battle.playerTempInt += card.val;
                UI.toast(`魔力 +${card.val}`);
            } else if (card.effect === 'both_up') {
                State.battle.playerTempStr += card.val;
                State.battle.playerTempInt += card.val;
                UI.toast(`攻撃・魔力 +${card.val}`);
            } else if (card.effect === 'action_up') {
                State.battle.actionsNextTurn += card.val;
                UI.toast(`次ターン行動回数 +${card.val}`);
            } else if (card.effect === 'maxhp_up') {
                const growth = Math.max(0, card.val - (card.growthApplied || 0));
                State.maxHp += growth; card.growthApplied = card.val;
                const heal = Game.getCardHeal(card);
                const actualHeal = Math.min(State.maxHp - State.hp, heal);
                State.hp += actualHeal;
                UI.combatNumber(actualHeal, 'heal', 'player-battle-avatar');
                UI.toast(`最大HP増強！ HP ${actualHeal} 回復`);
            } else if (card.effect === 'next_draw') {
                State.battle.drawNextTurn += card.val;
                UI.toast(`次ターン追加ドロー`);
            } else if (card.effect === 'mana_cycle') {
                UI.toast('魔道書を展開！');
            } else if (card.effect === 'mana_only') {
                UI.toast('魔力の雫を取り込んだ！');
            } else if (card.effect === 'draw_flow') {
                UI.toast('追い風が吹いた！');
            } else if (card.effect === 'redraw_hand') {
                UI.toast('運命を選び直した！');
            } else if (card.effect === 'tiger_form') {
                State.battle.tigerForm = card.upgraded ? 2 : 1; State.battle.combo = Math.max(State.battle.tigerForm,State.battle.combo); UI.toast('虎の型！ コンボが途切れない');
            } else if (card.effect === 'mana_forge') {
                const forgeGain = card.upgraded ? 2 : 1;
                State.battle.manaForge += forgeGain;
                UI.toast(`魔力炉が共鳴！ 獲得補正+${forgeGain}（合計+${State.battle.manaForge}）`);
            } else if (card.effect === 'second_heart') {
                State.battle.secondHeart = card.upgraded ? .75 : .5; UI.toast('第二の心臓が脈打つ！');
            } else if (card.effect === 'breakthrough') {
                State.battle.breakthrough = card.upgraded ? 1.8 : 1.5; UI.toast(`次の一撃が${State.battle.breakthrough}倍！`);
            } else if (card.effect === 'block_conversion') {
                const gain = Math.floor(State.battle.block / (card.upgraded ? 4 : 5)); State.battle.block = 0;
                State.battle.playerTempStr += gain; State.battle.playerTempInt += gain; UI.toast(`ブロックを力へ変換！ 攻撃・魔力+${gain}`);
            } else if (card.effect === 'chain_art') {
                State.battle.chainArt = card.upgraded ? .8 : .6; UI.toast('連鎖奥義を会得！');
            } else if (card.effect === 'mana_reactor') {
                State.battle.manaReactor = card.upgraded ? 2 : 1; UI.toast('魔力永久機関が起動！');
            } else if (card.effect === 'blood_pact') {
                State.battle.bloodPact = card.upgraded ? 1.25 : 1; UI.toast('血の盟約！ HP消費を全て装甲へ');
            } else if (card.effect === 'healing_strike') {
                State.battle.healingStrike = card.upgraded ? 1.5 : 1; UI.toast('不死循環！ 回復が敵を蝕む');
            } else if (card.effect === 'apex_str') {
                State.battle.playerTempStr += card.upgraded ? 7 : 5;
                State.battle.tigerForm = card.upgraded ? 3 : 2;
                State.battle.combo = Math.max(State.battle.combo,State.battle.tigerForm);
                State.battle.chainArt = card.upgraded ? 1 : .8;
                UI.traitActivation('attack','極・闘神化',`ATK +${card.upgraded?7:5} / COMBO ${State.battle.tigerForm}`);
            } else if (card.effect === 'apex_int') {
                const forgeGain = card.upgraded ? 3 : 2;
                const reactorGain = card.upgraded ? 3 : 2;
                State.battle.manaForge += forgeGain;
                State.battle.manaReactor = (Number(State.battle.manaReactor) || 0) + reactorGain;
                UI.traitActivation('magic','極・魔導核',`FORGE +${State.battle.manaForge} / REACTOR +${State.battle.manaReactor}`);
            } else if (card.effect === 'apex_hp') {
                State.battle.bloodPact = card.upgraded ? 1.5 : 1.25;
                State.battle.secondHeart = card.upgraded ? 1 : .75;
                const heal = Math.ceil(State.maxHp*(card.upgraded ? .45 : .3));
                const actualHeal = Math.min(State.maxHp-State.hp,heal); State.hp += actualHeal;
                UI.combatNumber(actualHeal,'heal','player-battle-avatar');
                UI.traitActivation('vitality','極・生命天輪',`HEAL ${actualHeal} / CYCLE ON`);
            } else if (card.effect === 'recycle') {
                State.battle.drawPile.push(...Game.shuffle(State.battle.discardPile.splice(0)));
            } else if (card.effect === 'retain_block') {
                State.battle.retainBlock = true;
            } else if (card.effect === 'berserk') {
                const gain = card.val + Math.floor((State.maxHp - State.hp) / 10);
                State.battle.playerTempStr += gain; UI.toast(`攻撃力 +${gain}`);
            } else if (card.effect === 'echo') {
                State.battle.echo = (Number(State.battle.echo) || 0) + 1;
                UI.toast(`残響を蓄積！ 次の魔法は合計${State.battle.echo+1}回発動`);
            } else if (card.effect === 'mana_echo') {
                const echoGain = card.upgraded ? 2 : 1;
                State.battle.manaEcho = (State.battle.manaEcho || 0) + echoGain;
                UI.toast(`龍脈共鳴！ 一時魔力の複製を${echoGain}回予約`);
            } else if (card.effect === 'immortal') {
                State.battle.immortal = true;
            } else if (card.effect === 'limit_break') {
                State.battle.playerTempStr += card.val;
                const hpCost = Math.min(State.hp - 1, card.hpCost || 10);
                State.hp -= hpCost;
                UI.combatNumber(hpCost, 'hurt', 'player-battle-avatar');
                UI.toast(`限界突破！ 攻撃+${card.val}`);
            } else if (card.effect === 'world_tree') {
                const growth = Math.max(0, card.val - (card.growthApplied || 0));
                State.maxHp += growth; card.growthApplied = card.val;
                const heal = Game.getCardHeal(card);
                const actualHeal = Math.min(State.maxHp - State.hp, heal);
                State.hp += actualHeal;
                State.battle.thorns += 4;
                UI.combatNumber(actualHeal, 'heal', 'player-battle-avatar');
                UI.toast('世界樹の加護！');
            }
        }

        if (card.effect === 'weak') State.battle.enemyWeak = true;
        if (card.effect === 'retain_block') State.battle.retainBlock = true;
        if (card.vulnerable) State.battle.enemyVulnerable += card.vulnerable;
        if (card.secretMod === 'rupture') { State.battle.enemyVulnerable += 1; UI.toast('【秘伝】脆弱を追加！'); }
        if (card.freeze) State.battle.enemyFrozen = true;
        if (card.thorns) State.battle.thorns += card.thorns;
        if (card.secretMod === 'anomaly_formula') {
            const anomaly = Math.floor(Math.random() * 3);
            if (anomaly === 0) { State.battle.enemyWeak = true; UI.toast('【異常式】術式変異：弱化'); }
            else if (anomaly === 1) { State.battle.enemyBurn += 4; UI.toast('【異常式】術式変異：炎上+4'); }
            else { State.battle.enemyVulnerable += 1; UI.toast('【異常式】術式変異：脆弱+1'); }
        }

        if (card.redraw) {
            const redrawCount = State.battle.hand.length + card.redraw;
            State.battle.discardPile.push(...State.battle.hand.splice(0));
            Game.drawCards(redrawCount);
            UI.toast(`手札を総入れ替え！ さらに${card.redraw}枚ドロー`);
        }
        if (card.draw) Game.drawCards(card.draw);
        if (card.add_action) State.battle.actionsLeft++;
        if (card.secretMod === 'insight') Game.drawCards(1);
        if (card.secretMod === 'tempo') State.battle.actionsLeft++;
        if (card.secretMod === 'serenity') State.battle.block += 6;
        if (card.secretMod === 'combo_mastery') State.battle.combo += card.hits || 1;
        if (card.secretMod === 'thornward') State.battle.thorns += 2;
        if (card.secretMod === 'renewal') Game.drawCards(1);
        if (card.manaGain) {
            const manaGain = card.manaGain * (card.secretMod === 'sacrifice_circuit' ? 2 : 1) + (State.battle.manaForge && !['mana_forge','apex_int'].includes(card.effect) ? State.battle.manaForge : 0);
            State.tempMana += manaGain;
            UI.combatNumber(manaGain, 'mana', 'player-battle-avatar');
            UI.toast(`一時魔力 +${manaGain}${card.secretMod === 'sacrifice_circuit'?'（生贄回路）':''}`);
            if (State.battle.manaEcho > 0 && card.effect !== 'mana_echo') {
                State.battle.manaEcho--;
                State.tempMana += manaGain;
                UI.combatNumber(manaGain, 'mana', 'player-battle-avatar', 140);
                UI.toast(`【龍脈共鳴】一時魔力を複製 +${manaGain}`);
            }
        } else if (manaSpent > 0) {
            UI.toast(`一時魔力を${manaSpent}消費`);
        }
        if (card.secretMod === 'paradox_refund' && manaSpent > 0) {
            const refund = Math.ceil(manaSpent / 2);
            State.battle.pendingManaRefund += refund;
            UI.toast(`【逆行支払い】次ターン 一時魔力+${refund}`);
        }
        if (card.secretMod === 'future_clone' && !State.battle.secretClonedUids.includes(card.uid)) {
            State.battle.secretClonedUids.push(card.uid);
            State.battle.discardPile.push({ ...card, uid:Math.random(), secretMod:null, exhaust:true, desc:`${card.desc.replace(/\s*【秘伝[^】]*】.*/, '')} [未来複製・1回のみ]` });
            UI.toast('【未来複製】捨て札へ一回限りの複製を生成！');
        }
        if (State.playerType === 'str' && card.type === 'phys' && !State.battle.strFlowTriggered && State.battle.combo >= 3) {
            State.battle.strFlowTriggered = true;
            State.battle.actionsLeft++;
            Game.drawCards(1);
            UI.toast('【特性】連撃の呼吸！ 行動権+1・1枚ドロー');
            UI.traitActivation('attack','連撃の呼吸','ACTION +1 / DRAW +1');
        }

        if ((card.exhaust || card.secretMod === 'sacrifice_circuit') && card.secretMod !== 'rebirth') {
            State.battle.exhaustPile.push(card);
        } else {
            State.battle.discardPile.push(card);
        }
        
        if (State.hp <= 0) {
            if (State.battle.immortal) { State.hp = 1; State.battle.immortal = false; UI.toast('不死身で反動を耐えた！'); }
            else { Game.gameOver(); return; }
        }
        if (State.battle.enemy.hp <= 0) {
            Game.winBattle();
        }
    },

    checkTurnEndCondition: () => {
        if (State.battle.actionsLeft <= 0 || State.battle.hand.length === 0) {
            setTimeout(() => Game.endTurn(), 300);
        }
    },

    dealDamage: (amount, meta = {}) => {
        const enemy = State.battle.enemy;
        if (!enemy || enemy.hp <= 0) return 0;
        State.battle.pendingFx = Math.max(State.battle.pendingFx || 0, meta.delay || 0);
        let finalAmount = Math.max(0, Math.floor(amount));
        if (State.battle.breakthrough) {
            const breakthroughMultiplier = State.battle.breakthrough;
            finalAmount = Math.floor(finalAmount * breakthroughMultiplier);
            State.battle.breakthrough = false;
            UI.toast(`【突破口】ダメージ${breakthroughMultiplier}倍！`);
        }
        const vulnerableStacks = State.battle.enemyVulnerable;
        if (vulnerableStacks > 0) {
            const vulnerableMultiplier = 1 + vulnerableStacks * .5;
            finalAmount = Math.floor(finalAmount * vulnerableMultiplier);
            State.battle.enemyVulnerable = 0;
            UI.toast(`脆弱${vulnerableStacks}を全消費！ ダメージ×${vulnerableMultiplier}`);
        }
        const absorbed = Math.min(enemy.block || 0, finalAmount);
        enemy.block = Math.max(0, (enemy.block || 0) - absorbed);
        finalAmount -= absorbed;
        if (absorbed > 0) UI.combatNumber(absorbed, 'block', 'enemy-sprite', meta.delay || 0);
        const dealt = Math.min(enemy.hp, finalAmount);
        enemy.hp = Math.max(0, enemy.hp - finalAmount);
        State.battle.damageThisTurn += dealt;
        State.runStats.damageDealt += dealt;
        UI.hitEnemy(dealt, meta.kind || 'phys', Boolean(meta.critical || vulnerableStacks > 0), meta.delay || 0, Boolean(meta.multiHit));
        if (dealt > 0) Game.triggerEnemyPhase();
        return dealt;
    },

    applyBurn: (burnAmount) => {
        const enemy = State.battle.enemy;
        if (!enemy || enemy.hp <= 0 || burnAmount <= 0) return;
        if (State.battle.enemyBurn > 0) {
            const consumedBurn = State.battle.enemyBurn;
            State.battle.enemyBurn = 0;
            const reignition = State.battle.enemyIgnited;
            const explosion = Math.max(1,Math.ceil(enemy.maxHp*(reignition ? .2 : .3)));
            const dealt = Math.min(enemy.hp,explosion);
            enemy.hp = Math.max(0,enemy.hp-explosion);
            State.battle.damageThisTurn += dealt;
            State.runStats.damageDealt += dealt;
            if (reignition) {
                const manaBefore = State.tempMana;
                State.tempMana = Math.ceil(manaBefore*1.5);
            } else {
                State.tempMana += 10;
                State.battle.enemyIgnited = true;
            }
            // 致死爆発でも勝利演出へ急いで遷移せず、爆発とカットインを見せ切る。
            State.battle.pendingFx = Math.max(State.battle.pendingFx || 0, 400);
            UI.flash('rare');
            UI.ignitionExplosion(reignition);
            UI.hitEnemy(dealt,'mag',true,80,false);
            UI.traitActivation(
                'magic',
                reignition ? '再引火' : '引火爆発',
                reignition ? 'MAX HP 20% / MANA ×1.5' : 'MAX HP 30% / MANA +10'
            );
            UI.toast(reignition
                ? `炎上${consumedBurn}が再引火！ ${dealt}ダメージ・一時魔力×1.5`
                : `炎上${consumedBurn}が爆発！ ${dealt}ダメージ・一時魔力+10`);
            if (dealt > 0) Game.triggerEnemyPhase();
        }
        State.battle.enemyBurn += burnAmount;
        UI.toast(`炎上 +${burnAmount}`);
    },

    triggerEnemyPhase: () => {
        const enemy = State.battle.enemy;
        if (!enemy || enemy.phaseTriggered || enemy.hp <= 0 || enemy.hp > enemy.maxHp*.5) return;
        enemy.phaseTriggered = true;
        let message = '戦い方が変化した！';
        if (['normal','brute','swarm','assassin'].includes(enemy.kind)) {
            enemy.strength += 2; message = '追い詰められて攻撃力+2！';
        } else if (enemy.kind === 'trick') {
            const guard = Math.floor(enemy.maxHp*.1); enemy.block += guard; message = `幻影を展開！ ブロック+${guard}`;
        } else if (enemy.kind === 'sprout') {
            const heal = Math.floor(enemy.maxHp*.06); enemy.hp = Math.min(enemy.maxHp,enemy.hp+heal); message = `生命力が活性化！ HP+${heal}`;
        } else if (enemy.kind === 'guardian') {
            const guard = Math.floor(enemy.maxHp*.14); enemy.block += guard; message = `守護障壁！ ブロック+${guard}`;
        } else {
            const guard = Math.floor(enemy.maxHp*.08); enemy.block += guard; enemy.strength += 2; message = `ボスが本気になった！ 攻撃+2・ブロック+${guard}`;
        }
        UI.burst('enemy-sprite','#f97316',14);
        UI.toast(`【形態変化】${message}`);
    },

    incomingDamage: () => {
        const enemy = State.battle.enemy;
        if (!enemy || !['atk','heavy','drain','multi'].includes(enemy.intent) || State.battle.enemyFrozen) return 0;
        const amount = enemy.intent === 'multi' ? enemy.intentValue*(enemy.intentHits||1) : enemy.intentValue;
        return State.battle.enemyWeak ? Math.floor(amount * .75) : amount;
    },

    previewCard: (card) => {
        const str = State.str + State.battle.playerTempStr;
        const int = State.int + State.battle.playerTempInt;
        if (card.type === 'phys') {
            let amount = Math.floor(str * card.val);
            if (card.extra === 'hp_scale') amount += Math.floor(State.hp * .1);
            let hpCost = 0;
            if (card.extra === 'hp_sacrifice') {
                hpCost = Math.min(Math.max(0,State.hp-1),Math.floor(State.hp*(card.scale||.15)));
                amount = Math.floor(hpCost * (card.extraMult || 2.6));
            }
            if (card.extra === 'hp_sacrifice_blast') {
                hpCost = Math.min(Math.max(0,State.hp-1),Math.floor(State.hp*(card.scale||.22)));
                amount = Math.floor(hpCost * (card.extraMult || 3.4));
            }
            if (card.extra === 'missing_hp_damage') amount += Math.floor((State.maxHp-State.hp)*(card.scale||.25));
            if (card.extra === 'combo_cashout') amount += Math.floor(str*(card.comboScale||.35)*State.battle.combo);
            if (card.extra === 'vitality_wave') amount = Math.floor(State.maxHp*(card.scale||.22)+(State.maxHp-State.hp)*(card.missingScale||.25));
            if (card.extra === 'block_dmg') amount = Math.floor(State.battle.block * (card.extraMult || 1));
            if (card.extra === 'maxhp_scale') {
                amount = Math.floor(State.maxHp * (card.scale || .3));
                if (card.hpCostScale) hpCost = Math.min(Math.max(0,State.hp-1),Math.floor(State.hp*card.hpCostScale));
            }
            if (card.extra === 'hp_halve_press') {
                hpCost = Math.min(Math.max(0,State.hp-1),Math.floor(State.hp*(card.scale||.5)));
                amount = Math.floor(hpCost * (card.extraMult || 3));
            }
            if (card.extra === 'execute' && State.battle.enemy.hp <= State.battle.enemy.maxHp * .3) amount *= 2;
            if (card.extra === 'intent_counter' && ['heavy','drain'].includes(State.battle.enemy.intent)) amount *= 2;
            const hits = card.hits || 1;
            let enemyBlock = State.battle.enemy.block || 0;
            let vulnerableStacks = State.battle.enemyVulnerable;
            let breakthroughMultiplier = State.battle.breakthrough || 1;
            const hitAmounts = [];
            let total = 0;
            for (let k=0;k<hits;k++) {
                let hit = Math.floor(amount * (1 + Math.min(5,State.battle.combo + k) * .1));
                if (breakthroughMultiplier > 1) {
                    hit = Math.floor(hit * breakthroughMultiplier);
                    breakthroughMultiplier = 1;
                }
                if (vulnerableStacks > 0) {
                    hit = Math.floor(hit * (1 + vulnerableStacks * .5));
                    vulnerableStacks = 0;
                }
                const absorbed = Math.min(enemyBlock,hit); enemyBlock -= absorbed; hit -= absorbed;
                hitAmounts.push(hit); total += hit;
            }
            const flowReady = State.playerType === 'str' && !State.battle.strFlowTriggered && State.battle.combo < 3 && State.battle.combo + hits >= 3;
            return `${card.hits ? `${hitAmounts.join('+')} → ` : ''}予測 ${total} DMG${hpCost ? ` / HP-${hpCost}` : ''}${flowReady ? ' / 連撃の呼吸' : ''}`;
        }
        if (card.type === 'mag') {
            let amount = Math.floor(int * card.val) + State.battle.magBonus;
            const previewManaSpent = card.consumeAllMana ? State.tempMana : (card.manaCost || 0);
            if (card.extra === 'temp_mana_burst') amount += previewManaSpent * 4;
            if (card.extra === 'temp_mana_flat_burst') amount += previewManaSpent*(card.manaFlat||8);
            const echoStacks = Math.max(0,Number(State.battle.echo)||0);
            let enemyBlock = State.battle.enemy.block || 0;
            let total = 0;
            for (let castIndex=0; castIndex<=echoStacks; castIndex++) {
                let hit = amount;
                if (castIndex === 0 && State.battle.breakthrough) hit = Math.floor(hit * State.battle.breakthrough);
                if (castIndex === 0 && State.battle.enemyVulnerable > 0) hit = Math.floor(hit * (1 + State.battle.enemyVulnerable*.5));
                const absorbed = Math.min(enemyBlock,hit);
                enemyBlock -= absorbed;
                total += hit-absorbed;
            }
            return `${card.manaCost ? `一時魔力-${previewManaSpent} / ` : ''}予測 ${total} DMG${echoStacks?`（残響×${echoStacks}／合計${echoStacks+1}回）`:''}`;
        }
        if (card.type === 'def') {
            let block = card.val;
            if (card.id === 'barrier') block = Math.floor(int * card.val);
            if (card.id === 'arcane_shield') block = Math.floor(int * card.val);
            if (card.extra === 'temp_mana_block') block = Math.floor(int * card.val) + State.tempMana * 2;
            let hpCost = 0;
            if (card.extra === 'hp_sacrifice_block') { hpCost = Math.min(Math.max(0,State.hp-1),Math.floor(State.hp*(card.scale||.12))); block = Math.floor(hpCost*(card.extraMult||2.5)); }
            if (card.extra === 'missing_hp_block') block += Math.floor((State.maxHp-State.hp)*.2);
            if (card.extra === 'maxhp_block') block = Math.min(card.upgraded?(card.upgradedBlockCap||75):(card.blockCap||60),Math.floor(State.maxHp*(card.scale||.5)));
            if (card.extra === 'intent_block') block = Game.incomingDamage();
            if (card.extra === 'revenge_guard') block = Game.incomingDamage() + Math.floor((State.maxHp-State.hp)*.2);
            if (State.battle.playerFrail) block = Math.max(1,Math.floor(block*.75));
            if (card.secretMod === 'anchor') block = Math.ceil(block * 1.5);
            return `ブロック +${block}${hpCost ? ` / HP-${hpCost}` : ''}`;
        }
        if (card.type === 'heal') { const baseHeal = Game.getCardHeal(card); const heal = card.extra==='low_hp_double' && State.hp<=State.maxHp/2 ? baseHeal*2 : baseHeal; return `HP +${Math.min(State.maxHp-State.hp, heal)}（最大HPの${Math.round(card.healRate*100)}%${card.extra==='low_hp_double'&&State.hp<=State.maxHp/2?'×2':''}）`; }
        return '効果を発動・続けてタップ';
    },

    describeCard: (card) => {
        const pct = value => Math.round(value * 100);
        const suffix = [];
        if (card.draw) suffix.push(`${card.draw}枚引く`);
        if (card.add_action) suffix.push('続けて行動');
        if (card.manaGain) suffix.push(`一時魔力+${card.manaGain}`);
        if (card.manaCost) suffix.push(`一時魔力${card.consumeAllMana?'全消費':`-${card.manaCost}`}`);
        if (card.exhaust) suffix.push('1回のみ');
        if (card.limit) suffix.push(`デッキ${card.limit}枚まで`);
        let main = '';
        if (card.type === 'phys') {
            if (card.extra === 'hp_scale') main = `攻撃${pct(card.val)}%＋現在HP10%ダメージ`;
            else if (card.extra === 'hp_sacrifice') main = `現在HPを${pct(card.scale || .15)}%消費し、その${card.extraMult || 2.6}倍のダメージ（HP1で止まる）`;
            else if (card.extra === 'hp_sacrifice_blast') main = `現在HPを${pct(card.scale || .22)}%消費し、その${card.extraMult || 3.4}倍のダメージ（HP1で止まる）`;
            else if (card.extra === 'block_dmg') main = `全ブロックを消費し、その${card.extraMult || 1}倍のダメージ`;
            else if (card.extra === 'maxhp_scale') main = `最大HPの${pct(card.scale || .3)}%ダメージ${card.hpCostScale ? `。現在HPを${pct(card.hpCostScale)}%消費（HP1で止まる）` : ''}`;
            else if (card.extra === 'hp_halve_press') main = `現在HPを${pct(card.scale || .5)}%消費し、その${card.extraMult || 3}倍のダメージ（HP1で止まる）`;
            else if (card.extra === 'combo_cashout') main = `攻撃${pct(card.val)}%＋現在コンボ1ごとに攻撃${pct(card.comboScale||.35)}%。使用後コンボを0にする`;
            else if (card.extra === 'vitality_wave') main = `最大HPの${pct(card.scale||.22)}%＋失ったHPの${pct(card.missingScale||.25)}%ダメージ`;
            else main = `攻撃${pct(card.val)}%${card.hits ? `の${card.hits}連撃` : 'ダメージ'}`;
            if (card.extra === 'execute') main += '。敵HP30%以下なら威力2倍';
            if (card.extra === 'missing_hp_damage') main += `。失ったHPの${pct(card.scale || .25)}%を追加`;
            if (card.extra === 'intent_counter') main += '。敵が強攻撃・吸収なら威力2倍＋予告値ブロック';
            if (card.extra === 'drain') main += `。与ダメージの${pct(card.drainRate || .5)}%回復`;
            if (card.self_dmg) main += `。自分も${card.self_dmg}ダメージ（反動ではHP1未満にならない）`;
        } else if (card.type === 'mag') {
            main = `魔力${pct(card.val)}%ダメージ`;
            if (card.extra === 'temp_mana_burst') main += '＋消費した一時魔力×4ダメージ（最低3必要）';
            if (card.extra === 'temp_mana_flat_burst') main += `＋消費した一時魔力×${card.manaFlat||8}固定ダメージ`;
            if (card.self_dmg) main += `。自分も${card.self_dmg}ダメージ（反動ではHP1未満にならない）`;
        } else if (card.type === 'def') {
            if (card.id === 'barrier' || card.id === 'arcane_shield') main = `魔力${pct(card.val)}%分のブロック`;
            else if (card.extra === 'temp_mana_block') main = `魔力${pct(card.val)}%＋一時魔力の2倍のブロック`;
            else if (card.extra === 'hp_sacrifice_block') main = `現在HPを${pct(card.scale||.12)}%消費し、その${card.extraMult||2.5}倍のブロック（HP1で止まる）`;
            else if (card.extra === 'missing_hp_block') main = `ブロック${card.val}＋失ったHPの20%`;
            else if (card.extra === 'maxhp_block') main = `最大HPの${pct(card.scale || .5)}%（最大${card.upgraded?(card.upgradedBlockCap||75):(card.blockCap||60)}）ブロック`;
            else if (card.extra === 'intent_block') main = `予告ダメージ分をブロック。防いだ値を次の魔法ボーナスへ変換（最大${card.upgraded?45:30}）`;
            else if (card.extra === 'revenge_guard') main = `予告値＋失ったHP20%をブロック。防いだ値を${card.upgraded?'1.5倍で':''}反射`;
            else main = `ブロック${card.val}`;
        } else if (card.type === 'heal') {
            main = `最大HPの${pct(card.healRate)}%回復`;
            if (card.extra === 'low_hp_double') main += `。HP半分以下なら${pct(card.healRate*2)}%回復`;
        } else {
            const effects = {
                str_up:`この戦闘中、攻撃+${card.val}`,
                int_up:`この戦闘中、魔力+${card.val}`,
                both_up:`この戦闘中、攻撃・魔力+${card.val}`,
                action_up:`次ターンの行動回数+${card.val}`,
                maxhp_up:`初回のみ最大HP+${card.val}、最大HPの${pct(card.healRate)}%回復`,
                next_draw:`次ターン${card.val}枚追加ドロー`,
                mana_cycle:'魔道書を展開する',
                mana_only:'一時魔力を凝縮する',
                draw_flow:'追い風を受ける',
                redraw_hand:'手札を総入れ替えする',
                tiger_form:'毎ターンのコンボ開始値を1にする',
                mana_forge:'一時魔力の獲得量をこの戦闘中+1（重複可）',
                second_heart:'ターン終了時、消費したHPの50%を回復',
                breakthrough:'次に与えるダメージを1.5倍にする',
                block_conversion:'全ブロックを消費し、5ごとに攻撃・魔力+1',
                chain_art:'各ターン最初の物理攻撃を60%で追撃',
                mana_reactor:'ターン開始時に一時魔力+1',
                blood_pact:'HP消費によるブロック変換率を100%にする',
                healing_strike:'回復カードの実回復量と同じダメージを与える',
                apex_str:'攻撃+5、コンボ開始値2、各ターン最初の物理攻撃を80%で追撃',
                apex_int:'一時魔力獲得+2、ターン開始時一時魔力+2（魔力炉と重複）',
                apex_hp:'最大HP30%回復、HP消費を125%ブロック化、消費HP75%をターン終了時に回復',
                recycle:'捨て札を山札へ戻す',
                berserk:`攻撃+${card.val}、失ったHP10ごとにさらに+1`,
                echo:'次の魔法の発動回数+1（重複可）',
                mana_echo:'次に得る一時魔力をもう一度得る',
                immortal:'この戦闘で一度だけHP1で耐える',
                limit_break:`攻撃+${card.val}、HPを${card.hpCost || 10}失う（HP1未満にならない）`,
                world_tree:`初回のみ最大HP+${card.val}。最大HPの${pct(card.healRate)}%回復、反撃4`
            };
            main = effects[card.effect] || '特殊効果を発動';
        }
        if (card.effect === 'weak') main += '。敵の次の攻撃を25%弱化';
        if (card.effect === 'retain_block') main += '。次ターンまでブロック保持';
        if (card.vulnerable) main += `。脆弱${card.vulnerable}を付与`;
        if (card.burn) main += `。炎上${card.burn}を付与`;
        if (card.freeze) main += '。敵の次の行動を封じる';
        if (card.thorns) main += `。反撃${card.thorns}を得る`;
        const secret = card.secretMod && SECRET_MODS[card.secretMod] ? ` 【秘伝・${SECRET_MODS[card.secretMod].name}】${SECRET_MODS[card.secretMod].desc}` : '';
        return `${main}。${suffix.length ? ` [${suffix.join('/')}]` : ''}${secret}`.trim();
    },

    upgradePreview: (card) => {
        const changes = [];
        if (card.val) {
            let nextVal = parseFloat((card.val*1.5).toFixed(2));
            if (['str_up','int_up','both_up','action_up','maxhp_up','next_draw','berserk','limit_break','world_tree'].includes(card.effect) || (card.type === 'def' && !['barrier','arcane_shield','mana_ward','prism_guard'].includes(card.id)) || card.type === 'heal') nextVal = Math.ceil(nextVal);
            changes.push(`基礎値 ${card.val}→${nextVal}`);
        }
        if (card.draw) changes.push(`ドロー ${card.draw}→${card.draw+1}`);
        if (card.healRate) changes.push(`回復 ${Math.round(card.healRate*100)}%→${Math.min(100,Math.round(card.healRate*150))}%`);
        if (card.self_dmg) changes.push(`反動 ${card.self_dmg}→${Math.max(0,card.self_dmg-2)}`);
        if (card.burn) changes.push(`炎上 ${card.burn}→${Math.ceil(card.burn*1.5)}`);
        if (card.thorns) changes.push(`反撃 ${card.thorns}→${Math.ceil(card.thorns*1.5)}`);
        if (card.extra === 'hp_sacrifice') changes.push('消費15%→12% / 威力2.6→3.4倍');
        if (card.extra === 'hp_sacrifice_blast') changes.push('消費22%→18% / 威力3.4→4.2倍');
        if (card.extra === 'hp_sacrifice_block') changes.push('消費12%→10% / ブロック2.5→3.2倍');
        if (card.extra === 'missing_hp_damage') changes.push('失ったHP倍率 25%→35%');
        const engineUpgrade = { tiger_form:'コンボ開始 1→2', mana_forge:'追加魔力 +1→+2', second_heart:'HP還元 50%→75%', breakthrough:'次のダメージ 1.5→1.8倍', block_conversion:'変換効率 ブロック5→4ごと', chain_art:'追撃 60%→80%', mana_reactor:'毎ターン魔力 +1→+2', blood_pact:'装甲変換 100%→125%', healing_strike:'回復ダメージ 100%→150%', apex_str:'攻撃+5→+7 / コンボ2→3 / 追撃80%→100%', apex_int:'魔力獲得・毎ターン +2→+3', apex_hp:'回復30%→45% / 装甲125%→150% / HP還元75%→100%' };
        if (engineUpgrade[card.effect]) changes.push(engineUpgrade[card.effect]);
        if (card.extra === 'maxhp_scale') changes.push('最大HP倍率 30%→40% / 消費10%→8%');
        if (card.extra === 'block_dmg') changes.push('ブロック倍率 1.5→2倍');
        if (card.extra === 'hp_halve_press') changes.push('消費30%→25% / 威力2.75→3.5倍');
        if (card.extra === 'maxhp_block') changes.push(card.id==='immortal_rampart'?'65%/上限75→80%/上限90':'50%/上限60→65%/上限75');
        if (card.extra === 'combo_cashout') changes.push('コンボ倍率 35%→50%');
        if (card.effect === 'mana_echo') changes.push('複製予約 1回→2回');
        if (card.extra === 'vitality_wave') changes.push('最大HP22%→30% / 失ったHP25%→35%');
        if (card.extra === 'intent_block') changes.push('変換上限 30→45');
        if (card.extra === 'revenge_guard') changes.push('反射 1→1.5倍');
        if (['echo','immortal'].includes(card.effect) || ['causal_reverse','revenge_fortress'].includes(card.id)) changes.push('1枚引く');
        return changes.join('・') || '固有効果を強化';
    },

    endPlayerTurn: () => {
        if (!State.battle.processing && State.battle.enemy && State.battle.enemy.hp > 0) Game.endTurn();
    },

    rollEnemyIntent: () => {
        const e = State.battle.enemy;
        if (!e) return;
        const turn = State.battle.turnCount;
        e.intentHits = 1;
        if (e.kind === 'swarm' && turn % 2 === 0) { e.intent = 'multi'; e.intentHits = 3; e.intentValue = Math.max(1,Math.floor((e.baseAtk+e.strength)*.46)); }
        else if (e.kind === 'sprout' && turn % 3 === 1) { e.intent = 'heal'; e.intentValue = Math.max(5,Math.floor(e.maxHp*.1)); }
        else if (e.kind === 'sprout' && turn % 3 === 2) { e.intent = 'drain'; e.intentValue = Math.max(1,Math.floor(e.baseAtk*.72)); }
        else if (e.kind === 'assassin' && turn % 3 === 1) { e.intent = 'multi'; e.intentHits = 2; e.intentValue = Math.max(1,Math.floor((e.baseAtk+e.strength)*.7)); }
        else if (e.kind === 'assassin' && turn % 3 === 2) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk+e.strength)*1.55); }
        else if (e.kind === 'trick' && turn % 3 === 1) { e.intent = 'drain'; e.intentValue = Math.max(1, Math.floor(e.baseAtk * .7)); }
        else if (e.kind === 'trick' && turn % 3 === 2) { e.intent = 'hex'; e.intentValue = 0; }
        else if (e.kind === 'brute' && turn % 3 === 2) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk + e.strength) * 1.65); }
        else if (e.kind === 'guardian' && turn % 3 === 0) { e.intent = 'guard'; e.intentValue = Math.floor(e.maxHp * .16); }
        else if (e.kind === 'guardian' && turn % 3 === 2) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk + e.strength) * 1.4); }
        else if (e.kind === 'normal' && turn > 0 && turn % 4 === 3) { e.intent = 'guard'; e.intentValue = Math.floor(e.maxHp * .12); }
        else if (e.kind === 'dragon' && turn % 4 === 1) { e.intent = 'buff'; e.intentValue = 2 + Math.floor(e.level/12); }
        else if (e.kind === 'dragon' && turn % 4 === 2) { e.intent = 'multi'; e.intentHits = 3; e.intentValue = Math.max(1,Math.floor((e.baseAtk+e.strength)*.55)); }
        else if (e.kind === 'dragon' && turn % 4 === 3) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk+e.strength)*1.7); }
        else if (e.kind === 'phoenix' && turn % 4 === 1) { e.intent = 'heal'; e.intentValue = Math.max(8,Math.floor(e.maxHp*.09)); }
        else if (e.kind === 'phoenix' && turn % 4 === 2) { e.intent = 'multi'; e.intentHits = 3; e.intentValue = Math.max(1,Math.floor((e.baseAtk+e.strength)*.5)); }
        else if (e.kind === 'phoenix' && turn % 4 === 3) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk+e.strength)*1.45); }
        else if (e.kind === 'colossus' && turn % 4 === 1) { e.intent = 'guard'; e.intentValue = Math.floor(e.maxHp*.16); }
        else if (e.kind === 'colossus' && turn % 4 === 2) { e.intent = 'buff'; e.intentValue = 2; }
        else if (e.kind === 'colossus' && turn % 4 === 3) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk+e.strength)*1.85); }
        else if (e.kind === 'boss' && turn % 4 === 1) { e.intent = 'buff'; e.intentValue = 2; }
        else if (e.kind === 'boss' && turn % 4 === 2) { e.intent = 'guard'; e.intentValue = Math.floor(e.maxHp*.14); }
        else if (e.kind === 'boss' && turn % 4 === 3) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk+e.strength)*1.7); }
        else { e.intent = 'atk'; e.intentValue = e.baseAtk + e.strength; }
    },

    advanceEnemyTurn: () => {
        State.battle.turnCount++;
        if (State.battle.enemy.affix?.id === 'frenzy' && State.battle.turnCount === 3) {
            State.battle.enemy.strength += 2;
            UI.toast('【変異：狂化】攻撃力+2！');
        }
        if (State.battle.turnCount > 0 && State.battle.turnCount % 5 === 0) {
            const rage = 1 + Math.floor(State.battle.enemy.level / 10);
            State.battle.enemy.strength += rage;
            UI.toast(`長期戦！ 敵の攻撃力+${rage}`);
        }
        Game.rollEnemyIntent();
        Game.startBattleTurn();
    },

    endTurn: () => {
        if (State.battle.processing) return;
        State.battle.processing = true;
        State.battle.selectedHandIndex = null;

        if (State.playerType === 'hp') {
            // 体力型: 安定した自然治癒。長期戦で強いが、完全な無限耐久にはしない。
            let regen = Math.min(14, Math.max(5, Math.floor(State.maxHp * 0.08)));
            if(State.hp < State.maxHp) {
                State.hp = Math.min(State.maxHp, State.hp + regen);
                UI.toast(`【特性】自然治癒 +${regen}`);
                UI.traitActivation('vitality','自然治癒',`HP +${regen}`);
            }
            if (State.battle.secondHeart && State.battle.hpSpentThisTurn > 0) {
                const pulse = Math.min(State.maxHp-State.hp,Math.ceil(State.battle.hpSpentThisTurn*State.battle.secondHeart));
                State.hp += pulse;
                if (pulse > 0) { UI.combatNumber(pulse,'heal','player-battle-avatar'); UI.traitActivation('vitality','第二の心臓',`HP +${pulse}`); }
            }
        }

        while(State.battle.hand.length > 0) {
            State.battle.discardPile.push(State.battle.hand.pop());
        }
        
        UI.updateBattle();
        UI.showTurnBanner(() => Game.enemyAction());
    },

    enemyAction: async () => {
        if (State.battle.enemy.hp <= 0) return;
        const enemy = State.battle.enemy;
        if (State.battle.enemyBurn > 0) {
            const burnDamage = State.battle.enemyBurn;
            State.battle.enemyBurn = Math.max(0, State.battle.enemyBurn - 2);
            Game.dealDamage(burnDamage, { kind:'mag', critical:false });
            UI.toast(`炎上 ${burnDamage}ダメージ！`);
            if (enemy.hp <= 0) { Game.winBattle(); return; }
        }
        if (enemy.affix?.id === 'regrowth' && enemy.hp < enemy.maxHp) {
            const recovered = Math.min(enemy.maxHp-enemy.hp,Math.max(2,Math.floor(enemy.maxHp*.03)));
            enemy.hp += recovered;
            UI.combatNumber(recovered,'heal','enemy-sprite');
            UI.toast(`【変異：再生】HPを${recovered}回復`);
        }
        if (State.battle.enemyFrozen) {
            State.battle.enemyFrozen = false;
            UI.burst('enemy-sprite','#93c5fd'); UI.toast(`${enemy.name}は凍って動けない！`);
            Game.advanceEnemyTurn(); return;
        }
        if (enemy.intent === 'buff') {
            enemy.strength += enemy.intentValue;
            UI.burst('enemy-sprite','#fbbf24');
            UI.toast(`${enemy.name}の攻撃力が${enemy.intentValue}上がった！`);
            Game.advanceEnemyTurn(); return;
        }
        if (enemy.intent === 'guard') {
            enemy.block += enemy.intentValue;
            UI.combatNumber(enemy.intentValue, 'block', 'enemy-sprite'); Sound.play('block');
            UI.toast(`${enemy.name}は守りを固めた！`);
            Game.advanceEnemyTurn(); return;
        }
        if (enemy.intent === 'hex') {
            State.battle.playerFrail = true;
            UI.burst('player-battle-avatar','#a855f7'); UI.toast('呪いでブロック獲得量が25%低下！');
            Game.advanceEnemyTurn(); return;
        }
        if (enemy.intent === 'heal') {
            const recovered = Math.min(enemy.maxHp-enemy.hp,enemy.intentValue);
            enemy.hp += recovered;
            UI.combatNumber(recovered,'heal','enemy-sprite'); UI.burst('enemy-sprite','#4ade80');
            UI.toast(`${enemy.name}はHPを${recovered}回復した！`);
            Game.advanceEnemyTurn(); return;
        }
        let dmg = enemy.intent === 'multi' ? enemy.intentValue * (enemy.intentHits || 1) : enemy.intentValue;
        if (State.battle.enemyWeak) { dmg = Math.floor(dmg * .75); State.battle.enemyWeak = false; }
        await UI.enemyAttack(enemy.intent === 'heavy' || enemy.intent === 'multi');
        if (State.battle.manaAbsorb) {
            State.battle.manaAbsorb = false;
            const converted = Math.max(1, Math.min(8, Math.floor(dmg * .5)));
            State.tempMana += converted;
            UI.traitActivation('magic','位相転換',`DAMAGE 0 / MANA +${converted}`);
            UI.burst('player-battle-avatar','#22d3ee',14);
            UI.toast(`攻撃を無効化し、一時魔力+${converted}！`);
            await new Promise(resolve => setTimeout(resolve, 1050));
            UI.updateBattle();
            Game.advanceEnemyTurn(); return;
        }
        if (State.playerType === 'str' && Math.random() < 0.1) {
            const counterDamage = Math.floor(dmg * 1.5);
            UI.burst('player-battle-avatar','#facc15',12);
            UI.traitActivation('attack','クロスカウンター',`DODGE / COUNTER ${counterDamage}`);
            UI.toast('敵の攻撃を完全回避！');
            await new Promise(resolve => setTimeout(resolve, 1050));
            const dealt = Game.dealDamage(counterDamage, { kind:'phys', critical:true });
            UI.toast(`クロスカウンター！ ${dealt}ダメージ`);
            if (enemy.hp <= 0) { Game.winBattle(); return; }
            await new Promise(resolve => setTimeout(resolve, 300));
            Game.advanceEnemyTurn(); return;
        }
        let blocked = Math.min(State.battle.block, dmg);
        
        // ブロック消費
        State.battle.block -= blocked;
        let actualDmg = dmg - blocked;
        
        if (actualDmg > 0) {
            State.hp -= actualDmg;
            State.runStats.damageTaken += actualDmg;
            UI.hitPlayer(actualDmg, enemy.intent === 'heavy');
            UI.toast(enemy.intent === 'multi' ? `${enemy.intentHits}連撃！ 合計${actualDmg}ダメージ` : `${actualDmg} のダメージを受けた！`);
        } else {
            Sound.play('block'); UI.combatNumber(blocked, 'block', 'player-battle-avatar');
            UI.toast(`ガードした！ (残ブロック${State.battle.block})`);
        }

        if (enemy.intent === 'drain' && actualDmg > 0) enemy.hp = Math.min(enemy.maxHp, enemy.hp + actualDmg);
        if (State.hp <= 0) {
            if (State.battle.immortal) { State.hp = 1; State.battle.immortal = false; UI.toast('不死身で耐えた！'); }
            else { Game.gameOver(); return; }
        }
        if (State.battle.counterMagic) {
            const converted = Math.min(State.battle.counterMagic, blocked);
            State.battle.magBonus += converted; State.battle.counterMagic = false;
            if (converted > 0) UI.toast(`因果反転！ 魔法ボーナス+${converted}`);
        }
        if (State.battle.reflectNext) {
            const reflectMultiplier = State.battle.reflectNext;
            State.battle.reflectNext = false;
            const reflected = Math.floor(blocked * reflectMultiplier);
            if (reflected > 0) { Game.dealDamage(reflected,{kind:'mag',critical:true}); UI.toast(`報復！ ${reflected}ダメージ`); }
        }
        if (dmg > 0 && State.battle.thorns > 0) {
            Game.dealDamage(State.battle.thorns, { kind:'phys' });
            UI.toast(`反撃 ${State.battle.thorns}ダメージ！`);
        }
        if (enemy.hp <= 0) { Game.winBattle(); return; }
        Game.advanceEnemyTurn();
    },

    winBattle: () => {
        if(State.battle.enemy.hp > 0) return; 
        State.battle.processing = true; 
        Game.recordBattleStats();
        State.battle.enemiesDefeated++;
        const gainedBP = 12 + Math.min(18, State.battle.enemy.level * 2);
        State.bp += gainedBP;
        let bossReward = '';
        if (State.battle.enemy.boss) {
            State.maxHp += 3; State.str += 1; State.int += 1; State.bp += 25;
            const heal = Math.floor(State.maxHp*.5); State.hp = Math.min(State.maxHp,State.hp+heal);
            bossReward = ' / 覚醒：最大HP+3・攻撃/魔力+1・BP+25・HP50%回復';
        }
        const impactDelay = State.battle.pendingFx || 0;
        setTimeout(() => { UI.victory(); UI.toast(`${State.battle.enemy.name} を倒した！ BP+${gainedBP}${bossReward}`); }, impactDelay + 60);
        setTimeout(() => {
            UI.showDraft(State.playerType, 'battle_reward');
        }, impactDelay + (State.battle.enemy.boss ? 1150 : 760));
    },

    checkBattleProgress: () => {
        if (State.battle.enemiesDefeated > 0 && State.battle.enemiesDefeated % 10 === 0) {
            Game.visitSecretMode();
        } else if (State.battle.enemiesDefeated > 0 && State.battle.enemiesDefeated % 5 === 0) {
            Game.visitShop();
        } else if (State.battle.enemiesDefeated > 0 && State.battle.enemiesDefeated % 2 === 0) {
            Game.showJourneyEvent();
        } else {
            State.hp = Math.min(State.maxHp, State.hp + Math.max(5,Math.floor(State.maxHp*.1)));
            Game.spawnEnemy();
        }
    },

    recordBattleStats: () => {
        if (State.battle.currentBattleRecorded) return;
        State.battle.currentBattleRecorded = true;
        State.runStats.totalBattleTurns += State.battle.turnCount + 1;
        State.runStats.battles++;
    },

    showJourneyEvent: () => {
        State.journeyChoices = Game.shuffle([...JOURNEY_EVENTS]).slice(0,3);
        UI.changeScene('scene-event',() => UI.renderJourneyEvents());
    },
    chooseJourneyEvent: (id) => {
        const event = JOURNEY_EVENTS.find(item => item.id === id); if (!event) return;
        let detail = '';
        if (id === 'spring') State.hp = Math.min(State.maxHp,State.hp + Math.floor(State.maxHp*.4));
        if (id === 'forge') {
            const candidates = State.deck.filter(card => !card.upgraded);
            const card = candidates[Math.floor(Math.random()*candidates.length)];
            if (card) Game.upgradeCard(card.uid,true);
            else State.bp += 20;
        }
        if (id === 'treasure') State.bp += 30;
        if (id === 'shrine') { State.maxHp += 8; State.hp = Math.max(1,State.hp-8); }
        if (id === 'insight') { State.str += 1; State.int += 1; }
        if (id === 'purify') {
            const index = State.deck.findIndex(card => ['punch','defend'].includes(card.id));
            if (index >= 0 && State.deck.length > 4) State.deck.splice(index,1); else State.bp += 15;
        }
        if (id === 'camp') {
            State.hp = Math.min(State.maxHp,State.hp+Math.floor(State.maxHp*.25));
            const candidates = State.deck.filter(card => !card.upgraded);
            const card = candidates[Math.floor(Math.random()*candidates.length)];
            if (card) { Game.upgradeCard(card.uid,true); detail = `${card.name}を強化`; } else State.bp += 20;
        }
        if (id === 'altar') {
            const cost = Math.min(State.hp-1,Math.floor(State.hp*.2));
            State.hp -= Math.max(0,cost); State.str += 2; State.int += 2; State.bp += 20;
            detail = `HP-${cost} / 攻撃・魔力+2`;
        }
        if (id === 'feast') { State.maxHp += 4; State.hp = State.maxHp; detail = '全回復！'; }
        if (id === 'mentor_path') {
            const candidates = CARDS_DB.filter(card => Game.isCardUnlocked(card) && card.rarity !== 'rare' && card.attr === State.playerType && (!card.limit || Game.countCard(card.id)<card.limit));
            const card = candidates[Math.floor(Math.random()*candidates.length)];
            if (card) { Game.addCard(card.id); const gained = State.deck[State.deck.length-1]; Game.upgradeCard(gained.uid,true); detail = `${card.name}+を習得`; }
            else { State.bp += 30; detail = '候補を極めていたためBP+30'; }
        }
        if (id === 'meteorite') {
            if (Math.random()<.5) { State.str += 2; detail = '攻撃+2'; } else { State.int += 2; detail = '魔力+2'; }
            State.bp += 15;
        }
        if (id === 'merchant') {
            const index = State.deck.findIndex(card => ['punch','defend'].includes(card.id));
            if (index >= 0 && State.deck.length > 4) { const [removed] = State.deck.splice(index,1); State.bp += 35; detail = `${removed.name}を交換・BP+35`; }
            else { State.bp += 15; detail = '交換品なし・BP+15'; }
        }
        Sound.play('rare'); UI.toast(`${event.title}の効果を得た！${detail ? ` ${detail}` : ''}`);
        setTimeout(() => UI.changeScene('scene-battle',() => Game.spawnEnemy()),500);
    },

    getSecretMod: (card) => {
        return SECRET_MOD_BY_CARD[card.id] || 'serenity';
    },
    visitSecretMode: () => {
        if (State.tempMana > 0) UI.toast(`秘伝到達：一時魔力${State.tempMana}をリセット`);
        State.tempMana = 0;
        State.battle.pendingManaRefund = 0;
        if (State.playerType === 'hp' && State.battle.block > 0) UI.toast(`5戦チェックポイント：持越しブロック${State.battle.block}をリセット`);
        if (State.playerType === 'hp') State.battle.block = 0;
        State.hp = Math.min(State.maxHp, State.hp + 12);
        UI.changeScene('scene-secret', () => UI.renderSecretMode());
        Sound.play('rare');
    },
    applySecretMod: (uid) => {
        const card = State.deck.find(item => item.uid === uid);
        if (!card || card.secretMod) return;
        if (State.bp < SECRET_MOD_COST) { UI.toast(`BPが足りません（必要 ${SECRET_MOD_COST}）`); return; }
        const modKey = Game.getSecretMod(card);
        State.bp -= SECRET_MOD_COST;
        card.secretMod = modKey;
        card.desc = Game.describeCard(card);
        Sound.play('rare');
        UI.toast(`${card.name}に「${SECRET_MODS[modKey].name}」を刻んだ！`);
        UI.renderSecretMode();
        RunStorage.save();
    },
    leaveSecretMode: () => UI.changeScene('scene-battle', () => Game.spawnEnemy()),

    // --- SHOP LOGIC ---
    visitShop: () => {
        if (State.tempMana > 0) UI.toast(`ショップ到達：一時魔力${State.tempMana}をリセット`);
        State.tempMana = 0;
        State.battle.pendingManaRefund = 0;
        if (State.playerType === 'hp' && State.battle.block > 0) UI.toast(`ショップ到達：持越しブロック${State.battle.block}をリセット`);
        if (State.playerType === 'hp') State.battle.block = 0;
        State.shopTab = 'upgrade';
        const available = CARDS_DB.filter(c => Game.isCardUnlocked(c) && c.rarity !== 'rare' && (!c.limit || Game.countCard(c.id) < c.limit));
        const typed = Game.shuffle(available.filter(c => c.attr === State.playerType)).slice(0, 3);
        const common = Game.shuffle(available.filter(c => c.attr === 'common' && !typed.includes(c))).slice(0, 1);
        State.shopCards = [...typed, ...common].map(c => c.id);
        UI.changeScene('scene-shop');
        UI.updateShop();
    },
    switchShopTab: (tab) => {
        State.shopTab = tab;
        UI.updateShop();
    },
    leaveShop: () => {
        State.hp = Math.min(State.maxHp, State.hp + 10);
        UI.changeScene('scene-battle', () => Game.spawnEnemy());
    },
    upgradeCard: (uid, free = false) => {
        const card = State.deck.find(c => c.uid === uid);
        const cost = card?.rarity === 'rare' ? CONSTANTS.COST_RARE_UPGRADE : CONSTANTS.COST_UPGRADE;
        if (!free && State.bp < cost) { UI.toast(`BPが足りません（必要 ${cost}）`); return; }
        if (card && !card.upgraded) {
            if (!free) State.bp -= cost;
            applyCardUpgradeValues(card);
            card.desc = Game.describeCard(card);
            UI.toast("カードを強化しました！");
            UI.updateShop();
        }
    },
    removeCard: (uid) => {
        if (State.bp < CONSTANTS.COST_REMOVE) { UI.toast("BPが足りません"); return; }
        if (State.deck.length <= 4) { UI.toast("デッキは4枚より少なくできません"); return; }
        const idx = State.deck.findIndex(c => c.uid === uid);
        if (idx > -1) {
            State.bp -= CONSTANTS.COST_REMOVE;
            State.deck.splice(idx, 1);
            UI.toast("カードを削除しました");
            UI.updateShop();
        }
    },
    buyCard: (cardId) => {
        if (State.bp < CONSTANTS.COST_BUY) { UI.toast("BPが足りません"); return; }
        const cardInfo = CARDS_DB.find(c => c.id === cardId);
        if(cardInfo && cardInfo.limit) {
            if(Game.countCard(cardId) >= cardInfo.limit) { UI.toast("所持上限です"); return; }
        }
        Game.addCard(cardId);
        State.bp -= CONSTANTS.COST_BUY;
        State.shopCards = State.shopCards.filter(id => id !== cardId);
        UI.toast("カードを購入しました！");
        UI.updateShop();
    },
    buyMetaUpgrade: (key) => {
        const definition = META_UPGRADES[key]; if (!definition) return;
        const level = State.meta.upgrades[key] || 0; const cost = Meta.cost(key,State.meta);
        if (level >= definition.max || State.meta.shards < cost) return;
        State.meta.shards -= cost; State.meta.upgrades[key] = level + 1; Meta.save(State.meta);
        Sound.play('rare'); UI.updateMetaResult();
    },
    gameOver: () => {
        if (!State.battle.active) return;
        Game.recordBattleStats();
        State.battle.active = false;
        State.battle.processing = true;
        const defeated = State.battle.enemiesDefeated;
        State.runShardsEarned = 3 + Math.floor(defeated * .7) + Math.floor(defeated / 5) * 3;
        State.runLevelBefore = State.meta.playerLevel;
        State.runXpEarned = 20 + defeated * 10 + Math.min(80,Math.floor(State.runStats.damageDealt / 120));
        State.meta.playerXp += State.runXpEarned;
        State.meta.playerLevel = Meta.levelFromXp(State.meta.playerXp);
        State.runNewUnlocks = CARDS_DB.filter(card => card.unlockLevel > State.runLevelBefore && card.unlockLevel <= State.meta.playerLevel);
        State.meta.shards += State.runShardsEarned; Meta.save(State.meta);
        RunStorage.clear();
        document.getElementById('result-score').innerText = State.battle.enemiesDefeated;
        document.getElementById('result-damage-dealt').innerText = State.runStats.damageDealt.toLocaleString('ja-JP');
        document.getElementById('result-damage-taken').innerText = State.runStats.damageTaken.toLocaleString('ja-JP');
        document.getElementById('result-cards-played').innerText = State.runStats.cardsPlayed.toLocaleString('ja-JP');
        document.getElementById('result-average-turns').innerText = (State.runStats.totalBattleTurns / Math.max(1,State.runStats.battles)).toFixed(1);
        UI.changeScene('scene-result',() => UI.updateMetaResult());
    }
};

// --- UI制御 (UI) ---
const UI = {
    battleCutinUntil: 0,
    updateViewportMode: () => {
        const viewport = window.visualViewport;
        const width = Math.round(viewport?.width || window.innerWidth);
        const height = Math.round(viewport?.height || window.innerHeight);
        const ratio = width / Math.max(1, height);
        let layout = 'square';
        if (ratio <= 0.82) layout = height < 700 ? 'portrait-compact' : 'portrait';
        else if (ratio >= 1.25) layout = 'landscape';
        document.documentElement.dataset.layout = layout;
        document.documentElement.style.setProperty('--app-height', `${height}px`);
        document.documentElement.style.setProperty('--viewport-width', `${width}px`);
        const hand = document.getElementById('hand-container');
        if (hand && State.battle?.hand) UI.fitBattleHand(hand, State.battle.hand.length);
    },
    fitBattleHand: (container, count) => {
        if (!container || count < 2) return container?.style.removeProperty('--hand-overlap');
        const portrait = document.documentElement.dataset.layout?.startsWith('portrait');
        const cardWidth = portrait ? 84 : (window.innerWidth >= 768 ? 144 : 96);
        const available = Math.max(240, container.clientWidth - 16);
        const needed = (available - cardWidth * count) / (count - 1);
        const overlap = Math.min(-10, Math.max(-Math.round(cardWidth * .62), Math.floor(needed)));
        container.style.setProperty('--hand-overlap', `${overlap}px`);
    },
    updateStartMeta: () => {
        const levels = Object.values(State.meta.upgrades).reduce((sum,level)=>sum+level,0);
        document.getElementById('meta-start-summary').innerHTML = DEBUG_ALL_CARDS
            ? `<i class="fas fa-flask text-cyan-300"></i> DEBUG ・ 全カード解放 ・ 通常セーブは維持`
            : `<i class="fas fa-star text-yellow-300"></i> PLAYER Lv.${State.meta.playerLevel} ・ 継承LV ${levels} ・ ${State.meta.shards} ✦`;
        const unlocked = CARDS_DB.filter(card => Game.isCardUnlocked(card)).length;
        const progress = document.getElementById('library-progress');
        if (progress) progress.innerText = `${unlocked}/${CARDS_DB.length}`;
        const startScene = document.getElementById('scene-start');
        if (startScene && !startScene.classList.contains('hidden')) UI.updateTitleHeader();
    },
    renderDeckViewer: () => {
        const sources = {
            deck: { title:'現在の全デッキ', cards:State.deck || [], note:'所持しているカード。戦闘中の各置き場とは別に全構成を表示します。' },
            draw: { title:'山札', cards:State.battle.drawPile || [], note:'これから引けるカードの内容。ドロー順は伏せて名前順に表示します。' },
            discard: { title:'捨て札', cards:State.battle.discardPile || [], note:'山札が尽きると再び山札へ戻るカードです。' },
            exhaust: { title:'除外札', cards:State.battle.exhaustPile || [], note:'この戦闘ではもう使用できないカードです。' }
        };
        const current = sources[State.deckViewerTab] || sources.deck;
        const cards = [...current.cards].sort((a,b)=>a.name.localeCompare(b.name,'ja'));
        document.querySelectorAll('.deck-view-tab').forEach(button => {
            const active = button.dataset.deckTab === State.deckViewerTab;
            button.className = `deck-view-tab rounded-lg py-2 text-xs font-black transition ${active?'bg-yellow-300 text-slate-900':'bg-white/5 text-slate-300 hover:bg-white/10'}`;
        });
        document.getElementById('deck-viewer-caption').innerText = `${current.title}：${current.note}`;
        document.getElementById('deck-viewer-count').innerText = `${cards.length}枚`;
        const grid = document.getElementById('deck-viewer-grid'); grid.innerHTML = '';
        if (!cards.length) { grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400"><i class="fas fa-box-open text-3xl mb-2"></i><div class="font-bold">カードはありません</div></div>'; return; }
        cards.forEach(card => {
            const el = document.createElement('div');
            const tone = card.attr==='str'?'border-red-400/35 bg-red-500/10':card.attr==='int'?'border-blue-400/35 bg-blue-500/10':card.attr==='hp'?'border-green-400/35 bg-green-500/10':'border-slate-400/35 bg-white/5';
            el.className = `collection-card rounded-2xl border ${tone} p-3 text-left overflow-hidden`;
            el.innerHTML = `<div class="flex items-start justify-between gap-2"><i class="fas ${card.icon} text-xl ${card.rarity==='rare'?'text-yellow-300':'text-white'}"></i><div class="flex gap-1">${card.upgraded?'<span class="text-[8px] font-black bg-green-400 text-green-950 rounded px-1.5 py-.5">UP</span>':''}${card.secretMod?'<span class="text-[8px] font-black bg-fuchsia-500 rounded px-1.5 py-.5">秘伝</span>':''}</div></div><div class="font-black text-sm mt-2">${card.name}</div><div class="text-[10px] leading-relaxed text-slate-300 mt-1">${card.desc}</div>`;
            grid.appendChild(el);
        });
    },
    renderCardLibrary: () => {
        const tab = ['common','hp','str','int'].includes(State.libraryTab) ? State.libraryTab : 'common';
        const cards = CARDS_DB.filter(card => card.attr===tab).sort((a,b)=>(a.unlockLevel||0)-(b.unlockLevel||0)||a.name.localeCompare(b.name,'ja'));
        const totalUnlocked = CARDS_DB.filter(card => Game.isCardUnlocked(card)).length;
        const tabUnlocked = cards.filter(card => Game.isCardUnlocked(card)).length;
        document.getElementById('library-caption').innerText = `${DEBUG_ALL_CARDS ? 'DEBUG 全カード解放' : `PLAYER Lv.${State.meta.playerLevel}`} ・ 全体 ${totalUnlocked}/${CARDS_DB.length} ・ このプラン ${tabUnlocked}/${cards.length}`;
        document.querySelectorAll('.library-tab').forEach(button => {
            const active = button.dataset.libraryTab === tab;
            button.className = `library-tab rounded-lg py-2 text-xs font-black transition ${active?'bg-yellow-300 text-slate-900':'bg-white/5 text-indigo-100 hover:bg-white/10'}`;
        });
        const grid = document.getElementById('card-library-grid'); grid.innerHTML = '';
        cards.forEach(card => {
            const unlocked = Game.isCardUnlocked(card);
            const el = document.createElement('div');
            const tone = tab==='str'?'border-red-400/35 bg-red-500/10':tab==='int'?'border-blue-400/35 bg-blue-500/10':tab==='hp'?'border-green-400/35 bg-green-500/10':'border-slate-400/35 bg-white/5';
            el.className = `collection-card rounded-2xl border ${tone} p-3 ${unlocked?'':'locked'}`;
            el.innerHTML = `<div class="flex items-start justify-between gap-2"><i class="fas ${unlocked?card.icon:'fa-question'} text-xl ${unlocked&&card.rarity==='rare'?'text-yellow-300':'text-white'}"></i>${card.rarity==='rare'?'<span class="text-[8px] font-black bg-yellow-300 text-amber-950 rounded-full px-2 py-1">RARE</span>':''}</div><div class="font-black text-sm mt-2">${unlocked?card.name:'未解放カード'}</div><div class="text-[10px] font-bold mt-1 ${unlocked?'text-indigo-200':'text-yellow-200'}">${card.unlockLevel?`PLAYER Lv.${card.unlockLevel}`:'基本カード'}</div><div class="collection-card-description text-[10px] md:text-xs leading-relaxed mt-1 ${unlocked?'text-slate-300':'text-slate-400'}">${unlocked?card.desc:`Lv.${card.unlockLevel}で正体と効果が解放されます。`}</div>`;
            grid.appendChild(el);
        });
    },
    renderAnnouncements: () => {
        const list = document.getElementById('announcements-list');
        list.innerHTML = '';
        ANNOUNCEMENTS.forEach((notice,index) => {
            const item = document.createElement('details');
            item.className = 'notice-item rounded-2xl overflow-hidden';
            if (index === 0) item.open = true;
            const sections = (notice.sections || []).map(section => `<section><h3>${section.heading}</h3><ul>${section.items.map(itemText => `<li>${itemText}</li>`).join('')}</ul></section>`).join('');
            const body = notice.sections
                ? `<div class="notice-lead">${notice.intro || ''}</div>${sections}`
                : `<p>${notice.body}</p>`;
            item.innerHTML = `<summary class="cursor-pointer select-none flex items-center gap-3 p-4 md:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-300"><span class="w-10 h-10 rounded-xl bg-pink-400/15 text-pink-200 grid place-items-center shrink-0"><i class="fas fa-bullhorn"></i></span><span class="min-w-0 flex-1"><time class="block text-[9px] md:text-[10px] font-black tracking-wider text-indigo-200">${notice.date}</time><span class="block text-sm md:text-base font-black mt-0.5">${notice.title}</span></span><span class="notice-chevron text-yellow-300 shrink-0"><i class="fas fa-chevron-down"></i></span></summary><div class="notice-body border-t border-white/10 px-4 pb-5 pt-4 md:px-6 md:pb-6">${body}</div>`;
            list.appendChild(item);
        });
    },
    getGrowthRank: () => {
        const score = State.maxHp / 7 + State.str * 1.7 + State.int * 1.7;
        const rank = score >= 72 ? 'S' : score >= 58 ? 'A' : score >= 45 ? 'B' : score >= 34 ? 'C' : 'D';
        return { score, rank };
    },
    renderGrowthAnalysis: () => {
        const statRank = (value, borders) => value >= borders[0] ? '突出' : value >= borders[1] ? '優秀' : value >= borders[2] ? '安定' : '伸びしろあり';
        const overall = UI.getGrowthRank();
        document.getElementById('analysis-name').innerText = `${State.name}の10日間の成長記録`;
        document.getElementById('analysis-hp').innerText = State.maxHp;
        document.getElementById('analysis-str').innerText = State.str;
        document.getElementById('analysis-int').innerText = State.int;
        document.getElementById('analysis-hp-rank').innerText = statRank(State.maxHp,[95,78,65]);
        document.getElementById('analysis-str-rank').innerText = statRank(State.str,[24,18,12]);
        document.getElementById('analysis-int-rank').innerText = statRank(State.int,[24,18,12]);
        document.getElementById('analysis-rank').innerText = overall.rank;
        document.getElementById('analysis-deck').innerText = State.deck.length;
        const best = [['最大HP',State.maxHp/7],['攻撃',State.str*1.7],['魔力',State.int*1.7]].sort((a,b)=>b[1]-a[1])[0][0];
        const rareCount = State.deck.filter(card => card.rarity === 'rare').length;
        document.getElementById('analysis-comment').innerText = `${best}を軸にした戦いが得意。${rareCount ? `レアカード${rareCount}枚を含む` : '基礎のまとまった'}${State.deck.length}枚デッキで実戦へ。評価${overall.rank}、生存力と攻撃テンポの両方を観測します。`;
        RunStorage.save();
    },
    renderSecretMode: () => {
        document.getElementById('secret-bp').innerText = State.bp;
        const list = document.getElementById('secret-card-list');
        list.innerHTML = '';
        State.deck.forEach(card => {
            const modKey = card.secretMod || Game.getSecretMod(card);
            const mod = SECRET_MODS[modKey];
            const button = document.createElement('button');
            button.className = `secret-card text-left rounded-2xl border p-3 md:p-4 ${card.secretMod?'border-fuchsia-300/50 opacity-65':'border-purple-300/20'} disabled:cursor-default`;
            button.disabled = Boolean(card.secretMod) || State.bp < SECRET_MOD_COST;
            button.innerHTML = `<div class="flex gap-3 items-start"><div class="w-10 h-10 rounded-xl bg-white/10 grid place-items-center text-fuchsia-200 shrink-0"><i class="fas ${mod.icon}"></i></div><div class="min-w-0 flex-1"><div class="flex justify-between gap-2"><span class="font-black text-sm md:text-base truncate">${card.name}</span><span class="text-[9px] font-black ${card.secretMod?'text-fuchsia-200':'text-yellow-300'} whitespace-nowrap">${card.secretMod?'改造済':`${SECRET_MOD_COST} BP`}</span></div><div class="text-fuchsia-200 font-black text-xs mt-1">${mod.name}</div><div class="text-[10px] md:text-xs text-purple-100 mt-1 leading-relaxed">${mod.desc}</div></div></div>`;
            if (!button.disabled) button.onclick = () => Game.applySecretMod(card.uid);
            list.appendChild(button);
        });
    },
    renderArcaneArts: () => {
        const list = document.getElementById('arcane-arts-list');
        const used = State.battle.arcaneArtsUsed || [];
        const arts = [
            { id:'transcribe', cost:3, icon:'fa-copy', name:'魔導転写', desc:'カードを2枚引く。' },
            { id:'phase', cost:5, icon:'fa-circle-notch', name:'位相転換', desc:'次の敵攻撃を無効化し、火力の半分（最大8）を一時魔力へ変換。' },
            { id:'compress', cost:8, icon:'fa-hourglass-half', name:'時間圧縮', desc:'行動権+1、カードを2枚引く。' }
        ];
        list.innerHTML = arts.map(art => {
            const spent = used.includes(art.id);
            const disabled = spent || State.tempMana < art.cost;
            return `<button onclick="Game.useArcaneArt('${art.id}')" ${disabled?'disabled':''} class="w-full text-left rounded-xl border p-3 transition ${disabled?'opacity-45 border-slate-600 bg-slate-800':'border-cyan-300/40 bg-indigo-500/20 hover:bg-indigo-500/35'}"><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-cyan-300/15 text-cyan-300 grid place-items-center"><i class="fas ${art.icon}"></i></div><div class="flex-1"><div class="flex justify-between gap-2"><span class="font-black">${art.name}</span><span class="text-cyan-300 font-black text-sm">${spent?'使用済':`${art.cost} MANA`}</span></div><div class="text-[10px] md:text-xs text-indigo-200 mt-1">${art.desc}</div></div></div></button>`;
        }).join('');
    },
    updateHandSelection: () => {
        const cards = document.querySelectorAll('#hand-container > div');
        cards.forEach((el,index) => {
            const selected = State.battle.selectedHandIndex === index;
            el.classList.toggle('card-selected',selected);
            el.setAttribute('aria-pressed',selected ? 'true' : 'false');
            const preview = el.querySelector('.card-preview');
            if (preview) {
                preview.classList.toggle('hidden',!selected);
                if (selected && State.battle.hand[index]) preview.innerText = Game.previewCard(State.battle.hand[index]);
            }
        });
    },
    resumeSavedRun: () => {
        const avatar = State.avatar || (State.playerType === 'hp' ? '🛡️' : State.playerType === 'str' ? '🔥' : '🔮');
        const traits = { hp:'特性: 生命の殻・自然治癒', str:'特性: 先手必勝・連撃の呼吸・クロスカウンター', int:'特性: 一時魔力' };
        document.getElementById('char-avatar').innerText = avatar;
        document.getElementById('player-battle-avatar').innerText = avatar;
        document.getElementById('trait-display').innerText = traits[State.playerType] || '特性: なし';
        document.getElementById('trait-display').classList.remove('hidden');
        document.getElementById('input-name').value = State.name.replace(/っち$/, '');
        Game.tempType = State.playerType;
        UI.updateHeader();
        if (State.phase === 'training') {
            UI.changeScene('scene-training', () => {
                UI.updateTraining(); UI.updateDailyEvent(); UI.updateActionButtons();
                UI.toast('育成データを読み込みました');
            });
        } else {
            document.getElementById('bp-display').classList.remove('hidden');
            UI.changeScene('scene-battle', () => {
                UI.setArena(State.battle.enemy?.kind || (State.battle.enemy?.boss ? 'boss' : 'normal'));
                UI.updateBattle();
                UI.toast('バトルを再開しました');
            });
        }
    },
    setArena: (kind) => {
        const scene = document.getElementById('scene-battle');
        const colors = { normal:'#8b5cf6', brute:'#ef4444', trick:'#6366f1', sprout:'#22c55e', swarm:'#eab308', guardian:'#0ea5e9', assassin:'#dc2626', dragon:'#f97316', phoenix:'#f43f5e', colossus:'#64748b', boss:'#f59e0b' };
        scene.style.setProperty('--arena-accent', colors[kind] || colors.normal);
        const sprite = document.getElementById('enemy-sprite');
        const bossKind = kind === 'boss' || ['dragon','phoenix','colossus'].includes(kind);
        sprite.getAnimations().forEach(animation => animation.cancel());
        sprite.classList.remove('victory-burst','enemy-hit','enemy-hit-heavy','player-hurt');
        sprite.style.opacity = '1'; sprite.style.transform = 'none'; sprite.style.visibility = 'visible';
        sprite.classList.toggle('boss-sprite', bossKind);
        requestAnimationFrame(() => sprite.animate([
            { opacity:0, transform:'translateY(-35px) scale(.35)' },
            { opacity:1, transform:'translateY(5px) scale(1.15)', offset:.72 },
            { opacity:1, transform:'translateY(0) scale(1)' }
        ], { duration:bossKind ? 680 : 420, easing:'cubic-bezier(.16,1,.3,1)' }));
    },
    flash: (kind = 'phys') => {
        const el = document.getElementById('battle-flash'); if (!el) return;
        el.className = 'battle-flash'; void el.offsetWidth; el.classList.add(`flash-${kind}`);
    },
    traitActivation: (kind, title, subtitle = '') => {
        const layer = document.getElementById('battle-fx-layer');
        if (!layer) return;
        // Keep center-screen announcements serialized, with a short visual pause
        // after the trait cut-in before the turn banner enters.
        UI.battleCutinUntil = Math.max(UI.battleCutinUntil, performance.now() + 1050);
        layer.querySelectorAll(`.trait-activation.${kind}`).forEach(element => element.remove());
        const el = document.createElement('div');
        el.className = `trait-activation ${kind}`;
        el.innerHTML = `<div class='text-center'><div class='trait-activation-title'>${title}</div><div class='trait-activation-sub'>${subtitle}</div></div>`;
        layer.appendChild(el);
        setTimeout(() => el.remove(), 980);
        if (navigator.vibrate && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(kind === 'attack' ? [18,22,28] : 22);
    },
    showTurnBanner: (onComplete) => {
        const banner = document.getElementById('turn-banner');
        if (!banner) { if (onComplete) onComplete(); return; }
        const wait = Math.max(0, UI.battleCutinUntil - performance.now());
        setTimeout(() => {
            if (!State.battle.active || !State.battle.processing) return;
            banner.classList.remove('scale-0');
            setTimeout(() => {
                banner.classList.add('scale-0');
                if (onComplete) onComplete();
            }, 1000);
        }, wait);
    },
    combatNumber: (amount, kind = 'damage', targetId = 'enemy-sprite', delay = 0, critical = false, emphasis = false) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const layer = document.getElementById('battle-fx-layer');
        const target = document.getElementById(targetId); const scene = document.getElementById('scene-battle');
        if (!layer || !target || !scene) return;
        const rect = target.getBoundingClientRect(); const base = scene.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = `damage-number ${kind}${critical ? ' critical' : ''}${emphasis ? ' multi-hit' : ''}`;
        el.textContent = kind === 'heal' ? `+${Math.floor(amount)}` : kind === 'block' ? `🛡 ${Math.floor(amount)}` : Math.floor(amount);
        el.style.left = `${rect.left - base.left + rect.width / 2 + (Math.random() * 24 - 12)}px`;
        el.style.top = `${rect.top - base.top + rect.height * .42}px`;
        el.style.animationDelay = `${delay}ms`;
        layer.appendChild(el); setTimeout(() => el.remove(), delay + (emphasis ? 1050 : 850));
    },
    burst: (targetId, color = '#fbbf24', count = 8, delay = 0) => {
        const layer = document.getElementById('battle-fx-layer'); const target = document.getElementById(targetId); const scene = document.getElementById('scene-battle');
        if (!layer || !target || !scene || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = target.getBoundingClientRect(); const base = scene.getBoundingClientRect();
        for (let i=0;i<count;i++) {
            const p = document.createElement('i'); p.className = 'fx-particle';
            const angle = (Math.PI * 2 * i / count) + Math.random() * .3; const distance = 35 + Math.random() * 65;
            p.style.setProperty('--x', `${rect.left-base.left+rect.width/2}px`); p.style.setProperty('--y', `${rect.top-base.top+rect.height/2}px`);
            p.style.setProperty('--dx', `${Math.cos(angle)*distance}px`); p.style.setProperty('--dy', `${Math.sin(angle)*distance}px`); p.style.setProperty('--particle', color);
            p.style.animationDelay = `${delay}ms`; layer.appendChild(p); setTimeout(()=>p.remove(), delay+700);
        }
    },
    ignitionExplosion: (reignition = false) => {
        const layer = document.getElementById('battle-fx-layer');
        const target = document.getElementById('enemy-sprite');
        const scene = document.getElementById('scene-battle');
        if (!layer || !target || !scene) return;
        const rect = target.getBoundingClientRect();
        const base = scene.getBoundingClientRect();
        const x = rect.left-base.left+rect.width/2;
        const y = rect.top-base.top+rect.height/2;
        const explosion = document.createElement('div');
        explosion.className = `ignition-explosion${reignition ? ' reignition' : ''}`;
        explosion.style.left = `${x}px`;
        explosion.style.top = `${y}px`;
        explosion.innerHTML = '<i></i><i></i>';
        layer.appendChild(explosion);
        const lightweight = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
        const particleCount = lightweight ? (reignition ? 10 : 8) : (reignition ? 16 : 14);
        UI.burst('enemy-sprite',reignition ? '#e879f9' : '#fb923c',particleCount);
        UI.flash(reignition ? 'mag' : 'rare');
        requestAnimationFrame(() => UI.hitStop(lightweight ? 40 : (reignition ? 75 : 60)));
        if (navigator.vibrate && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(reignition ? [35,25,55] : [28,20,42]);
        setTimeout(() => explosion.remove(), 720);
    },
    consumeCard: async (clone, tier, x, y, type) => {
        const colors = { phys:'#fb7185', mag:'#a78bfa', def:'#60a5fa', heal:'#4ade80', buff:'#fbbf24', skill:'#c084fc' };
        const ring = document.createElement('div'); ring.className = 'card-consume-ring';
        ring.style.left = `${x}px`; ring.style.top = `${y}px`; ring.style.setProperty('--consume-color',colors[type]||'#fbbf24');
        document.body.appendChild(ring); setTimeout(()=>ring.remove(),450);
        const duration = tier === 3 ? 220 : tier === 2 ? 160 : 115;
        const animation = clone.animate([
            { transform:'scale(.45) rotate(10deg)', opacity:.9, filter:'brightness(2)' },
            { transform:`scale(${tier===3?1.08:.78}) rotate(-4deg)`, opacity:1, filter:'brightness(3)', offset:.38 },
            { transform:'scale(0) rotate(24deg)', opacity:0, filter:'brightness(4) blur(2px)' }
        ], { duration, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards' });
        try { await animation.finished; } catch (_) {}
    },
    hitStop: (duration = 0) => {
        if (!duration || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const scene = document.getElementById('scene-battle');
        const running = scene.getAnimations({subtree:true}).filter(animation => animation.playState === 'running');
        running.forEach(animation => animation.pause()); scene.classList.add('hitstop-freeze');
        setTimeout(() => {
            scene.classList.remove('hitstop-freeze');
            running.forEach(animation => { try { if (animation.playState === 'paused') animation.play(); } catch (_) {} });
        }, duration);
    },
    hitEnemy: (amount, kind = 'phys', critical = false, delay = 0, multiHit = false) => {
        if (amount <= 0) return;
        setTimeout(() => {
            const sprite = document.getElementById('enemy-sprite'); const scene = document.getElementById('scene-battle');
            const fx = document.createElement('div'); const rect = sprite.getBoundingClientRect(); const base = scene.getBoundingClientRect();
            fx.className = kind === 'mag' ? 'magic-fx' : 'slash-fx'; fx.style.left = `${rect.left-base.left+rect.width/2}px`; fx.style.top = `${rect.top-base.top+rect.height/2}px`;
            document.getElementById('battle-fx-layer').appendChild(fx); setTimeout(()=>fx.remove(),600);
            sprite.classList.remove('enemy-hit','enemy-hit-heavy'); void sprite.offsetWidth; sprite.classList.add(critical?'enemy-hit-heavy':'enemy-hit');
            const player = document.getElementById('player-battle-avatar'); player.classList.remove('player-attack'); void player.offsetWidth; player.classList.add('player-attack');
            UI.combatNumber(amount, 'damage', 'enemy-sprite', 0, critical, multiHit); UI.burst('enemy-sprite',kind==='mag'?'#a78bfa':'#fb7185',critical?12:7);
            if (critical) {
                UI.flash(kind === 'mag' ? 'mag' : 'phys');
                const ratio = amount / Math.max(1,State.battle.enemy?.maxHp || amount);
                requestAnimationFrame(() => UI.hitStop(ratio >= .35 ? 135 : 88));
            }
            Sound.play(kind); if (critical && navigator.vibrate) navigator.vibrate(25);
        }, delay);
    },
    hitPlayer: (amount, heavy = false) => {
        const player = document.getElementById('player-battle-avatar');
        player.classList.remove('player-hurt'); void player.offsetWidth; player.classList.add('player-hurt');
        UI.combatNumber(amount,'hurt','player-battle-avatar',0,heavy); UI.burst('player-battle-avatar','#ef4444',heavy?12:7); UI.flash('hurt'); Sound.play('hurt');
        if (navigator.vibrate) navigator.vibrate(heavy ? [35,25,45] : 30);
    },
    enemyAttack: async (heavy = false) => {
        const sprite = document.getElementById('enemy-sprite');
        const distance = heavy ? 56 : 36;
        const animation = sprite.animate([
            { transform:'translateY(0) scale(1)' },
            { transform:'translateY(-10px) scale(1.12)', offset:.32 },
            { transform:`translate(-${distance}px, ${distance*.28}px) scale(${heavy?1.3:1.18}) rotate(-7deg)`, offset:.68 },
            { transform:'translateY(0) scale(1)' }
        ], { duration:heavy?420:320, easing:'cubic-bezier(.2,.8,.2,1)' });
        try { await animation.finished; } catch (_) {}
    },
    victory: () => {
        const sprite = document.getElementById('enemy-sprite');
        sprite.classList.remove('victory-burst'); void sprite.offsetWidth; sprite.classList.add('victory-burst');
        UI.burst('enemy-sprite','#fbbf24',State.battle.enemy?.boss?18:12); UI.flash('rare'); Sound.play('win');
    },
    updateMetaResult: () => {
        document.getElementById('result-shards-earned').innerText = `+${State.runShardsEarned || 0} ✦`;
        document.getElementById('result-shards-total').innerText = State.meta.shards;
        const level = State.meta.playerLevel;
        const floorXp = Meta.xpForLevel(level);
        const nextXp = Meta.xpForLevel(Math.min(MAX_PLAYER_LEVEL,level + 1));
        const needed = Math.max(1,nextXp - floorXp);
        const progress = level >= MAX_PLAYER_LEVEL ? 100 : Math.min(100,Math.max(0,(State.meta.playerXp-floorXp)/needed*100));
        document.getElementById('result-player-level').innerText = level;
        document.getElementById('result-xp-earned').innerText = `+${State.runXpEarned || 0} EXP`;
        document.getElementById('result-xp-progress').innerText = `${State.meta.playerXp-floorXp} / ${level>=MAX_PLAYER_LEVEL?'MAX':needed} EXP`;
        document.getElementById('result-xp-next').innerText = level >= MAX_PLAYER_LEVEL ? 'MAX LEVEL' : `NEXT Lv.${level+1}`;
        requestAnimationFrame(() => { document.getElementById('result-xp-bar').style.width = `${progress}%`; });
        document.getElementById('result-level-up').classList.toggle('hidden', level <= State.runLevelBefore);
        const unlockPanel = document.getElementById('result-unlocks');
        const unlockList = document.getElementById('result-unlock-list');
        unlockList.innerHTML = '';
        State.runNewUnlocks.forEach(card => {
            const badge = document.createElement('div');
            badge.className = `rounded-full px-3 py-1.5 text-xs font-black border ${card.rarity==='rare'?'bg-yellow-400/20 border-yellow-300/50 text-yellow-200':'bg-white/10 border-white/20 text-white'}`;
            badge.innerHTML = `<i class="fas ${card.icon} mr-1"></i>${card.name}${card.rarity==='rare'?' ★':''}`;
            unlockList.appendChild(badge);
        });
        unlockPanel.classList.toggle('hidden', State.runNewUnlocks.length === 0);
        document.getElementById('meta-shards-display').innerText = State.meta.shards;
        const grid = document.getElementById('meta-upgrade-grid'); grid.innerHTML = '';
        Object.entries(META_UPGRADES).forEach(([key,definition]) => {
            const level = State.meta.upgrades[key] || 0; const cost = Meta.cost(key,State.meta); const maxed = level >= definition.max;
            const button = document.createElement('button');
            button.className = 'meta-upgrade text-left rounded-xl border border-white/15 p-2.5 md:p-3 transition';
            button.disabled = maxed || State.meta.shards < cost;
            button.innerHTML = `<div class="flex items-center gap-2"><i class="fas ${definition.icon} ${definition.color} text-lg"></i><span class="font-black text-xs md:text-sm">${definition.name}</span></div><div class="text-[9px] md:text-[10px] text-slate-400 mt-1">${definition.desc}</div><div class="flex items-center justify-between mt-2"><span class="text-[9px] font-bold text-indigo-200">LV ${level}/${definition.max}</span><span class="text-[10px] font-black ${maxed?'text-green-300':'text-yellow-300'}">${maxed?'MAX':`${cost} ✦`}</span></div>`;
            button.onclick = () => Game.buyMetaUpgrade(key); grid.appendChild(button);
        });
    },
    changeScene: (id, onShown) => {
        const overlay = document.getElementById('transition-overlay');
        overlay.style.opacity = '1';
        setTimeout(() => {
            document.querySelectorAll('[id^="scene-"]').forEach(el => el.classList.add('hidden'));
            const el = document.getElementById(id);
            el.classList.remove('hidden');
            if(id === 'scene-start') {
                el.classList.add('slide-in');
                UI.updateTitleHeader();
            }
            setTimeout(() => {
                overlay.style.opacity = '0';
                if (onShown) setTimeout(onShown, 120);
            }, 50);
        }, 500);
    },
    updateTitleHeader: () => {
        const level = State.meta.playerLevel;
        const atMax = level >= MAX_PLAYER_LEVEL;
        const nextLevelXp = Meta.xpForLevel(Math.min(MAX_PLAYER_LEVEL, level + 1));
        document.getElementById('header-icon').innerHTML = '<i class="fas fa-star"></i>';
        document.getElementById('player-name-display').innerText = 'たまごち！';
        document.getElementById('phase-display').innerText = 'PLAYER LEVEL';
        document.getElementById('turn-display').innerText = `Lv.${level}`;
        document.getElementById('turn-sub').innerText = atMax ? 'MAX LEVEL' : `次まで ${Math.max(0, nextLevelXp - State.meta.playerXp)} XP`;
        document.getElementById('trait-display').classList.add('hidden');
        document.getElementById('bp-display').classList.add('hidden');
    },
    updateHeader: () => {
        document.getElementById('header-icon').innerHTML = '<i class="fas fa-egg"></i>';
        document.getElementById('player-name-display').innerText = State.name;
        const ph = State.phase === 'training' ? '育成中' : (State.phase === 'battle' ? `戦闘中 (${State.battle.enemiesDefeated}体目)` : '準備');
        document.getElementById('phase-display').innerText = ph;
        document.getElementById('shop-bp').innerText = `${State.bp} BP`;
        document.getElementById('bp-display').innerText = `BP: ${State.bp}`;
        if (State.phase === 'training') {
            document.getElementById('turn-display').innerText = `残り ${11 - State.turn}日`;
            document.getElementById('turn-sub').innerText = `${State.turn}/10ターン目`;
        } else {
            document.getElementById('turn-display').innerText = `TURN ${State.battle.turnCount+1}`;
            document.getElementById('turn-sub').innerText = "";
        }
    },
    updateTraining: () => {
        document.getElementById('train-maxhp-val').innerText = State.maxHp;
        document.getElementById('train-hp-val').innerText = State.hp;
        document.getElementById('stat-str').innerText = State.str;
        document.getElementById('stat-int').innerText = State.int;
        const hpPct = Math.min(100, (State.hp / State.maxHp) * 100);
        document.getElementById('train-hp-bar').style.width = `${hpPct}%`;
        const bar = document.getElementById('train-hp-bar');
        const cheapestTraining = Math.min(...['hp','str','int'].map(type => Game.getTrainingAction(type).cost));
        if (State.hp <= cheapestTraining) {
            bar.classList.remove('bg-green-500'); bar.classList.add('bg-red-500', 'shake-anim');
        } else {
            bar.classList.add('bg-green-500'); bar.classList.remove('bg-red-500', 'shake-anim');
        }
    },
    updateDailyEvent: () => {
        const event = State.trainingEvent || TRAINING_EVENTS[0];
        const card = document.getElementById('daily-event-card');
        document.getElementById('daily-event-icon').innerText = event.icon;
        document.getElementById('daily-event-day').innerText = `DAY ${State.turn}`;
        document.getElementById('daily-event-title').innerText = event.title;
        document.getElementById('daily-event-desc').innerText = event.desc;
        card.classList.remove('daily-event-card'); void card.offsetWidth; card.classList.add('daily-event-card');
    },
    greatSuccess: () => {
        const avatar = document.getElementById('char-avatar');
        avatar.classList.remove('great-success-avatar'); void avatar.offsetWidth; avatar.classList.add('great-success-avatar');
        if (navigator.vibrate) navigator.vibrate([30,30,60]);
    },
    updateActionButtons: () => {
        Object.keys(ACTION_DATA).forEach(key => {
            const data = Game.getTrainingAction(key);
            const btn = document.getElementById(`act-btn-${key}`);
            const isSelected = State.selectedAction === key;
            let bgClass = '', textClass = '', borderClass = '';
            if(data.color === 'green') { bgClass = 'bg-green-50 hover:bg-green-100'; textClass = 'text-green-800'; borderClass = 'border-green-200'; }
            if(data.color === 'red') { bgClass = 'bg-red-50 hover:bg-red-100'; textClass = 'text-red-800'; borderClass = 'border-red-200'; }
            if(data.color === 'blue') { bgClass = 'bg-blue-50 hover:bg-blue-100'; textClass = 'text-blue-800'; borderClass = 'border-blue-200'; }
            if(data.color === 'yellow') { bgClass = 'bg-yellow-100 hover:bg-yellow-200'; textClass = 'text-yellow-900'; borderClass = 'border-yellow-400'; }
            if(isSelected) {
                let statText = `+${data.gain}`;
                if(key === 'rest') {
                    const healAmount = Math.floor(State.maxHp * data.restRate);
                    const actualHeal = Math.min(State.maxHp - State.hp, healAmount);
                    statText = `+${actualHeal}`;
                }
                btn.className = `action-btn ${bgClass.split(' ')[0]} ${textClass} p-2 md:p-4 rounded-xl md:rounded-2xl border-4 ${borderClass.replace('border-b-4', '')} transition-all duration-200 flex flex-col md:flex-row items-center gap-1 md:gap-4 h-20 md:h-20 group relative overflow-hidden shadow-inner ring-2 ring-offset-1 ring-${data.color}-400 transform scale-[1.02]`;
                btn.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center w-full btn-content-enter"><span class="font-black text-2xl md:text-3xl tracking-widest">実行！</span><div class="flex gap-2 text-xs md:text-sm font-bold"><span class="text-${data.color}-600">${data.stat} ${statText}</span>${data.cost > 0 ? `<span class="text-red-500">HP -${data.cost}</span>` : ''}</div></div>`;
            } else {
                btn.className = `action-btn ${bgClass} ${textClass} p-2 md:p-4 rounded-xl md:rounded-2xl border-2 ${key==='rest'?'border-b-4':''} ${borderClass} transition-all duration-200 flex flex-col md:flex-row items-center gap-1 md:gap-4 h-20 md:h-20 group relative overflow-hidden shadow-sm active:scale-95 ${State.selectedAction ? 'opacity-50' : 'opacity-100'}`;
                let costBadge = data.cost > 0 ? `<span class="text-[9px] md:text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-red-200 relative z-10 md:ml-auto whitespace-nowrap">+${data.gain} / HP-${data.cost}<br><span class="text-yellow-600">大成功 ${Math.round(data.greatChance*100)}%</span></span>` : `<span class="text-[10px] md:text-sm bg-white px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-yellow-200 text-green-600 font-bold relative z-10 md:ml-auto whitespace-nowrap">回復: Maxの${Math.round(data.restRate*100)}%</span>`;
                btn.innerHTML = `<div class="flex items-center gap-1 md:gap-3 relative z-10 md:w-1/3 justify-center md:justify-start"><i class="fas ${data.icon} text-xl md:text-3xl"></i><span class="font-bold text-sm md:text-xl whitespace-nowrap">${data.title}</span></div>${costBadge}`;
            }
        });
    },
    showCutin: ({ icon, title, statText, costText, variant = 'normal', onComplete }) => {
        const el = document.getElementById('scene-cutin');
        const band = document.getElementById('cutin-band');
        const content = document.getElementById('cutin-content');
        document.getElementById('cutin-icon').innerText = icon;
        document.getElementById('cutin-title').innerText = title;
        document.getElementById('cutin-stat').innerText = statText;
        document.getElementById('cutin-cost').innerText = costText;
        document.getElementById('cutin-cost').className = costText ? "text-lg md:text-2xl font-bold text-red-600 bg-white/80 px-3 py-1 rounded-lg whitespace-nowrap shadow-sm" : "hidden";
        el.classList.remove('hidden','training-result-wait','training-result-great');
        if (variant === 'great') el.classList.add('training-result-great');
        const anticipation = variant === 'great' ? 480 : variant === 'training' ? 220 : 0;
        if (anticipation) el.classList.add('training-result-wait');
        band.classList.remove('anim-band'); content.classList.remove('anim-text');
        setTimeout(() => {
            el.classList.remove('training-result-wait');
            void band.offsetWidth;
            band.classList.add('anim-band'); content.classList.add('anim-text');
            if (variant === 'great') { UI.greatSuccess(); Sound.play('rare'); if (navigator.vibrate) navigator.vibrate([45,35,90,30,120]); }
        }, anticipation);
        const duration = anticipation + (variant === 'great' ? 1580 : 1150);
        setTimeout(() => {
            el.classList.add('hidden');
            el.classList.remove('training-result-wait','training-result-great');
            if (onComplete) onComplete();
        }, duration);
    },
    showEffectPop: (card) => {
        const el = document.createElement('div');
        el.className = 'effect-popup';
        el.style.left = '50%'; el.style.top = '50%';
        el.innerText = card.name + "!";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
    },
    showDraft: (type, mode = 'training') => {
        const container = document.getElementById('draft-container');
        const skipBtn = document.getElementById('draft-skip-container');
        const title = document.getElementById('draft-title');
        const subtitle = document.getElementById('draft-subtitle');
        container.innerHTML = '';
        container.className = 'w-full max-w-6xl grid grid-cols-3 gap-2 md:gap-6 overflow-y-auto pb-4 px-2 md:px-4';
        const isUnderLimit = (c) => { const limit = c.limit || (c.rarity === 'rare' ? 1 : null); return !limit || Game.countCard(c.id) < limit; };
        const getCommons = () => CARDS_DB.filter(c => { if (!Game.isCardUnlocked(c)) return false; if (c.rarity === 'rare') return false; if (!isUnderLimit(c)) return false; return c.attr === 'common' || c.attr === type; });
        if (mode === 'battle_reward') {
            skipBtn.classList.remove('hidden'); title.innerText = State.battle.enemy.boss ? "ボス撃破報酬！" : State.battle.enemy.elite ? "エリート報酬！" : "バトル報酬！";
            let commons = getCommons();
            let rares = CARDS_DB.filter(c => Game.isCardUnlocked(c) && c.rarity === 'rare' && c.pool === type && isUnderLimit(c));
            let choices = [];
            const guaranteedRare = rares.length > 0 && (State.battle.enemy.boss || State.rarePity >= 4);
            const rareChance = State.battle.enemy.elite ? .08 : .03;
            for(let i=0; i<3; i++) {
                let isRare = (i === 0 && guaranteedRare) || Math.random() < rareChance;
                let source = (isRare && rares.length > 0) ? rares : commons;
                let available = source.filter(c => !choices.find(ch => ch.id === c.id));
                if (available.length === 0) { source = (source === rares) ? commons : rares; available = source.filter(c => !choices.find(ch => ch.id === c.id)); }
                if (available.length > 0) { choices.push(available[Math.floor(Math.random() * available.length)]); }
            }
            const hasRare = choices.some(c => c.rarity === 'rare');
            State.rarePity = hasRare ? 0 : rares.length > 0 ? State.rarePity + 1 : 0;
            subtitle.innerText = rares.length === 0 ? 'この型のレアカードをコンプリート！' : hasRare ? "黄金に輝くレアカード出現！" : `戦利品を選ぼう（レア保証まで あと${Math.max(0,4-State.rarePity)}回）`;
            UI.renderDraftCards(choices, container);
        } else {
            skipBtn.classList.add('hidden'); title.innerText = "カード獲得！"; subtitle.innerText = "強化完了！1枚選んでデッキに追加";
            let candidates = getCommons();
            if(candidates.length < 3) candidates = [...candidates, ...CARDS_DB.filter(c=>c.id==='punch')];
            const choiceCount = State.trainingEvent?.draftChoices || 3;
            const choices = Game.shuffle([...new Set(candidates)]).slice(0, choiceCount);
            container.className = `w-full max-w-6xl grid ${choiceCount===4?'grid-cols-2 md:grid-cols-4':'grid-cols-3'} gap-2 md:gap-6 overflow-y-auto pb-4 px-2 md:px-4`;
            UI.renderDraftCards(choices, container);
        }
        document.getElementById('scene-draft').classList.remove('hidden');
    },
    renderDraftCards: (cards, container) => {
        cards.forEach((card, index) => {
            const el = document.createElement('div');
            el.className = 'draft-reveal card-face bg-white p-2 md:p-4 rounded-xl shadow-lg border-2 border-slate-200 flex flex-col items-center gap-1 md:gap-2 cursor-pointer hover:border-yellow-400 transition transform hover:scale-105 active:scale-95 text-center h-full justify-between card-hover';
            el.style.setProperty('--delay', `${index * 80}ms`);
            if (card.rarity === 'rare') el.className += ' rare-card border-yellow-300 ring-2 md:ring-4 ring-yellow-100 bg-yellow-50';
            el.onclick = () => Game.draftCard(card.id);
            el.setAttribute('role','button'); el.tabIndex = 0; el.setAttribute('aria-label',`${card.name}。${card.desc}。選んで獲得`);
            el.onkeydown = (e) => { if(e.key==='Enter'||e.key===' '){e.preventDefault();Game.draftCard(card.id);} };
            let colorClass = card.type === 'phys' ? 'text-red-500 bg-red-100' : (card.type === 'mag' ? 'text-blue-500 bg-blue-100' : 'text-green-500 bg-green-100');
            if (card.rarity === 'rare') colorClass = 'text-yellow-600 bg-yellow-200';
            el.innerHTML = `<div class="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${colorClass} flex items-center justify-center text-xl md:text-3xl shrink-0 border-2 md:border-4 border-white shadow-sm mb-1 md:mb-2"><i class="fas ${card.icon || 'fa-star'}"></i></div><div class="w-full"><div class="font-bold text-xs md:text-lg text-slate-800 mb-1 leading-tight ${card.rarity==='rare' ? 'text-yellow-700':''}">${card.name}</div><div class="flex gap-1 justify-center flex-wrap mb-1 md:mb-2">${card.rarity === 'rare' ? '<span class="bg-yellow-400 text-[8px] md:text-[10px] font-black px-1 md:px-2 py-0.5 rounded text-slate-900 shadow-sm">RARE</span>' : ''}${card.add_action ? '<span class="bg-orange-400 text-[8px] md:text-[10px] font-black px-1 md:px-2 py-0.5 rounded text-white shadow-sm">連撃</span>' : ''}${card.exhaust ? '<span class="bg-purple-600 text-[8px] md:text-[10px] font-black px-1 md:px-2 py-0.5 rounded text-white shadow-sm">1回</span>' : ''}</div><div class="text-[9px] md:text-sm text-slate-500 leading-tight">${card.desc}</div></div>`;
            container.appendChild(el);
        });
    },
    renderJourneyEvents: () => {
        const container = document.getElementById('event-choice-container'); container.innerHTML = '';
        State.journeyChoices.forEach((event,index) => {
            const button = document.createElement('button');
            button.className = `event-choice draft-reveal text-left rounded-2xl border border-white/20 bg-gradient-to-br ${event.color} p-4 md:p-6 shadow-2xl transition hover:scale-[1.03] active:scale-95`;
            button.style.setProperty('--delay',`${index*90}ms`);
            button.innerHTML = `<div class="flex items-start justify-between gap-2"><div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl md:text-3xl mb-3 border border-white/30"><i class="fas ${event.icon}"></i></div>${event.risk?'<span class="text-[10px] font-black bg-red-950/50 border border-red-200/40 rounded-full px-2 py-1">HIGH RISK</span>':''}</div><div class="font-black text-lg md:text-2xl mb-1">${event.title}</div><div class="text-xs md:text-sm text-white/80 leading-relaxed">${event.desc}</div><div class="mt-4 text-xs font-black bg-black/20 inline-flex px-3 py-1 rounded-full">これを選ぶ <i class="fas fa-chevron-right ml-2 mt-0.5"></i></div>`;
            button.onclick = () => { button.disabled = true; Game.chooseJourneyEvent(event.id); };
            container.appendChild(button);
        });
    },
    updateShop: () => {
        UI.updateHeader(); 
        const tabs = ['upgrade', 'remove', 'buy'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            const col = document.getElementById(`shop-col-${t}`);
            if(State.shopTab === t) { btn.classList.add('text-white', 'border-green-400'); btn.classList.remove('text-slate-400', 'border-transparent'); col.classList.remove('hidden'); col.classList.add('flex'); } 
            else { btn.classList.remove('text-white', 'border-green-400'); btn.classList.add('text-slate-400', 'border-transparent'); col.classList.remove('flex'); col.classList.add('hidden'); col.classList.add('md:flex'); }
        });
        const renderShopList = (listId, clickFn, btnClass, btnText) => {
            const list = document.getElementById(listId);
            list.innerHTML = '';
            if(listId === 'shop-buy-list' && list.children.length === 0) {
                 let shopCards = State.shopCards.map(id => CARDS_DB.find(c => c.id === id)).filter(Boolean);
                 shopCards.forEach(card => {
                    const reachedLimit = card.limit && Game.countCard(card.id) >= card.limit;
                    const opacity = reachedLimit ? 'opacity-50' : 'opacity-100';
                    const div = document.createElement('div');
                    div.className = `flex justify-between items-center gap-2 bg-slate-800 p-2.5 rounded-lg text-sm text-white cursor-pointer hover:bg-slate-600 mb-2 ${opacity}`;
                    div.innerHTML = `<span class="min-w-0"><span class="font-bold block"><i class="fas ${card.icon} mr-1"></i>${card.name}</span><span class="text-[10px] text-slate-400 leading-tight block mt-0.5">${card.desc}</span></span> <span class="text-xs bg-slate-900 px-2 py-1 rounded ${btnClass} whitespace-nowrap">${reachedLimit?'上限':`${btnText} 50`}</span>`;
                    if(!reachedLimit) div.onclick = () => clickFn(card.id);
                    list.appendChild(div);
                 });
            } else if (listId !== 'shop-buy-list') {
                State.deck.forEach(card => {
                    if(listId === 'shop-upgrade-list' && card.upgraded) return;
                    const div = document.createElement('div');
                    div.className = 'flex justify-between items-center gap-2 bg-slate-800 p-2.5 rounded-lg text-sm text-white cursor-pointer hover:bg-slate-600 mb-2';
                    const detail = listId === 'shop-upgrade-list' ? Game.upgradePreview(card) : card.desc;
                    const price = listId === 'shop-upgrade-list' ? (card.rarity==='rare'?CONSTANTS.COST_RARE_UPGRADE:CONSTANTS.COST_UPGRADE) : CONSTANTS.COST_REMOVE;
                    div.innerHTML = `<span class="min-w-0"><span class="font-bold block"><i class="fas ${card.icon} mr-1"></i>${card.name}</span><span class="text-[10px] text-slate-400 leading-tight block mt-0.5">${detail}</span></span> <span class="text-xs bg-slate-900 px-2 py-1 rounded ${btnClass} whitespace-nowrap">${btnText} ${price}</span>`;
                    div.onclick = () => clickFn(card.uid);
                    list.appendChild(div);
                });
            }
        };
        renderShopList('shop-upgrade-list', Game.upgradeCard, 'text-green-400', '強化');
        renderShopList('shop-remove-list', Game.removeCard, 'text-red-400', '削除');
        renderShopList('shop-buy-list', Game.buyCard, 'text-blue-400', '購入');
    },
    updateBattle: () => {
        if (State.battle.enemy) {
            const e = State.battle.enemy;
            document.getElementById('enemy-name').innerText = e.name;
            document.getElementById('enemy-sprite').innerText = e.sprite || '👿';
            document.getElementById('enemy-level').innerText = `LV.${e.level} ${e.archetypeLabel || ''}${e.boss ? '・BOSS' : e.elite ? '・ELITE' : ''}`;
            const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
            document.getElementById('enemy-hp-bar').style.width = `${hpPct}%`;
            document.getElementById('enemy-hp-text').innerText = `${e.hp}/${e.maxHp}`;
            const intents = {
                atk: ['fa-sword', 'text-red-600 bg-red-100', `攻撃 ${e.intentValue}`],
                heavy: ['fa-skull-crossbones', 'text-red-700 bg-orange-100', `強攻撃 ${e.intentValue}`],
                multi: ['fa-bolt', 'text-amber-700 bg-amber-100', `連撃 ${e.intentValue}×${e.intentHits||1}`],
                drain: ['fa-tint', 'text-purple-700 bg-purple-100', `吸収 ${e.intentValue}`],
                buff: ['fa-arrow-up', 'text-yellow-700 bg-yellow-100', `攻撃強化 +${e.intentValue}`],
                guard: ['fa-shield-alt', 'text-blue-700 bg-blue-100', `防御 +${e.intentValue}`],
                hex: ['fa-skull', 'text-purple-700 bg-purple-100', '呪い：防御弱化'],
                heal: ['fa-heart', 'text-green-700 bg-green-100', `回復 +${e.intentValue}`]
            };
            const info = intents[e.intent] || intents.atk;
            document.getElementById('enemy-intent').className = `flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base font-bold ${info[1]} py-0.5 px-3 md:py-1 md:px-4 rounded-full inline-block shadow-sm whitespace-nowrap`;
            document.getElementById('enemy-intent').innerHTML = `<i class="fas ${info[0]}"></i> <span>${info[2]}</span>`;
            const enemyStatuses = [];
            if (e.trait) enemyStatuses.push(`<span class="status-chip bg-slate-700 text-white" title="${e.trait}"><i class="fas fa-circle-info"></i>${e.archetypeLabel}</span>`);
            if (e.block > 0) enemyStatuses.push(`<span class="status-chip bg-blue-500 text-white"><i class="fas fa-shield-alt"></i>${e.block}</span>`);
            if (State.battle.enemyVulnerable > 0) enemyStatuses.push(`<span class="status-chip bg-orange-500 text-white"><i class="fas fa-crosshairs"></i>脆弱 ${State.battle.enemyVulnerable}</span>`);
            if (State.battle.enemyBurn > 0) enemyStatuses.push(`<span class="status-chip bg-red-500 text-white"><i class="fas fa-fire"></i>炎上 ${State.battle.enemyBurn}</span>`);
            if (State.battle.enemyWeak) enemyStatuses.push(`<span class="status-chip bg-slate-500 text-white"><i class="fas fa-arrow-down"></i>弱体</span>`);
            if (State.battle.enemyFrozen) enemyStatuses.push(`<span class="status-chip bg-cyan-500 text-white"><i class="fas fa-snowflake"></i>凍結</span>`);
            if (e.affix) enemyStatuses.push(`<span class="status-chip bg-fuchsia-600 text-white" title="${e.affix.desc}"><i class="fas fa-dna"></i>${e.affix.name}</span>`);
            if (e.phaseTriggered) enemyStatuses.push('<span class="status-chip bg-orange-600 text-white"><i class="fas fa-fire"></i>本気</span>');
            document.getElementById('enemy-statuses').innerHTML = enemyStatuses.join('');
        }
        document.getElementById('battle-player-hp').innerText = State.hp;
        document.getElementById('battle-player-maxhp').innerText = State.maxHp;
        const apCont = document.getElementById('action-point-container');
        apCont.innerHTML = '';
        for(let i=0; i<State.battle.actionsLeft; i++) { apCont.innerHTML += `<div class="w-3 h-3 md:w-4 md:h-4 rounded-full bg-yellow-400 border border-white shadow-sm pop-anim"></div>`; }
        if(State.battle.actionsLeft === 0) apCont.innerHTML = `<span class="text-[10px] md:text-xs text-slate-400">0</span>`;
        const blkEl = document.getElementById('battle-block');
        if(State.battle.block > 0) { blkEl.classList.remove('hidden'); document.getElementById('battle-block-val').innerText = State.battle.block; } else { blkEl.classList.add('hidden'); }
        const playerStatuses = [];
        if (State.playerType === 'hp') playerStatuses.push(`<span class="status-chip bg-blue-600 text-white" title="5戦チェックポイントまでブロックを持ち越す"><i class="fas fa-shield-heart"></i>区間防壁</span>`);
        if (State.battle.playerTempStr > 0) playerStatuses.push(`<span class="status-chip bg-red-500 text-white">攻+${State.battle.playerTempStr}</span>`);
        if (State.battle.playerTempInt > 0) playerStatuses.push(`<span class="status-chip bg-indigo-500 text-white">魔+${State.battle.playerTempInt}</span>`);
        if (State.battle.thorns > 0) playerStatuses.push(`<span class="status-chip bg-orange-500 text-white">反撃${State.battle.thorns}</span>`);
        if (State.battle.immortal) playerStatuses.push(`<span class="status-chip bg-yellow-400 text-slate-900">不死身</span>`);
        if (State.battle.echo) playerStatuses.push(`<span class="status-chip bg-purple-500 text-white">残響 ×${Number(State.battle.echo)||1}</span>`);
        if (State.battle.manaForge) playerStatuses.push(`<span class="status-chip bg-indigo-500 text-white"><i class="fas fa-fire-flame-curved"></i>炉 +${State.battle.manaForge}</span>`);
        if (State.battle.manaEcho) playerStatuses.push(`<span class="status-chip bg-cyan-600 text-white"><i class="fas fa-wave-square"></i>龍脈 ×${State.battle.manaEcho}</span>`);
        if (State.battle.counterMagic) playerStatuses.push(`<span class="status-chip bg-indigo-600 text-white">因果反転</span>`);
        if (State.battle.reflectNext) playerStatuses.push(`<span class="status-chip bg-rose-600 text-white">報復</span>`);
        if (State.battle.manaAbsorb) playerStatuses.push(`<span class="status-chip bg-cyan-600 text-white"><i class="fas fa-circle-notch"></i>位相転換</span>`);
        if (State.battle.playerFrail) playerStatuses.push(`<span class="status-chip bg-slate-500 text-white">防御弱化</span>`);
        document.getElementById('player-statuses').innerHTML = playerStatuses.join('');
        const comboPanel = document.getElementById('combo-panel');
        document.getElementById('combo-count').innerText = State.battle.combo;
        comboPanel.classList.toggle('active', State.battle.combo >= 2);
        if (State.battle.combo >= 2) { comboPanel.classList.remove('combo-bump'); void comboPanel.offsetWidth; comboPanel.classList.add('combo-bump'); }
        const incoming = Math.max(0, Game.incomingDamage() - State.battle.block);
        const endButton = document.getElementById('end-turn-button');
        if (endButton) { endButton.innerHTML = incoming > 0 ? `ターンスキップ <span class="text-red-300">HP -${incoming}</span> <i class="fas fa-forward ml-1"></i>` : `ターンスキップ <span class="text-green-300">安全</span> <i class="fas fa-forward ml-1"></i>`; endButton.disabled = State.battle.processing; }
        const tempManaPanel = document.getElementById('temp-mana-panel');
        tempManaPanel.classList.toggle('hidden', State.playerType !== 'int');
        tempManaPanel.disabled = State.battle.processing;
        document.getElementById('temp-mana-value').innerText = State.tempMana;
        const restartButton = document.getElementById('battle-restart-button');
        if (restartButton) restartButton.disabled = State.battle.processing;
        document.getElementById('battle-deck-count').innerText = State.battle.drawPile.length;
        document.getElementById('battle-discard-count').innerText = State.battle.discardPile.length;
        document.getElementById('battle-exhaust-count').innerText = State.battle.exhaustPile.length;
        const handCont = document.getElementById('hand-container');
        handCont.innerHTML = '';
        const drawnUids = new Set(State.battle.lastDrawnUids || []);
        let drawOrder = 0;
        State.battle.hand.forEach((card, idx) => {
            const el = document.createElement('div');
            const canPlay = State.battle.actionsLeft > 0 && !State.battle.processing;
            const opacity = canPlay ? 'opacity-100' : 'opacity-50 grayscale';
            let typeColor = card.type === 'phys' ? 'bg-red-50 border-red-200' : (card.type === 'mag' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200');
            if(card.type === 'skill') typeColor = 'bg-purple-50 border-purple-200';
            if(card.rarity === 'rare') typeColor = 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200';
            let selectedClass = "";
            if (State.battle.selectedHandIndex === idx) { selectedClass = "card-selected"; }
            const drawnClass = drawnUids.has(card.uid) ? 'card-draw-in' : '';
            if (drawnClass) {
                const drawDelay = drawOrder++ * 45;
                el.style.setProperty('--draw-delay',`${drawDelay}ms`);
                el.addEventListener('animationend',() => el.classList.remove('card-draw-in'),{once:true});
                setTimeout(() => el.classList.remove('card-draw-in'),drawDelay + 520);
            }
            el.className = `card-face ${card.rarity==='rare'?'rare-card':''} w-24 h-32 md:w-36 md:h-52 bg-white rounded-xl border-b-4 ${typeColor} shadow-xl flex flex-col p-1.5 md:p-2 relative cursor-pointer transition-all duration-300 shrink-0 ${opacity} ${selectedClass} ${drawnClass}`;
            el.setAttribute('role','button'); el.tabIndex = canPlay ? 0 : -1; el.setAttribute('aria-pressed', State.battle.selectedHandIndex === idx ? 'true' : 'false'); el.setAttribute('aria-label', `${card.name}。${card.desc}`);
            if(canPlay) el.onclick = (e) => Game.handleCardClick(e, idx);
            if(canPlay) el.onkeydown = (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Game.handleCardClick(e, idx); } };
            let badges = '';
            if(card.rarity === 'rare') badges += `<span class="card-badge bg-yellow-400 text-slate-900" title="レア"><i class="fas fa-star"></i><span class="card-badge-label">RARE</span></span>`;
            if(card.add_action) badges += `<span class="card-badge bg-orange-400 text-white" title="続けて行動"><i class="fas fa-forward"></i><span class="card-badge-label">連撃</span></span>`;
            if(card.manaCost) badges += `<span class="card-badge ${State.tempMana>=card.manaCost?'bg-cyan-500':'bg-slate-500'} text-white" title="一時魔力 ${card.consumeAllMana?'全消費':card.manaCost+'消費'}"><i class="fas fa-magic"></i><span class="card-badge-label">${card.manaCost}</span></span>`;
            if(card.exhaust && card.secretMod !== 'rebirth') badges += `<span class="card-badge bg-purple-600 text-white" title="この戦闘で1回のみ"><i class="fas fa-hourglass-end"></i><span class="card-badge-label">1回</span></span>`;
            if(card.secretMod) badges += `<span class="card-badge bg-fuchsia-600 text-white" title="秘伝：${SECRET_MODS[card.secretMod].name}"><i class="fas fa-wand-magic-sparkles"></i><span class="card-badge-label">秘伝</span></span>`;
            const preview = `<div class="card-preview ${State.battle.selectedHandIndex===idx?'':'hidden'} relative z-10 bg-slate-900 text-yellow-300 text-[8px] md:text-[10px] font-black rounded px-1 py-0.5 text-center">${Game.previewCard(card)}</div>`;
            el.innerHTML = `<div class="card-badge-row">${badges}</div><div class="flex-1 min-h-0 flex flex-col items-center justify-center mt-5 md:mt-6 overflow-hidden relative z-[1]"><div class="text-2xl md:text-4xl mb-1 md:mb-2 drop-shadow-sm shrink-0 ${card.rarity==='rare' ? 'text-yellow-600' : (card.type==='phys'?'text-red-400':(card.type==='mag'?'text-blue-400':'text-green-400'))}"><i class="fas ${card.icon}"></i></div><div class="font-bold text-center text-[10px] md:text-sm leading-tight mb-1 md:mb-2 w-full truncate shrink-0 ${card.rarity==='rare'?'text-yellow-800':'text-slate-800'}">${card.name}</div><p class="card-description text-[8px] md:text-xs text-center text-slate-500 leading-tight px-0.5 line-clamp-3">${card.desc}</p></div>${preview}`;
            handCont.appendChild(el);
        });
        State.battle.lastDrawnUids = [];
        UI.fitBattleHand(handCont, State.battle.hand.length);
    },
    toast: (msg) => {
        const el = document.getElementById('toast');
        clearTimeout(UI.toastTimer);
        el.innerText = msg;
        el.style.opacity = 1;
        el.style.top = '140px'; 
        UI.toastTimer = setTimeout(() => { el.style.opacity = 0; el.style.top = '120px'; }, 1700);
    },
    animPop: (selector) => { const el = document.querySelector(selector); if(el) { el.classList.remove('pop-anim'); void el.offsetWidth; el.classList.add('pop-anim'); } },
    animShake: (selector) => { const el = document.querySelector(selector); if(el) { el.classList.remove('shake-anim'); void el.offsetWidth; el.classList.add('shake-anim'); } }
};

// --- 初期化 ---
// GameオブジェクトをHTMLのonclickから呼べるようにwindowに登録
window.Game = Game;

window.onload = () => {
    UI.updateViewportMode();
    const overlay = document.getElementById('transition-overlay');
    if(overlay) overlay.style.opacity = '0';
    UI.updateStartMeta();
    if (RunStorage.restore()) UI.resumeSavedRun();
};

setInterval(() => {
    if (!State.isTransitioning && !State.battle.processing) RunStorage.save();
}, 1200);
window.addEventListener('beforeunload', () => {
    if (!State.isTransitioning && !State.battle.processing) RunStorage.save();
});
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !State.isTransitioning && !State.battle.processing) RunStorage.save();
});

window.addEventListener('resize', UI.updateViewportMode, { passive:true });
window.addEventListener('orientationchange', () => setTimeout(UI.updateViewportMode, 120), { passive:true });
window.visualViewport?.addEventListener('resize', UI.updateViewportMode, { passive:true });

// 初期タイプ選択状態
Game.selectType('hp');

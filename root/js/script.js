import { CONSTANTS, ACTION_DATA, CARDS_DB, HIRAGANA } from './data.js';

const META_UPGRADES = {
    vitality: { name:'生命の殻', icon:'fa-heart', color:'text-green-300', desc:'初期最大HP +5', max:5 },
    power: { name:'力の記憶', icon:'fa-fist-raised', color:'text-red-300', desc:'初期攻撃 +1', max:5 },
    wisdom: { name:'知恵の記憶', icon:'fa-hat-wizard', color:'text-blue-300', desc:'初期魔力 +1', max:5 },
    fortune: { name:'幸運の星', icon:'fa-star', color:'text-yellow-300', desc:'大成功率 +3%', max:5 }
};

const Meta = {
    load() {
        try {
            const saved = JSON.parse(localStorage.getItem('ikuseicchi_meta') || '{}');
            const upgrades = {};
            Object.entries(META_UPGRADES).forEach(([key,definition]) => { upgrades[key] = Math.min(definition.max,Math.max(0,Math.floor(Number(saved.upgrades?.[key])||0))); });
            return { shards:Math.max(0,Math.floor(Number(saved.shards)||0)), upgrades };
        } catch (_) { return { shards:0, upgrades:{vitality:0,power:0,wisdom:0,fortune:0} }; }
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
    { id:'purify', icon:'fa-feather-alt', title:'浄化の風', desc:'デッキの「パンチ」か「防御」を1枚削除。', color:'from-slate-400 to-slate-600' }
];

// --- 状態管理 (State) ---
const State = {
    phase: 'start', name: '', playerType: 'hp', turn: 1, maxTurns: 10, bp: 0,
    selectedAction: null, hp: 50, maxHp: 50, str: 5, int: 5, deck: [],
    shopTab: 'upgrade', shopCards: [], isTransitioning: false, rarePity: 0,
    meta: Meta.load(), trainingEvent: null, lastTrainingEvent: null, journeyChoices: [],
    battle: {
        active: false, enemiesDefeated: 0, enemy: null, hand: [], drawPile: [], discardPile: [], exhaustPile: [],
        actionsLeft: 1, actionsNextTurn: 1, drawNextTurn: 0, block: 0, turnCount: 0,
        playerTempStr: 0, playerTempInt: 0, magBonus: 0, processing: false, selectedHandIndex: null,
        retainBlock: false, echo: false, immortal: false, enemyWeak: false,
        combo: 0, cardsPlayed: 0, damageThisTurn: 0, lastCardType: null, spellChain: 0,
        enemyVulnerable: 0, enemyBurn: 0, enemyFrozen: false, thorns: 0, playerFrail: false,
        counterMagic: false, reflectNext: false, pendingFx: 0
    }
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
        const input = document.getElementById('input-name');
        let name = input.value.trim() || 'ななし';
        if(!name.endsWith('っち')) name += 'っち';
        State.name = name;
        State.phase = 'training';
        State.playerType = Game.tempType || 'hp';
        State.hp = 50; State.maxHp = 50; State.str = 5; State.int = 5; State.turn = 1; State.bp = 0; State.rarePity = 0;
        State.deck = [];
        State.selectedAction = null;
        State.isTransitioning = false;

        Game.addCard('punch');
        Game.addCard('punch');
        Game.addCard('defend');
        
        let trait = "";
        let avatar = '🐣';
        if (State.playerType === 'hp') { 
            State.maxHp = 60; State.hp = 60; 
            Game.addCard('bandage'); Game.addCard('tackle'); 
            trait = "特性: 自然治癒・肉壁"; avatar = '🐻';
        } else if (State.playerType === 'str') { 
            State.str = 8; 
            Game.addCard('kick'); Game.addCard('rage'); 
            trait = "特性: 先手必勝"; avatar = '🐯';
        } else if (State.playerType === 'int') { 
            State.int = 8; 
            Game.addCard('spark'); Game.addCard('barrier'); 
            trait = "特性: 魔力循環"; avatar = '🦉';
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

    // --- TRAINING ---
    rollTrainingEvent: (initial = false) => {
        let candidates = TRAINING_EVENTS.filter(event => event.id !== State.lastTrainingEvent);
        if (initial) candidates = TRAINING_EVENTS.filter(event => ['calm','festival','mentor'].includes(event.id));
        const event = candidates[Math.floor(Math.random() * candidates.length)] || TRAINING_EVENTS[0];
        State.trainingEvent = event; State.lastTrainingEvent = event.id;
        State.selectedAction = null;
        UI.updateDailyEvent(); UI.updateActionButtons();
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
        if (greatSuccess) { title = '大成功！！'; icon = '🌟'; UI.greatSuccess(); Sound.play('rare'); }
        UI.updateTraining();
        const bonusText = (State.trainingEvent.bp || (greatSuccess && State.trainingEvent.bpOnGreat)) ? ` / BP +${(State.trainingEvent.bp||0)+(greatSuccess?State.trainingEvent.bpOnGreat||0:0)}` : '';
        UI.showCutin({ icon, title, statText: `${gainStat} +${gainVal}${bonusText}`, costText: `HP -${action.cost}`, onComplete: () => UI.showDraft(type, 'training') });
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
                icon: "⚔️", 
                title: "BATTLE START", 
                statText: "育成終了！", 
                costText: "実戦へ",
                onComplete: () => {
                    Game.initBattle();
                }
            });
        } else {
            State.turn++;
            UI.updateHeader();
            Game.rollTrainingEvent();
        }
    },

    // --- BATTLE ---
    initBattle: () => {
        State.phase = 'battle';
        State.battle.active = true;
        State.battle.enemiesDefeated = 0;
        State.battle.processing = false; 
        State.isTransitioning = false;
        State.battle.block = 0;

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
        const elite = !bosses && tier % 3 === 0;
        const archetypes = bosses
            ? [{ kind:'boss', sprite:'🐲', title:'覇王', hp:1.55, atk:1.15 }]
            : elite
                ? [{ kind:'guardian', sprite:'🗿', title:'鉄壁の', hp:1.42, atk:1.05 }]
                : [{ kind:'normal', sprite:'👿', title:'', hp:1, atk:1 }, { kind:'brute', sprite:'👹', title:'猛き', hp:1.22, atk:1.15 }, { kind:'trick', sprite:'🧙', title:'妖しき', hp:.9, atk:.92 }];
        const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
        const eMaxHp = Math.floor((55 + level * 15 + Math.pow(level, 1.25) * 2.5) * archetype.hp);
        const eAtk = Math.floor((7 + level * 1.35) * archetype.atk);
        State.battle.enemy = { name: `${archetype.title}${nameStr}`, sprite: archetype.sprite, kind: archetype.kind, maxHp: eMaxHp, hp: eMaxHp, block: 0, baseAtk: eAtk, intent: 'atk', intentValue: eAtk, level: tier, strength: 0, boss: bosses, elite };
        
        State.battle.drawPile = Game.shuffle([...State.deck]);
        State.battle.discardPile = [];
        State.battle.exhaustPile = [];
        State.battle.hand = [];
        State.battle.turnCount = 0;
        State.battle.selectedHandIndex = null;
        
        if (State.playerType === 'str') {
            State.battle.actionsNextTurn = 2; 
            UI.toast("【特性】先手必勝！");
        } else {
            State.battle.actionsNextTurn = 1;
        }
        
        State.battle.drawNextTurn = 0;
        State.battle.playerTempStr = 0;
        State.battle.playerTempInt = 0;
        State.battle.magBonus = 0;
        State.battle.retainBlock = false;
        State.battle.echo = false;
        State.battle.immortal = false;
        State.battle.enemyWeak = false;
        State.battle.combo = 0;
        State.battle.cardsPlayed = 0;
        State.battle.damageThisTurn = 0;
        State.battle.lastCardType = null;
        State.battle.spellChain = 0;
        State.battle.enemyVulnerable = 0;
        State.battle.enemyBurn = 0;
        State.battle.enemyFrozen = false;
        State.battle.thorns = 0;
        State.battle.playerFrail = false;
        State.battle.counterMagic = false;
        State.battle.reflectNext = false;
        State.battle.processing = false;
        Game.rollEnemyIntent();
        UI.setArena(archetype.kind);
        UI.toast(`${State.battle.enemy.name} (Lv.${tier}) があらわれた！`);
        Game.startBattleTurn();
    },

    startBattleTurn: () => {
        State.battle.actionsLeft = State.battle.actionsNextTurn; 
        State.battle.actionsNextTurn = 1;
        if (!State.battle.retainBlock) State.battle.block = 0;
        State.battle.retainBlock = false;
        State.battle.processing = false;
        State.battle.selectedHandIndex = null;
        State.battle.combo = 0;
        State.battle.cardsPlayed = 0;
        State.battle.damageThisTurn = 0;
        State.battle.lastCardType = null;
        State.battle.spellChain = 0;
        
        const drawCount = CONSTANTS.DRAW_COUNT + State.battle.drawNextTurn;
        State.battle.drawNextTurn = 0; 

        Game.drawCards(drawCount);
        UI.updateBattle();
        UI.updateHeader();
    },

    shuffle: (array) => array.sort(() => Math.random() - 0.5),

    drawCards: (num) => {
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
                State.battle.hand.push(State.battle.drawPile.pop());
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
            UI.updateBattle();
        }
    },

    deselectCard: () => {
        if (State.battle.selectedHandIndex !== null) {
            State.battle.selectedHandIndex = null;
            UI.updateBattle();
        }
    },

    getCardImpact: (card) => {
        if (card.rarity === 'rare' || card.val >= 4 || (card.hits || 1) >= 5 || ['hp_halve_press','maxhp_block'].includes(card.extra)) return 3;
        if (card.val >= 2.2 || (card.hits || 1) >= 3 || card.exhaust) return 2;
        return 1;
    },

    playCardSequence: async (handIndex) => {
        const card = State.battle.hand[handIndex];
        if (!card) return;
        if (State.battle.actionsLeft <= 0) {
            UI.toast("行動権がありません！");
            UI.animShake('#action-point-container');
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
            }, card.hits ? Math.min(480, card.hits * 75) : impactTier===3?280:160);
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

        let str = State.str + State.battle.playerTempStr;
        let int = State.int + State.battle.playerTempInt;
        const isDamageCard = card.type === 'phys' || card.type === 'mag';
        if (isDamageCard) {
            State.battle.combo++;
            State.battle.cardsPlayed++;
            if (card.type === 'mag') State.battle.spellChain = State.battle.lastCardType === 'mag' ? State.battle.spellChain + 1 : 0;
            else State.battle.spellChain = 0;
            State.battle.lastCardType = card.type;
        }

        if (card.type === 'phys') {
            const comboMultiplier = 1 + Math.min(5, Math.max(0, State.battle.combo - 1)) * 0.1;
            let dmg = Math.floor(str * card.val * comboMultiplier);
            if (card.extra === 'hp_scale') dmg += Math.floor(State.hp * 0.1);
            if (card.extra === 'hp_dmg') dmg = State.hp;
            if (card.extra === 'hp_dmg_half') dmg = Math.floor(State.hp * (card.scale || .5));
            if (card.extra === 'block_dmg') dmg = Math.floor(State.battle.block * (card.extraMult || 1));
            if (card.extra === 'maxhp_scale') dmg = Math.floor(State.maxHp * (card.scale || .25));
            if (card.extra === 'execute' && State.battle.enemy.hp <= State.battle.enemy.maxHp * 0.3) dmg *= 2;
            if (card.extra === 'intent_counter' && ['heavy','drain'].includes(State.battle.enemy.intent)) dmg *= 2;
            if (card.extra === 'hp_halve_press') {
                // プレス強化: 現在HPを半分にし、消費分の3倍ダメージ
                const cost = Math.max(1, Math.floor(State.hp * (card.scale || .5)));
                State.hp -= cost;
                dmg = Math.floor(cost * (card.extraMult || 3));
                UI.animShake('#game-container');
                UI.toast(`HP燃焼! ${cost}消費`);
            }
            if (card.self_dmg) {
                State.hp -= card.self_dmg;
                UI.animShake('#game-container');
                UI.combatNumber(card.self_dmg, 'hurt', 'player-battle-avatar');
                UI.toast(`反動 ${card.self_dmg} ダメージ`);
            }
            let totalDealt = 0;
            if (card.hits) {
                for(let k=0; k<card.hits; k++) totalDealt += Game.dealDamage(dmg, { kind:'phys', delay:k * 75, critical: (card.rarity === 'rare' && k === card.hits-1) || dmg >= State.battle.enemy.maxHp * .25 });
            } else {
                totalDealt = Game.dealDamage(dmg, { kind:'phys', critical: card.rarity === 'rare' || card.extra === 'execute' });
            }
            if (card.extra === 'drain') {
                const drainAmt = Math.min(State.maxHp - State.hp, Math.floor(totalDealt * 0.5));
                State.hp += drainAmt;
                UI.combatNumber(drainAmt, 'heal', 'player-battle-avatar');
                UI.toast(`HP ${drainAmt} 吸収`);
            }
            if (card.extra === 'intent_counter' && ['heavy','drain'].includes(State.battle.enemy.intent)) State.battle.block += Game.incomingDamage();
            if (card.consumeBlock) State.battle.block = 0;
        } else if (card.type === 'mag') {
            const storedBonus = State.battle.magBonus;
            let dmg = Math.floor(int * card.val) + storedBonus + State.battle.spellChain * 2;
            if (card.extra === 'bonus_scale') dmg += storedBonus * 2;
            State.battle.magBonus = 0;
            Game.dealDamage(dmg, { kind:'mag', critical: card.rarity === 'rare' || dmg >= State.battle.enemy.maxHp * .25 });
            if (State.battle.echo) { Game.dealDamage(dmg, { kind:'mag', delay:120, critical:true }); State.battle.echo = false; UI.toast(`残響！ ${dmg}追加ダメージ`); }
            if (card.self_dmg) { State.hp -= card.self_dmg; UI.combatNumber(card.self_dmg, 'hurt', 'player-battle-avatar'); UI.animShake('#game-container'); UI.toast(`反動 ${card.self_dmg} ダメージ`); }
        } else if (card.type === 'heal') {
            let heal = card.val;
            if (card.extra === 'low_hp_double' && State.hp <= State.maxHp / 2) heal *= 2;
            const actualHeal = Math.min(State.maxHp - State.hp, heal);
            State.hp += actualHeal;
            UI.combatNumber(actualHeal, 'heal', 'player-battle-avatar'); Sound.play('heal'); UI.burst('player-battle-avatar','#4ade80');
            UI.toast(`HP ${actualHeal} 回復`);
        } else if (card.type === 'def') {
            let blk = card.val;
            if (card.id === 'barrier' || card.id === 'arcane_shield') blk = Math.floor(int * card.val);
            if (card.extra === 'missing_hp_block') blk += Math.floor((State.maxHp - State.hp) * .2);
            if (card.extra === 'maxhp_block') blk = Math.min(card.upgraded ? 75 : 60, Math.floor(State.maxHp * (card.scale || .5)));
            if (card.extra === 'intent_block') blk = Game.incomingDamage();
            if (card.extra === 'revenge_guard') blk = Game.incomingDamage() + Math.floor((State.maxHp - State.hp) * .2);
            if (State.battle.playerFrail) blk = Math.max(1, Math.floor(blk * .75));
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
                State.hp = Math.min(State.maxHp, State.hp + card.val);
                UI.toast(`最大HP増強！`);
            } else if (card.effect === 'next_draw') {
                State.battle.drawNextTurn += card.val;
                UI.toast(`次ターン追加ドロー`);
            } else if (card.effect === 'reduce_cost') {
                State.battle.magBonus = Math.max(State.battle.magBonus, card.upgraded ? 8 : 5);
                UI.toast(`魔法威力UP状態`);
            } else if (card.effect === 'recycle') {
                State.battle.drawPile.push(...Game.shuffle(State.battle.discardPile.splice(0)));
            } else if (card.effect === 'retain_block') {
                State.battle.retainBlock = true;
            } else if (card.effect === 'berserk') {
                const gain = card.val + Math.floor((State.maxHp - State.hp) / 10);
                State.battle.playerTempStr += gain; UI.toast(`攻撃力 +${gain}`);
            } else if (card.effect === 'echo') {
                State.battle.echo = true;
            } else if (card.effect === 'immortal') {
                State.battle.immortal = true;
            } else if (card.effect === 'limit_break') {
                State.battle.playerTempStr += card.val;
                State.hp = Math.max(1, State.hp - 8);
                UI.combatNumber(8, 'hurt', 'player-battle-avatar');
                UI.toast(`限界突破！ 攻撃+${card.val}`);
            } else if (card.effect === 'world_tree') {
                const growth = Math.max(0, card.val - (card.growthApplied || 0));
                State.maxHp += growth; card.growthApplied = card.val;
                State.hp = Math.min(State.maxHp, State.hp + card.val);
                State.battle.thorns += 5;
                UI.combatNumber(card.val, 'heal', 'player-battle-avatar');
                UI.toast('世界樹の加護！');
            }
        }

        if (card.effect === 'weak') State.battle.enemyWeak = true;
        if (card.effect === 'retain_block') State.battle.retainBlock = true;
        if (card.vulnerable) State.battle.enemyVulnerable += card.vulnerable;
        if (card.burn) State.battle.enemyBurn += card.burn;
        if (card.freeze) State.battle.enemyFrozen = true;
        if (card.thorns) State.battle.thorns += card.thorns;

        if (card.draw) Game.drawCards(card.draw);
        if (card.add_action) State.battle.actionsLeft++;

        let recycle = false;
        if (!card.exhaust && State.playerType === 'int' && (card.type === 'mag' || card.attr === 'int')) {
            if (Math.random() < 0.2) {
                recycle = true;
                UI.toast("【特性】魔力循環！");
            }
        }

        if (recycle) {
            if (State.battle.hand.length < CONSTANTS.HAND_LIMIT) State.battle.hand.push(card);
            else State.battle.discardPile.push(card);
        } else if (card.exhaust) {
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
        let vulnerable = false;
        if (State.battle.enemyVulnerable > 0) {
            finalAmount = Math.floor(finalAmount * 1.5);
            State.battle.enemyVulnerable--;
            vulnerable = true;
        }
        const absorbed = Math.min(enemy.block || 0, finalAmount);
        enemy.block = Math.max(0, (enemy.block || 0) - absorbed);
        finalAmount -= absorbed;
        if (absorbed > 0) UI.combatNumber(absorbed, 'block', 'enemy-sprite', meta.delay || 0);
        const dealt = Math.min(enemy.hp, finalAmount);
        enemy.hp = Math.max(0, enemy.hp - finalAmount);
        State.battle.damageThisTurn += dealt;
        UI.hitEnemy(dealt, meta.kind || 'phys', Boolean(meta.critical || vulnerable), meta.delay || 0);
        return dealt;
    },

    incomingDamage: () => {
        const enemy = State.battle.enemy;
        if (!enemy || !['atk','heavy','drain'].includes(enemy.intent) || State.battle.enemyFrozen) return 0;
        return State.battle.enemyWeak ? Math.floor(enemy.intentValue * .75) : enemy.intentValue;
    },

    previewCard: (card) => {
        const str = State.str + State.battle.playerTempStr;
        const int = State.int + State.battle.playerTempInt;
        if (card.type === 'phys') {
            const comboMultiplier = 1 + Math.min(5, State.battle.combo) * .1;
            let amount = Math.floor(str * card.val * comboMultiplier);
            if (card.extra === 'hp_scale') amount += Math.floor(State.hp * .1);
            if (card.extra === 'hp_dmg_half') amount = Math.floor(State.hp * (card.scale || .5));
            if (card.extra === 'block_dmg') amount = Math.floor(State.battle.block * (card.extraMult || 1));
            if (card.extra === 'maxhp_scale') amount = Math.floor(State.maxHp * (card.scale || .25));
            if (card.extra === 'hp_halve_press') amount = Math.floor(Math.floor(State.hp * (card.scale || .5)) * (card.extraMult || 3));
            if (card.extra === 'execute' && State.battle.enemy.hp <= State.battle.enemy.maxHp * .3) amount *= 2;
            if (card.extra === 'intent_counter' && ['heavy','drain'].includes(State.battle.enemy.intent)) amount *= 2;
            const hits = card.hits || 1;
            const vulnerableBonus = State.battle.enemyVulnerable > 0 ? Math.floor(amount * .5) : 0;
            const total = Math.max(0, amount * hits + vulnerableBonus - (State.battle.enemy.block || 0));
            return `${card.hits ? `${amount}×${card.hits} → ` : ''}予測 ${total} DMG`;
        }
        if (card.type === 'mag') {
            let amount = Math.floor(int * card.val) + State.battle.magBonus + (State.battle.lastCardType === 'mag' ? (State.battle.spellChain + 1) * 2 : 0);
            if (card.extra === 'bonus_scale') amount += State.battle.magBonus * 2;
            const firstHit = State.battle.enemyVulnerable > 0 ? Math.floor(amount * 1.5) : amount;
            const enemyBlock = State.battle.enemy.block || 0;
            const firstTotal = Math.max(0, firstHit - enemyBlock);
            const remainingBlock = Math.max(0, enemyBlock - firstHit);
            let total = firstTotal + (State.battle.echo ? Math.max(0, amount - remainingBlock) : 0);
            return `予測 ${total} DMG${State.battle.echo?'（残響）':''}`;
        }
        if (card.type === 'def') {
            let block = card.val;
            if (card.id === 'barrier') block = Math.floor(int * card.val);
            if (card.id === 'arcane_shield') block = Math.floor(int * card.val);
            if (card.extra === 'missing_hp_block') block += Math.floor((State.maxHp-State.hp)*.2);
            if (card.extra === 'maxhp_block') block = Math.min(card.upgraded?75:60,Math.floor(State.maxHp*(card.scale||.5)));
            if (card.extra === 'intent_block') block = Game.incomingDamage();
            if (card.extra === 'revenge_guard') block = Game.incomingDamage() + Math.floor((State.maxHp-State.hp)*.2);
            if (State.battle.playerFrail) block = Math.max(1,Math.floor(block*.75));
            return `ブロック +${block}`;
        }
        if (card.type === 'heal') { const heal = card.extra==='low_hp_double' && State.hp<=State.maxHp/2 ? card.val*2 : card.val; return `HP +${Math.min(State.maxHp-State.hp, heal)}`; }
        return '効果を発動・続けてタップ';
    },

    describeCard: (card) => {
        const pct = value => Math.round(value * 100);
        const suffix = [];
        if (card.draw) suffix.push(`${card.draw}枚引く`);
        if (card.add_action) suffix.push('続けて行動');
        if (card.exhaust) suffix.push('1回のみ');
        if (card.limit) suffix.push(`デッキ${card.limit}枚まで`);
        let main = '';
        if (card.type === 'phys') {
            if (card.extra === 'hp_scale') main = `攻撃${pct(card.val)}%＋現在HP10%ダメージ`;
            else if (card.extra === 'hp_dmg_half') main = `現在HPの${pct(card.scale || .5)}%ダメージ`;
            else if (card.extra === 'block_dmg') main = `全ブロックを消費し、その${card.extraMult || 1}倍のダメージ`;
            else if (card.extra === 'maxhp_scale') main = `最大HPの${pct(card.scale || .25)}%ダメージ`;
            else if (card.extra === 'hp_halve_press') main = `現在HPを${pct(card.scale || .5)}%消費し、その${card.extraMult || 3}倍のダメージ`;
            else main = `攻撃${pct(card.val)}%${card.hits ? `の${card.hits}連撃` : 'ダメージ'}`;
            if (card.extra === 'execute') main += '。敵HP30%以下なら威力2倍';
            if (card.extra === 'intent_counter') main += '。敵が強攻撃・吸収なら威力2倍＋予告値ブロック';
            if (card.extra === 'drain') main += '。与ダメージの50%回復';
            if (card.self_dmg) main += `。自分も${card.self_dmg}ダメージ`;
        } else if (card.type === 'mag') {
            main = `魔力${pct(card.val)}%ダメージ`;
            if (card.extra === 'bonus_scale') main += '＋蓄積魔法ボーナスの3倍';
            if (card.self_dmg) main += `。自分も${card.self_dmg}ダメージ`;
        } else if (card.type === 'def') {
            if (card.id === 'barrier' || card.id === 'arcane_shield') main = `魔力${pct(card.val)}%分のブロック`;
            else if (card.extra === 'missing_hp_block') main = `ブロック${card.val}＋失ったHPの20%`;
            else if (card.extra === 'maxhp_block') main = `最大HPの${pct(card.scale || .5)}%（最大${card.upgraded?75:60}）ブロック`;
            else if (card.extra === 'intent_block') main = `予告ダメージ分をブロック。防いだ値を次の魔法ボーナスへ変換（最大${card.upgraded?45:30}）`;
            else if (card.extra === 'revenge_guard') main = `予告値＋失ったHP20%をブロック。防いだ値を${card.upgraded?'1.5倍で':''}反射`;
            else main = `ブロック${card.val}`;
        } else if (card.type === 'heal') {
            main = `HP${card.val}回復`;
            if (card.extra === 'low_hp_double') main += `。HP半分以下なら${card.val*2}回復`;
        } else {
            const effects = {
                str_up:`この戦闘中、攻撃+${card.val}`,
                int_up:`この戦闘中、魔力+${card.val}`,
                both_up:`この戦闘中、攻撃・魔力+${card.val}`,
                action_up:`次ターンの行動回数+${card.val}`,
                maxhp_up:`初回のみ最大HP+${card.val}、HP${card.val}回復`,
                next_draw:`次ターン${card.val}枚追加ドロー`,
                reduce_cost:`次の魔法ダメージ+${card.upgraded?8:5}`,
                recycle:'捨て札を山札へ戻す',
                berserk:`攻撃+${card.val}、失ったHP10ごとにさらに+1`,
                echo:'次に与える魔法ダメージをもう一度与える',
                immortal:'この戦闘で一度だけHP1で耐える',
                limit_break:`攻撃+${card.val}、HPを8失う（HP1未満にならない）`,
                world_tree:`初回のみ最大HP+${card.val}。HP${card.val}回復、反撃5`
            };
            main = effects[card.effect] || '特殊効果を発動';
        }
        if (card.effect === 'weak') main += '。敵の次の攻撃を25%弱化';
        if (card.effect === 'retain_block') main += '。次ターンまでブロック保持';
        if (card.vulnerable) main += `。脆弱${card.vulnerable}を付与`;
        if (card.burn) main += `。炎上${card.burn}を付与`;
        if (card.freeze) main += '。敵の次の行動を封じる';
        if (card.thorns) main += `。反撃${card.thorns}を得る`;
        return `${main}。${suffix.length ? ` [${suffix.join('/')}]` : ''}`.trim();
    },

    upgradePreview: (card) => {
        const changes = [];
        if (card.val) {
            let nextVal = parseFloat((card.val*1.5).toFixed(2));
            if (['str_up','int_up','both_up','action_up','maxhp_up','next_draw','berserk','limit_break','world_tree'].includes(card.effect) || (card.type === 'def' && !['barrier','arcane_shield'].includes(card.id)) || card.type === 'heal') nextVal = Math.ceil(nextVal);
            changes.push(`基礎値 ${card.val}→${nextVal}`);
        }
        if (card.draw) changes.push(`ドロー ${card.draw}→${card.draw+1}`);
        if (card.self_dmg) changes.push(`反動 ${card.self_dmg}→${Math.max(0,card.self_dmg-2)}`);
        if (card.burn) changes.push(`炎上 ${card.burn}→${Math.ceil(card.burn*1.5)}`);
        if (card.thorns) changes.push(`反撃 ${card.thorns}→${Math.ceil(card.thorns*1.5)}`);
        if (card.extra === 'hp_dmg_half') changes.push('HP倍率 35%→50%');
        if (card.extra === 'maxhp_scale') changes.push('最大HP倍率 25%→35%');
        if (card.extra === 'block_dmg') changes.push('ブロック倍率 1.5→2倍');
        if (card.extra === 'hp_halve_press') changes.push('消費30%→25% / 威力2.5→3.25倍');
        if (card.extra === 'maxhp_block') changes.push('50%/上限60→65%/上限75');
        if (card.effect === 'reduce_cost') changes.push('魔法ボーナス 5→8');
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
        if (e.kind === 'trick' && turn % 3 === 1) { e.intent = 'drain'; e.intentValue = Math.max(1, Math.floor(e.baseAtk * .7)); }
        else if (e.kind === 'trick' && turn % 3 === 2) { e.intent = 'hex'; e.intentValue = 0; }
        else if (e.kind === 'brute' && turn % 3 === 2) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk + e.strength) * 1.65); }
        else if (e.kind === 'guardian' && turn % 3 === 0) { e.intent = 'guard'; e.intentValue = Math.floor(e.maxHp * .16); }
        else if (e.kind === 'guardian' && turn % 3 === 2) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk + e.strength) * 1.4); }
        else if (e.kind === 'normal' && turn > 0 && turn % 4 === 3) { e.intent = 'guard'; e.intentValue = Math.floor(e.maxHp * .12); }
        else if (e.kind === 'boss' && turn % 4 === 1) { e.intent = 'buff'; e.intentValue = 2 + Math.floor(e.level / 10); }
        else if (e.kind === 'boss' && turn % 4 === 2) { e.intent = 'guard'; e.intentValue = Math.floor(e.maxHp * .14); }
        else if (e.kind === 'boss' && turn % 4 === 3) { e.intent = 'heavy'; e.intentValue = Math.floor((e.baseAtk + e.strength) * 1.8); }
        else { e.intent = 'atk'; e.intentValue = e.baseAtk + e.strength; }
    },

    advanceEnemyTurn: () => {
        State.battle.turnCount++;
        if (State.battle.turnCount > 0 && State.battle.turnCount % 4 === 0) {
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
            let regen = Math.min(8, Math.max(3, Math.floor(State.maxHp * 0.05)));
            if(State.hp < State.maxHp) {
                State.hp = Math.min(State.maxHp, State.hp + regen);
                UI.toast(`【特性】自然治癒 +${regen}`);
            }
        }

        while(State.battle.hand.length > 0) {
            State.battle.discardPile.push(State.battle.hand.pop());
        }
        
        UI.updateBattle();
        const banner = document.getElementById('turn-banner');
        banner.classList.remove('scale-0');
        
        setTimeout(() => {
            Game.enemyAction();
            banner.classList.add('scale-0');
        }, 1000);
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
        await UI.enemyAttack(enemy.intent === 'heavy');
        let dmg = enemy.intentValue;
        if (State.battle.enemyWeak) { dmg = Math.floor(dmg * .75); State.battle.enemyWeak = false; }
        let blocked = Math.min(State.battle.block, dmg);
        
        // ブロック消費
        State.battle.block -= blocked;
        let actualDmg = dmg - blocked;
        
        if (actualDmg > 0) {
            State.hp -= actualDmg;
            UI.hitPlayer(actualDmg, enemy.intent === 'heavy');
            UI.toast(`${actualDmg} のダメージを受けた！`);
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
        State.battle.enemiesDefeated++;
        const gainedBP = 12 + Math.min(18, State.battle.enemy.level * 2);
        State.bp += gainedBP;
        const impactDelay = State.battle.pendingFx || 0;
        setTimeout(() => { UI.victory(); UI.toast(`${State.battle.enemy.name} を倒した！ BP+${gainedBP}`); }, impactDelay + 60);
        setTimeout(() => {
            UI.showDraft(State.playerType, 'battle_reward');
        }, impactDelay + (State.battle.enemy.boss ? 1150 : 760));
    },

    checkBattleProgress: () => {
        if (State.battle.enemiesDefeated > 0 && State.battle.enemiesDefeated % 5 === 0) {
            Game.visitShop();
        } else if (State.battle.enemiesDefeated > 0 && State.battle.enemiesDefeated % 3 === 0) {
            Game.showJourneyEvent();
        } else {
            State.hp = Math.min(State.maxHp, State.hp + 5);
            Game.spawnEnemy();
        }
    },

    showJourneyEvent: () => {
        State.journeyChoices = Game.shuffle([...JOURNEY_EVENTS]).slice(0,3);
        UI.changeScene('scene-event',() => UI.renderJourneyEvents());
    },
    chooseJourneyEvent: (id) => {
        const event = JOURNEY_EVENTS.find(item => item.id === id); if (!event) return;
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
        State.hp = Math.min(State.maxHp,State.hp+5);
        Sound.play('rare'); UI.toast(`${event.title}の効果を得た！`);
        setTimeout(() => UI.changeScene('scene-battle',() => Game.spawnEnemy()),500);
    },

    // --- SHOP LOGIC ---
    visitShop: () => {
        State.shopTab = 'upgrade';
        const available = CARDS_DB.filter(c => c.rarity !== 'rare' && (!c.limit || Game.countCard(c.id) < c.limit));
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
            card.upgraded = true;
            if (card.val) card.val = parseFloat((card.val * 1.5).toFixed(2));
            if (card.val && (['str_up','int_up','both_up','action_up','maxhp_up','next_draw','berserk','limit_break','world_tree'].includes(card.effect) || (card.type === 'def' && !['barrier','arcane_shield'].includes(card.id)) || card.type === 'heal')) card.val = Math.ceil(card.val);
            if (card.draw) card.draw += 1;
            if (card.self_dmg) card.self_dmg = Math.max(0, card.self_dmg - 2);
            if (card.burn) card.burn = Math.ceil(card.burn * 1.5);
            if (card.thorns) card.thorns = Math.ceil(card.thorns * 1.5);
            card.name += "+";
            let newDesc = '';
            if (card.extra === 'hp_dmg_half') { card.scale = .5; newDesc = '現在HPの50%分のダメージを与える。'; }
            if (card.extra === 'maxhp_scale') { card.scale = .35; newDesc = '最大HPの35%ダメージ。'; }
            if (card.extra === 'block_dmg') { card.extraMult = 2; newDesc = '全ブロックを消費し、その2倍のダメージ。[1回のみ]'; }
            if (card.extra === 'hp_halve_press') { card.scale = .25; card.extraMult = 3.25; newDesc = '現在HPを25%消費し、その3.25倍のダメージ。[1回のみ]'; }
            if (card.extra === 'maxhp_block') { card.scale = .65; newDesc = '最大HPの65%（最大75）ブロックと反撃8。[1回のみ]'; }
            if ((card.effect === 'echo' || card.effect === 'immortal' || ['causal_reverse','revenge_fortress'].includes(card.id)) && !card.draw) { card.draw = 1; }
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
        State.battle.active = false;
        State.battle.processing = true;
        const defeated = State.battle.enemiesDefeated;
        State.runShardsEarned = 3 + Math.floor(defeated * .7) + Math.floor(defeated / 5) * 3;
        State.meta.shards += State.runShardsEarned; Meta.save(State.meta);
        document.getElementById('result-score').innerText = State.battle.enemiesDefeated;
        UI.changeScene('scene-result',() => UI.updateMetaResult());
    }
};

// --- UI制御 (UI) ---
const UI = {
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
        document.getElementById('meta-start-summary').innerHTML = levels > 0 ? `<i class="fas fa-star text-yellow-300"></i> 継承LV ${levels} ・ ${State.meta.shards} ✦` : `<i class="fas fa-seedling text-green-200"></i> 継承強化なし ・ ${State.meta.shards} ✦`;
    },
    setArena: (kind) => {
        const scene = document.getElementById('scene-battle');
        const colors = { normal:'#8b5cf6', brute:'#ef4444', trick:'#6366f1', guardian:'#0ea5e9', boss:'#f59e0b' };
        scene.style.setProperty('--arena-accent', colors[kind] || colors.normal);
        const sprite = document.getElementById('enemy-sprite');
        sprite.getAnimations().forEach(animation => animation.cancel());
        sprite.classList.remove('victory-burst','enemy-hit','enemy-hit-heavy','player-hurt');
        sprite.style.opacity = '1'; sprite.style.transform = 'none'; sprite.style.visibility = 'visible';
        sprite.classList.toggle('boss-sprite', kind === 'boss');
        requestAnimationFrame(() => sprite.animate([
            { opacity:0, transform:'translateY(-35px) scale(.35)' },
            { opacity:1, transform:'translateY(5px) scale(1.15)', offset:.72 },
            { opacity:1, transform:'translateY(0) scale(1)' }
        ], { duration:kind === 'boss' ? 680 : 420, easing:'cubic-bezier(.16,1,.3,1)' }));
    },
    flash: (kind = 'phys') => {
        const el = document.getElementById('battle-flash'); if (!el) return;
        el.className = 'battle-flash'; void el.offsetWidth; el.classList.add(`flash-${kind}`);
    },
    combatNumber: (amount, kind = 'damage', targetId = 'enemy-sprite', delay = 0, critical = false) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const layer = document.getElementById('battle-fx-layer');
        const target = document.getElementById(targetId); const scene = document.getElementById('scene-battle');
        if (!layer || !target || !scene) return;
        const rect = target.getBoundingClientRect(); const base = scene.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = `damage-number ${kind}${critical ? ' critical' : ''}`;
        el.textContent = kind === 'heal' ? `+${Math.floor(amount)}` : kind === 'block' ? `🛡 ${Math.floor(amount)}` : Math.floor(amount);
        el.style.left = `${rect.left - base.left + rect.width / 2 + (Math.random() * 24 - 12)}px`;
        el.style.top = `${rect.top - base.top + rect.height * .42}px`;
        el.style.animationDelay = `${delay}ms`;
        layer.appendChild(el); setTimeout(() => el.remove(), delay + 850);
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
    hitEnemy: (amount, kind = 'phys', critical = false, delay = 0) => {
        if (amount <= 0) return;
        setTimeout(() => {
            const sprite = document.getElementById('enemy-sprite'); const scene = document.getElementById('scene-battle');
            const fx = document.createElement('div'); const rect = sprite.getBoundingClientRect(); const base = scene.getBoundingClientRect();
            fx.className = kind === 'mag' ? 'magic-fx' : 'slash-fx'; fx.style.left = `${rect.left-base.left+rect.width/2}px`; fx.style.top = `${rect.top-base.top+rect.height/2}px`;
            document.getElementById('battle-fx-layer').appendChild(fx); setTimeout(()=>fx.remove(),600);
            sprite.classList.remove('enemy-hit','enemy-hit-heavy'); void sprite.offsetWidth; sprite.classList.add(critical?'enemy-hit-heavy':'enemy-hit');
            const player = document.getElementById('player-battle-avatar'); player.classList.remove('player-attack'); void player.offsetWidth; player.classList.add('player-attack');
            UI.combatNumber(amount, 'damage', 'enemy-sprite', 0, critical); UI.burst('enemy-sprite',kind==='mag'?'#a78bfa':'#fb7185',critical?12:7);
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
            if(id === 'scene-start') el.classList.add('slide-in');
            setTimeout(() => {
                overlay.style.opacity = '0';
                if (onShown) setTimeout(onShown, 120);
            }, 50);
        }, 500);
    },
    updateHeader: () => {
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
    showCutin: ({ icon, title, statText, costText, onComplete }) => {
        const el = document.getElementById('scene-cutin');
        const band = document.getElementById('cutin-band');
        const content = document.getElementById('cutin-content');
        document.getElementById('cutin-icon').innerText = icon;
        document.getElementById('cutin-title').innerText = title;
        document.getElementById('cutin-stat').innerText = statText;
        document.getElementById('cutin-cost').innerText = costText;
        document.getElementById('cutin-cost').className = costText ? "text-lg md:text-2xl font-bold text-red-600 bg-white/80 px-3 py-1 rounded-lg whitespace-nowrap shadow-sm" : "hidden";
        el.classList.remove('hidden');
        band.classList.remove('anim-band'); content.classList.remove('anim-text');
        void band.offsetWidth; 
        band.classList.add('anim-band'); content.classList.add('anim-text');
        setTimeout(() => { el.classList.add('hidden'); if (onComplete) onComplete(); }, 1150);
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
        const getCommons = () => CARDS_DB.filter(c => { if (c.rarity === 'rare') return false; if (!isUnderLimit(c)) return false; return c.attr === 'common' || c.attr === type; });
        if (mode === 'battle_reward') {
            skipBtn.classList.remove('hidden'); title.innerText = State.battle.enemy.boss ? "ボス撃破報酬！" : State.battle.enemy.elite ? "エリート報酬！" : "バトル報酬！";
            let commons = getCommons();
            let rares = CARDS_DB.filter(c => c.rarity === 'rare' && c.pool === type && isUnderLimit(c));
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
            button.innerHTML = `<div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl md:text-3xl mb-3 border border-white/30"><i class="fas ${event.icon}"></i></div><div class="font-black text-lg md:text-2xl mb-1">${event.title}</div><div class="text-xs md:text-sm text-white/80 leading-relaxed">${event.desc}</div><div class="mt-4 text-xs font-black bg-black/20 inline-flex px-3 py-1 rounded-full">これを選ぶ <i class="fas fa-chevron-right ml-2 mt-0.5"></i></div>`;
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
            document.getElementById('enemy-level').innerText = `LV.${e.level}${e.boss ? ' BOSS' : e.elite ? ' ELITE' : ''}`;
            const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
            document.getElementById('enemy-hp-bar').style.width = `${hpPct}%`;
            document.getElementById('enemy-hp-text').innerText = `${e.hp}/${e.maxHp}`;
            const intents = {
                atk: ['fa-sword', 'text-red-600 bg-red-100', `攻撃 ${e.intentValue}`],
                heavy: ['fa-skull-crossbones', 'text-red-700 bg-orange-100', `強攻撃 ${e.intentValue}`],
                drain: ['fa-tint', 'text-purple-700 bg-purple-100', `吸収 ${e.intentValue}`],
                buff: ['fa-arrow-up', 'text-yellow-700 bg-yellow-100', `攻撃強化 +${e.intentValue}`],
                guard: ['fa-shield-alt', 'text-blue-700 bg-blue-100', `防御 +${e.intentValue}`],
                hex: ['fa-skull', 'text-purple-700 bg-purple-100', '呪い：防御弱化']
            };
            const info = intents[e.intent] || intents.atk;
            document.getElementById('enemy-intent').className = `flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base font-bold ${info[1]} py-0.5 px-3 md:py-1 md:px-4 rounded-full inline-block shadow-sm whitespace-nowrap`;
            document.getElementById('enemy-intent').innerHTML = `<i class="fas ${info[0]}"></i> <span>${info[2]}</span>`;
            const enemyStatuses = [];
            if (e.block > 0) enemyStatuses.push(`<span class="status-chip bg-blue-500 text-white"><i class="fas fa-shield-alt"></i>${e.block}</span>`);
            if (State.battle.enemyVulnerable > 0) enemyStatuses.push(`<span class="status-chip bg-orange-500 text-white"><i class="fas fa-crosshairs"></i>脆弱 ${State.battle.enemyVulnerable}</span>`);
            if (State.battle.enemyBurn > 0) enemyStatuses.push(`<span class="status-chip bg-red-500 text-white"><i class="fas fa-fire"></i>炎上 ${State.battle.enemyBurn}</span>`);
            if (State.battle.enemyWeak) enemyStatuses.push(`<span class="status-chip bg-slate-500 text-white"><i class="fas fa-arrow-down"></i>弱体</span>`);
            if (State.battle.enemyFrozen) enemyStatuses.push(`<span class="status-chip bg-cyan-500 text-white"><i class="fas fa-snowflake"></i>凍結</span>`);
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
        if (State.battle.playerTempStr > 0) playerStatuses.push(`<span class="status-chip bg-red-500 text-white">攻+${State.battle.playerTempStr}</span>`);
        if (State.battle.playerTempInt > 0) playerStatuses.push(`<span class="status-chip bg-indigo-500 text-white">魔+${State.battle.playerTempInt}</span>`);
        if (State.battle.thorns > 0) playerStatuses.push(`<span class="status-chip bg-orange-500 text-white">反撃${State.battle.thorns}</span>`);
        if (State.battle.immortal) playerStatuses.push(`<span class="status-chip bg-yellow-400 text-slate-900">不死身</span>`);
        if (State.battle.echo) playerStatuses.push(`<span class="status-chip bg-purple-500 text-white">残響</span>`);
        if (State.battle.counterMagic) playerStatuses.push(`<span class="status-chip bg-indigo-600 text-white">因果反転</span>`);
        if (State.battle.reflectNext) playerStatuses.push(`<span class="status-chip bg-rose-600 text-white">報復</span>`);
        if (State.battle.playerFrail) playerStatuses.push(`<span class="status-chip bg-slate-500 text-white">防御弱化</span>`);
        document.getElementById('player-statuses').innerHTML = playerStatuses.join('');
        const comboPanel = document.getElementById('combo-panel');
        document.getElementById('combo-count').innerText = State.battle.combo;
        comboPanel.classList.toggle('active', State.battle.combo >= 2);
        if (State.battle.combo >= 2) { comboPanel.classList.remove('combo-bump'); void comboPanel.offsetWidth; comboPanel.classList.add('combo-bump'); }
        const incoming = Math.max(0, Game.incomingDamage() - State.battle.block);
        const endButton = document.getElementById('end-turn-button');
        if (endButton) { endButton.innerHTML = incoming > 0 ? `ターン終了 <span class="text-red-300">HP -${incoming}</span> <i class="fas fa-forward ml-1"></i>` : `ターン終了 <span class="text-green-300">安全</span> <i class="fas fa-forward ml-1"></i>`; endButton.disabled = State.battle.processing; }
        document.getElementById('battle-deck-count').innerText = State.battle.drawPile.length;
        document.getElementById('battle-discard-count').innerText = State.battle.discardPile.length;
        document.getElementById('battle-exhaust-count').innerText = State.battle.exhaustPile.length;
        const handCont = document.getElementById('hand-container');
        handCont.innerHTML = '';
        State.battle.hand.forEach((card, idx) => {
            const el = document.createElement('div');
            const canPlay = State.battle.actionsLeft > 0 && !State.battle.processing;
            const opacity = canPlay ? 'opacity-100' : 'opacity-50 grayscale';
            let typeColor = card.type === 'phys' ? 'bg-red-50 border-red-200' : (card.type === 'mag' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200');
            if(card.type === 'skill') typeColor = 'bg-purple-50 border-purple-200';
            if(card.rarity === 'rare') typeColor = 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200';
            let selectedClass = "";
            if (State.battle.selectedHandIndex === idx) { selectedClass = "card-selected"; }
            el.className = `card-face ${card.rarity==='rare'?'rare-card':''} w-24 h-32 md:w-36 md:h-52 bg-white rounded-xl border-b-4 ${typeColor} shadow-xl flex flex-col p-1.5 md:p-2 relative cursor-pointer transition-all duration-200 shrink-0 ${opacity} ${selectedClass}`;
            el.setAttribute('role','button'); el.tabIndex = canPlay ? 0 : -1; el.setAttribute('aria-pressed', State.battle.selectedHandIndex === idx ? 'true' : 'false'); el.setAttribute('aria-label', `${card.name}。${card.desc}`);
            if(canPlay) el.onclick = (e) => Game.handleCardClick(e, idx);
            if(canPlay) el.onkeydown = (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Game.handleCardClick(e, idx); } };
            let badges = '';
            if(card.rarity === 'rare') badges += `<div class="bg-yellow-400 text-slate-900 px-1 md:px-1.5 rounded text-[8px] md:text-[10px] font-bold shadow-sm border border-white whitespace-nowrap">RARE</div>`;
            if(card.add_action) badges += `<div class="bg-orange-400 text-white px-1 md:px-1.5 rounded text-[8px] md:text-[10px] font-bold shadow-sm border border-white whitespace-nowrap">連撃</div>`;
            if(card.exhaust) badges += `<div class="bg-purple-600 text-white px-1 md:px-1.5 rounded text-[8px] md:text-[10px] font-bold shadow-sm border border-white whitespace-nowrap">1回</div>`;
            const preview = State.battle.selectedHandIndex === idx ? `<div class="relative z-10 bg-slate-900 text-yellow-300 text-[8px] md:text-[10px] font-black rounded px-1 py-0.5 text-center">${Game.previewCard(card)}</div>` : '';
            el.innerHTML = `<div class="absolute -top-2 md:-top-3 left-0 right-0 flex justify-center gap-0.5 md:gap-1 z-10 flex-wrap px-1">${badges}</div><div class="flex-1 flex flex-col items-center justify-center mt-1 md:mt-2 overflow-hidden relative z-[1]"><div class="text-2xl md:text-4xl mb-1 md:mb-2 drop-shadow-sm ${card.rarity==='rare' ? 'text-yellow-600' : (card.type==='phys'?'text-red-400':(card.type==='mag'?'text-blue-400':'text-green-400'))}"><i class="fas ${card.icon}"></i></div><div class="font-bold text-center text-[10px] md:text-sm leading-tight mb-1 md:mb-2 w-full truncate ${card.rarity==='rare'?'text-yellow-800':'text-slate-800'}">${card.name}</div><p class="text-[8px] md:text-xs text-center text-slate-500 leading-tight px-0.5 line-clamp-3">${card.desc}</p></div>${preview}`;
            handCont.appendChild(el);
        });
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
};

window.addEventListener('resize', UI.updateViewportMode, { passive:true });
window.addEventListener('orientationchange', () => setTimeout(UI.updateViewportMode, 120), { passive:true });
window.visualViewport?.addEventListener('resize', UI.updateViewportMode, { passive:true });

// 初期タイプ選択状態
Game.selectType('hp');

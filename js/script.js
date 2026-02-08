import { CONSTANTS, ACTION_DATA, CARDS_DB, HIRAGANA } from './data.js';

// --- 状態管理 (State) ---
const State = {
    phase: 'start', name: '', playerType: 'hp', turn: 1, maxTurns: 10, bp: 0,
    selectedAction: null, hp: 50, maxHp: 50, str: 5, int: 5, deck: [],
    shopTab: 'upgrade', isTransitioning: false,
    battle: {
        active: false, enemiesDefeated: 0, enemy: null, hand: [], drawPile: [], discardPile: [], exhaustPile: [],
        actionsLeft: 1, actionsNextTurn: 1, drawNextTurn: 0, block: 0, turnCount: 0,
        playerTempStr: 0, playerTempInt: 0, magBonus: 0, processing: false, selectedHandIndex: null
    }
};

// --- ゲームロジック (Game) ---
const Game = {
    selectType: (type) => {
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
        State.hp = 50; State.maxHp = 50; State.str = 5; State.int = 5; State.turn = 1; State.bp = 0;
        State.deck = [];
        State.selectedAction = null;
        State.isTransitioning = false;

        Game.addCard('punch');
        Game.addCard('punch');
        Game.addCard('defend');
        
        let trait = "";
        if (State.playerType === 'hp') { 
            State.maxHp = 60; State.hp = 60; 
            Game.addCard('bandage'); Game.addCard('tackle'); 
            trait = "特性: 自然治癒";
        } else if (State.playerType === 'str') { 
            State.str = 8; 
            Game.addCard('kick'); Game.addCard('rage'); 
            trait = "特性: 先手必勝";
        } else if (State.playerType === 'int') { 
            State.int = 8; 
            Game.addCard('spark'); Game.addCard('barrier'); 
            trait = "特性: 魔力循環";
        }
        
        document.getElementById('trait-display').innerText = trait;
        document.getElementById('trait-display').classList.remove('hidden');

        UI.updateHeader();
        UI.changeScene('scene-training');
        UI.updateActionButtons(); 
        UI.updateTraining();
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
        if (State.hp <= CONSTANTS.TRAIN_COST) {
            UI.toast("体力が足りない！");
            UI.animShake('#train-hp-bar');
            document.getElementById('hp-warning').classList.remove('hidden');
            State.isTransitioning = false;
            return;
        }
        State.hp -= CONSTANTS.TRAIN_COST;
        
        let gainStat = ""; let gainVal = 0; let title = ""; let icon = "";
        if (type === 'hp') {
            State.maxHp += CONSTANTS.HP_GAIN; gainStat = "最大体力"; gainVal = CONSTANTS.HP_GAIN; title = "体力強化！"; icon = "💖";
        } else if (type === 'str') {
            State.str += CONSTANTS.STAT_GAIN; gainStat = "攻撃力"; gainVal = CONSTANTS.STAT_GAIN; title = "筋トレ成功！"; icon = "💪";
        } else if (type === 'int') {
            State.int += CONSTANTS.STAT_GAIN; gainStat = "魔力"; gainVal = CONSTANTS.STAT_GAIN; title = "研究成果！"; icon = "🔮";
        }
        UI.updateTraining();
        UI.showCutin({ icon, title, statText: `${gainStat} +${gainVal}`, costText: `HP -${CONSTANTS.TRAIN_COST}`, onComplete: () => UI.showDraft(type, 'training') });
    },
    doRest: () => {
        const healAmount = Math.floor(State.maxHp * CONSTANTS.REST_RECOVERY_RATE);
        const oldHp = State.hp;
        State.hp = Math.min(State.maxHp, State.hp + healAmount);
        UI.updateTraining();
        UI.showCutin({ icon: "💤", title: "リフレッシュ", statText: `HP +${State.hp - oldHp}`, costText: `全快まであと${State.maxHp - State.hp}`, onComplete: () => Game.advanceTurn() });
    },
    
    draftCard: (cardId) => {
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
        }
    },

    // --- BATTLE ---
    initBattle: () => {
        State.phase = 'battle';
        State.battle.active = true;
        State.battle.enemiesDefeated = 0;
        State.battle.processing = false; 
        State.isTransitioning = false;
        document.getElementById('bp-display').classList.remove('hidden');
        if (State.hp <= 0) State.hp = 1;
        UI.changeScene('scene-battle');
        Game.spawnEnemy();
    },

    spawnEnemy: () => {
        const level = State.battle.enemiesDefeated;
        let nameLen = Math.floor(Math.random() * 3) + 2; 
        let nameStr = "";
        for(let i=0; i<nameLen; i++) nameStr += HIRAGANA[Math.floor(Math.random() * HIRAGANA.length)];
        nameStr += "っち";

        const eMaxHp = 30 + (level * 15);
        const eAtk = 5 + (level * 2);

        State.battle.enemy = { name: nameStr, maxHp: eMaxHp, hp: eMaxHp, baseAtk: eAtk, intent: 'atk', level: level + 1 };
        
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
        State.battle.processing = false;
        
        UI.toast(`${nameStr} (Lv.${level+1}) があらわれた！`);
        Game.startBattleTurn();
    },

    startBattleTurn: () => {
        State.battle.actionsLeft = State.battle.actionsNextTurn; 
        State.battle.actionsNextTurn = 1;
        State.battle.block = 0;
        State.battle.processing = false;
        State.battle.selectedHandIndex = null;
        
        const drawCount = CONSTANTS.DRAW_COUNT + State.battle.drawNextTurn;
        State.battle.drawNextTurn = 0; 

        Game.drawCards(drawCount);
        UI.updateBattle();
        UI.updateHeader();
    },

    shuffle: (array) => array.sort(() => Math.random() - 0.5),

    drawCards: (num) => {
        for(let i=0; i<num; i++) {
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

    playCardSequence: (handIndex) => {
        const card = State.battle.hand[handIndex];
        if (State.battle.actionsLeft <= 0) {
            UI.toast("行動権がありません！");
            UI.animShake('#action-point-container');
            return;
        }

        const cardEl = document.getElementById('hand-container').children[handIndex];
        if(cardEl) {
            const rect = cardEl.getBoundingClientRect();
            const clone = cardEl.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = rect.left + 'px';
            clone.style.top = rect.top + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.margin = '0';
            clone.style.transform = 'none';
            clone.classList.remove('hand-overlap');
            clone.classList.add('card-using-anim'); 
            document.body.appendChild(clone);
            
            cardEl.style.opacity = '0'; 
            State.battle.processing = true;

            void clone.offsetWidth; 
            
            // Animation: fly to center
            clone.style.top = '50%';
            clone.style.left = '50%';
            clone.style.transform = 'translate(-50%, -50%) scale(1.5)';
            clone.style.opacity = '0';

            setTimeout(() => {
                UI.showEffectPop(card);
                Game.executeCardLogic(handIndex);
                clone.remove();
                UI.updateBattle();
                
                setTimeout(() => {
                    if (State.battle.enemy.hp > 0) {
                        State.battle.processing = false;
                        UI.updateBattle();
                        Game.checkTurnEndCondition();
                    }
                }, 500);
            }, 450); 
        } else {
            Game.executeCardLogic(handIndex);
            UI.updateBattle();
        }
    },

    executeCardLogic: (handIndex) => {
        const card = State.battle.hand[handIndex];
        State.battle.actionsLeft--;
        State.battle.selectedHandIndex = null;

        let str = State.str + State.battle.playerTempStr;
        let int = State.int + State.battle.playerTempInt;

        if (card.type === 'phys') {
            let dmg = Math.floor(str * card.val);
            if (card.extra === 'hp_scale') dmg += Math.floor(State.hp * 0.1);
            if (card.extra === 'hp_dmg') dmg = State.hp;
            if (card.extra === 'hp_dmg_half') dmg = Math.floor(State.hp * 0.5);
            if (card.extra === 'drain') {
                let drainAmt = Math.floor(dmg * 0.5);
                State.hp = Math.min(State.maxHp, State.hp + drainAmt);
                UI.toast(`HP ${drainAmt} 吸収`);
            }
            if (card.self_dmg) {
                State.hp -= card.self_dmg;
                UI.animShake('#game-container');
                UI.toast(`反動 ${card.self_dmg} ダメージ`);
            }
            if (card.hits) {
                for(let k=0; k<card.hits; k++) Game.dealDamage(dmg);
            } else {
                Game.dealDamage(dmg);
            }
        } else if (card.type === 'mag') {
            let dmg = Math.floor(int * card.val) + State.battle.magBonus;
            Game.dealDamage(dmg);
        } else if (card.type === 'heal') {
            let heal = card.val;
            State.hp = Math.min(State.maxHp, State.hp + heal);
            UI.toast(`HP ${heal} 回復`);
        } else if (card.type === 'def') {
            let blk = card.val;
            if (card.id === 'barrier') blk = Math.floor(int * 2);
            State.battle.block += blk;
            UI.toast(`ブロック ${blk}`);
        } else if (card.type === 'buff' || card.type === 'skill') {
            if (card.effect === 'str_up') {
                State.battle.playerTempStr += card.val;
                UI.toast(`攻撃力 +${card.val}`);
            } else if (card.effect === 'int_up') {
                State.battle.playerTempInt += card.val;
                UI.toast(`魔力 +${card.val}`);
            } else if (card.effect === 'action_up') {
                State.battle.actionsNextTurn += card.val;
                UI.toast(`次ターン行動回数 +${card.val}`);
            } else if (card.effect === 'maxhp_up') {
                State.maxHp += card.val;
                State.hp += 20;
                UI.toast(`最大HP増強！`);
            } else if (card.effect === 'next_draw') {
                State.battle.drawNextTurn += card.val;
                UI.toast(`次ターン追加ドロー`);
            } else if (card.effect === 'reduce_cost') {
                State.battle.magBonus += 5;
                UI.toast(`魔法威力UP状態`);
            }
        }

        if (card.draw) Game.drawCards(card.draw);
        if (card.add_action) State.battle.actionsLeft++;

        let recycle = false;
        if (State.playerType === 'int' && (card.type === 'mag' || card.attr === 'int')) {
            if (Math.random() < 0.2) {
                recycle = true;
                UI.toast("【特性】魔力循環！");
            }
        }

        State.battle.hand.splice(handIndex, 1);
        if (recycle) {
            State.battle.hand.push(card);
        } else if (card.exhaust) {
            State.battle.exhaustPile.push(card);
        } else {
            State.battle.discardPile.push(card);
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

    dealDamage: (amount) => {
        State.battle.enemy.hp -= amount;
        UI.animShake('#enemy-sprite');
    },

    endTurn: () => {
        if (State.battle.processing) return;
        State.battle.processing = true;
        State.battle.selectedHandIndex = null;

        if (State.playerType === 'hp') {
            let regen = Math.floor(State.maxHp * 0.05);
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

    enemyAction: () => {
        if (State.battle.enemy.hp <= 0) return;
        let dmg = State.battle.enemy.baseAtk;
        let blocked = Math.min(State.battle.block, dmg);
        let actualDmg = dmg - blocked;
        
        if (actualDmg > 0) {
            State.hp -= actualDmg;
            UI.animShake('#game-container');
            UI.toast(`${actualDmg} のダメージを受けた！`);
        } else {
            UI.toast("ガードした！");
        }

        if (State.hp <= 0) {
            Game.gameOver();
        } else {
            State.battle.turnCount++;
            Game.startBattleTurn();
        }
    },

    winBattle: () => {
        if(State.battle.enemy.hp > 0) return; 
        State.battle.processing = true; 
        State.battle.enemiesDefeated++;
        const gainedBP = 10 + (State.battle.enemy.level * 5);
        State.bp += gainedBP;
        
        UI.toast(`${State.battle.enemy.name} を倒した！ BP+${gainedBP}`);
        
        setTimeout(() => {
            UI.showDraft(State.playerType, 'battle_reward');
        }, 1000);
    },

    checkBattleProgress: () => {
        if (State.battle.enemiesDefeated > 0 && State.battle.enemiesDefeated % 5 === 0) {
            Game.visitShop();
        } else {
            State.hp = Math.min(State.maxHp, State.hp + 5);
            Game.spawnEnemy();
        }
    },

    // --- SHOP LOGIC ---
    visitShop: () => {
        State.shopTab = 'upgrade';
        UI.changeScene('scene-shop');
        UI.updateShop();
    },
    switchShopTab: (tab) => {
        State.shopTab = tab;
        UI.updateShop();
    },
    leaveShop: () => {
        UI.changeScene('scene-battle');
        State.hp = Math.min(State.maxHp, State.hp + 10);
        Game.spawnEnemy();
    },
    upgradeCard: (uid) => {
        if (State.bp < CONSTANTS.COST_UPGRADE) { UI.toast("BPが足りません"); return; }
        const card = State.deck.find(c => c.uid === uid);
        if (card && !card.upgraded) {
            State.bp -= CONSTANTS.COST_UPGRADE;
            card.upgraded = true;
            if (card.val) card.val = parseFloat((card.val * 1.5).toFixed(1));
            if (card.draw) card.draw = Math.ceil(card.draw * 1.5);
            card.name += "+";
            let newDesc = card.desc;
            newDesc = newDesc.replace(/(\d+)(%)/g, (match, num, unit) => Math.floor(parseInt(num) * 1.5) + unit);
            newDesc = newDesc.replace(/(\d+)(\s*)(回復|ダメージ|ブロック)/g, (match, num, space, word) => Math.floor(parseInt(num) * 1.5) + space + word);
            newDesc = newDesc.replace(/(攻撃力|攻撃|魔力|最大HP|行動回数)\+?(\s*)([+-]?\d+)/g, (match, word, space, num) => word + "+" + Math.ceil(parseInt(num) * 1.5));
            if (newDesc === card.desc && !card.desc.includes('UP') && !card.desc.includes('+')) { newDesc += " [性能UP]"; }
            card.desc = newDesc;
            UI.toast("カードを強化しました！");
            UI.updateShop();
        }
    },
    removeCard: (uid) => {
        if (State.bp < CONSTANTS.COST_REMOVE) { UI.toast("BPが足りません"); return; }
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
        UI.toast("カードを購入しました！");
        UI.updateShop();
    },
    gameOver: () => {
        State.battle.processing = true;
        UI.changeScene('scene-result');
        document.getElementById('result-score').innerText = State.battle.enemiesDefeated;
    }
};

// --- UI制御 (UI) ---
const UI = {
    changeScene: (id) => {
        const overlay = document.getElementById('transition-overlay');
        overlay.style.opacity = '1';
        setTimeout(() => {
            document.querySelectorAll('[id^="scene-"]').forEach(el => el.classList.add('hidden'));
            const el = document.getElementById(id);
            el.classList.remove('hidden');
            if(id === 'scene-start') el.classList.add('slide-in');
            setTimeout(() => { overlay.style.opacity = '0'; }, 50);
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
        if (State.hp <= CONSTANTS.TRAIN_COST) {
            bar.classList.remove('bg-green-500'); bar.classList.add('bg-red-500', 'shake-anim');
        } else {
            bar.classList.add('bg-green-500'); bar.classList.remove('bg-red-500', 'shake-anim');
        }
    },
    updateActionButtons: () => {
        Object.keys(ACTION_DATA).forEach(key => {
            const data = ACTION_DATA[key];
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
                    const healAmount = Math.floor(State.maxHp * CONSTANTS.REST_RECOVERY_RATE);
                    const actualHeal = Math.min(State.maxHp - State.hp, healAmount);
                    statText = `+${actualHeal}`;
                }
                btn.className = `action-btn ${bgClass.split(' ')[0]} ${textClass} p-2 md:p-4 rounded-xl md:rounded-2xl border-4 ${borderClass.replace('border-b-4', '')} transition-all duration-200 flex flex-col md:flex-row items-center gap-1 md:gap-4 h-20 md:h-20 group relative overflow-hidden shadow-inner ring-2 ring-offset-1 ring-${data.color}-400 transform scale-[1.02]`;
                btn.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center w-full btn-content-enter"><span class="font-black text-2xl md:text-3xl tracking-widest">実行！</span><div class="flex gap-2 text-xs md:text-sm font-bold"><span class="text-${data.color}-600">${data.stat} ${statText}</span>${data.cost > 0 ? `<span class="text-red-500">HP -${data.cost}</span>` : ''}</div></div>`;
            } else {
                btn.className = `action-btn ${bgClass} ${textClass} p-2 md:p-4 rounded-xl md:rounded-2xl border-2 ${key==='rest'?'border-b-4':''} ${borderClass} transition-all duration-200 flex flex-col md:flex-row items-center gap-1 md:gap-4 h-20 md:h-20 group relative overflow-hidden shadow-sm active:scale-95 ${State.selectedAction ? 'opacity-50' : 'opacity-100'}`;
                let costBadge = data.cost > 0 ? `<span class="text-[10px] md:text-sm bg-red-100 text-red-600 font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-red-200 relative z-10 md:ml-auto whitespace-nowrap">消費: -${data.cost} HP</span>` : `<span class="text-[10px] md:text-sm bg-white px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-yellow-200 text-green-600 font-bold relative z-10 md:ml-auto whitespace-nowrap">回復: Maxの75%</span>`;
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
        setTimeout(() => { el.classList.add('hidden'); if (onComplete) onComplete(); }, 2200);
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
        const isUnderLimit = (c) => { if (!c.limit) return true; return Game.countCard(c.id) < c.limit; };
        const getCommons = () => CARDS_DB.filter(c => { if (c.rarity === 'rare') return false; if (!isUnderLimit(c)) return false; return c.attr === 'common' || c.attr === type; });
        if (mode === 'battle_reward') {
            skipBtn.classList.remove('hidden'); title.innerText = "バトル報酬！"; subtitle.innerText = "戦利品を選ぼう！(レアが出るかも？)";
            let commons = getCommons();
            let rares = CARDS_DB.filter(c => c.rarity === 'rare' && c.pool === type && isUnderLimit(c));
            let choices = [];
            for(let i=0; i<3; i++) {
                let isRare = Math.random() < 0.1; 
                let source = (isRare && rares.length > 0) ? rares : commons;
                let available = source.filter(c => !choices.find(ch => ch.id === c.id));
                if (available.length === 0) { source = (source === rares) ? commons : rares; available = source.filter(c => !choices.find(ch => ch.id === c.id)); }
                if (available.length > 0) { choices.push(available[Math.floor(Math.random() * available.length)]); }
            }
            UI.renderDraftCards(choices, container);
        } else {
            skipBtn.classList.add('hidden'); title.innerText = "カード獲得！"; subtitle.innerText = "強化完了！1枚選んでデッキに追加";
            let candidates = getCommons();
            if(candidates.length < 3) candidates = [...candidates, ...CARDS_DB.filter(c=>c.id==='punch')];
            const choices = Game.shuffle([...new Set(candidates)]).slice(0, 3);
            UI.renderDraftCards(choices, container);
        }
        document.getElementById('scene-draft').classList.remove('hidden');
    },
    renderDraftCards: (cards, container) => {
        cards.forEach(card => {
            const el = document.createElement('div');
            el.className = 'bg-white p-2 md:p-4 rounded-xl shadow-lg border-2 border-slate-200 flex flex-col items-center gap-1 md:gap-2 cursor-pointer hover:border-yellow-400 transition transform hover:scale-105 active:scale-95 text-center h-full justify-between card-hover';
            if (card.rarity === 'rare') el.className += ' border-yellow-300 ring-2 md:ring-4 ring-yellow-100 bg-yellow-50';
            el.onclick = () => Game.draftCard(card.id);
            let colorClass = card.type === 'phys' ? 'text-red-500 bg-red-100' : (card.type === 'mag' ? 'text-blue-500 bg-blue-100' : 'text-green-500 bg-green-100');
            if (card.rarity === 'rare') colorClass = 'text-yellow-600 bg-yellow-200';
            el.innerHTML = `<div class="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${colorClass} flex items-center justify-center text-xl md:text-3xl shrink-0 border-2 md:border-4 border-white shadow-sm mb-1 md:mb-2"><i class="fas ${card.icon || 'fa-star'}"></i></div><div class="w-full"><div class="font-bold text-xs md:text-lg text-slate-800 mb-1 leading-tight ${card.rarity==='rare' ? 'text-yellow-700':''}">${card.name}</div><div class="flex gap-1 justify-center flex-wrap mb-1 md:mb-2">${card.rarity === 'rare' ? '<span class="bg-yellow-400 text-[8px] md:text-[10px] font-black px-1 md:px-2 py-0.5 rounded text-slate-900 shadow-sm">RARE</span>' : ''}${card.add_action ? '<span class="bg-orange-400 text-[8px] md:text-[10px] font-black px-1 md:px-2 py-0.5 rounded text-white shadow-sm">連撃</span>' : ''}${card.exhaust ? '<span class="bg-purple-600 text-[8px] md:text-[10px] font-black px-1 md:px-2 py-0.5 rounded text-white shadow-sm">1回</span>' : ''}</div><div class="text-[9px] md:text-sm text-slate-500 leading-tight">${card.desc}</div></div>`;
            container.appendChild(el);
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
                 let candidates = CARDS_DB.filter(c => c.rarity !== 'rare'); let shopCards = Game.shuffle(candidates).slice(0, 3);
                 shopCards.forEach(card => {
                    const reachedLimit = card.limit && Game.countCard(card.id) >= card.limit;
                    const opacity = reachedLimit ? 'opacity-50' : 'opacity-100';
                    const div = document.createElement('div');
                    div.className = `flex justify-between items-center bg-slate-800 p-2 rounded text-sm text-white cursor-pointer hover:bg-slate-600 mb-2 ${opacity}`;
                    div.innerHTML = `<span><i class="fas ${card.icon}"></i> ${card.name}</span> <span class="text-xs bg-slate-900 px-2 py-1 rounded ${btnClass} whitespace-nowrap">${reachedLimit?'上限':btnText}</span>`;
                    if(!reachedLimit) div.onclick = () => clickFn(card.id);
                    list.appendChild(div);
                 });
            } else if (listId !== 'shop-buy-list') {
                State.deck.forEach(card => {
                    if(listId === 'shop-upgrade-list' && card.upgraded) return;
                    const div = document.createElement('div');
                    div.className = 'flex justify-between items-center bg-slate-800 p-2 rounded text-sm text-white cursor-pointer hover:bg-slate-600 mb-2';
                    div.innerHTML = `<span><i class="fas ${card.icon}"></i> ${card.name}</span> <span class="text-xs bg-slate-900 px-2 py-1 rounded ${btnClass} whitespace-nowrap">${btnText}</span>`;
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
            const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
            document.getElementById('enemy-hp-bar').style.width = `${hpPct}%`;
            document.getElementById('enemy-hp-text').innerText = `${e.hp}/${e.maxHp}`;
            document.getElementById('enemy-intent').innerHTML = `<i class="fas fa-sword"></i> <span>攻撃 ${e.baseAtk}</span>`;
        }
        document.getElementById('battle-player-hp').innerText = State.hp;
        document.getElementById('battle-player-maxhp').innerText = State.maxHp;
        const apCont = document.getElementById('action-point-container');
        apCont.innerHTML = '';
        for(let i=0; i<State.battle.actionsLeft; i++) { apCont.innerHTML += `<div class="w-3 h-3 md:w-4 md:h-4 rounded-full bg-yellow-400 border border-white shadow-sm pop-anim"></div>`; }
        if(State.battle.actionsLeft === 0) apCont.innerHTML = `<span class="text-[10px] md:text-xs text-slate-400">0</span>`;
        const blkEl = document.getElementById('battle-block');
        if(State.battle.block > 0) { blkEl.classList.remove('hidden'); document.getElementById('battle-block-val').innerText = State.battle.block; } else { blkEl.classList.add('hidden'); }
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
            el.className = `w-24 h-32 md:w-36 md:h-52 bg-white rounded-xl border-b-4 ${typeColor} shadow-xl flex flex-col p-1.5 md:p-2 relative cursor-pointer transition-all duration-200 shrink-0 ${opacity} ${selectedClass}`;
            if(canPlay) el.onclick = (e) => Game.handleCardClick(e, idx);
            let badges = '';
            if(card.rarity === 'rare') badges += `<div class="bg-yellow-400 text-slate-900 px-1 md:px-1.5 rounded text-[8px] md:text-[10px] font-bold shadow-sm border border-white whitespace-nowrap">RARE</div>`;
            if(card.add_action) badges += `<div class="bg-orange-400 text-white px-1 md:px-1.5 rounded text-[8px] md:text-[10px] font-bold shadow-sm border border-white whitespace-nowrap">連撃</div>`;
            if(card.exhaust) badges += `<div class="bg-purple-600 text-white px-1 md:px-1.5 rounded text-[8px] md:text-[10px] font-bold shadow-sm border border-white whitespace-nowrap">1回</div>`;
            el.innerHTML = `<div class="absolute -top-2 md:-top-3 left-0 right-0 flex justify-center gap-0.5 md:gap-1 z-10 flex-wrap px-1">${badges}</div><div class="flex-1 flex flex-col items-center justify-center mt-1 md:mt-2 overflow-hidden"><div class="text-2xl md:text-4xl mb-1 md:mb-2 drop-shadow-sm ${card.rarity==='rare' ? 'text-yellow-600' : (card.type==='phys'?'text-red-400':(card.type==='mag'?'text-blue-400':'text-green-400'))}"><i class="fas ${card.icon}"></i></div><div class="font-bold text-center text-[10px] md:text-sm leading-tight mb-1 md:mb-2 w-full truncate ${card.rarity==='rare'?'text-yellow-800':'text-slate-800'}">${card.name}</div><p class="text-[8px] md:text-xs text-center text-slate-500 leading-tight px-0.5 line-clamp-3">${card.desc}</p></div>`;
            handCont.appendChild(el);
        });
    },
    toast: (msg) => {
        const el = document.getElementById('toast');
        el.innerText = msg;
        el.style.opacity = 1;
        el.style.top = '140px'; 
        setTimeout(() => { el.style.opacity = 0; el.style.top = '120px'; }, 2000);
    },
    animPop: (selector) => { const el = document.querySelector(selector); if(el) { el.classList.remove('pop-anim'); void el.offsetWidth; el.classList.add('pop-anim'); } },
    animShake: (selector) => { const el = document.querySelector(selector); if(el) { el.classList.remove('shake-anim'); void el.offsetWidth; el.classList.add('shake-anim'); } }
};

// --- 初期化 ---
// GameオブジェクトをHTMLのonclickから呼べるようにwindowに登録
window.Game = Game;

window.onload = () => {
    const overlay = document.getElementById('transition-overlay');
    if(overlay) overlay.style.opacity = '0';
};

// 初期タイプ選択状態
Game.selectType('hp');

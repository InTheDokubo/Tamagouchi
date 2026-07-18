// --- 定数とデータ定義 ---

export const CONSTANTS = {
    TRAIN_COST: 15,
    HP_GAIN: 10,
    STAT_GAIN: 2,
    REST_RECOVERY_RATE: 0.75,
    DRAW_COUNT: 4,
    HAND_LIMIT: 9,
    COST_UPGRADE: 45,
    COST_REMOVE: 25,
    COST_BUY: 50,
    COST_RARE_UPGRADE: 80
};

export const HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";

export const ACTION_DATA = {
    hp: { id: 'hp', title: '最大体力UP', icon: 'fa-heart', color: 'green', cost: CONSTANTS.TRAIN_COST, stat: '最大HP', gain: CONSTANTS.HP_GAIN },
    str: { id: 'str', title: '筋トレ', icon: 'fa-dumbbell', color: 'red', cost: CONSTANTS.TRAIN_COST, stat: '攻撃', gain: CONSTANTS.STAT_GAIN },
    int: { id: 'int', title: '魔術研究', icon: 'fa-book', color: 'blue', cost: CONSTANTS.TRAIN_COST, stat: '魔力', gain: CONSTANTS.STAT_GAIN },
    rest: { id: 'rest', title: '休む', icon: 'fa-bed', color: 'yellow', cost: 0, stat: 'HP回復', gain: 0 } 
};

// カードデータベース
// type: phys(物理), mag(魔法), def(防御), skill(スキル), buff(バフ), heal(回復)
export const CARDS_DB = [
    { id: 'punch', name: 'パンチ', type: 'phys', attr: 'str', val: 1.0, desc: '攻撃力の100%ダメージ。', icon: 'fa-fist-raised' },
    { id: 'kick', name: 'キック', type: 'phys', attr: 'str', val: 2.2, desc: '攻撃力の220%ダメージ。', icon: 'fa-shoe-prints' },
    { id: 'spark', name: 'プチ魔法', type: 'mag', attr: 'int', val: 1.0, manaGain: 1, desc: '魔力100%ダメージ。一時魔力+1。', icon: 'fa-bolt' },
    { id: 'defend', name: '防御', type: 'def', attr: 'common', val: 8, desc: 'ブロック8を得る。', icon: 'fa-shield-alt' },
    { id: 'quick_think', name: '思考加速', type: 'skill', attr: 'common', add_action: true, draw: 2, exhaust: true, limit: 2, desc: '2枚引いて行動権+1。[1回のみ/デッキ2枚まで]', icon: 'fa-brain' },
    { id: 'prepare', name: '仕込み', type: 'skill', attr: 'common', effect: 'next_draw', val: 2, desc: '次のターン開始時に2枚多く引く。', icon: 'fa-toolbox' },
    { id: 'meditate', name: '瞑想', type: 'skill', attr: 'common', effect: 'action_up', val: 1, add_action: true, limit: 2, desc: '次のターン行動回数+1。続けて行動可。[デッキ2枚まで]', icon: 'fa-om' },
    { id: 'cheer', name: '声援', type: 'buff', attr: 'common', effect: 'str_up', val: 1, redraw: 2, add_action: true, exhaust: true, limit: 1, desc: 'この戦闘中、攻撃+1。手札を総入れ替えし、さらに2枚引く。続けて行動。[1回のみ/デッキ1枚まで]', icon: 'fa-bullhorn' },
    { id: 'focus', name: '集中', type: 'buff', attr: 'common', effect: 'both_up', val: 1, add_action: true, exhaust: true, limit: 2, desc: 'この戦闘中、攻撃・魔力+1。続けて行動。[1回のみ]', icon: 'fa-crosshairs' },
    { id: 'recycle', name: '再構築', type: 'skill', attr: 'common', effect: 'recycle', draw: 2, exhaust: true, limit: 1, desc: '捨て札を山札に戻し、2枚引く。[デッキ1枚まで]', icon: 'fa-recycle' },
    { id: 'tackle', name: 'タックル', type: 'phys', attr: 'str', val: 0.5, extra: 'hp_scale', desc: '攻撃50% + 現在HPの10%ダメージ。', icon: 'fa-football-ball' },
    { id: 'rage', name: '激怒', type: 'buff', attr: 'str', effect: 'str_up', val: 2, add_action: true, exhaust: true, desc: 'この戦闘中、攻撃力+2。続けて行動。[1回のみ]', icon: 'fa-fire' },
    { id: 'multi', name: '連続拳', type: 'phys', attr: 'str', val: 0.5, hits: 2, add_action: true, desc: '50%の2回攻撃。続けて行動。コンボを素早く稼ぐ。', icon: 'fa-users' },
    { id: 'heavy', name: '本気パンチ', type: 'phys', attr: 'str', val: 4.0, exhaust: true, desc: '攻撃力の400%の大ダメージ。[1回のみ]', icon: 'fa-hammer' },
    { id: 'quick', name: 'ジャブ', type: 'phys', attr: 'str', val: 0.55, add_action: true, desc: '攻撃55%ダメ。続けて行動。コンボの起点。', icon: 'fa-wind' },
    { id: 'life_burn', name: '羅刹撃', type: 'phys', attr: 'str', val: 3.5, self_dmg: 5, desc: '攻撃350%ダメ。自分も5ダメ受ける（反動ではHP1未満にならない）。', icon: 'fa-skull-crossbones' },
    { id: 'draw_slash', name: '燕返し', type: 'phys', attr: 'str', val: 1.4, draw: 1, desc: '攻撃140%ダメ。カードを1枚引く。', icon: 'fa-feather-alt' },
    { id: 'finisher', name: 'とどめの一撃', type: 'phys', attr: 'str', val: 2.0, extra: 'execute', desc: '攻撃200%。敵HPが30%以下なら400%。', icon: 'fa-gavel' },
    { id: 'guard_break', name: '崩し打ち', type: 'phys', attr: 'str', val: 1.2, effect: 'weak', desc: '攻撃120%。敵の次の攻撃を25%弱化。', icon: 'fa-hammer' },
    { id: 'feint', name: 'フェイント', type: 'phys', attr: 'str', val: 0.4, vulnerable: 1, add_action: true, desc: '攻撃40%。脆弱を付与し、続けて行動。大技への布石。', icon: 'fa-people-arrows' },
    { id: 'flurry', name: '乱れ打ち', type: 'phys', attr: 'str', val: 0.5, hits: 3, desc: '攻撃50%の3連撃。連撃の呼吸を一気に発動できる。', icon: 'fa-hand-rock' },
    { id: 'fireball', name: '炎魔法', type: 'mag', attr: 'int', val: 2.5, manaGain: 3, exhaust: true, desc: '魔力250%ダメージ。一時魔力+3。[1回のみ]', icon: 'fa-fire-alt' },
    { id: 'barrier', name: 'バリア', type: 'def', attr: 'int', val: 1.0, manaGain: 2, desc: '魔力100%分のブロック。一時魔力+2。', icon: 'fa-shield-alt' },
    { id: 'thunder', name: '雷撃', type: 'mag', attr: 'int', val: 0.85, manaGain: 1, add_action: true, desc: '魔力85%ダメージ。一時魔力+1。続けて行動。', icon: 'fa-poo-storm' },
    { id: 'mana_charge', name: '魔力充填', type: 'buff', attr: 'int', effect: 'int_up', val: 3, manaGain: 4, add_action: true, exhaust: true, desc: 'この戦闘中、魔力+3。一時魔力+4。続けて行動。[1回のみ]', icon: 'fa-magic' },
    { id: 'grimoire', name: '魔道書', type: 'skill', attr: 'int', effect: 'mana_cycle', manaCost: 3, draw: 2, add_action: true, desc: '一時魔力3消費。2枚引き、続けて行動。', icon: 'fa-book-open' },
    { id: 'future_sight', name: '未来予知', type: 'skill', attr: 'int', effect: 'next_draw', val: 3, manaGain: 2, exhaust: true, desc: '次ターン3枚追加。一時魔力+2。[1回のみ]', icon: 'fa-eye' },
    { id: 'frost', name: '氷結魔法', type: 'mag', attr: 'int', val: 1.3, manaGain: 2, effect: 'weak', desc: '魔力130%ダメージ。一時魔力+2。敵の次の攻撃を25%弱化。', icon: 'fa-snowflake' },
    { id: 'arcane_shield', name: '魔力装甲', type: 'def', attr: 'int', val: 1.2, manaGain: 1, draw: 1, desc: '魔力120%分のブロック。一時魔力+1。1枚引く。', icon: 'fa-user-shield' },
    { id: 'overload', name: 'オーバーロード', type: 'mag', attr: 'int', val: 3.2, manaGain: 4, self_dmg: 4, desc: '魔力320%ダメージ。一時魔力+4。自分も4ダメージ（反動ではHP1未満にならない）。', icon: 'fa-broadcast-tower' },
    { id: 'scorch', name: '灼熱', type: 'mag', attr: 'int', val: 1.1, manaGain: 2, burn: 5, desc: '魔力110%ダメージ。一時魔力+2。炎上5を付与。', icon: 'fa-temperature-high' },
    { id: 'mana_burst', name: '魔力解放', type: 'mag', attr: 'int', val: 1.8, manaCost: 3, consumeAllMana: true, extra: 'temp_mana_burst', exhaust: true, desc: '一時魔力を全消費（最低3）。魔力180%＋消費量×4ダメージ。[1回のみ]', icon: 'fa-bahai' },
    { id: 'bandage', name: '絆創膏', type: 'heal', attr: 'hp', val: 0, healRate: 0.18, exhaust: true, desc: '最大HPの18%回復。[1回のみ]', icon: 'fa-band-aid' },
    { id: 'rest', name: '深呼吸', type: 'heal', attr: 'hp', val: 0, healRate: 0.35, exhaust: true, desc: '最大HPの35%回復。[1回のみ]', icon: 'fa-spa' },
    { id: 'muscle', name: 'ビルドアップ', type: 'heal', attr: 'hp', val: 0, healRate: 0.15, add_action: true, exhaust: true, desc: '最大HPの15%回復。続けて行動。[1回のみ]', icon: 'fa-heartbeat' },
    { id: 'counter', name: '構える', type: 'def', attr: 'common', val: 15, desc: 'ブロック15を得る。', icon: 'fa-hand-paper' },
    { id: 'life_share', name: '生命転換', type: 'phys', attr: 'hp', val: 0, extra: 'hp_sacrifice', scale: 0.15, extraMult: 2.6, desc: '現在HPを15%消費し、その2.6倍のダメージ（HP1で止まる）。', icon: 'fa-balance-scale' },
    { id: 'endure', name: '不屈', type: 'def', attr: 'hp', val: 30, exhaust: true, desc: 'ブロック30を得る。[1回のみ]', icon: 'fa-mountain' },
    { id: 'body_press', name: 'ボディプレス', type: 'phys', attr: 'hp', val: 0, extra: 'maxhp_scale', scale: 0.3, hpCostScale: 0.1, desc: '最大HPの30%ダメージ。現在HPを10%消費（HP1で止まる）。', icon: 'fa-weight-hanging' },
    { id: 'fortify', name: '要塞化', type: 'def', attr: 'hp', val: 12, effect: 'retain_block', exhaust: true, desc: 'ブロック12。次のターンまでブロックを保持。[1回のみ]', icon: 'fa-chess-rook' },
    { id: 'second_wind', name: '底力', type: 'heal', attr: 'hp', val: 0, healRate: 0.2, extra: 'low_hp_double', exhaust: true, desc: '最大HPの20%回復。HP半分以下なら40%回復。[1回のみ]', icon: 'fa-heart' },
    { id: 'spikes', name: 'トゲの鎧', type: 'def', attr: 'hp', val: 9, thorns: 3, desc: 'ブロック9。この戦闘中、反撃3を得る。', icon: 'fa-sun' },
    { id: 'iron_will', name: '鋼の意志', type: 'def', attr: 'hp', val: 8, extra: 'missing_hp_block', desc: 'ブロック8＋失ったHPの20%。', icon: 'fa-shield-alt' },
    { id: 'dragon_fist', name: 'ドラゴン拳', type: 'phys', attr: 'str', val: 5.0, exhaust: true, rarity: 'rare', pool: 'str', desc: '攻撃力の500%の超ダメージ。[1回のみ]', icon: 'fa-dragon' },
    { id: 'blood_sucker', name: '吸血撃', type: 'phys', attr: 'str', val: 1.8, extra: 'drain', drainRate: 0.4, rarity: 'rare', pool: 'str', desc: '攻撃180%ダメージ。与えたダメージの40%回復。', icon: 'fa-tint' },
    { id: 'god_strength', name: '鬼神化', type: 'buff', attr: 'str', effect: 'str_up', val: 5, add_action: true, exhaust: true, rarity: 'rare', pool: 'str', desc: 'この戦闘中、攻撃力+5。続けて行動。[1回のみ]', icon: 'fa-mask' },
    { id: 'meteor', name: 'メテオ', type: 'mag', attr: 'int', val: 6.0, manaGain: 4, exhaust: true, rarity: 'rare', pool: 'int', desc: '魔力600%ダメージ。一時魔力+4。[1回のみ]', icon: 'fa-meteor' },
    { id: 'time_warp', name: '時渡り', type: 'skill', attr: 'int', effect: 'action_up', val: 2, manaCost: 7, exhaust: true, rarity: 'rare', pool: 'int', desc: '一時魔力7消費。次ターンの行動回数+2。[1回のみ]', icon: 'fa-hourglass-half' },
    { id: 'titan_body', name: '巨人の体', type: 'buff', attr: 'hp', effect: 'maxhp_up', val: 20, healRate: 0.3, exhaust: true, rarity: 'rare', pool: 'hp', desc: '初回のみ最大HP+20。最大HPの30%回復。[1回のみ]', icon: 'fa-mountain' },
    
    // --- 体力型調整 ---
    { id: 'grand_slam', name: 'プレス', type: 'phys', attr: 'hp', val: 0, extra: 'hp_halve_press', scale: 0.3, extraMult: 2.75, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '現在HPを30%消費し、その2.75倍のダメージ（HP1で止まる）。[1回のみ]', icon: 'fa-weight-hanging' },
    { id: 'super_heal', name: '大回復', type: 'heal', attr: 'hp', val: 0, healRate: 0.7, exhaust: true, rarity: 'rare', pool: 'hp', desc: '最大HPの70%回復。[1回のみ]', icon: 'fa-first-aid' },
    
    // --- 体力型追加カード ---
    { id: 'shield_bash', name: 'シールドバッシュ', type: 'def', attr: 'hp', val: 7, add_action: true, pool: 'hp', desc: 'ブロック7。続けて行動できる。', icon: 'fa-shield-alt' },
    { id: 'vitality', name: '活力', type: 'heal', attr: 'hp', val: 0, healRate: 0.1, add_action: true, exhaust: true, pool: 'hp', desc: '最大HPの10%回復。続けて行動。[1回のみ]', icon: 'fa-leaf' },
    { id: 'castle_gate', name: '城門', type: 'phys', attr: 'hp', val: 0, extra: 'block_dmg', extraMult: 1.5, consumeBlock: true, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '全ブロックを消費し、その1.5倍のダメージ。[1回のみ]', icon: 'fa-dungeon' },
    { id: 'berserker', name: '狂戦士', type: 'buff', attr: 'str', effect: 'berserk', val: 2, add_action: true, exhaust: true, rarity: 'rare', pool: 'str', desc: '攻撃+2。失ったHP10ごとにさらに攻撃+1。[1回のみ]', icon: 'fa-angry' },
    { id: 'echo_spell', name: '残響魔法', type: 'skill', attr: 'int', effect: 'echo', manaCost: 6, add_action: true, exhaust: true, rarity: 'rare', pool: 'int', desc: '一時魔力6消費。次の魔法をもう一度与える。続けて行動。[1回のみ]', icon: 'fa-clone' },
    { id: 'immortal', name: '不死身', type: 'skill', attr: 'hp', effect: 'immortal', add_action: true, exhaust: true, rarity: 'rare', pool: 'hp', desc: 'この戦闘で一度だけ致死ダメージをHP1で耐える。[1回のみ]', icon: 'fa-ankh' },
    { id: 'infinite_blades', name: '無限連斬', type: 'phys', attr: 'str', val: 0.7, hits: 6, exhaust: true, rarity: 'rare', pool: 'str', limit: 1, desc: '攻撃70%の6連撃。コンボ補正が全段に乗る。[1回のみ]', icon: 'fa-khanda' },
    { id: 'limit_break', name: '限界突破', type: 'buff', attr: 'str', effect: 'limit_break', val: 6, hpCost: 10, add_action: true, exhaust: true, rarity: 'rare', pool: 'str', limit: 1, desc: 'この戦闘中、攻撃+6。HPを10失う（HP1未満にならない）。続けて行動。[1回のみ]', icon: 'fa-bolt' },
    { id: 'black_hole', name: 'ブラックホール', type: 'mag', attr: 'int', val: 4.0, manaGain: 4, burn: 8, vulnerable: 1, exhaust: true, rarity: 'rare', pool: 'int', limit: 1, desc: '魔力400%ダメージ。一時魔力+4。炎上8と脆弱。[1回のみ]', icon: 'fa-circle-notch' },
    { id: 'absolute_zero', name: '絶対零度', type: 'mag', attr: 'int', val: 3.2, manaGain: 4, freeze: true, exhaust: true, rarity: 'rare', pool: 'int', limit: 1, desc: '魔力320%ダメージ。一時魔力+4。敵の次の行動を封じる。[1回のみ]', icon: 'fa-icicles' },
    { id: 'world_tree', name: '世界樹の加護', type: 'buff', attr: 'hp', effect: 'world_tree', val: 20, healRate: 0.3, add_action: true, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '初回のみ最大HP+20。最大HPの30%回復、反撃4。続けて行動。[1回のみ]', icon: 'fa-tree' },
    { id: 'aegis', name: '神盾イージス', type: 'def', attr: 'hp', val: 0, extra: 'maxhp_block', scale: 0.5, thorns: 5, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '最大HPの50%（最大60）ブロックと反撃5。[1回のみ]', icon: 'fa-shield-virus' },
    { id: 'masters_read', name: '剣聖の見切り', type: 'phys', attr: 'str', val: 2.4, extra: 'intent_counter', exhaust: true, rarity: 'rare', pool: 'str', limit: 1, desc: '攻撃240%。敵が強攻撃・吸収なら480%になり、予告値のブロック。[1回のみ]', icon: 'fa-user-ninja' },
    { id: 'causal_reverse', name: '因果反転', type: 'def', attr: 'int', val: 0, manaCost: 5, extra: 'intent_block', exhaust: true, rarity: 'rare', pool: 'int', limit: 1, desc: '一時魔力5消費。予告値をブロックし、防いだ値を次の魔法へ変換。[1回のみ]', icon: 'fa-yin-yang' },
    { id: 'revenge_fortress', name: '報復要塞', type: 'def', attr: 'hp', val: 0, extra: 'revenge_guard', exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '予告値＋失ったHP20%をブロック。次の攻撃で防いだ値を反射。[1回のみ]', icon: 'fa-chess-rook' },
];

// Every card is deliberately assigned a secret modification that complements
// its role. Keeping this table explicit prevents generic upgrades from creating
// accidental infinite loops (notably draw + action cards such as quick_think).
const SECRET_MOD_GROUPS = {
    rupture: ['punch','kick','tackle','life_burn','draw_slash','finisher','guard_break','quick','feint','life_share','body_press','dragon_fist','blood_sucker','masters_read'],
    combo_mastery: ['multi','flurry','infinite_blades'],
    rebirth: ['heavy','grand_slam','castle_gate'],
    anchor: ['defend','counter','endure','fortify','iron_will','revenge_fortress'],
    thornward: ['spikes','aegis','shield_bash'],
    overflow: ['bandage','rest','second_wind'],
    renewal: ['super_heal','vitality'],
    serenity: ['quick_think','cheer','focus','rage','muscle','god_strength','titan_body','berserker','immortal','limit_break','world_tree'],
    insight: ['meditate'],
    tempo: ['prepare','recycle'],
    sacrifice_circuit: ['spark','thunder','barrier','arcane_shield'],
    void_distill: ['fireball','overload','meteor','black_hole'],
    anomaly_formula: ['mana_charge','frost','scorch','absolute_zero'],
    paradox_refund: ['grimoire','mana_burst','time_warp','echo_spell','causal_reverse'],
    future_clone: ['future_sight']
};

export const SECRET_MOD_BY_CARD = Object.fromEntries(
    Object.entries(SECRET_MOD_GROUPS).flatMap(([mod,ids]) => ids.map(id => [id,mod]))
);

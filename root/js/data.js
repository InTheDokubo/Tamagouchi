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
    { id: 'spark', name: 'プチ魔法', type: 'mag', attr: 'int', val: 1.0, desc: '魔力の100%魔法ダメージ。', icon: 'fa-bolt' },
    { id: 'defend', name: '防御', type: 'def', attr: 'common', val: 8, desc: 'ブロック8を得る。', icon: 'fa-shield-alt' },
    { id: 'quick_think', name: '思考加速', type: 'skill', attr: 'common', add_action: true, draw: 2, exhaust: true, limit: 2, desc: '2枚引いて行動権+1。[1回のみ/デッキ2枚まで]', icon: 'fa-brain' },
    { id: 'prepare', name: '仕込み', type: 'skill', attr: 'common', effect: 'next_draw', val: 2, desc: '次のターン開始時に2枚多く引く。', icon: 'fa-toolbox' },
    { id: 'meditate', name: '瞑想', type: 'skill', attr: 'common', effect: 'action_up', val: 1, add_action: true, desc: '次のターン行動回数+1。続けて行動可。', icon: 'fa-om' },
    { id: 'cheer', name: '声援', type: 'buff', attr: 'common', effect: 'str_up', val: 1, add_action: true, draw: 1, exhaust: true, limit: 2, desc: 'この戦闘中、攻撃+1。1枚引く。続けて行動。[1回のみ]', icon: 'fa-bullhorn' },
    { id: 'focus', name: '集中', type: 'buff', attr: 'common', effect: 'both_up', val: 1, add_action: true, exhaust: true, limit: 2, desc: 'この戦闘中、攻撃・魔力+1。続けて行動。[1回のみ]', icon: 'fa-crosshairs' },
    { id: 'recycle', name: '再構築', type: 'skill', attr: 'common', effect: 'recycle', draw: 2, exhaust: true, limit: 1, desc: '捨て札を山札に戻し、2枚引く。[デッキ1枚まで]', icon: 'fa-recycle' },
    { id: 'tackle', name: 'タックル', type: 'phys', attr: 'str', val: 0.5, extra: 'hp_scale', desc: '攻撃50% + 現在HPの10%ダメージ。', icon: 'fa-football-ball' },
    { id: 'rage', name: '激怒', type: 'buff', attr: 'str', effect: 'str_up', val: 3, add_action: true, exhaust: true, desc: 'この戦闘中、攻撃力+3。続けて行動。[1回のみ]', icon: 'fa-fire' },
    { id: 'multi', name: '連続拳', type: 'phys', attr: 'str', val: 0.55, hits: 2, add_action: true, desc: '55%の2回攻撃。続けて行動できる。', icon: 'fa-users' },
    { id: 'heavy', name: '本気パンチ', type: 'phys', attr: 'str', val: 4.0, exhaust: true, desc: '攻撃力の400%の大ダメージ。[1回のみ]', icon: 'fa-hammer' },
    { id: 'quick', name: 'ジャブ', type: 'phys', attr: 'str', val: 0.6, add_action: true, desc: '攻撃60%ダメ。続けて行動できる。', icon: 'fa-wind' },
    { id: 'life_burn', name: '羅刹撃', type: 'phys', attr: 'str', val: 3.5, self_dmg: 5, desc: '攻撃350%ダメ。自分も5ダメ受ける。', icon: 'fa-skull-crossbones' },
    { id: 'draw_slash', name: '燕返し', type: 'phys', attr: 'str', val: 1.5, draw: 1, desc: '攻撃150%ダメ。カードを1枚引く。', icon: 'fa-feather-alt' },
    { id: 'finisher', name: 'とどめの一撃', type: 'phys', attr: 'str', val: 2.0, extra: 'execute', desc: '攻撃200%。敵HPが30%以下なら400%。', icon: 'fa-gavel' },
    { id: 'guard_break', name: '崩し打ち', type: 'phys', attr: 'str', val: 1.2, effect: 'weak', desc: '攻撃120%。敵の次の攻撃を25%弱化。', icon: 'fa-hammer' },
    { id: 'feint', name: 'フェイント', type: 'phys', attr: 'str', val: 0.45, vulnerable: 1, add_action: true, desc: '攻撃45%。敵を脆弱にし、次の一撃を1.5倍。続けて行動。', icon: 'fa-people-arrows' },
    { id: 'flurry', name: '乱れ打ち', type: 'phys', attr: 'str', val: 0.55, hits: 3, desc: '攻撃55%の3連撃。コンボ補正と好相性。', icon: 'fa-hand-rock' },
    { id: 'fireball', name: '炎魔法', type: 'mag', attr: 'int', val: 2.5, exhaust: true, desc: '魔力の250%魔法ダメージ。[1回のみ]', icon: 'fa-fire-alt' },
    { id: 'barrier', name: 'バリア', type: 'def', attr: 'int', val: 2.0, desc: '魔力200%分のブロックを得る。', icon: 'fa-shield-alt' },
    { id: 'thunder', name: '雷撃', type: 'mag', attr: 'int', val: 0.85, add_action: true, desc: '魔力85%ダメ。続けて行動できる。', icon: 'fa-poo-storm' },
    { id: 'mana_charge', name: '魔力充填', type: 'buff', attr: 'int', effect: 'int_up', val: 3, add_action: true, exhaust: true, desc: 'この戦闘中、魔力+3。続けて行動。[1回のみ]', icon: 'fa-magic' },
    { id: 'grimoire', name: '魔道書', type: 'skill', attr: 'int', draw: 1, effect: 'reduce_cost', exhaust: true, desc: '1枚引き、次の魔法ダメージ+5。[1回のみ]', icon: 'fa-book-open' }, 
    { id: 'future_sight', name: '未来予知', type: 'skill', attr: 'int', effect: 'next_draw', val: 3, exhaust: true, desc: '次のターン3枚多く引く。[1回のみ]', icon: 'fa-eye' },
    { id: 'frost', name: '氷結魔法', type: 'mag', attr: 'int', val: 1.3, effect: 'weak', desc: '魔力130%ダメージ。敵の次の攻撃を25%弱化。', icon: 'fa-snowflake' },
    { id: 'arcane_shield', name: '魔力装甲', type: 'def', attr: 'int', val: 1.2, draw: 1, desc: '魔力120%分のブロック。1枚引く。', icon: 'fa-user-shield' },
    { id: 'overload', name: 'オーバーロード', type: 'mag', attr: 'int', val: 3.2, self_dmg: 4, desc: '魔力320%ダメージ。自分も4ダメージ。', icon: 'fa-broadcast-tower' },
    { id: 'scorch', name: '灼熱', type: 'mag', attr: 'int', val: 1.1, burn: 5, desc: '魔力110%ダメージ。敵に炎上5を付与。', icon: 'fa-temperature-high' },
    { id: 'mana_burst', name: '魔力解放', type: 'mag', attr: 'int', val: 1.8, extra: 'bonus_scale', exhaust: true, desc: '魔力180%＋蓄積した魔法ボーナスの3倍。[1回のみ]', icon: 'fa-bahai' },
    { id: 'bandage', name: '絆創膏', type: 'heal', attr: 'hp', val: 10, exhaust: true, desc: 'HP10回復。[1回のみ]', icon: 'fa-band-aid' },
    { id: 'rest', name: '深呼吸', type: 'heal', attr: 'hp', val: 25, exhaust: true, desc: 'HP25回復。[1回のみ]', icon: 'fa-spa' },
    { id: 'muscle', name: 'ビルドアップ', type: 'buff', attr: 'hp', effect: 'maxhp_up', val: 5, add_action: true, exhaust: true, desc: '初回のみ最大HP+5。HP5回復。続けて行動。[1回のみ]', icon: 'fa-heartbeat' },
    { id: 'counter', name: '構える', type: 'def', attr: 'common', val: 15, desc: 'ブロック15を得る。', icon: 'fa-hand-paper' },
    { id: 'life_share', name: '生命転換', type: 'phys', attr: 'hp', val: 0, extra: 'hp_dmg_half', scale: 0.35, desc: '現在HPの35%分のダメージを与える。', icon: 'fa-balance-scale' },
    { id: 'endure', name: '不屈', type: 'def', attr: 'hp', val: 30, exhaust: true, desc: 'ブロック30を得る。[1回のみ]', icon: 'fa-mountain' },
    { id: 'body_press', name: 'ボディプレス', type: 'phys', attr: 'hp', val: 0, extra: 'maxhp_scale', desc: '最大HPの25%ダメージ。', icon: 'fa-weight-hanging' },
    { id: 'fortify', name: '要塞化', type: 'def', attr: 'hp', val: 12, effect: 'retain_block', exhaust: true, desc: 'ブロック12。次のターンまでブロックを保持。[1回のみ]', icon: 'fa-chess-rook' },
    { id: 'second_wind', name: '底力', type: 'heal', attr: 'hp', val: 12, extra: 'low_hp_double', exhaust: true, desc: 'HP12回復。HP半分以下なら24回復。[1回のみ]', icon: 'fa-heart' },
    { id: 'spikes', name: 'トゲの鎧', type: 'def', attr: 'hp', val: 9, thorns: 3, desc: 'ブロック9。この戦闘中、反撃3を得る。', icon: 'fa-sun' },
    { id: 'iron_will', name: '鋼の意志', type: 'def', attr: 'hp', val: 6, extra: 'missing_hp_block', desc: 'ブロック6＋失ったHPの20%。', icon: 'fa-shield-alt' },
    { id: 'dragon_fist', name: 'ドラゴン拳', type: 'phys', attr: 'str', val: 5.0, exhaust: true, rarity: 'rare', pool: 'str', desc: '攻撃力の500%の超ダメージ。[1回のみ]', icon: 'fa-dragon' },
    { id: 'blood_sucker', name: '吸血撃', type: 'phys', attr: 'str', val: 2.0, extra: 'drain', rarity: 'rare', pool: 'str', desc: '攻撃200%ダメ。与ダメの50%回復。', icon: 'fa-tint' },
    { id: 'god_strength', name: '鬼神化', type: 'buff', attr: 'str', effect: 'str_up', val: 5, add_action: true, exhaust: true, rarity: 'rare', pool: 'str', desc: 'この戦闘中、攻撃力+5。続けて行動。[1回のみ]', icon: 'fa-mask' },
    { id: 'meteor', name: 'メテオ', type: 'mag', attr: 'int', val: 6.0, exhaust: true, rarity: 'rare', pool: 'int', desc: '魔力600%の破壊的ダメージ。[1回のみ]', icon: 'fa-meteor' },
    { id: 'time_warp', name: '時渡り', type: 'skill', attr: 'int', effect: 'action_up', val: 2, exhaust: true, rarity: 'rare', pool: 'int', desc: '次ターンの行動回数+2。[1回のみ]', icon: 'fa-hourglass-half' },
    { id: 'absolute_barrier', name: '絶対防御', type: 'def', attr: 'int', val: 50, exhaust: true, rarity: 'rare', pool: 'int', desc: 'ブロック50を得る。[1回のみ]', icon: 'fa-shield-virus' },
    { id: 'titan_body', name: '巨人の体', type: 'buff', attr: 'hp', effect: 'maxhp_up', val: 20, exhaust: true, rarity: 'rare', pool: 'hp', desc: '初回のみ最大HP+20。HP20回復。[1回のみ]', icon: 'fa-mountain' },
    
    // --- 体力型調整 ---
    { id: 'grand_slam', name: 'プレス', type: 'phys', attr: 'hp', val: 0, extra: 'hp_halve_press', scale: 0.3, extraMult: 2.5, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '現在HPを30%消費し、その2.5倍のダメージ。[1回のみ]', icon: 'fa-weight-hanging' },
    { id: 'super_heal', name: '大回復', type: 'heal', attr: 'hp', val: 50, exhaust: true, rarity: 'rare', pool: 'hp', desc: 'HPを50回復する。[1回のみ]', icon: 'fa-first-aid' },
    
    // --- 体力型追加カード ---
    { id: 'shield_bash', name: 'シールドバッシュ', type: 'def', attr: 'hp', val: 5, add_action: true, pool: 'hp', desc: 'ブロック5。続けて行動できる。', icon: 'fa-shield-alt' },
    { id: 'vitality', name: '活力', type: 'heal', attr: 'hp', val: 5, add_action: true, exhaust: true, pool: 'hp', desc: 'HP5回復。続けて行動。[1回のみ]', icon: 'fa-leaf' },
    { id: 'castle_gate', name: '城門', type: 'phys', attr: 'hp', val: 0, extra: 'block_dmg', extraMult: 1.5, consumeBlock: true, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '全ブロックを消費し、その1.5倍のダメージ。[1回のみ]', icon: 'fa-dungeon' },
    { id: 'berserker', name: '狂戦士', type: 'buff', attr: 'str', effect: 'berserk', val: 2, add_action: true, exhaust: true, rarity: 'rare', pool: 'str', desc: '攻撃+2。失ったHP10ごとにさらに攻撃+1。[1回のみ]', icon: 'fa-angry' },
    { id: 'echo_spell', name: '残響魔法', type: 'skill', attr: 'int', effect: 'echo', add_action: true, exhaust: true, rarity: 'rare', pool: 'int', desc: '次に与える魔法ダメージをもう一度与える。続けて行動。[1回のみ]', icon: 'fa-clone' },
    { id: 'immortal', name: '不死身', type: 'skill', attr: 'hp', effect: 'immortal', add_action: true, exhaust: true, rarity: 'rare', pool: 'hp', desc: 'この戦闘で一度だけ致死ダメージをHP1で耐える。[1回のみ]', icon: 'fa-ankh' },
    { id: 'infinite_blades', name: '無限連斬', type: 'phys', attr: 'str', val: 0.7, hits: 6, exhaust: true, rarity: 'rare', pool: 'str', limit: 1, desc: '攻撃70%の6連撃。コンボ補正が全段に乗る。[1回のみ]', icon: 'fa-khanda' },
    { id: 'limit_break', name: '限界突破', type: 'buff', attr: 'str', effect: 'limit_break', val: 7, add_action: true, exhaust: true, rarity: 'rare', pool: 'str', limit: 1, desc: 'この戦闘中、攻撃+7。HPを8失う（HP1未満にならない）。続けて行動。[1回のみ]', icon: 'fa-bolt' },
    { id: 'black_hole', name: 'ブラックホール', type: 'mag', attr: 'int', val: 4.0, burn: 8, vulnerable: 1, exhaust: true, rarity: 'rare', pool: 'int', limit: 1, desc: '魔力400%ダメージ。炎上8と脆弱を付与。[1回のみ]', icon: 'fa-circle-notch' },
    { id: 'absolute_zero', name: '絶対零度', type: 'mag', attr: 'int', val: 3.2, freeze: true, exhaust: true, rarity: 'rare', pool: 'int', limit: 1, desc: '魔力320%ダメージ。敵の次の行動を封じる。[1回のみ]', icon: 'fa-icicles' },
    { id: 'world_tree', name: '世界樹の加護', type: 'buff', attr: 'hp', effect: 'world_tree', val: 25, add_action: true, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '初回のみ最大HP+25。HP25回復、反撃5。続けて行動。[1回のみ]', icon: 'fa-tree' },
    { id: 'aegis', name: '神盾イージス', type: 'def', attr: 'hp', val: 0, extra: 'maxhp_block', scale: 0.5, thorns: 5, exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '最大HPの50%（最大60）ブロックと反撃5。[1回のみ]', icon: 'fa-shield-virus' },
    { id: 'masters_read', name: '剣聖の見切り', type: 'phys', attr: 'str', val: 2.4, extra: 'intent_counter', exhaust: true, rarity: 'rare', pool: 'str', limit: 1, desc: '攻撃240%。敵が強攻撃・吸収なら480%になり、予告値のブロック。[1回のみ]', icon: 'fa-user-ninja' },
    { id: 'causal_reverse', name: '因果反転', type: 'def', attr: 'int', val: 0, extra: 'intent_block', exhaust: true, rarity: 'rare', pool: 'int', limit: 1, desc: '予告ダメージ分をブロック。防いだ値を最大30まで次の魔法へ変換。[1回のみ]', icon: 'fa-yin-yang' },
    { id: 'revenge_fortress', name: '報復要塞', type: 'def', attr: 'hp', val: 0, extra: 'revenge_guard', exhaust: true, rarity: 'rare', pool: 'hp', limit: 1, desc: '予告値＋失ったHP20%をブロック。次の攻撃で防いだ値を反射。[1回のみ]', icon: 'fa-chess-rook' },
];

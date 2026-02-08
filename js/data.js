// --- 定数とデータ定義 ---

export const CONSTANTS = {
    TRAIN_COST: 15,
    HP_GAIN: 10,
    STAT_GAIN: 2,
    REST_RECOVERY_RATE: 0.75,
    DRAW_COUNT: 3,
    COST_UPGRADE: 30,
    COST_REMOVE: 50,
    COST_BUY: 40
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
    { id: 'defend', name: '防御', type: 'def', attr: 'common', val: 10, desc: 'ブロック10を得る。', icon: 'fa-shield-alt' },
    { id: 'quick_think', name: '思考加速', type: 'skill', attr: 'common', add_action: true, draw: 2, exhaust: true, limit: 2, desc: '2枚引いて行動権+1。[1回のみ/デッキ2枚まで]', icon: 'fa-brain' },
    { id: 'prepare', name: '仕込み', type: 'skill', attr: 'common', effect: 'next_draw', val: 2, desc: '次のターン開始時に2枚多く引く。', icon: 'fa-toolbox' },
    { id: 'meditate', name: '瞑想', type: 'skill', attr: 'common', effect: 'action_up', val: 1, add_action: true, desc: '次のターン行動回数+1。続けて行動可。', icon: 'fa-om' },
    { id: 'cheer', name: '声援', type: 'buff', attr: 'common', effect: 'str_up', val: 1, add_action: true, draw: 1, desc: '攻撃+1。1枚引く。続けて行動可。', icon: 'fa-bullhorn' },
    { id: 'tackle', name: 'タックル', type: 'phys', attr: 'str', val: 0.5, extra: 'hp_scale', desc: '攻撃50% + 現在HPの10%ダメージ。', icon: 'fa-football-ball' },
    { id: 'rage', name: '激怒', type: 'buff', attr: 'str', effect: 'str_up', val: 3, add_action: true, desc: '攻撃力+3。続けて行動できる。', icon: 'fa-fire' },
    { id: 'multi', name: '連続拳', type: 'phys', attr: 'str', val: 0.7, hits: 2, add_action: true, desc: '70%の2回攻撃。続けて行動できる。', icon: 'fa-users' },
    { id: 'heavy', name: '本気パンチ', type: 'phys', attr: 'str', val: 4.0, exhaust: true, desc: '攻撃力の400%の大ダメージ。[1回のみ]', icon: 'fa-hammer' },
    { id: 'quick', name: 'ジャブ', type: 'phys', attr: 'str', val: 0.8, add_action: true, desc: '攻撃80%ダメ。続けて行動できる。', icon: 'fa-wind' },
    { id: 'life_burn', name: '羅刹撃', type: 'phys', attr: 'str', val: 3.5, self_dmg: 5, desc: '攻撃350%ダメ。自分も5ダメ受ける。', icon: 'fa-skull-crossbones' },
    { id: 'draw_slash', name: '燕返し', type: 'phys', attr: 'str', val: 1.5, draw: 1, desc: '攻撃150%ダメ。カードを1枚引く。', icon: 'fa-feather-alt' },
    { id: 'fireball', name: '炎魔法', type: 'mag', attr: 'int', val: 2.5, exhaust: true, desc: '魔力の250%魔法ダメージ。[1回のみ]', icon: 'fa-fire-alt' },
    { id: 'barrier', name: 'バリア', type: 'def', attr: 'int', val: 2.0, desc: '魔力200%分のブロックを得る。', icon: 'fa-shield-alt' },
    { id: 'thunder', name: '雷撃', type: 'mag', attr: 'int', val: 1.5, add_action: true, desc: '魔力150%ダメ。続けて行動できる。', icon: 'fa-poo-storm' },
    { id: 'mana_charge', name: '魔力充填', type: 'buff', attr: 'int', effect: 'int_up', val: 3, add_action: true, desc: '魔力+3。続けて行動できる。', icon: 'fa-magic' },
    { id: 'grimoire', name: '魔道書', type: 'skill', attr: 'int', draw: 1, effect: 'reduce_cost', desc: '1枚引き、次の魔法ダメ+5。', icon: 'fa-book-open' }, 
    { id: 'future_sight', name: '未来予知', type: 'skill', attr: 'int', effect: 'next_draw', val: 3, exhaust: true, desc: '次のターン3枚多く引く。[1回のみ]', icon: 'fa-eye' },
    { id: 'bandage', name: '絆創膏', type: 'heal', attr: 'hp', val: 10, exhaust: true, desc: 'HP10回復。[1回のみ]', icon: 'fa-band-aid' },
    { id: 'rest', name: '深呼吸', type: 'heal', attr: 'hp', val: 25, exhaust: true, desc: 'HP25回復。[1回のみ]', icon: 'fa-spa' },
    { id: 'muscle', name: 'ビルドアップ', type: 'buff', attr: 'hp', effect: 'maxhp_up', val: 5, add_action: true, desc: '最大HP+5、HP5回復。続けて行動できる。', icon: 'fa-heartbeat' },
    { id: 'counter', name: '構える', type: 'def', attr: 'common', val: 15, desc: 'ブロック15を得る。', icon: 'fa-hand-paper' },
    { id: 'life_share', name: '生命転換', type: 'phys', attr: 'hp', val: 0, extra: 'hp_dmg_half', desc: '現在HPの50%分のダメージを与える。', icon: 'fa-balance-scale' },
    { id: 'endure', name: '不屈', type: 'def', attr: 'hp', val: 30, exhaust: true, desc: 'ブロック30を得る。[1回のみ]', icon: 'fa-mountain' },
    { id: 'dragon_fist', name: 'ドラゴン拳', type: 'phys', attr: 'str', val: 5.0, exhaust: true, rarity: 'rare', pool: 'str', desc: '攻撃力の500%の超ダメージ。[1回のみ]', icon: 'fa-dragon' },
    { id: 'blood_sucker', name: '吸血撃', type: 'phys', attr: 'str', val: 2.0, extra: 'drain', rarity: 'rare', pool: 'str', desc: '攻撃200%ダメ。与ダメの50%回復。', icon: 'fa-tint' },
    { id: 'god_strength', name: '鬼神化', type: 'buff', attr: 'str', effect: 'str_up', val: 5, add_action: true, rarity: 'rare', pool: 'str', desc: '攻撃力+5。続けて行動できる。', icon: 'fa-mask' },
    { id: 'meteor', name: 'メテオ', type: 'mag', attr: 'int', val: 6.0, exhaust: true, rarity: 'rare', pool: 'int', desc: '魔力600%の破壊的ダメージ。[1回のみ]', icon: 'fa-meteor' },
    { id: 'time_warp', name: '時渡り', type: 'skill', attr: 'int', effect: 'action_up', val: 2, exhaust: true, rarity: 'rare', pool: 'int', desc: '次ターンの行動回数+2。[1回のみ]', icon: 'fa-hourglass-half' },
    { id: 'absolute_barrier', name: '絶対防御', type: 'def', attr: 'int', val: 50, exhaust: true, rarity: 'rare', pool: 'int', desc: 'ブロック50を得る。[1回のみ]', icon: 'fa-shield-virus' },
    { id: 'titan_body', name: '巨人の体', type: 'buff', attr: 'hp', effect: 'maxhp_up', val: 20, rarity: 'rare', pool: 'hp', desc: '最大HP+20、HP20回復。', icon: 'fa-mountain' },
    { id: 'grand_slam', name: 'プレス', type: 'phys', attr: 'hp', val: 0, extra: 'hp_dmg', rarity: 'rare', pool: 'hp', desc: '現在のHPと同じダメージを与える。', icon: 'fa-weight-hanging' },
    { id: 'super_heal', name: '大回復', type: 'heal', attr: 'hp', val: 50, exhaust: true, rarity: 'rare', pool: 'hp', desc: 'HPを50回復する。[1回のみ]', icon: 'fa-first-aid' },
];

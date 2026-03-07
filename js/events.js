/**
 * 《少年派的奇幻漂流》生存冒险游戏 - 事件系统模块（困难版）
 *
 * 管理随机事件池、关键剧情事件、Debuff系统和老虎攻击判定。
 */

class EventSystem {
    constructor() {
        this._triggeredStoryIds = new Set();
        this._pendingFollowUp = null;
        this._activeDebuffs = [];
        this._boatRepaired = false;
    }

    /**
     * 重置事件系统状态（新游戏时调用）。
     */
    reset() {
        this._triggeredStoryIds.clear();
        this._pendingFollowUp = null;
        this._activeDebuffs = [];
        this._boatRepaired = false;
    }

    /**
     * 检查当前天是否有事件需要触发。
     *
     * @param {number} day - 当前天数
     * @param {object} resources - 当前资源 {food, water, stamina, tigerBond, faith}
     * @returns {object|null} 事件对象，或 null 表示无事件
     */
    checkEvent(day, resources) {
        // 优先处理后续事件链
        if (this._pendingFollowUp) {
            const followUp = this._findFollowUpEvent(this._pendingFollowUp);
            this._pendingFollowUp = null;
            if (followUp) {
                return followUp;
            }
        }

        // 检查关键剧情事件（优先级最高）
        const storyEvent = this._checkStoryEvent(day);
        if (storyEvent) {
            return storyEvent;
        }

        // 老虎突袭判定（tigerBond 低时）
        const tigerAttack = this._checkTigerAttack(resources);
        if (tigerAttack) {
            return tigerAttack;
        }

        // 随机事件触发判定
        if (Math.random() < GameData.GAME_CONFIG.EVENT_TRIGGER_CHANCE) {
            return this._pickRandomEvent(resources);
        }

        return null;
    }

    /**
     * 处理玩家在事件中的选择。
     *
     * @param {object} event - 当前事件对象
     * @param {number} choiceIndex - 选择的选项索引
     * @returns {{effects: object, resultText: string, debuff: string|null}} 选择的效果和结果文本
     */
    processChoice(event, choiceIndex) {
        const choice = event.choices[choiceIndex];
        if (!choice) {
            return {effects: {}, resultText: '什么都没有发生。', debuff: null};
        }

        // 检查是否有后续事件
        if (choice.followUpEvent) {
            this._pendingFollowUp = choice.followUpEvent;
        }

        // 检查特殊标签
        if (choice.specialTag === 'repair' || (event.id === 'boat_leak' && choiceIndex === 0)) {
            this._boatRepaired = true;
        }

        return {
            effects: choice.effects || {},
            resultText: choice.resultText || '',
            debuff: choice.debuff || null,
        };
    }

    /**
     * 检查是否有待触发的后续事件。
     *
     * @returns {boolean}
     */
    hasPendingFollowUp() {
        return this._pendingFollowUp !== null;
    }

    // ============================================================
    // Debuff 系统
    // ============================================================

    /**
     * 添加一个 debuff。
     *
     * @param {string} debuffTypeKey - DEBUFF_TYPES 中的 key
     */
    addDebuff(debuffTypeKey) {
        const debuffType = GameData.DEBUFF_TYPES[debuffTypeKey];
        if (!debuffType) {
            return;
        }

        // 同类 debuff 不叠加，刷新持续时间
        const existing = this._activeDebuffs.find((d) => d.id === debuffType.id);
        if (existing) {
            existing.remainingDays = debuffType.duration;
            return;
        }

        this._activeDebuffs.push({
            ...debuffType,
            remainingDays: debuffType.duration,
        });
    }

    /**
     * 处理每日 debuff 效果，并递减持续时间。
     *
     * @returns {{effects: object, expiredDebuffs: Array, actionPenalty: number}}
     */
    processDailyDebuffs() {
        const combinedEffects = {};
        const expiredDebuffs = [];
        let actionPenalty = 1.0;

        for (let i = this._activeDebuffs.length - 1; i >= 0; i--) {
            const debuff = this._activeDebuffs[i];

            // 叠加每日效果
            if (debuff.dailyEffects) {
                for (const [key, val] of Object.entries(debuff.dailyEffects)) {
                    combinedEffects[key] = (combinedEffects[key] || 0) + val;
                }
            }

            // 叠加行动惩罚
            if (debuff.actionPenalty) {
                actionPenalty *= debuff.actionPenalty;
            }

            // 递减持续时间
            debuff.remainingDays--;
            if (debuff.remainingDays <= 0) {
                expiredDebuffs.push(debuff);
                this._activeDebuffs.splice(i, 1);
            }
        }

        return {effects: combinedEffects, expiredDebuffs, actionPenalty};
    }

    /**
     * 获取当前活跃的 debuff 列表。
     *
     * @returns {Array}
     */
    getActiveDebuffs() {
        return [...this._activeDebuffs];
    }

    /**
     * 获取当前 debuff 对行动效果的惩罚系数。
     *
     * @returns {number}
     */
    getActionPenalty() {
        let penalty = 1.0;
        for (const debuff of this._activeDebuffs) {
            if (debuff.actionPenalty) {
                penalty *= debuff.actionPenalty;
            }
        }
        return penalty;
    }

    /**
     * 获取船只修复状态。
     *
     * @returns {boolean}
     */
    getBoatRepaired() {
        return this._boatRepaired;
    }

    // ============================================================
    // 老虎突袭判定
    // ============================================================

    /**
     * 当老虎羁绊过低时，有概率发生突袭事件。
     *
     * @param {object} resources - 当前资源
     * @returns {object|null}
     * @private
     */
    _checkTigerAttack(resources) {
        const config = GameData.GAME_CONFIG;
        if (resources.tigerBond > config.TIGER_ATTACK_THRESHOLD) {
            return null;
        }

        // 羁绊越低，攻击概率越高
        const bondRatio = resources.tigerBond / config.TIGER_ATTACK_THRESHOLD;
        const attackChance = config.TIGER_ATTACK_CHANCE * (1 - bondRatio) + 0.05;

        if (Math.random() > attackChance) {
            return null;
        }

        return {
            id: 'tiger_sudden_attack',
            title: '帕克突然袭击！',
            description: '理查德·帕克毫无征兆地向你扑来！它的爪子在你面前挥过。'
                + '你必须立刻反应，否则会有生命危险！',
            illustration: 'evt-tiger-attack',
            choices: [
                {
                    text: '用船桨防御并反击',
                    effects: {stamina: -20, tigerBond: 5, faith: 3},
                    resultText: '你用船桨挡住了帕克的攻击，大声呐喊。帕克退缩了，但你已经筋疲力尽。',
                    debuff: 'INJURED',
                },
                {
                    text: '扔食物转移它的注意力',
                    effects: {food: -15, tigerBond: 3, stamina: -8},
                    resultText: '你慌忙扔出食物，帕克被吸引住了。你侥幸逃过一劫，但食物储备更少了。',
                },
                {
                    text: '跳入海中躲避',
                    effects: {stamina: -15, water: -5, tigerBond: -8, faith: -5},
                    resultText: '你跳入冰冷的海水中。帕克在船上咆哮。你挣扎着爬回船上，又冷又怕。你在帕克眼中越来越弱小。',
                    debuff: 'SICK',
                },
            ],
        };
    }

    // ============================================================
    // 内部方法
    // ============================================================

    /**
     * 检查关键剧情事件。
     *
     * @param {number} day - 当前天数
     * @returns {object|null}
     * @private
     */
    _checkStoryEvent(day) {
        for (const event of GameData.STORY_EVENTS) {
            if (event.triggerDay === day && event.once && !this._triggeredStoryIds.has(event.id)) {
                this._triggeredStoryIds.add(event.id);
                return event;
            }
        }
        return null;
    }

    /**
     * 查找后续事件（用于事件链）。
     *
     * @param {string} eventId - 后续事件 ID
     * @returns {object|null}
     * @private
     */
    _findFollowUpEvent(eventId) {
        const event = GameData.STORY_EVENTS.find((e) => e.id === eventId);
        if (event && !this._triggeredStoryIds.has(event.id)) {
            this._triggeredStoryIds.add(event.id);
            return event;
        }
        return null;
    }

    /**
     * 根据权重从随机事件池中抽取事件。
     *
     * @param {object} resources - 当前资源状态
     * @returns {object|null}
     * @private
     */
    _pickRandomEvent(resources) {
        const events = GameData.RANDOM_EVENTS;
        if (!events || events.length === 0) {
            return null;
        }

        const gameState = {boatRepaired: this._boatRepaired};

        // 计算每个事件的实际权重（支持动态权重）
        const weightedEvents = events.map((event) => {
            let weight = event.weight;
            if (typeof event.dynamicWeight === 'function') {
                weight = event.dynamicWeight(resources, gameState);
            }
            return {event, weight};
        });

        // 计算总权重
        const totalWeight = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
        if (totalWeight <= 0) {
            return null;
        }

        // 加权随机抽取
        let roll = Math.random() * totalWeight;
        for (const item of weightedEvents) {
            roll -= item.weight;
            if (roll <= 0) {
                return item.event;
            }
        }

        return weightedEvents[weightedEvents.length - 1].event;
    }

    /**
     * 获取事件的插图 Emoji。
     *
     * @param {object} event - 事件对象
     * @returns {string} emoji
     */
    getEventEmoji(event) {
        const emojiMap = {
            'evt-calm': '🌊',
            'evt-rain': '🌧️',
            'evt-storm': '⛈️',
            'evt-flyfish': '🐟',
            'evt-turtle': '🐢',
            'evt-tiger': '🐅',
            'evt-tiger-attack': '🐅💥',
            'evt-debris': '📦',
            'evt-sun': '☀️',
            'evt-stars': '✨',
            'evt-glow': '🌌',
            'evt-dolphin': '🐬',
            'evt-start': '⛵',
            'evt-whale': '🐋',
            'evt-island': '🏝️',
            'evt-island-night': '💀',
            'evt-victory': '🌅',
            'evt-shark': '🦈',
            'evt-leak': '🕳️',
            'evt-ship': '🚢',
            'evt-rot': '🦠',
            'evt-night': '🌑',
            'evt-sting': '🪼',
            'evt-fog': '🌫️',
            'evt-faith': '✝️',
        };
        return emojiMap[event.illustration] || '❓';
    }
}

// 导出
window.EventSystem = EventSystem;

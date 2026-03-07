/**
 * 《少年派的奇幻漂流》生存冒险游戏 - 核心引擎（困难版）
 *
 * 管理游戏状态机、每日循环、资源管理、Debuff处理、胜负判定，整合所有模块。
 */

// ============================================================
// ResourceManager - 资源管理器
// ============================================================
class ResourceManager {
    constructor() {
        this._resources = {};
        this.reset();
    }

    /**
     * 重置到初始资源值。
     */
    reset() {
        this._resources = {...GameData.INITIAL_RESOURCES};
    }

    /**
     * 获取当前资源（只读副本）。
     *
     * @returns {object}
     */
    getResources() {
        return {...this._resources};
    }

    /**
     * 应用资源效果。
     *
     * @param {object} effects - 资源变化 {food: +10, water: -5, ...}
     * @param {number} multiplier - 正向效果的乘数（用于难度缩放）
     */
    applyEffects(effects, multiplier = 1.0) {
        if (!effects) {
            return;
        }

        for (const [key, value] of Object.entries(effects)) {
            if (this._resources[key] === undefined) {
                continue;
            }
            const adjusted = value > 0 ? value * multiplier : value;
            this._resources[key] = Math.max(
                GameData.GAME_CONFIG.RESOURCE_MIN,
                Math.min(GameData.GAME_CONFIG.RESOURCE_MAX, this._resources[key] + adjusted)
            );
        }
    }

    /**
     * 应用每日基础消耗。
     *
     * @param {number} consumptionMultiplier - 消耗倍率
     */
    applyDailyConsumption(consumptionMultiplier = 1.0) {
        for (const [key, value] of Object.entries(GameData.DAILY_CONSUMPTION)) {
            if (this._resources[key] !== undefined) {
                this._resources[key] = Math.max(
                    GameData.GAME_CONFIG.RESOURCE_MIN,
                    this._resources[key] + value * consumptionMultiplier
                );
            }
        }
    }

    /**
     * 检查是否有资源归零（死亡判定）。
     *
     * @returns {string|null} 归零的资源 key，或 null
     */
    checkDeath() {
        for (const key of Object.keys(GameData.INITIAL_RESOURCES)) {
            if (this._resources[key] <= 0) {
                return key;
            }
        }
        return null;
    }
}

// ============================================================
// GameEngine - 核心游戏引擎
// ============================================================
class GameEngine {
    constructor() {
        this._state = GameData.GameState.INTRO;
        this._day = 1;
        this._actionsRemaining = GameData.GAME_CONFIG.ACTIONS_PER_DAY;
        this._currentEvent = null;

        // 统计数据
        this._stats = {
            days: 0,
            actionsTotal: 0,
            eventsEncountered: 0,
            fishCaught: 0,
            debuffsSuffered: 0,
            tigerAttacksSurvived: 0,
        };

        // 初始化子系统
        this._resourceManager = new ResourceManager();
        this._eventSystem = new EventSystem();
        this._ui = new UIManager({
            onActionClick: (action) => this._handleAction(action),
            onEventChoice: (index) => this._handleEventChoice(index),
            onContinue: () => this._handleContinue(),
        });

        // 启动开场动画
        this._ui.playIntro();
    }

    // ============================================================
    // 公共接口
    // ============================================================

    /**
     * 从开场进入游戏（按钮点击时调用）。
     */
    startGame() {
        if (this._state !== GameData.GameState.INTRO) {
            return;
        }

        this._state = GameData.GameState.PLAYING;
        this._day = 1;
        this._actionsRemaining = GameData.GAME_CONFIG.ACTIONS_PER_DAY;
        this._resourceManager.reset();
        this._eventSystem.reset();
        this._ui.clearLog();

        // 切换到游戏场景
        this._ui.switchScene('game');

        // 刷新 UI
        this._refreshUI();

        // 第1天触发教学事件
        setTimeout(() => this._checkAndTriggerEvent(), 600);
    }

    /**
     * 重新开始游戏。
     */
    restart() {
        this._state = GameData.GameState.PLAYING;
        this._day = 1;
        this._actionsRemaining = GameData.GAME_CONFIG.ACTIONS_PER_DAY;
        this._stats = {
            days: 0,
            actionsTotal: 0,
            eventsEncountered: 0,
            fishCaught: 0,
            debuffsSuffered: 0,
            tigerAttacksSurvived: 0,
        };
        this._resourceManager.reset();
        this._eventSystem.reset();
        this._ui.clearLog();

        this._ui.switchScene('game');
        this._refreshUI();

        setTimeout(() => this._checkAndTriggerEvent(), 600);
    }

    // ============================================================
    // 行动处理
    // ============================================================

    /**
     * 处理玩家选择的行动。
     *
     * @param {object} action - 行动定义
     * @private
     */
    _handleAction(action) {
        if (this._state !== GameData.GameState.PLAYING || this._actionsRemaining <= 0) {
            return;
        }

        const difficulty = GameData.getDifficultyForDay(this._day);
        // debuff 行动惩罚
        const debuffPenalty = this._eventSystem.getActionPenalty();
        const effectiveMultiplier = difficulty.effectMultiplier * debuffPenalty;
        let logText = '';

        if (action.isRandom && action.outcomes) {
            // 随机结果行动（如探索）
            const roll = Math.random();
            let cumulative = 0;
            for (const outcome of action.outcomes) {
                cumulative += outcome.chance;
                if (roll <= cumulative) {
                    this._resourceManager.applyEffects(outcome.effects, effectiveMultiplier);
                    logText = `${action.icon} ${action.name}：${outcome.text}`;
                    break;
                }
            }
        } else {
            // 普通行动
            this._resourceManager.applyEffects(action.effects, effectiveMultiplier);
            logText = `${action.icon} ${action.name}：执行完毕`;
        }

        // 修补船只特殊标签
        if (action.specialTag === 'repair') {
            this._eventSystem._boatRepaired = true;
            logText = `${action.icon} ${action.name}：船只已修补，漏水风险降低`;
        }

        // 统计
        this._actionsRemaining--;
        this._stats.actionsTotal++;
        if (action.id === 'fish') {
            this._stats.fishCaught++;
        }

        // 更新 UI
        this._ui.addLog(this._day, logText);
        this._refreshUI();

        // 检查死亡
        const deathKey = this._resourceManager.checkDeath();
        if (deathKey) {
            this._endGame(false, deathKey);
            return;
        }

        // 行动用完，结束这一天
        if (this._actionsRemaining <= 0) {
            setTimeout(() => this._endDay(), 400);
        }
    }

    // ============================================================
    // 每日结算
    // ============================================================

    /**
     * 结束当天，进入结算阶段。
     *
     * @private
     */
    async _endDay() {
        if (this._state !== GameData.GameState.PLAYING) {
            return;
        }

        const difficulty = GameData.getDifficultyForDay(this._day);

        // 应用每日消耗
        this._resourceManager.applyDailyConsumption(difficulty.consumptionMultiplier);

        // 应用 debuff 每日效果
        const debuffResult = this._eventSystem.processDailyDebuffs();
        if (debuffResult.effects && Object.keys(debuffResult.effects).length > 0) {
            this._resourceManager.applyEffects(debuffResult.effects, 1.0);
        }

        // 记录 debuff 变化
        for (const expired of debuffResult.expiredDebuffs) {
            this._ui.addLog(this._day, `💊 ${expired.name}已痊愈`);
        }

        // 信念低于阈值时额外消耗
        const resources = this._resourceManager.getResources();
        if (resources.faith < GameData.GAME_CONFIG.FAITH_DECAY_THRESHOLD) {
            const faithPenalty = {stamina: -2, tigerBond: -1};
            this._resourceManager.applyEffects(faithPenalty, 1.0);
        }

        // 检查死亡
        const deathKey = this._resourceManager.checkDeath();
        if (deathKey) {
            this._endGame(false, deathKey);
            return;
        }

        // 推进天数
        this._day++;
        this._stats.days = this._day;
        this._actionsRemaining = GameData.GAME_CONFIG.ACTIONS_PER_DAY;

        // 日夜过渡动画
        await this._ui.showDayTransition(this._day);

        // 更新天气
        this._updateWeather();

        // 刷新 UI
        this._refreshUI();

        // 检查是否触发事件
        this._checkAndTriggerEvent();
    }

    // ============================================================
    // 事件处理
    // ============================================================

    /**
     * 检查并触发事件。
     *
     * @private
     */
    _checkAndTriggerEvent() {
        const resources = this._resourceManager.getResources();
        const event = this._eventSystem.checkEvent(this._day, resources);

        if (event) {
            this._currentEvent = event;
            this._state = GameData.GameState.EVENT;
            this._stats.eventsEncountered++;

            // 记录老虎攻击统计
            if (event.id === 'tiger_sudden_attack') {
                this._stats.tigerAttacksSurvived++;
            }

            const emoji = this._eventSystem.getEventEmoji(event);
            this._ui.showEvent(event, emoji);
        }
    }

    /**
     * 处理玩家在事件中的选择。
     *
     * @param {number} choiceIndex - 选项索引
     * @private
     */
    _handleEventChoice(choiceIndex) {
        if (this._state !== GameData.GameState.EVENT || !this._currentEvent) {
            return;
        }

        const result = this._eventSystem.processChoice(this._currentEvent, choiceIndex);
        const difficulty = GameData.getDifficultyForDay(this._day);

        // 应用效果
        this._resourceManager.applyEffects(result.effects, difficulty.effectMultiplier);

        // 处理 debuff
        if (result.debuff) {
            this._eventSystem.addDebuff(result.debuff);
            this._stats.debuffsSuffered++;
            const debuffType = GameData.DEBUFF_TYPES[result.debuff];
            if (debuffType) {
                this._ui.addLog(this._day, `⚠️ 获得状态：${debuffType.icon} ${debuffType.name}（持续${debuffType.duration}天）`);
            }
        }

        // 日志
        this._ui.addLog(this._day, `📜 ${this._currentEvent.title}：${result.resultText}`);

        // 检查是否是胜利事件
        if (result.resultText === 'victory') {
            this._endGame(true, null);
            return;
        }

        // 更新资源 UI
        this._ui.updateResources(this._resourceManager.getResources());
        this._ui.updateDebuffs(this._eventSystem.getActiveDebuffs());

        // 检查死亡
        const deathKey = this._resourceManager.checkDeath();
        if (deathKey) {
            this._ui.showEventResult(result.resultText);
            setTimeout(() => this._endGame(false, deathKey), 1500);
            return;
        }

        // 显示事件结果
        this._ui.showEventResult(result.resultText);
    }

    /**
     * 事件结果确认后继续游戏。
     *
     * @private
     */
    _handleContinue() {
        this._currentEvent = null;
        this._state = GameData.GameState.PLAYING;

        // 检查是否有后续事件链
        if (this._eventSystem.hasPendingFollowUp()) {
            setTimeout(() => this._checkAndTriggerEvent(), 300);
            return;
        }

        this._ui.switchScene('game');
        this._refreshUI();
    }

    // ============================================================
    // 游戏结束
    // ============================================================

    /**
     * 结束游戏。
     *
     * @param {boolean} isVictory - 是否胜利
     * @param {string|null} failureKey - 失败原因资源 key
     * @private
     */
    _endGame(isVictory, failureKey) {
        this._state = GameData.GameState.GAMEOVER;
        this._stats.days = this._day;

        if (isVictory) {
            this._ui.showVictory(this._stats);
        } else {
            this._ui.showDefeat(failureKey, this._stats);
        }
    }

    // ============================================================
    // UI 刷新
    // ============================================================

    /**
     * 刷新所有游戏 UI。
     *
     * @private
     */
    _refreshUI() {
        const resources = this._resourceManager.getResources();

        this._ui.updateResources(resources);
        this._ui.updateDay(this._day, GameData.GAME_CONFIG.TARGET_DAYS);
        this._ui.updateActionsLeft(this._actionsRemaining);
        this._ui.updateDebuffs(this._eventSystem.getActiveDebuffs());
        this._ui.renderActions(
            GameData.ACTIONS,
            this._actionsRemaining,
            resources
        );
    }

    /**
     * 随机更新天气显示。
     *
     * @private
     */
    _updateWeather() {
        const weathers = GameData.WEATHER_DESCRIPTIONS;
        const weather = weathers[Math.floor(Math.random() * weathers.length)];
        this._ui.updateWeather(weather.icon, weather.text);
    }
}

// ============================================================
// 程序入口
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
});

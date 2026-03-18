/**
 * 《少年派的奇幻漂流》自动 AI Agent
 *
 * 智能策略引擎：根据资源状态自动选择最优行动和事件选项，
 * 自动从开场动画通关到第 227 天胜利。
 */

class GameAgent {
    constructor() {
        // Agent 状态
        this._enabled = false;
        this._speed = 'fast';  // normal / fast / turbo
        this._tickTimer = null;
        this._decisionLog = [];

        // 速度配置（tick 间隔 ms）
        this._speedConfig = {
            normal: 1200,
            fast: 400,
            turbo: 80,
        };

        // 原始延迟函数引用（用于猴子补丁）
        this._originalDelay = null;

        // 构建 UI 面板
        this._buildUI();

        // 等 DOM 就绪后初始化
        this._log('🤖 Agent 已加载，点击面板按钮启动');
    }

    // ============================================================
    // 策略引擎 — 行动选择
    // ============================================================

    /**
     * 根据当前资源状态选择最优行动。
     *
     * @param {object} resources - {food, water, stamina, tigerBond, faith}
     * @param {number} day - 当前天数
     * @returns {{action: object, reason: string}}
     */
    selectAction(resources, day) {
        const actions = GameData.ACTIONS;
        const difficulty = GameData.getDifficultyForDay(day);
        const effectMul = difficulty.effectMultiplier;

        // 计算每日消耗后的"净安全余量"
        const dailyDrain = {
            food: Math.abs(GameData.DAILY_CONSUMPTION.food) * difficulty.consumptionMultiplier,
            water: Math.abs(GameData.DAILY_CONSUMPTION.water) * difficulty.consumptionMultiplier,
            stamina: Math.abs(GameData.DAILY_CONSUMPTION.stamina) * difficulty.consumptionMultiplier,
            tigerBond: Math.abs(GameData.DAILY_CONSUMPTION.tigerBond) * difficulty.consumptionMultiplier,
            faith: Math.abs(GameData.DAILY_CONSUMPTION.faith) * difficulty.consumptionMultiplier,
        };

        // 计算各资源可以撑多少天
        const daysLeft = {
            food: resources.food / dailyDrain.food,
            water: resources.water / dailyDrain.water,
            stamina: resources.stamina / dailyDrain.stamina,
            tigerBond: resources.tigerBond / dailyDrain.tigerBond,
            faith: resources.faith / dailyDrain.faith,
        };

        // 紧急阈值
        const CRITICAL = 18;
        const LOW = 30;
        const SAFE = 50;

        // 规则引擎 — 按优先级判断
        // 规则 1：体力极低，必须休息
        if (resources.stamina < CRITICAL) {
            return this._pickAction(actions, 'rest', '⚡ 体力极低，必须休息');
        }

        // 规则 2：虎之羁绊极低，防止被攻击
        if (resources.tigerBond < 14) {
            // 训练老虎需要 food 和 stamina，检查是否承受得起
            if (resources.food > 15 && resources.stamina > 20) {
                return this._pickAction(actions, 'trainTiger', '🐾 羁绊极低，紧急训练老虎');
            }
            // 承受不起就先补给
            if (resources.food < 15) {
                return this._pickAction(actions, 'fish', '🐟 食物不足，无法训练老虎，先捕鱼');
            }
            if (resources.stamina < 20) {
                return this._pickAction(actions, 'rest', '⚡ 体力不足，无法训练老虎，先休息');
            }
        }

        // 规则 3：食物极低
        if (resources.food < CRITICAL) {
            if (resources.stamina > 20) {
                return this._pickAction(actions, 'fish', '🐟 食物极低，紧急捕鱼');
            }
            return this._pickAction(actions, 'rest', '⚡ 食物低但体力也不足，先休息');
        }

        // 规则 4：淡水极低
        if (resources.water < CRITICAL) {
            if (resources.stamina > 15) {
                return this._pickAction(actions, 'collectWater', '💧 淡水极低，紧急收集雨水');
            }
            return this._pickAction(actions, 'rest', '⚡ 淡水低但体力不足，先休息');
        }

        // 规则 5：信念极低
        if (resources.faith < 22) {
            if (resources.stamina > 15) {
                return this._pickAction(actions, 'pray', '🙏 信念极低，紧急祈祷');
            }
            return this._pickAction(actions, 'rest', '⚡ 信念低但体力不足，先休息');
        }

        // 规则 6：体力偏低
        if (resources.stamina < LOW) {
            return this._pickAction(actions, 'rest', '⚡ 体力偏低，休息恢复');
        }

        // 规则 7：中等优先级 — 找出最需要补充的资源
        const urgency = [
            {key: 'food', daysLeft: daysLeft.food, action: 'fish', icon: '🐟', name: '食物'},
            {key: 'water', daysLeft: daysLeft.water, action: 'collectWater', icon: '💧', name: '淡水'},
            {key: 'tigerBond', daysLeft: daysLeft.tigerBond, action: 'trainTiger', icon: '🐾', name: '羁绊'},
            {key: 'faith', daysLeft: daysLeft.faith, action: 'pray', icon: '🙏', name: '信念'},
        ];

        // 按可撑天数排序，最少的优先
        urgency.sort((a, b) => a.daysLeft - b.daysLeft);

        for (const item of urgency) {
            const act = actions.find((a) => a.id === item.action);
            if (!act) {
                continue;
            }

            // 检查行动是否会导致某资源归零
            if (this._wouldCauseDeath(act, resources, effectMul)) {
                continue;
            }

            // 如果该资源已经很安全就跳过
            if (resources[item.key] > SAFE && item.daysLeft > 10) {
                continue;
            }

            return {
                action: act,
                reason: `${item.icon} ${item.name}可撑${item.daysLeft.toFixed(1)}天，优先补充`,
            };
        }

        // 兜底：休息
        return this._pickAction(actions, 'rest', '😴 资源均衡，休息保持体力');
    }

    /**
     * 检查行动是否会导致资源归零。
     *
     * @param {object} action - 行动定义
     * @param {object} resources - 当前资源
     * @param {number} effectMul - 效果乘数
     * @returns {boolean}
     * @private
     */
    _wouldCauseDeath(action, resources, effectMul) {
        if (!action.effects || action.isRandom) {
            return false;
        }

        for (const [key, val] of Object.entries(action.effects)) {
            if (resources[key] === undefined) {
                continue;
            }
            // 负面效果不受乘数影响
            const adjusted = val < 0 ? val : val * effectMul;
            if (resources[key] + adjusted <= 2) {
                return true;
            }
        }
        return false;
    }

    /**
     * 从行动列表中根据 ID 获取行动。
     *
     * @param {Array} actions - 行动列表
     * @param {string} actionId - 行动 ID
     * @param {string} reason - 决策理由
     * @returns {{action: object, reason: string}}
     * @private
     */
    _pickAction(actions, actionId, reason) {
        const action = actions.find((a) => a.id === actionId);
        return {action, reason};
    }

    // ============================================================
    // 事件决策器
    // ============================================================

    /**
     * 为事件选择最优选项。
     *
     * @param {object} event - 事件对象
     * @param {object} resources - 当前资源
     * @returns {{choiceIndex: number, reason: string}}
     */
    selectEventChoice(event, resources) {
        // 硬编码致命事件
        if (event.id === 'story_island_night') {
            // 食人岛：必须选"离开"（索引 0），选 1 直接死亡
            return {choiceIndex: 0, reason: '⚠️ 食人岛！必须立刻离开'};
        }

        if (!event.choices || event.choices.length === 0) {
            return {choiceIndex: 0, reason: '无选项'};
        }

        // 只有一个选项
        if (event.choices.length === 1) {
            return {choiceIndex: 0, reason: '唯一选项'};
        }

        // 评分系统：为每个选项打分
        let bestIndex = 0;
        let bestScore = -Infinity;
        let bestReason = '';

        for (let i = 0; i < event.choices.length; i++) {
            const choice = event.choices[i];
            let score = 0;
            const reasons = [];

            // 计算资源效果得分
            if (choice.effects) {
                for (const [key, val] of Object.entries(choice.effects)) {
                    if (resources[key] === undefined) {
                        continue;
                    }

                    // 如果会导致资源归零，极大惩罚
                    if (val < 0 && resources[key] + val <= 0) {
                        score -= 1000;
                        reasons.push(`${key}会归零！`);
                        continue;
                    }

                    // 根据资源当前量给权重
                    // 资源越低，正收益越值钱，负消耗越痛苦
                    const urgencyWeight = this._getResourceUrgency(resources[key]);

                    if (val > 0) {
                        score += val * urgencyWeight * 1.5;
                    } else {
                        score += val * urgencyWeight;
                    }
                }
            }

            // Debuff 惩罚
            if (choice.debuff) {
                const debuffType = GameData.DEBUFF_TYPES[choice.debuff];
                if (debuffType) {
                    // 计算 debuff 总伤害
                    let debuffDamage = 0;
                    if (debuffType.dailyEffects) {
                        for (const val of Object.values(debuffType.dailyEffects)) {
                            debuffDamage += Math.abs(val) * debuffType.duration;
                        }
                    }
                    score -= debuffDamage * 2;
                    reasons.push(`debuff:${debuffType.name}(-${debuffDamage})`);
                }
            }

            // 如果结果是 victory，最高分
            if (choice.resultText === 'victory') {
                score = 99999;
                reasons.push('🏆 胜利！');
            }

            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
                bestReason = reasons.join(', ');
            }
        }

        const choiceName = event.choices[bestIndex].text;
        return {
            choiceIndex: bestIndex,
            reason: `选择「${choiceName}」${bestReason ? ' (' + bestReason + ')' : ''}`,
        };
    }

    /**
     * 获取资源紧急程度权重。
     *
     * @param {number} value - 当前资源值
     * @returns {number} 权重（越紧急越大）
     * @private
     */
    _getResourceUrgency(value) {
        if (value <= 10) {
            return 5.0;
        }
        if (value <= 20) {
            return 3.0;
        }
        if (value <= 35) {
            return 2.0;
        }
        if (value <= 50) {
            return 1.5;
        }
        return 1.0;
    }

    // ============================================================
    // 自动控制器
    // ============================================================

    /**
     * 启动 Agent。
     */
    start() {
        if (this._enabled) {
            return;
        }

        this._enabled = true;
        this._log('🚀 Agent 启动！');
        this._updateUIState();
        this._patchAnimations();
        this._tick();
    }

    /**
     * 停止 Agent。
     */
    stop() {
        this._enabled = false;

        if (this._tickTimer) {
            clearTimeout(this._tickTimer);
            this._tickTimer = null;
        }

        this._unpatchAnimations();
        this._log('⏹ Agent 已停止');
        this._updateUIState();
    }

    /**
     * Agent 主循环 tick。
     *
     * @private
     */
    _tick() {
        if (!this._enabled) {
            return;
        }

        const game = window.game;
        if (!game) {
            this._scheduleTick();
            return;
        }

        const state = game._state;

        switch (state) {
            case GameData.GameState.INTRO:
                this._handleIntro(game);
                break;

            case GameData.GameState.PLAYING:
                this._handlePlaying(game);
                break;

            case GameData.GameState.EVENT:
                this._handleEvent(game);
                break;

            case GameData.GameState.GAMEOVER:
                this._handleGameover(game);
                break;

            default:
                break;
        }

        this._scheduleTick();
    }

    /**
     * 调度下一次 tick。
     *
     * @private
     */
    _scheduleTick() {
        if (!this._enabled) {
            return;
        }
        const interval = this._speedConfig[this._speed] || 400;
        this._tickTimer = setTimeout(() => this._tick(), interval);
    }

    /**
     * 处理开场阶段。
     *
     * @param {object} game - GameEngine 实例
     * @private
     */
    _handleIntro(game) {
        // 尝试点击"开始漂流"按钮
        const btnStart = document.getElementById('btn-start');
        if (btnStart && btnStart.classList.contains('visible')) {
            this._log('⛵ 跳过开场，开始游戏');
            game.startGame();
            return;
        }

        // 如果按钮还没出现，尝试加速开场动画
        // 直接调用 startGame（如果状态允许）
        if (btnStart && !btnStart.classList.contains('visible')) {
            // 强制显示按钮
            btnStart.classList.add('visible');
        }
    }

    /**
     * 处理游戏进行阶段。
     *
     * @param {object} game - GameEngine 实例
     * @private
     */
    _handlePlaying(game) {
        if (game._actionsRemaining <= 0) {
            // 等待日结算完成
            return;
        }

        const resources = game._resourceManager.getResources();
        const day = game._day;

        // 选择行动
        const decision = this.selectAction(resources, day);
        if (!decision || !decision.action) {
            return;
        }

        this._log(`📅 第${day}天 | ${decision.reason}`);
        this._updateResourceDisplay(resources);

        // 执行行动
        game._handleAction(decision.action);
    }

    /**
     * 处理事件阶段。
     *
     * @param {object} game - GameEngine 实例
     * @private
     */
    _handleEvent(game) {
        const event = game._currentEvent;

        if (!event) {
            return;
        }

        // 检查是否已经在显示事件结果（需要点继续）
        const btnContinue = document.getElementById('btn-continue');
        if (btnContinue && btnContinue.classList.contains('visible')) {
            this._log('▶️ 继续');
            game._handleContinue();
            return;
        }

        // 检查是否还有选项按钮
        const choicesEl = document.getElementById('event-choices');
        if (!choicesEl || choicesEl.children.length === 0) {
            // 选项可能还没渲染好，等一下
            return;
        }

        const resources = game._resourceManager.getResources();
        const decision = this.selectEventChoice(event, resources);

        this._log(`📜 事件「${event.title}」| ${decision.reason}`);

        // 执行选择
        game._handleEventChoice(decision.choiceIndex);
    }

    /**
     * 处理游戏结束阶段。
     *
     * @param {object} game - GameEngine 实例
     * @private
     */
    _handleGameover(game) {
        const titleEl = document.getElementById('gameover-title');
        const isVictory = titleEl && titleEl.classList.contains('victory');

        if (isVictory) {
            this._log('🎉🎉🎉 通关成功！少年派到达了墨西哥海岸！');
        } else {
            const dayText = game._day || '?';
            this._log(`💀 第${dayText}天失败，准备重新开始...`);

            // 自动重启
            setTimeout(() => {
                if (this._enabled && game._state === GameData.GameState.GAMEOVER) {
                    this._log('🔄 自动重新开始...');
                    game.restart();
                }
            }, this._speed === 'turbo' ? 500 : 2000);
        }

        // 胜利后停止
        if (isVictory) {
            this.stop();
        }
    }

    // ============================================================
    // 动画加速（猴子补丁）
    // ============================================================

    /**
     * 替换 UI 延迟函数以加速动画。
     *
     * @private
     */
    _patchAnimations() {
        const game = window.game;
        if (!game || !game._ui) {
            return;
        }

        // 保存原始延迟函数
        this._originalDelay = game._ui._delay.bind(game._ui);

        // 根据速度替换
        const speedFactor = {
            normal: 1.0,
            fast: 0.15,
            turbo: 0.01,
        };

        const factor = speedFactor[this._speed] || 0.15;

        game._ui._delay = (ms) => {
            return new Promise((resolve) => setTimeout(resolve, Math.max(10, ms * factor)));
        };

        this._log(`⚡ 动画加速 x${Math.round(1 / factor)}`);
    }

    /**
     * 恢复原始动画速度。
     *
     * @private
     */
    _unpatchAnimations() {
        const game = window.game;
        if (game && game._ui && this._originalDelay) {
            game._ui._delay = this._originalDelay;
            this._originalDelay = null;
        }
    }

    // ============================================================
    // UI 控制面板
    // ============================================================

    /**
     * 构建浮动 UI 面板。
     *
     * @private
     */
    _buildUI() {
        // 面板容器
        const panel = document.createElement('div');
        panel.id = 'agent-panel';
        panel.innerHTML = `
            <style>
                #agent-panel {
                    position: fixed;
                    top: 12px;
                    right: 12px;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 13px;
                    user-select: none;
                }

                #agent-toggle-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.3);
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    color: #fff;
                    font-size: 22px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
                    margin-left: auto;
                }

                #agent-toggle-btn:hover {
                    transform: scale(1.1);
                    border-color: rgba(59,130,246,0.6);
                }

                #agent-toggle-btn.active {
                    border-color: #22c55e;
                    box-shadow: 0 0 20px rgba(34,197,94,0.4);
                    animation: agent-pulse 2s infinite;
                }

                @keyframes agent-pulse {
                    0%, 100% { box-shadow: 0 0 10px rgba(34,197,94,0.3); }
                    50% { box-shadow: 0 0 25px rgba(34,197,94,0.6); }
                }

                #agent-detail-panel {
                    display: none;
                    margin-top: 8px;
                    background: rgba(15, 23, 42, 0.92);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 12px;
                    padding: 12px;
                    min-width: 260px;
                    max-width: 320px;
                    color: #e2e8f0;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                }

                #agent-detail-panel.open {
                    display: block;
                }

                .agent-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #60a5fa;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .agent-speed-row {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 8px;
                }

                .agent-speed-btn {
                    flex: 1;
                    padding: 4px 0;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 6px;
                    background: transparent;
                    color: #94a3b8;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .agent-speed-btn:hover {
                    background: rgba(255,255,255,0.1);
                }

                .agent-speed-btn.active {
                    background: rgba(59,130,246,0.3);
                    border-color: #3b82f6;
                    color: #60a5fa;
                }

                #agent-log {
                    max-height: 180px;
                    overflow-y: auto;
                    font-size: 11px;
                    line-height: 1.6;
                    color: #94a3b8;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 8px;
                }

                #agent-log::-webkit-scrollbar {
                    width: 4px;
                }

                #agent-log::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 2px;
                }

                .agent-log-entry {
                    padding: 2px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }

                #agent-resource-preview {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-bottom: 6px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px 10px;
                }

                .agent-res-item {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }

                .agent-res-val {
                    font-weight: 600;
                    color: #e2e8f0;
                }

                .agent-res-val.low {
                    color: #f59e0b;
                }

                .agent-res-val.critical {
                    color: #ef4444;
                }

                .agent-stats-row {
                    font-size: 11px;
                    color: #64748b;
                    margin-bottom: 4px;
                }
            </style>

            <!-- 浮动切换按钮 -->
            <button id="agent-toggle-btn" title="AI Agent">🤖</button>

            <!-- 详细面板 -->
            <div id="agent-detail-panel">
                <div class="agent-title">🤖 AI Agent 控制台</div>

                <div id="agent-resource-preview"></div>

                <div class="agent-speed-row">
                    <button class="agent-speed-btn" data-speed="normal">🐢 正常</button>
                    <button class="agent-speed-btn active" data-speed="fast">🐇 快速</button>
                    <button class="agent-speed-btn" data-speed="turbo">⚡ 极速</button>
                </div>

                <div id="agent-stats" class="agent-stats-row"></div>

                <div id="agent-log"></div>
            </div>
        `;

        document.body.appendChild(panel);

        // 绑定事件
        const toggleBtn = document.getElementById('agent-toggle-btn');
        const detailPanel = document.getElementById('agent-detail-panel');

        toggleBtn.addEventListener('click', () => {
            // 长按展开面板，短按切换 Agent
            if (detailPanel.classList.contains('open')) {
                if (this._enabled) {
                    this.stop();
                } else {
                    this.start();
                }
            } else {
                detailPanel.classList.add('open');
            }
        });

        // 点击面板外关闭
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target)) {
                detailPanel.classList.remove('open');
            }
        });

        // 速度按钮
        const speedBtns = panel.querySelectorAll('.agent-speed-btn');
        speedBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = btn.dataset.speed;
                this._speed = speed;

                speedBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');

                // 如果正在运行，重新应用动画速度
                if (this._enabled) {
                    this._patchAnimations();
                }

                this._log(`🎚 速度切换: ${speed}`);
            });
        });
    }

    /**
     * 更新 UI 按钮状态。
     *
     * @private
     */
    _updateUIState() {
        const btn = document.getElementById('agent-toggle-btn');
        if (btn) {
            btn.classList.toggle('active', this._enabled);
            btn.textContent = this._enabled ? '🧠' : '🤖';
            btn.title = this._enabled ? 'Agent 运行中 — 点击停止' : 'AI Agent — 点击启动';
        }
    }

    /**
     * 更新资源预览显示。
     *
     * @param {object} resources - 当前资源
     * @private
     */
    _updateResourceDisplay(resources) {
        const el = document.getElementById('agent-resource-preview');
        if (!el) {
            return;
        }

        const items = [
            {icon: '🐟', key: 'food'},
            {icon: '💧', key: 'water'},
            {icon: '⚡', key: 'stamina'},
            {icon: '🐾', key: 'tigerBond'},
            {icon: '🙏', key: 'faith'},
        ];

        el.innerHTML = items.map((item) => {
            const val = Math.round(resources[item.key] || 0);
            const cls = val <= 10 ? 'critical' : (val <= 20 ? 'low' : '');
            return `<span class="agent-res-item">${item.icon}<span class="agent-res-val ${cls}">${val}</span></span>`;
        }).join('');
    }

    /**
     * 添加 Agent 日志。
     *
     * @param {string} text - 日志内容
     * @private
     */
    _log(text) {
        this._decisionLog.push(text);

        // 保持最近 100 条
        if (this._decisionLog.length > 100) {
            this._decisionLog.shift();
        }

        const logEl = document.getElementById('agent-log');
        if (!logEl) {
            return;
        }

        const entry = document.createElement('div');
        entry.className = 'agent-log-entry';
        entry.textContent = text;
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;

        // 保持最近 50 条 DOM
        while (logEl.children.length > 50) {
            logEl.removeChild(logEl.firstChild);
        }

        // 同时输出到控制台
        console.log(`[Agent] ${text}`);
    }
}

// ============================================================
// 启动 Agent
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 延迟一点，确保 GameEngine 已初始化
    setTimeout(() => {
        window.agent = new GameAgent();
    }, 500);
});

/**
 * 《少年派的奇幻漂流》生存冒险游戏 - UI 管理模块（困难版）
 *
 * 负责 Canvas 海浪动画、DOM 更新、场景切换、事件弹窗、Debuff显示和开场动画。
 */

class UIManager {
    /**
     * @param {object} callbacks - 回调函数 {onActionClick, onEventChoice, onContinue}
     */
    constructor(callbacks) {
        this._callbacks = callbacks || {};
        this._canvas = document.getElementById('wave-canvas');
        this._ctx = this._canvas.getContext('2d');
        this._animFrameId = null;
        this._waveOffset = 0;
        this._timeOfDay = 0;

        // DOM 缓存
        this._els = {
            sceneIntro: document.getElementById('scene-intro'),
            sceneGame: document.getElementById('scene-game'),
            sceneEvent: document.getElementById('scene-event'),
            sceneGameover: document.getElementById('scene-gameover'),
            introText: document.getElementById('intro-text'),
            introProgressBar: document.getElementById('intro-progress-bar'),
            btnStart: document.getElementById('btn-start'),
            dayNumber: document.getElementById('day-number'),
            dayProgressBar: document.getElementById('day-progress-bar'),
            weatherIcon: document.getElementById('weather-icon'),
            weatherText: document.getElementById('weather-text'),
            actionsLeft: document.getElementById('actions-left'),
            actionsGrid: document.getElementById('actions-grid'),
            logEntries: document.getElementById('log-entries'),
            eventIllustration: document.getElementById('event-illustration'),
            eventTitle: document.getElementById('event-title'),
            eventDescription: document.getElementById('event-description'),
            eventChoices: document.getElementById('event-choices'),
            eventResult: document.getElementById('event-result'),
            btnContinue: document.getElementById('btn-continue'),
            gameoverIcon: document.getElementById('gameover-icon'),
            gameoverTitle: document.getElementById('gameover-title'),
            gameoverDescription: document.getElementById('gameover-description'),
            gameoverStats: document.getElementById('gameover-stats'),
            dayTransition: document.getElementById('day-transition'),
            dayTransitionText: document.getElementById('day-transition-text'),
            debuffContainer: document.getElementById('debuff-container'),
        };

        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        this._startWaveAnimation();
    }

    // ============================================================
    // Canvas 海浪动画
    // ============================================================

    _resizeCanvas() {
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
    }

    _startWaveAnimation() {
        const animate = () => {
            this._drawWaves();
            this._waveOffset += 0.015;
            this._animFrameId = requestAnimationFrame(animate);
        };
        animate();
    }

    _drawWaves() {
        const ctx = this._ctx;
        const w = this._canvas.width;
        const h = this._canvas.height;
        const t = this._timeOfDay;

        // 天空渐变
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        const r1 = Math.round(10 + t * 15);
        const g1 = Math.round(22 + t * 20);
        const b1 = Math.round(40 + t * 30);
        const r2 = Math.round(15 + t * 30);
        const g2 = Math.round(36 + t * 40);
        const b2 = Math.round(64 + t * 40);
        skyGrad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
        skyGrad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // 绘制多层海浪
        const layers = [
            {y: h * 0.55, amp: 20, freq: 0.008, speed: 1.0, alpha: 0.15, color: '59,130,246'},
            {y: h * 0.62, amp: 15, freq: 0.012, speed: 0.7, alpha: 0.2, color: '56,189,248'},
            {y: h * 0.70, amp: 25, freq: 0.006, speed: 1.3, alpha: 0.12, color: '59,130,246'},
            {y: h * 0.78, amp: 18, freq: 0.01, speed: 0.9, alpha: 0.18, color: '14,165,233'},
            {y: h * 0.85, amp: 12, freq: 0.015, speed: 0.5, alpha: 0.25, color: '26,58,92'},
        ];

        for (const layer of layers) {
            ctx.beginPath();
            ctx.moveTo(0, h);

            for (let x = 0; x <= w; x += 3) {
                const y = layer.y
                    + Math.sin(x * layer.freq + this._waveOffset * layer.speed) * layer.amp
                    + Math.sin(x * layer.freq * 0.5 + this._waveOffset * layer.speed * 0.6) * layer.amp * 0.5;
                ctx.lineTo(x, y);
            }

            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fillStyle = `rgba(${layer.color},${layer.alpha})`;
            ctx.fill();
        }
    }

    /**
     * 设置时间因子（0=深夜, 0.5=白天），影响海浪颜色。
     *
     * @param {number} value - 0~1
     */
    setTimeOfDay(value) {
        this._timeOfDay = Math.max(0, Math.min(1, value));
    }

    // ============================================================
    // 场景切换
    // ============================================================

    /**
     * 切换到指定场景。
     *
     * @param {'intro'|'game'|'event'|'gameover'} sceneName
     */
    switchScene(sceneName) {
        const sceneMap = {
            intro: this._els.sceneIntro,
            game: this._els.sceneGame,
            event: this._els.sceneEvent,
            gameover: this._els.sceneGameover,
        };

        for (const el of Object.values(sceneMap)) {
            el.classList.remove('active');
        }

        const target = sceneMap[sceneName];
        if (target) {
            setTimeout(() => target.classList.add('active'), 50);
        }
    }

    // ============================================================
    // 开场动画
    // ============================================================

    /**
     * 播放开场叙事动画。
     *
     * @returns {Promise<void>}
     */
    async playIntro() {
        const texts = GameData.INTRO_TEXTS;
        const total = texts.length;
        const textEl = this._els.introText;
        const progressBar = this._els.introProgressBar;

        for (let i = 0; i < total; i++) {
            textEl.classList.remove('visible');
            await this._delay(300);

            textEl.textContent = texts[i];
            textEl.classList.add('visible');
            progressBar.style.width = `${((i + 1) / total) * 100}%`;

            await this._delay(2500);
        }

        // 显示开始按钮
        this._els.btnStart.classList.add('visible');
    }

    // ============================================================
    // 主游戏界面更新
    // ============================================================

    /**
     * 更新资源条显示。
     *
     * @param {object} resources - {food, water, stamina, tigerBond, faith}
     */
    updateResources(resources) {
        const keys = ['food', 'water', 'stamina', 'tigerBond', 'faith'];
        for (const key of keys) {
            const value = Math.round(resources[key] || 0);
            const pct = Math.max(0, Math.min(100, value));

            const valEl = document.getElementById(`val-${key}`);
            const barEl = document.getElementById(`bar-${key}`);

            if (valEl) {
                valEl.textContent = pct;
                valEl.classList.toggle('low', pct <= 20);
                valEl.classList.toggle('critical', pct <= 10);
                valEl.classList.add('value-change');
                setTimeout(() => valEl.classList.remove('value-change'), 300);
            }

            if (barEl) {
                barEl.style.width = `${pct}%`;
                barEl.classList.toggle('low', pct <= 20);
                barEl.classList.toggle('critical', pct <= 10);
            }
        }
    }

    /**
     * 更新天数显示。
     *
     * @param {number} day - 当前天数
     * @param {number} totalDays - 目标天数
     */
    updateDay(day, totalDays) {
        this._els.dayNumber.textContent = `第 ${day} 天`;
        const pct = Math.min(100, (day / totalDays) * 100);
        this._els.dayProgressBar.style.width = `${pct}%`;

        // 根据天数模拟日夜
        const dayPhase = (Math.sin(day * 0.3) + 1) / 2;
        this.setTimeOfDay(dayPhase * 0.6 + 0.2);
    }

    /**
     * 更新剩余行动次数。
     *
     * @param {number} remaining
     */
    updateActionsLeft(remaining) {
        this._els.actionsLeft.textContent = remaining;
    }

    /**
     * 更新天气显示。
     *
     * @param {string} icon
     * @param {string} text
     */
    updateWeather(icon, text) {
        this._els.weatherIcon.textContent = icon;
        this._els.weatherText.textContent = text;
    }

    /**
     * 更新 Debuff 显示。
     *
     * @param {Array} debuffs - 活跃的 debuff 列表
     */
    updateDebuffs(debuffs) {
        const container = this._els.debuffContainer;
        if (!container) {
            return;
        }

        container.innerHTML = '';

        if (!debuffs || debuffs.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        for (const debuff of debuffs) {
            const tag = document.createElement('div');
            tag.className = 'debuff-tag';
            tag.title = `${debuff.name}：${debuff.description}（剩余${debuff.remainingDays}天）`;
            tag.innerHTML = `<span class="debuff-icon">${debuff.icon}</span>`
                + `<span class="debuff-name">${debuff.name}</span>`
                + `<span class="debuff-duration">${debuff.remainingDays}天</span>`;
            container.appendChild(tag);
        }
    }

    /**
     * 渲染行动按钮。
     *
     * @param {Array} actions - 行动定义数组
     * @param {number} remainingActions - 剩余行动次数
     * @param {object} resources - 当前资源
     */
    renderActions(actions, remainingActions, resources) {
        const grid = this._els.actionsGrid;
        grid.innerHTML = '';

        for (const action of actions) {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.disabled = remainingActions <= 0;

            // 检查资源是否足够
            let willDie = false;
            if (action.effects && !action.isRandom) {
                willDie = Object.entries(action.effects).some(([key, val]) => {
                    if (val < 0 && resources[key] !== undefined) {
                        return resources[key] + val <= 0;
                    }
                    return false;
                });
                if (willDie) {
                    btn.classList.add('action-danger');
                }
            }

            btn.innerHTML = `
                <span class="action-icon">${action.icon}</span>
                <span class="action-name">${action.name}</span>
                <span class="action-effect">${action.effectText}</span>
            `;

            btn.addEventListener('click', () => {
                if (this._callbacks.onActionClick) {
                    this._callbacks.onActionClick(action);
                }
            });

            grid.appendChild(btn);
        }
    }

    /**
     * 添加日志条目。
     *
     * @param {number} day - 天数
     * @param {string} text - 日志内容
     */
    addLog(day, text) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `<span class="log-day">[第${day}天]</span>${text}`;

        this._els.logEntries.appendChild(entry);
        this._els.logEntries.scrollTop = this._els.logEntries.scrollHeight;

        // 保持最近 20 条
        while (this._els.logEntries.children.length > 20) {
            this._els.logEntries.removeChild(this._els.logEntries.firstChild);
        }
    }

    /**
     * 清空日志。
     */
    clearLog() {
        this._els.logEntries.innerHTML = '';
    }

    // ============================================================
    // 事件弹窗
    // ============================================================

    /**
     * 显示事件弹窗。
     *
     * @param {object} event - 事件对象
     * @param {string} emoji - 事件插图 Emoji
     */
    showEvent(event, emoji) {
        this._els.eventIllustration.textContent = emoji;
        this._els.eventTitle.textContent = event.title;
        this._els.eventDescription.textContent = event.description;

        // 隐藏结果和继续按钮
        this._els.eventResult.classList.remove('visible');
        this._els.eventResult.textContent = '';
        this._els.btnContinue.classList.remove('visible');

        // 渲染选项
        this._els.eventChoices.innerHTML = '';
        event.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'event-choice-btn';

            const effectPreview = this._formatEffectPreview(choice.effects);
            const debuffWarning = choice.debuff
                ? ` ⚠️${GameData.DEBUFF_TYPES[choice.debuff]?.name || ''}`
                : '';

            btn.innerHTML = `
                <span>${choice.text}</span>
                <span class="choice-effect-preview">${effectPreview}${debuffWarning}</span>
            `;

            btn.addEventListener('click', () => {
                if (this._callbacks.onEventChoice) {
                    this._callbacks.onEventChoice(index);
                }
            });

            this._els.eventChoices.appendChild(btn);
        });

        this.switchScene('event');
    }

    /**
     * 显示事件选择结果。
     *
     * @param {string} resultText - 结果文本
     */
    showEventResult(resultText) {
        // 隐藏选项按钮
        this._els.eventChoices.innerHTML = '';

        // 显示结果
        this._els.eventResult.textContent = resultText;
        this._els.eventResult.classList.add('visible');

        // 显示继续按钮
        this._els.btnContinue.classList.add('visible');
        this._els.btnContinue.onclick = () => {
            if (this._callbacks.onContinue) {
                this._callbacks.onContinue();
            }
        };
    }

    /**
     * 格式化效果预览文本。
     *
     * @param {object} effects
     * @returns {string}
     * @private
     */
    _formatEffectPreview(effects) {
        if (!effects || Object.keys(effects).length === 0) {
            return '';
        }

        const nameMap = {
            food: '食物',
            water: '淡水',
            stamina: '体力',
            tigerBond: '羁绊',
            faith: '信念',
        };
        const parts = [];

        for (const [key, val] of Object.entries(effects)) {
            if (val !== 0 && nameMap[key]) {
                const sign = val > 0 ? '+' : '';
                parts.push(`${sign}${val}${nameMap[key]}`);
            }
        }

        return parts.join(' ');
    }

    // ============================================================
    // 日夜过渡动画
    // ============================================================

    /**
     * 播放新一天过渡动画。
     *
     * @param {number} day - 新的天数
     * @returns {Promise<void>}
     */
    async showDayTransition(day) {
        this._els.dayTransitionText.textContent = `第 ${day} 天`;
        this._els.dayTransition.classList.add('active');
        await this._delay(800);
        this._els.dayTransition.classList.remove('active');
        await this._delay(400);
    }

    // ============================================================
    // 游戏结局画面
    // ============================================================

    /**
     * 显示胜利画面。
     *
     * @param {object} stats - 统计数据
     */
    showVictory(stats) {
        this._els.gameoverIcon.textContent = '🌅';
        this._els.gameoverTitle.textContent = '漂流终点 — 你获救了！';
        this._els.gameoverTitle.className = 'gameover-title victory';
        this._els.gameoverDescription.textContent =
            '经过227天的漂流，你终于到达了墨西哥海岸。\n'
            + '理查德·帕克头也不回地走向了丛林，消失在你的视线中。\n'
            + '你永远不会忘记这段旅程。';

        this._renderStats(stats);
        this.switchScene('gameover');
    }

    /**
     * 显示失败画面。
     *
     * @param {string} failureKey - 失败原因 key
     * @param {object} stats - 统计数据
     */
    showDefeat(failureKey, stats) {
        const failData = GameData.FAILURE_TEXTS[failureKey] || {
            title: '旅程终结',
            description: '你的漂流之旅到此结束了...',
        };

        this._els.gameoverIcon.textContent = '💀';
        this._els.gameoverTitle.textContent = failData.title;
        this._els.gameoverTitle.className = 'gameover-title defeat';
        this._els.gameoverDescription.textContent = failData.description;

        this._renderStats(stats);
        this.switchScene('gameover');
    }

    /**
     * 渲染统计面板。
     *
     * @param {object} stats
     * @private
     */
    _renderStats(stats) {
        const grid = this._els.gameoverStats;
        grid.innerHTML = '';

        const statItems = [
            {value: stats.days || 0, label: '存活天数'},
            {value: stats.actionsTotal || 0, label: '总行动次数'},
            {value: stats.eventsEncountered || 0, label: '遭遇事件'},
            {value: stats.fishCaught || 0, label: '捕鱼次数'},
            {value: stats.debuffsSuffered || 0, label: '遭受状态异常'},
            {value: stats.tigerAttacksSurvived || 0, label: '虎袭幸存'},
        ];

        for (const item of statItems) {
            const div = document.createElement('div');
            div.className = 'stat-item';
            div.innerHTML = `
                <div class="stat-value">${item.value}</div>
                <div class="stat-label">${item.label}</div>
            `;
            grid.appendChild(div);
        }
    }

    // ============================================================
    // 工具方法
    // ============================================================

    /**
     * 延时 Promise。
     *
     * @param {number} ms - 毫秒数
     * @returns {Promise<void>}
     * @private
     */
    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 销毁 UI（清理动画帧）。
     */
    destroy() {
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
        }
    }
}

// 导出
window.UIManager = UIManager;

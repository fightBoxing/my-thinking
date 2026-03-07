/**
 * 《少年派的奇幻漂流》生存冒险游戏 - 游戏数据常量模块（困难版）
 *
 * 定义所有游戏常量、行动效果表、随机事件池、Debuff系统和剧情文本。
 */

// ============================================================
// 游戏状态枚举
// ============================================================
const GameState = Object.freeze({
    INTRO: 'INTRO',
    PLAYING: 'PLAYING',
    EVENT: 'EVENT',
    GAMEOVER: 'GAMEOVER',
});

// ============================================================
// 游戏基础配置
// ============================================================
const GAME_CONFIG = Object.freeze({
    TARGET_DAYS: 227,
    ACTIONS_PER_DAY: 2,
    RESOURCE_MIN: 0,
    RESOURCE_MAX: 100,
    EVENT_TRIGGER_CHANCE: 0.55,
    TIGER_ATTACK_THRESHOLD: 12,
    TIGER_ATTACK_CHANCE: 0.25,
    FAITH_DECAY_THRESHOLD: 30,
});

// ============================================================
// 资源初始值（降低）
// ============================================================
const INITIAL_RESOURCES = Object.freeze({
    food: 45,
    water: 40,
    stamina: 65,
    tigerBond: 20,
    faith: 70,
});

// ============================================================
// 资源元数据（名称、图标、颜色）
// ============================================================
const RESOURCE_META = Object.freeze({
    food: {name: '食物', icon: '🐟', colorVar: '--res-food'},
    water: {name: '淡水', icon: '💧', colorVar: '--res-water'},
    stamina: {name: '体力', icon: '⚡', colorVar: '--res-stamina'},
    tigerBond: {name: '虎之羁绊', icon: '🐾', colorVar: '--res-tiger'},
    faith: {name: '信念', icon: '🙏', colorVar: '--res-faith'},
});

// ============================================================
// 每日基础消耗（增大）
// ============================================================
const DAILY_CONSUMPTION = Object.freeze({
    food: -4,
    water: -5,
    stamina: -3,
    tigerBond: -2,
    faith: -1,
});

// ============================================================
// 难度曲线 - 5阶段，更陡峭
// ============================================================
const DIFFICULTY_TIERS = Object.freeze([
    {maxDay: 30, consumptionMultiplier: 1.0, effectMultiplier: 1.0},
    {maxDay: 70, consumptionMultiplier: 1.15, effectMultiplier: 0.9},
    {maxDay: 120, consumptionMultiplier: 1.3, effectMultiplier: 0.8},
    {maxDay: 180, consumptionMultiplier: 1.45, effectMultiplier: 0.7},
    {maxDay: 227, consumptionMultiplier: 1.6, effectMultiplier: 0.6},
]);

/**
 * 根据当前天数获取难度参数。
 *
 * @param {number} day - 当前天数
 * @returns {{consumptionMultiplier: number, effectMultiplier: number}}
 */
function getDifficultyForDay(day) {
    for (const tier of DIFFICULTY_TIERS) {
        if (day <= tier.maxDay) {
            return tier;
        }
    }
    return DIFFICULTY_TIERS[DIFFICULTY_TIERS.length - 1];
}

// ============================================================
// Debuff 定义（持续多天的负面效果）
// ============================================================
const DEBUFF_TYPES = Object.freeze({
    SICK: {
        id: 'sick',
        name: '生病',
        icon: '🤒',
        description: '发烧使你虚弱不堪',
        duration: 3,
        dailyEffects: {stamina: -5, food: -2, faith: -2},
    },
    INJURED: {
        id: 'injured',
        name: '受伤',
        icon: '🩹',
        description: '伤口让每个动作都疼痛',
        duration: 4,
        dailyEffects: {stamina: -4, water: -1},
        actionPenalty: 0.7,
    },
    DESPAIR: {
        id: 'despair',
        name: '绝望',
        icon: '😞',
        description: '你开始怀疑是否值得继续',
        duration: 3,
        dailyEffects: {faith: -5, tigerBond: -2},
    },
    SEASICK: {
        id: 'seasick',
        name: '晕船',
        icon: '🤢',
        description: '剧烈的风浪让你恶心不止',
        duration: 2,
        dailyEffects: {stamina: -3, food: -3, water: -2},
    },
    SUNBURN: {
        id: 'sunburn',
        name: '灼伤',
        icon: '🔥',
        description: '严重的日晒灼伤使你痛苦不堪',
        duration: 3,
        dailyEffects: {stamina: -3, water: -3},
    },
});

// ============================================================
// 行动定义（收益降低）
// ============================================================
const ACTIONS = Object.freeze([
    {
        id: 'fish',
        name: '捕鱼',
        icon: '🎣',
        description: '撒网捕鱼获取食物',
        effects: {food: 12, stamina: -12},
        effectText: '+12食物 -12体力',
    },
    {
        id: 'collectWater',
        name: '收集雨水',
        icon: '🌧️',
        description: '用容器收集珍贵的淡水',
        effects: {water: 10, stamina: -6},
        effectText: '+10淡水 -6体力',
    },
    {
        id: 'trainTiger',
        name: '训练老虎',
        icon: '🐅',
        description: '尝试与理查德·帕克建立信任',
        effects: {tigerBond: 7, food: -6, stamina: -10},
        effectText: '+7羁绊 -6食物 -10体力',
    },
    {
        id: 'rest',
        name: '休息',
        icon: '😴',
        description: '在救生艇上休息恢复体力',
        effects: {stamina: 20, food: -3, water: -3},
        effectText: '+20体力 -3食物 -3淡水',
    },
    {
        id: 'explore',
        name: '探索海域',
        icon: '🔭',
        description: '观察周围海域，或许能有发现',
        effects: null,
        effectText: '高风险高回报',
        isRandom: true,
        outcomes: [
            {chance: 0.35, effects: {food: 8, water: 5, stamina: -8}, text: '你发现了一些漂浮的物资！'},
            {chance: 0.25, effects: {food: 3, stamina: -10}, text: '只找到了一点残存的食物碎屑...'},
            {chance: 0.25, effects: {stamina: -15}, text: '什么都没有找到，白白消耗了体力...'},
            {chance: 0.15, effects: {stamina: -20, water: -5}, text: '遭遇暗流，差点翻船！你精疲力竭。'},
        ],
    },
    {
        id: 'pray',
        name: '祈祷',
        icon: '🙏',
        description: '向神灵祈祷，寻找内心的力量',
        effects: {faith: 10, stamina: -3},
        effectText: '+10信念 -3体力',
    },
    {
        id: 'repairBoat',
        name: '修补船只',
        icon: '🔧',
        description: '检查并修补救生艇的破损',
        effects: {stamina: -15},
        effectText: '-15体力（防止漏水事件）',
        specialTag: 'repair',
    },
]);

// ============================================================
// 随机事件池（大量增加负面事件）
// ============================================================
const RANDOM_EVENTS = [
    {
        id: 'calm_sea',
        title: '风平浪静',
        description: '今天海面异常平静，温暖的阳光洒在救生艇上，你感到一丝安宁。',
        illustration: 'evt-calm',
        weight: 12,
        choices: [
            {
                text: '享受片刻宁静',
                effects: {stamina: 5, faith: 3},
                resultText: '难得的平静让你恢复了些许精力，内心也平静了一些。',
            },
        ],
    },
    {
        id: 'light_rain',
        title: '天降小雨',
        description: '乌云聚集，细密的雨滴开始落下。这是收集淡水的好机会！',
        illustration: 'evt-rain',
        weight: 10,
        choices: [
            {
                text: '全力收集雨水',
                effects: {water: 8},
                resultText: '你用所有能找到的容器收集了一些雨水。',
            },
        ],
    },
    {
        id: 'storm',
        title: '暴风雨来袭',
        description: '天色骤暗，狂风怒号，巨浪拍打着小小的救生艇！你必须做出选择。',
        illustration: 'evt-storm',
        weight: 14,
        choices: [
            {
                text: '全力加固船只',
                effects: {stamina: -15, faith: -3},
                resultText: '你拼尽全力稳住了救生艇，但精疲力尽，内心也动摇了。',
            },
            {
                text: '冒险收集雨水',
                effects: {water: 18, stamina: -18, food: -10},
                resultText: '你收集了大量雨水，但风暴卷走了不少食物储备，你也差点被浪冲走。',
            },
        ],
    },
    {
        id: 'flying_fish',
        title: '飞鱼群来袭',
        description: '一群飞鱼跃出水面，有些直接落在了船里。',
        illustration: 'evt-flyfish',
        weight: 6,
        dynamicWeight: (state) => state.food < 25 ? 12 : 6,
        choices: [
            {
                text: '赶紧收集飞鱼',
                effects: {food: 14},
                resultText: '你和帕克分享了这份大海的馈赠。',
            },
        ],
    },
    {
        id: 'sea_turtle',
        title: '海龟靠近',
        description: '一只海龟缓缓游到救生艇旁。',
        illustration: 'evt-turtle',
        weight: 6,
        choices: [
            {
                text: '捕获海龟',
                effects: {food: 15, tigerBond: 3, faith: -3},
                resultText: '你获得了食物，但杀生让你内心不安。帕克倒是很满意。',
            },
            {
                text: '放走海龟',
                effects: {tigerBond: -2, faith: 5},
                resultText: '你目送海龟离去。帕克不满地咆哮，但你内心平静。',
            },
        ],
    },
    {
        id: 'tiger_restless',
        title: '老虎躁动不安',
        description: '理查德·帕克发出低沉的咆哮，它看起来很饥饿，很危险。',
        illustration: 'evt-tiger',
        weight: 15,
        dynamicWeight: (state) => state.tigerBond < 15 ? 30 : 15,
        choices: [
            {
                text: '喂食安抚',
                effects: {food: -12, tigerBond: 8},
                resultText: '你用一大部分食物储备安抚了帕克。你的肚子在咕咕叫。',
            },
            {
                text: '挥动船桨威慑',
                effects: {stamina: -12, tigerBond: 3, faith: -2},
                resultText: '你鼓起勇气挥动船桨，帕克退缩了，但你累得够呛，信心也被消耗了。',
            },
        ],
    },
    {
        id: 'drifting_debris',
        title: '发现漂流物',
        description: '远处有什么东西在水面上漂浮...',
        illustration: 'evt-debris',
        weight: 5,
        choices: [
            {
                text: '冒险游过去打捞',
                effects: {food: 8, water: 4, stamina: -10},
                resultText: '你成功打捞到一些物资，但游泳消耗了大量体力。',
            },
            {
                text: '太远了，不冒险',
                effects: {},
                resultText: '你目送漂流物远去，也许这是正确的选择。',
            },
        ],
    },
    {
        id: 'scorching_sun',
        title: '烈日暴晒',
        description: '太阳像一团火球挂在头顶，空气仿佛凝固了。',
        illustration: 'evt-sun',
        weight: 15,
        choices: [
            {
                text: '用帆布遮阳',
                effects: {water: -8, stamina: -6},
                resultText: '即便遮了阳，高温仍然让你严重脱水。',
            },
            {
                text: '节省体力躺着不动',
                effects: {water: -12, stamina: -3},
                resultText: '你躺着不动，口渴让你几近崩溃。',
                debuff: 'SUNBURN',
            },
        ],
    },
    {
        id: 'starry_night',
        title: '繁星之夜',
        description: '漫天繁星倒映在平静的海面上。你和帕克并肩躺在船上。',
        illustration: 'evt-stars',
        weight: 5,
        choices: [
            {
                text: '仰望星空',
                effects: {stamina: 8, tigerBond: 3, faith: 5},
                resultText: '这一刻的宁静让你恢复了力量和信心。',
            },
        ],
    },
    {
        id: 'bioluminescence',
        title: '海面荧光',
        description: '夜晚的海面突然亮起了梦幻般的蓝色荧光。',
        illustration: 'evt-glow',
        weight: 4,
        choices: [
            {
                text: '静静欣赏这奇景',
                effects: {stamina: 5, tigerBond: 3, faith: 8},
                resultText: '帕克也被这美景吸引。你相信，这个世界还有奇迹。',
            },
        ],
    },
    {
        id: 'dolphins',
        title: '海豚伴游',
        description: '一群海豚围绕着救生艇欢快地跳跃。',
        illustration: 'evt-dolphin',
        weight: 4,
        choices: [
            {
                text: '跟随海豚的方向前行',
                effects: {stamina: 3, water: 3, faith: 3},
                resultText: '海豚引领你找到了一片有小雨的区域。',
            },
        ],
    },
    // =================== 新增负面事件 ===================
    {
        id: 'shark_attack',
        title: '鲨鱼围攻',
        description: '几条灰鲨在救生艇周围盘旋，它们时不时撞击船体。帕克紧张地蜷缩在角落。',
        illustration: 'evt-shark',
        weight: 12,
        choices: [
            {
                text: '用船桨驱赶鲨鱼',
                effects: {stamina: -18, tigerBond: 5, faith: 3},
                resultText: '你奋力用船桨拍打水面，终于吓退了鲨鱼。帕克用感激的眼神看着你。',
            },
            {
                text: '扔食物引开鲨鱼',
                effects: {food: -15, stamina: -5},
                resultText: '你心疼地扔出了宝贵的食物。鲨鱼被吸引走了，但你的储备又少了。',
            },
        ],
    },
    {
        id: 'boat_leak',
        title: '船体漏水',
        description: '你发现救生艇底部出现了一个裂缝，海水正在慢慢渗入！',
        illustration: 'evt-leak',
        weight: 10,
        dynamicWeight: (state, gameState) => {
            if (gameState && gameState.boatRepaired) {
                return 3;
            }
            return 10;
        },
        choices: [
            {
                text: '立刻修补裂缝',
                effects: {stamina: -20, water: -5},
                resultText: '你花了很大力气堵住了漏水点，但淡水储备被海水污染了一部分。',
            },
            {
                text: '先舀水再说',
                effects: {stamina: -12, water: -10, food: -5},
                resultText: '你不停地舀水，但裂缝越来越大。一些食物和淡水被毁了。',
                debuff: 'INJURED',
            },
        ],
    },
    {
        id: 'tiger_steals_food',
        title: '帕克偷吃储备',
        description: '你打了个盹，醒来时发现理查德·帕克正在大吃你辛苦储存的食物！',
        illustration: 'evt-tiger',
        weight: 10,
        dynamicWeight: (state) => state.tigerBond < 20 ? 20 : 10,
        choices: [
            {
                text: '大声呵斥它',
                effects: {food: -10, tigerBond: -5, stamina: -5},
                resultText: '帕克被吓到了，但它已经吃掉了不少。它对你充满敌意。',
            },
            {
                text: '算了，就当喂它',
                effects: {food: -15, tigerBond: 5},
                resultText: '你忍痛接受了这个事实。至少帕克看起来对你友善了些。',
            },
        ],
    },
    {
        id: 'ghost_ship',
        title: '远处的船影',
        description: '你看到远处海面上有一艘船！这是获救的机会吗？',
        illustration: 'evt-ship',
        weight: 5,
        choices: [
            {
                text: '拼命挥舞衣物求救',
                effects: {stamina: -25, faith: -8},
                resultText: '你声嘶力竭地呼喊，挥舞了很久...但那艘船越来越远，直到消失在地平线。绝望笼罩了你。',
            },
            {
                text: '冷静观察，保存体力',
                effects: {stamina: -5, faith: -3},
                resultText: '那似乎只是一个幻影，或者一艘永远不会靠近的远洋货轮。你学会了不再奢望。',
            },
        ],
    },
    {
        id: 'food_rot',
        title: '食物变质',
        description: '高温和湿气让你储存的一部分食物发霉变质了。腐烂的气味弥漫在船上。',
        illustration: 'evt-rot',
        weight: 10,
        dynamicWeight: (state) => state.food > 50 ? 15 : 5,
        choices: [
            {
                text: '忍痛扔掉变质食物',
                effects: {food: -12},
                resultText: '你扔掉了变质的食物，心在滴血。',
            },
            {
                text: '硬吃一部分，省点',
                effects: {food: -6, stamina: -8},
                resultText: '你捏着鼻子吃了一些不太烂的部分。肚子隐隐作痛。',
                debuff: 'SICK',
            },
        ],
    },
    {
        id: 'saltwater_splash',
        title: '海水倒灌',
        description: '一个大浪突然打过来，海水灌进了你存放淡水的容器！',
        illustration: 'evt-storm',
        weight: 10,
        choices: [
            {
                text: '赶紧抢救淡水',
                effects: {water: -8, stamina: -10},
                resultText: '你抢救了一部分淡水，但不少已经被咸水污染了。',
            },
            {
                text: '来不及了...',
                effects: {water: -15, faith: -3},
                resultText: '大量淡水被毁。你望着空空如也的水罐，绝望地叹了口气。',
            },
        ],
    },
    {
        id: 'nightmare',
        title: '噩梦缠身',
        description: '你梦到了沉船那夜的惨状，母亲和父亲的呼喊声不断回响。你在冷汗中惊醒。',
        illustration: 'evt-night',
        weight: 8,
        choices: [
            {
                text: '试着祈祷平复心情',
                effects: {stamina: -5, faith: 5},
                resultText: '祈祷让你的心稍微平静了一些，但那些画面挥之不去。',
            },
            {
                text: '强迫自己忘记',
                effects: {stamina: -3, faith: -8},
                resultText: '你试图压制回忆，但它们像潮水一样不断涌来。你感到前所未有的孤独。',
                debuff: 'DESPAIR',
            },
        ],
    },
    {
        id: 'jellyfish_sting',
        title: '水母蛰伤',
        description: '你伸手去海里捞东西，突然一阵刺痛——水母！你的手臂已经红肿起来。',
        illustration: 'evt-sting',
        weight: 8,
        choices: [
            {
                text: '用淡水冲洗伤口',
                effects: {water: -8, stamina: -5},
                resultText: '你用宝贵的淡水冲洗了伤口，疼痛稍有缓解。',
            },
            {
                text: '忍着痛不处理',
                effects: {stamina: -8},
                resultText: '伤口持续灼痛，你很难集中注意力做任何事情。',
                debuff: 'INJURED',
            },
        ],
    },
    {
        id: 'heavy_fog',
        title: '浓雾弥漫',
        description: '一层厚厚的大雾笼罩了一切，你什么都看不见。帕克焦躁地在船上走来走去。',
        illustration: 'evt-fog',
        weight: 8,
        choices: [
            {
                text: '原地不动等待雾散',
                effects: {stamina: -3, tigerBond: -3},
                resultText: '雾中帕克越来越不安，你们之间的紧张感加剧了。',
            },
            {
                text: '利用雾气中的水汽收集淡水',
                effects: {water: 6, stamina: -8},
                resultText: '你用布收集了一些雾气凝结的水滴，虽然不多但聊胜于无。',
            },
        ],
    },
    {
        id: 'seasickness',
        title: '剧烈风浪',
        description: '今天的海浪异常猛烈，救生艇像一片树叶般被抛来抛去。',
        illustration: 'evt-storm',
        weight: 10,
        choices: [
            {
                text: '紧紧抓住船舷',
                effects: {stamina: -12, food: -5},
                resultText: '你死死抓住船舷，一些食物被甩出了船外。',
                debuff: 'SEASICK',
            },
            {
                text: '把自己绑在桅杆上',
                effects: {stamina: -8, water: -3},
                resultText: '你用绳子把自己固定住，浪花不断打在你脸上，淡水被弄洒了一些。',
            },
        ],
    },
];

// ============================================================
// 关键剧情事件（特定天数必触发）- 增加更多
// ============================================================
const STORY_EVENTS = Object.freeze([
    {
        id: 'story_tutorial',
        triggerDay: 1,
        once: true,
        title: '漂流的开始',
        description: '暴风雨过后，你发现自己孤身一人漂浮在太平洋上，身边只有一艘救生艇'
            + '...和一只450磅重的孟加拉虎——理查德·帕克。\n\n'
            + '你必须管理食物、淡水、体力、与老虎的关系，还有最重要的——你的信念。每天你可以执行2个行动。\n\n'
            + '警告：这片海域危机四伏。暴风雨、鲨鱼、疾病、绝望...都可能随时夺走你的生命。\n\n'
            + '坚持227天，到达墨西哥海岸。祝你好运。',
        illustration: 'evt-start',
        choices: [
            {
                text: '无论如何，我要活下去',
                effects: {faith: 5},
                resultText: '你握紧拳头，下定决心。漂流之旅，正式开始。前方的路将无比艰难。',
            },
        ],
    },
    {
        id: 'story_animals_death',
        triggerDay: 8,
        once: true,
        title: '弱肉强食',
        description: '救生艇上不只有你和帕克。一匹受伤的斑马、一只猩猩、一只鬣狗也在船上。'
            + '\n\n鬣狗变得越来越狂暴。它先是扑向了受伤的斑马，然后又袭击了那只猩猩...'
            + '\n\n你无力阻止这场杀戮。最后，帕克一巴掌拍碎了鬣狗的脑袋。'
            + '\n\n现在，这艘船上只剩下你和一头沾满鲜血的孟加拉虎。',
        illustration: 'evt-tiger',
        choices: [
            {
                text: '这就是自然法则',
                effects: {food: 15, faith: -8, tigerBond: -5},
                resultText: '死去的动物留下了一些食物...但这个场景将永远刻在你的噩梦里。你更加恐惧帕克了。',
            },
            {
                text: '为死去的动物祈祷',
                effects: {food: 10, faith: 3, tigerBond: -3, stamina: -5},
                resultText: '你流着泪为它们祈祷。帕克警惕地注视着你。死亡就在身边，你必须更加小心。',
            },
        ],
    },
    {
        id: 'story_first_storm',
        triggerDay: 15,
        once: true,
        title: '第一场大风暴',
        description: '天空变得墨黑，闪电撕裂了乌云。这是你遇到的第一场真正的大风暴。'
            + '巨浪不断冲击救生艇，你和帕克都在为生存而挣扎。',
        illustration: 'evt-storm',
        choices: [
            {
                text: '拼命加固救生艇',
                effects: {stamina: -20, tigerBond: 5, faith: -3},
                resultText: '你在狂风暴雨中死死抓住绳索。帕克缩在角落。风暴过后你伤痕累累。',
                debuff: 'INJURED',
            },
            {
                text: '利用风暴收集大量雨水',
                effects: {water: 20, food: -8, stamina: -15},
                resultText: '你冒着生命危险收集雨水，但大量食物被浪花冲走了。',
                debuff: 'SEASICK',
            },
        ],
    },
    {
        id: 'story_tiger_attack_close',
        triggerDay: 30,
        once: true,
        title: '帕克的第一次攻击',
        description: '你在整理物资时不小心背对着帕克。一声低吼让你的血液凝固——'
            + '你转头看到帕克正蓄势待扑，它的瞳孔收缩成针尖大小。\n\n'
            + '你只有一瞬间做出反应。',
        illustration: 'evt-tiger',
        choices: [
            {
                text: '拿起船桨正面对峙',
                effects: {stamina: -18, tigerBond: 8, faith: 5},
                resultText: '你挺直腰板，举起船桨直视帕克的眼睛。对峙持续了数分钟...帕克最终退缩了。你证明了自己的勇气。',
            },
            {
                text: '跳进海里躲避',
                effects: {stamina: -15, water: -10, tigerBond: -5, faith: -5},
                resultText: '你慌乱地跳入大海。海水冰冷刺骨，你挣扎着爬回船上时，帕克用蔑视的眼神看着你。你在它眼中变得更弱了。',
                debuff: 'SICK',
            },
        ],
    },
    {
        id: 'story_flying_fish_swarm',
        triggerDay: 50,
        once: true,
        title: '飞鱼风暴',
        description: '数以千计的飞鱼突然从海面跃起，像一场银色的暴雨降临在救生艇上！'
            + '帕克兴奋地扑来扑去。但飞鱼的尖嘴也在刺伤你。',
        illustration: 'evt-flyfish',
        choices: [
            {
                text: '忍痛尽力捕获飞鱼',
                effects: {food: 25, tigerBond: 5, stamina: -10},
                resultText: '你被飞鱼扎得满身伤口，但收获了大量食物。帕克吃得很满足。',
                debuff: 'INJURED',
            },
            {
                text: '先躲避，等飞鱼停了再捡',
                effects: {food: 12, stamina: -3, faith: 2},
                resultText: '你缩在一旁等飞鱼雨过去，只拾到了一部分，但至少没受伤。',
            },
        ],
    },
    {
        id: 'story_whale',
        triggerDay: 80,
        once: true,
        title: '鲸鱼出没',
        description: '一头巨大的座头鲸缓缓浮出水面，它的身躯比救生艇大上几十倍。'
            + '它在你旁边喷出高高的水柱...但它巨大的尾巴正在危险地靠近救生艇。',
        illustration: 'evt-whale',
        choices: [
            {
                text: '静静等待它离开',
                effects: {stamina: -5, faith: 5, tigerBond: 3},
                resultText: '你屏住呼吸，鲸鱼优雅地游走了。那一刻的美让你心生敬畏。',
            },
            {
                text: '尝试靠近获取鲸鱼带来的鱼群',
                effects: {food: 18, stamina: -15, water: -8},
                resultText: '鲸鱼的尾巴差点掀翻救生艇！你吓出一身冷汗，但也趁机捕获了不少鱼。不少淡水洒了。',
            },
        ],
    },
    {
        id: 'story_faith_crisis',
        triggerDay: 100,
        once: true,
        title: '信仰的考验',
        description: '一百天了。整整一百天。\n\n'
            + '你已经不记得陆地的样子了。每天都是无尽的蓝色，无尽的波浪。\n\n'
            + '你开始怀疑：上帝是否已经遗忘了你？这一切的苦难到底有什么意义？\n\n'
            + '帕克饥饿的眼神提醒你，你随时可能成为它的食物。',
        illustration: 'evt-faith',
        choices: [
            {
                text: '我选择相信，继续战斗',
                effects: {faith: 15, stamina: -10, tigerBond: 3},
                resultText: '你跪在船上，向天空祈祷。眼泪流下脸颊，但你的内心燃起了新的火焰。你不会放弃。',
            },
            {
                text: '对着大海呐喊：为什么是我？',
                effects: {faith: -15, stamina: 5, tigerBond: -5},
                resultText: '你的怒吼在大海上回荡。帕克被你的疯狂吓到了。你发泄了愤怒，但内心更加空虚。',
                debuff: 'DESPAIR',
            },
        ],
    },
    {
        id: 'story_carnivorous_island',
        triggerDay: 120,
        once: true,
        title: '神秘的浮岛',
        description: '在海上漂流了一百多天后，你几乎不敢相信自己的眼睛——前方出现了一座翠绿的浮岛！'
            + '岛上有淡水池塘、茂密的植被和无数的狐獴。帕克迫不及待地跳上了岸。',
        illustration: 'evt-island',
        choices: [
            {
                text: '白天探索浮岛',
                effects: {food: 35, water: 25, stamina: 15, faith: 10},
                resultText: '这座岛简直是天堂！你尽情地吃喝，恢复了体力。但夜幕即将降临...',
                followUpEvent: 'story_island_night',
            },
        ],
    },
    {
        id: 'story_island_night',
        triggerDay: null,
        once: true,
        title: '食人岛的秘密',
        description: '当夜幕降临，你发现岛上的池塘开始冒出腐蚀性液体，'
            + '一朵莲花中包裹着一颗人类的牙齿...\n\n这座岛会在夜晚吞噬一切活物。你必须做出选择。',
        illustration: 'evt-island-night',
        choices: [
            {
                text: '立刻离开这座死亡之岛',
                effects: {stamina: -8, faith: 5},
                resultText: '你带着帕克匆忙返回救生艇。这座岛从此消失在黑暗中。你明白了：没有捷径，只有继续漂流。',
            },
            {
                text: '留下来过夜——这里太舒适了',
                effects: {food: -100, water: -100, stamina: -100, tigerBond: -100, faith: -100},
                resultText: '你闭上了眼睛...再也没有醒来。食人岛吞噬了你。',
            },
        ],
    },
    {
        id: 'story_passing_ship',
        triggerDay: 150,
        once: true,
        title: '远去的希望',
        description: '一艘巨大的货轮出现在地平线上！你能清楚地看到它的烟囱冒着白烟。\n\n'
            + '你拼命挥舞所有能找到的东西，声嘶力竭地呐喊...\n\n'
            + '但它在你眼前缓缓驶过，像是来自另一个世界的幽灵，对你的存在视而不见。',
        illustration: 'evt-ship',
        choices: [
            {
                text: '不...不要走...！',
                effects: {faith: -20, stamina: -15},
                resultText: '货轮消失了。你瘫倒在船上，这一次的打击几乎摧毁了你。世界忘记了你的存在。',
                debuff: 'DESPAIR',
            },
            {
                text: '...也许下一次会被发现',
                effects: {faith: -8, stamina: -8},
                resultText: '你咬紧牙关，告诉自己这不是最后一次机会。但泪水还是模糊了视线。',
            },
        ],
    },
    {
        id: 'story_mega_storm',
        triggerDay: 180,
        once: true,
        title: '世纪风暴',
        description: '这是你见过的最可怕的风暴。天空变成了漆黑一片，闪电像末日审判一样不断劈下。\n\n'
            + '海浪高如楼房，救生艇几乎被垂直抛起。你和帕克都在尖叫。\n\n'
            + '这是你与大海的终极考验。',
        illustration: 'evt-storm',
        choices: [
            {
                text: '用绳子把自己和帕克都绑住',
                effects: {stamina: -25, food: -15, water: -12, tigerBond: 10, faith: 5},
                resultText: '你把帕克也绑在了船上。风暴中你们紧紧依偎。一人一虎，共同面对这地狱般的夜晚。黎明终于来了。',
                debuff: 'INJURED',
            },
            {
                text: '只顾自己，保住体力',
                effects: {stamina: -15, food: -20, water: -15, tigerBond: -8},
                resultText: '帕克在风暴中被甩来甩去，对你充满愤怒。大量物资被冲走了。你虽然保住了些体力，但失去了更多。',
            },
        ],
    },
    {
        id: 'story_final_storm',
        triggerDay: 210,
        once: true,
        title: '最后的风暴',
        description: '又是一场猛烈的风暴。但这一次，风暴过后你闻到了...泥土的气味。\n\n'
            + '是的，泥土的气味。那是来自陆地的气息。\n\n还有最后的路要走。',
        illustration: 'evt-storm',
        choices: [
            {
                text: '全力以赴，向着泥土的方向前进！',
                effects: {stamina: -20, food: -10, water: -8, faith: 15},
                resultText: '你拼尽最后的力量划桨。帕克也似乎感受到了什么，安静地凝望着前方。希望就在不远处。',
            },
            {
                text: '保存体力，顺其自然',
                effects: {stamina: -8, food: -5, water: -5, faith: 5},
                resultText: '你选择顺着洋流漂流。泥土的气味越来越浓。再坚持一下就好。',
            },
        ],
    },
    {
        id: 'story_victory',
        triggerDay: 227,
        once: true,
        title: '到达墨西哥海岸',
        description: '第227天清晨，你睁开疲惫的双眼，看到了一条金色的海岸线。'
            + '椰子树、沙滩、远处的村庄...\n\n'
            + '你做到了。你活了下来。\n\n'
            + '当救生艇搁浅在沙滩上时，理查德·帕克头也不回地走向了丛林。'
            + '它甚至没有回头看你一眼。你知道，你永远不会忘记它。',
        illustration: 'evt-victory',
        choices: [
            {
                text: '谢谢你，理查德·帕克',
                effects: {},
                resultText: 'victory',
            },
        ],
    },
]);

// ============================================================
// 失败结局文本
// ============================================================
const FAILURE_TEXTS = Object.freeze({
    food: {
        title: '饥饿的终点',
        description: '你已经好几天没有吃任何东西了。最后的力气在今天消耗殆尽...'
            + '\n\n太平洋的波浪依旧翻涌，但你再也听不到了。',
    },
    water: {
        title: '干渴的绝望',
        description: '嘴唇干裂，喉咙像被火烧一样。你伸出手想要抓住什么，但四周只有无尽的咸水...'
            + '\n\n水，水，到处都是水，却没有一滴可以喝。',
    },
    stamina: {
        title: '力竭倒下',
        description: '你的身体已经到了极限。每一次呼吸都变得沉重无比，'
            + '眼皮像铅一样重...\n\n你倒在了救生艇上，再也站不起来。',
    },
    tigerBond: {
        title: '帕克的怒火',
        description: '理查德·帕克的瞳孔在黑暗中闪烁。你与它之间脆弱的信任已经完全崩塌。'
            + '\n\n一声低吼之后，一切都结束了。在大海上，你终究没能驯服这头猛兽。',
    },
    faith: {
        title: '失去希望',
        description: '你望着无尽的大海，心中最后一丝希望的火苗熄灭了。'
            + '\n\n你不再想要挣扎。你不再想要活着。你只是安静地闭上了眼睛，'
            + '任由救生艇随波逐流...\n\n也许，这就是你的命运。',
    },
    tigerAttack: {
        title: '猛虎噬人',
        description: '理查德·帕克已经忍耐到了极限。在一个你毫无防备的瞬间，它扑了过来。\n\n'
            + '450磅的力量让你毫无还手之力。在最后的意识里，你看到了帕克琥珀色的眼睛...\n\n'
            + '在这片无人的大海上，自然法则主宰一切。',
    },
});

// ============================================================
// 开场叙事文本序列
// ============================================================
const INTRO_TEXTS = Object.freeze([
    '1977年，印度本地治里...',
    '我的父亲经营着一座动物园。',
    '我叫 Piscine Molitor Patel，人们叫我——Pi。',
    '父亲决定举家迁往加拿大，带上了动物园里的动物们。',
    '我们搭上了一艘日本货轮"齐姆楚姆号"...',
    '然而，在太平洋深处，一场暴风雨改变了一切。',
    '货轮沉没了。我失去了家人，失去了一切。',
    '当我醒来时，发现自己在一艘救生艇上——',
    '与一只450磅重的孟加拉虎，理查德·帕克。',
    '在这片无情的大海上，没有人会来救我。',
    '我必须活下去。不管付出什么代价。',
]);

// ============================================================
// 天气描述（随机装饰性文本）
// ============================================================
const WEATHER_DESCRIPTIONS = Object.freeze([
    {text: '晴朗', icon: '☀️'},
    {text: '多云', icon: '⛅'},
    {text: '阴天', icon: '☁️'},
    {text: '小雨', icon: '🌦️'},
    {text: '大雨', icon: '🌧️'},
    {text: '风暴', icon: '⛈️'},
    {text: '起雾', icon: '🌫️'},
    {text: '星夜', icon: '🌙'},
    {text: '闷热', icon: '🌡️'},
    {text: '狂风', icon: '💨'},
]);

// ============================================================
// 导出（全局挂载，因为不使用模块打包）
// ============================================================
window.GameData = Object.freeze({
    GameState,
    GAME_CONFIG,
    INITIAL_RESOURCES,
    RESOURCE_META,
    DAILY_CONSUMPTION,
    DIFFICULTY_TIERS,
    getDifficultyForDay,
    DEBUFF_TYPES,
    ACTIONS,
    RANDOM_EVENTS,
    STORY_EVENTS,
    FAILURE_TEXTS,
    INTRO_TEXTS,
    WEATHER_DESCRIPTIONS,
});

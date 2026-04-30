import { computed, ref } from 'vue'

export type SupportedLocale = 'zh-CN' | 'en-US'

const STORAGE_KEY = 'chemistry-uno-locale'

const messages = {
  'zh-CN': {
    common: {
      zh: '中文',
      en: 'English',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      loading: '加载中...',
      localPlayer: '本地玩家',
      localMode: '单机模式',
      localProfile: '本地资料',
    },
    login: {
      setup: '本地玩家设置',
      preview: '本地玩家预览',
      previewDesc: '仅用于本机单人对战与本地战绩',
      nickname: '昵称',
      avatar: '头像',
      random: '随机生成',
      nicknamePlaceholder: '输入你的玩家昵称',
      intro: '本版本为仅单机的玩家 VS AI 模式。昵称、头像、战绩与设置都会保存在当前设备中。',
      submit: '进入单机模式',
      submitting: '初始化中...',
      errors: {
        empty: '请输入昵称',
        tooLong: '昵称不能超过 20 个字符',
        invalid: '昵称只能包含中英文字母、数字和下划线',
        failed: '本地玩家资料初始化失败',
      },
      randomSeeds: ['元素旅人', '反应学徒', '量子牌手', '轨道漫游者', '催化大师', '分子猎手'],
    },
    lobby: {
      title: '本地 AI 对战大厅',
      subtitle: '当前版本仅保留玩家 VS AI 模式。昵称、头像、战绩和设置都会保存在当前设备中。',
      currentPlayer: '当前玩家',
      localSave: '本机存档',
      deck: '牌组',
      deckDesc: '查看当前 AI 对战使用的牌组配置',
      aiArena: 'AI 竞技场',
      tutorial: '教学关卡',
      localInfo: '本地说明',
      info1: '不需要账号系统或联网匹配。',
      info2: '所有资料和战绩只保存在当前设备。',
      info3: '你可以随时修改昵称、头像与外观设置。',
      info4: '教学关卡会自动创建 1v1 的入门 AI 对局。',
      resume: '继续本地对战',
      continue: '继续',
      end: '结束',
      ended: '本地对局已结束。',
      endedTitle: '已退出',
      leaveConfirm: '确定要结束当前这局本地对战吗？',
      resetProfile: '重设本地资料',
      resetProfileConfirm: '确定要重设当前本地玩家资料吗？这会返回资料设置页。',
      tutorialRoom: '教学: 首战AI',
      tutorialFailed: '创建教学关卡失败',
      aiFailed: '创建AI对战失败',
      systemError: '系统异常',
      roomError: '错误',
      nav: {
        decks: '本地牌组',
        history: '对局记录',
        appearance: '外观偏好',
      },
      tutorialSteps: {
        welcomeTitle: '欢迎来到单机模式',
        welcomeContent: '这里是本地单机版的化学 UNO。你可以直接挑战 AI，或先进入教学关卡熟悉出牌和反应规则。',
        navigationTitle: '玩家资料',
        navigationContent: '通过这里可以进入个人资料页，修改头像、查看本机战绩和本地牌组。',
        playerTitle: '当前玩家',
        playerContent: '这里显示当前使用的昵称和头像。单机模式下，数据只保存在当前设备。',
        aiTitle: 'AI竞技场',
        aiContent: '从这里开始一局玩家 VS AI 对战。你可以调整 AI 难度和数量，随时开始挑战。',
        doneTitle: '开始本地对战',
        doneContent: '你已经了解单机版大厅的主要功能。现在就开始一局 AI 对战，或进入教学关卡熟悉规则。',
      },
      modal: {
        title: 'AI 竞技场',
        mode: '本地 PvE 模式',
        roomName: '对局名称',
        roomNamePlaceholder: '留空则自动生成名称',
        difficulty: 'AI 智能等级',
        opponents: 'AI 数量',
        deck: '牌组',
        points: '燃素结算',
        pointsDesc: '难度 >= 50% 时可获得本地燃素奖励',
        customDeckDesc: '自定义牌组不支持燃素模式',
        start: '开始挑战',
      },
      footer: {
        agreement: '服务协议',
        privacy: '隐私政策',
      },
    },
    profile: {
      title: '本地玩家档案',
      categories: {
        research: '本地牌组',
        history: '对局记录',
        settings: '外观偏好',
      },
      resetProfile: '重设本地玩家资料',
      resetProfileConfirm: '确定要重设当前本地玩家资料吗？这会返回资料设置页。',
      resetTitle: '重设本地资料',
    },
    profileHeader: {
      localPlayer: '本地玩家',
      level: '研究员等级',
      points: '燃素',
      createdAt: '注册时间',
    },
    reactions: {
      eyebrow: '实验百科',
      title: '化学反应百科',
      subtitle: '实验室化学反应百科',
      registryTitle: 'Reaction Registry',
      searchPlaceholder: '搜索反应物或生成物',
      matched: 'Matched',
      emptyState: '未检索到相关化学反应数据',
      prev: 'Prev',
      next: 'Next',
      clear: 'Clear',
      status: 'Status',
    },
    game: {
      roomNotLoaded: '房间信息未加载，请刷新页面',
      userInfoInvalid: '用户信息异常，请重新登录',
      operationFailed: '操作失败',
      joinFailedTitle: '加入失败',
      roomNotFound: '房间不存在或已被关闭',
      authFailed: '身份验证失败，请重新登录',
      notInRoom: '您不在该房间中',
      initTimeout: '实验室初始化超时，请检查网络连接后重试',
      tutorialAiStep: '当前是 AI 演示步骤，请等待 AI 操作',
      tutorialWrongAction: '当前步骤不支持该操作，请按提示执行',
      playFailed: '出牌失败',
      notSelectedTarget: '请选择要合成或放置的化学物质',
      selectTwoSubstances: '请选择参与双联反应的两种物质',
      doubleActionFailed: '双联行动失败',
      doubleNotReady: '双联反应尚未就绪，请先进行普通实验（行动）',
      drawFailed: '摸牌失败',
      copyPrivateSuccess: '私密房间邀请链接已复制（含访问密钥），快发送给你的科研伙伴吧！',
      copyPublicSuccess: '实验邀请链接已复制到剪贴板，快发送给你的科研伙伴吧！',
      copyFailed: '链接复制失败，请手动复制浏览器地址栏',
      achievementAlchemist: '获得成就：炼金术士 (合成单质金)',
      achievementTitle: '成就达成！',
      achievements: {
        normal: {
          title: '成就达成',
          description: '你已完成一项成就',
        },
        milestone: {
          title: '里程碑达成',
          description: '阶段目标已完成',
        },
        rare: {
          title: '稀有成就',
          description: '解锁了一项罕见的成就',
        },
        final: {
          title: '终局完成',
          description: '达成了最终目标',
        },
      },
    },
  },
  'en-US': {
    common: {
      zh: '中文',
      en: 'English',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      loading: 'Loading...',
      localPlayer: 'Local Player',
      localMode: 'Local Mode',
      localProfile: 'Local Profile',
    },
    login: {
      setup: 'Local Player Setup',
      preview: 'Local Player Preview',
      previewDesc: 'Used only for local single-player matches and local records',
      nickname: 'Nickname',
      avatar: 'Avatar',
      random: 'Random',
      nicknamePlaceholder: 'Enter your player nickname',
      intro: 'This build is local-only Player vs AI. Nickname, avatar, records, and settings are stored on this device.',
      submit: 'Enter Local Mode',
      submitting: 'Initializing...',
      errors: {
        empty: 'Please enter a nickname',
        tooLong: 'Nickname must be 20 characters or fewer',
        invalid: 'Nickname can only contain letters, numbers, Chinese characters, and underscores',
        failed: 'Failed to initialize local player profile',
      },
      randomSeeds: ['Element Walker', 'Reaction Rookie', 'Quantum Duelist', 'Orbital Drifter', 'Catalyst Master', 'Molecule Hunter'],
    },
    lobby: {
      title: 'Local AI Battle Lobby',
      subtitle: 'This build focuses on Player vs AI. Your nickname, avatar, records, and settings are saved on this device.',
      currentPlayer: 'Current Player',
      localSave: 'Local Save',
      deck: 'Deck',
      deckDesc: 'View the deck used for the current AI match',
      aiArena: 'AI Arena',
      tutorial: 'Tutorial Match',
      localInfo: 'Local Notes',
      info1: 'No account system or online matchmaking required.',
      info2: 'All profile data and match records stay on this device.',
      info3: 'You can update avatar and appearance at any time.',
      info4: 'The tutorial creates a beginner-friendly 1v1 AI match.',
      resume: 'Resume Local Match',
      continue: 'Continue',
      end: 'End',
      ended: 'Local match ended.',
      endedTitle: 'Exited',
      leaveConfirm: 'End the current local match?',
      resetProfile: 'Reset Local Profile',
      resetProfileConfirm: 'Reset the current local player profile and return to setup?',
      tutorialRoom: 'Tutorial: First AI Match',
      tutorialFailed: 'Failed to create tutorial match',
      aiFailed: 'Failed to create AI match',
      systemError: 'System Error',
      roomError: 'Error',
      nav: {
        decks: 'Local Decks',
        history: 'Match History',
        appearance: 'Appearance',
      },
      tutorialSteps: {
        welcomeTitle: 'Welcome to Local Mode',
        welcomeContent: 'This is the local single-player edition of Chemistry UNO. You can challenge AI directly or start with the tutorial.',
        navigationTitle: 'Player Profile',
        navigationContent: 'Open the profile page from here to manage avatar, match history, and local decks.',
        playerTitle: 'Current Player',
        playerContent: 'This shows the nickname and avatar currently in use. In local mode, everything stays on this device.',
        aiTitle: 'AI Arena',
        aiContent: 'Start a Player vs AI match here. You can adjust AI difficulty and count anytime.',
        doneTitle: 'Start Playing',
        doneContent: 'You now know the main parts of the local lobby. Start an AI match or open the tutorial to learn the basics.',
      },
      modal: {
        title: 'AI Arena',
        mode: 'Local PvE Mode',
        roomName: 'Match Name',
        roomNamePlaceholder: 'Leave empty to generate automatically',
        difficulty: 'AI Difficulty',
        opponents: 'AI Count',
        deck: 'Deck',
        points: 'Point Rewards',
        pointsDesc: 'Difficulty >= 50% grants local point rewards',
        customDeckDesc: 'Custom decks do not support point mode',
        start: 'Start Match',
      },
      footer: {
        agreement: 'User Agreement',
        privacy: 'Privacy Policy',
      },
    },
    profile: {
      title: 'Local Player Profile',
      categories: {
        research: 'Local Decks',
        history: 'Match History',
        settings: 'Appearance',
      },
      resetProfile: 'Reset Local Player Profile',
      resetProfileConfirm: 'Reset the current local player profile and return to setup?',
      resetTitle: 'Reset Local Profile',
    },
    profileHeader: {
      localPlayer: 'Local Player',
      level: 'Level',
      points: 'Points',
      createdAt: 'Created',
    },
    reactions: {
      eyebrow: 'Experimental Wiki',
      title: 'Chemical Reaction Encyclopedia',
      subtitle: 'Reaction database',
      registryTitle: 'Reaction Registry',
      searchPlaceholder: 'Search reactant or product',
      matched: 'Matched',
      emptyState: 'No matching chemical reactions found',
      prev: 'Prev',
      next: 'Next',
      clear: 'Clear',
      status: 'Status',
    },
    game: {
      roomNotLoaded: 'Room information has not loaded, please refresh the page',
      userInfoInvalid: 'User information is invalid, please log in again',
      operationFailed: 'Operation failed',
      joinFailedTitle: 'Join failed',
      roomNotFound: 'Room does not exist or has been closed',
      authFailed: 'Authentication failed, please log in again',
      notInRoom: 'You are not in this room',
      initTimeout: 'Lab initialization timed out, please check your connection and try again',
      tutorialAiStep: 'This is an AI demo step, please wait for the AI',
      tutorialWrongAction: 'This step does not support that action, please follow the prompt',
      playFailed: 'Play failed',
      notSelectedTarget: 'Please select a substance to synthesize or place',
      selectTwoSubstances: 'Please select two substances for the double reaction',
      doubleActionFailed: 'Double action failed',
      doubleNotReady: 'Double reaction is not ready yet, please perform a normal action first',
      drawFailed: 'Draw failed',
      copyPrivateSuccess: 'Private room invite link copied (with access key). Send it to your lab partner!',
      copyPublicSuccess: 'Experiment invite link copied to clipboard. Send it to your lab partner!',
      copyFailed: 'Link copy failed, please copy the browser address bar manually',
      achievementAlchemist: 'Achievement unlocked: Alchemist (synthesize elemental gold)',
      achievementTitle: 'Achievement Unlocked!',
      achievements: {
        normal: {
          title: 'Achievement Unlocked',
          description: 'You have completed an achievement',
        },
        milestone: {
          title: 'Milestone Reached',
          description: 'You have completed an important milestone',
        },
        rare: {
          title: 'Rare Achievement',
          description: 'You have unlocked a rare achievement',
        },
        final: {
          title: 'Final Achievement',
          description: 'You have completed the final achievement',
        },
      },
    }
  },
} as const

const detectBrowserLocale = (): SupportedLocale => {
  const language = String(navigator.language || '').toLowerCase()
  return language.startsWith('zh') ? 'zh-CN' : 'en-US'
}

const locale = ref<SupportedLocale>('zh-CN')

const resolveMessage = (inputLocale: SupportedLocale, path: string): string => {
  const result = path.split('.').reduce<any>((acc, key) => acc?.[key], messages[inputLocale])
  return typeof result === 'string' ? result : path
}

export const initializeI18n = () => {
  const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null
  locale.value = stored === 'zh-CN' || stored === 'en-US' ? stored : detectBrowserLocale()
  document.documentElement.lang = locale.value
}

export const setLocale = (nextLocale: SupportedLocale) => {
  locale.value = nextLocale
  localStorage.setItem(STORAGE_KEY, nextLocale)
  document.documentElement.lang = nextLocale
}

export const useI18n = () => {
  const t = (path: string) => resolveMessage(locale.value, path)
  // td: return both Chinese and English texts joined with a separator
  const td = (path: string, separator = ' / ') => {
    const zh = resolveMessage('zh-CN', path)
    const en = resolveMessage('en-US', path)
    // If both are identical or one is missing, fallback to the available one
    if (!zh && !en) return path
    if (!zh) return en
    if (!en) return zh
    if (zh === en) return zh
    return `${zh}${separator}${en}`
  }
  const currentLocale = computed(() => locale.value)
  const isZh = computed(() => locale.value === 'zh-CN')
  return {
    locale: currentLocale,
    isZh,
    t,
    td,
    setLocale,
  }
}

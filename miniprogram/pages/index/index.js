const app = getApp();
let msgId = 0;

Page({
    data: {
        messages: [],
        inputValue: '',
        loading: false,
        scrollToId: '',
        userInfo: null,
        showMenu: false,
        showMap: false,
        mapUrl: '',
        conversations: [],
        currentConversationId: '',
        welcomeText: '你好！我是新生入学助手，有什么问题都可以问我～\n\n你可以直接输入问题，也可以点击下方的快捷提问：',
        quickQuestions: [
            '学校在哪里', '学费怎么交', '食堂怎么样',
            '宿舍怎么样', '报到流程是什么', '图书馆怎么借书',
            '学校有什么社团', '周边有什么好玩的', '怎么选课'
        ]
    },

    onLoad() {
        const userInfo = app.globalData.userInfo;
        if (!userInfo || !userInfo.user_id) {
            wx.redirectTo({ url: '/pages/login/login' });
            return;
        }
        this.setData({
            userInfo,
            mapUrl: app.globalData.baseUrl.replace('/api', '') + '/public/campus_map.jpg'
        });
        this.loadConversations();
        // 首次进入创建空会话
        if (!this.data.currentConversationId) {
            this._createNewConv();
        }
    },

    onShow() {
        // 从其他页面返回时，恢复当前会话的消息
        if (this.data.currentConversationId) {
            const conv = this._findConv(this.data.currentConversationId);
            if (conv) {
                this.setData({ messages: conv.messages || [] });
            }
        }
    },

    // ========== 会话管理 ==========
    loadConversations() {
        const list = wx.getStorageSync('conversations') || [];
        this.setData({ conversations: list });
    },

    _saveAll() {
        wx.setStorageSync('conversations', this.data.conversations);
    },

    _findConv(id) {
        return this.data.conversations.find(c => c.id === id);
    },

    _createNewConv() {
        const id = 'conv_' + Date.now();
        const conv = {
            id,
            title: '新对话',
            messages: [],
            createdAt: this._fmtDate(new Date()),
            updatedAt: this._fmtDate(new Date())
        };
        this.data.conversations.unshift(conv);
        this._saveAll();
        msgId = 0;
        this.data.currentConversationId = id;
        this.setData({
            currentConversationId: id,
            messages: [],
            showMenu: false,
            scrollToId: ''
        });
    },

    startNewConversation() {
        this._createNewConv();
    },

    switchConversation(e) {
        const id = e.currentTarget.dataset.id;
        const conv = this._findConv(id);
        if (!conv) return;
        msgId = conv.messages.length > 0
            ? Math.max(...conv.messages.map(m => m.id))
            : 0;
        this.data.currentConversationId = id;
        this.setData({
            currentConversationId: id,
            messages: conv.messages || [],
            showMenu: false,
            scrollToId: conv.messages && conv.messages.length > 0
                ? 'msg-' + conv.messages[conv.messages.length - 1].id
                : ''
        });
    },

    deleteConversation(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '删除对话',
            content: '确定删除这个对话吗？',
            success: (res) => {
                if (!res.confirm) return;
                this.data.conversations = this.data.conversations.filter(c => c.id !== id);
                this._saveAll();
                if (this.data.currentConversationId === id) {
                    this._createNewConv();
                } else {
                    this.setData({ conversations: this.data.conversations });
                }
            }
        });
    },

    clearAllHistory() {
        wx.showModal({
            title: '清空历史',
            content: '确定清空所有对话记录吗？此操作不可恢复。',
            success: (res) => {
                if (!res.confirm) return;
                this.data.conversations = [];
                this._saveAll();
                this._createNewConv();
            }
        });
    },

    // ========== 菜单 ==========
    toggleMenu() { this.setData({ showMenu: !this.data.showMenu }); },
    closeMenu() { this.setData({ showMenu: false }); },

    // ========== 地图面板 ==========
    openMap() { this.setData({ showMap: true }); },
    closeMap() { this.setData({ showMap: false }); },

    // ========== 聊天 ==========
    onInput(e) { this.setData({ inputValue: e.detail.value }); },

    onSend() {
        const text = this.data.inputValue.trim();
        if (!text || this.data.loading) return;
        this.askQuestion(text);
    },

    onQuickAsk(e) {
        const text = e.currentTarget.dataset.text;
        this.askQuestion(text);
    },

    async askQuestion(text) {
        if (!this.data.currentConversationId) {
            this._createNewConv();
        }

        const now = this._fmtTime();
        const userMsg = { id: ++msgId, role: 'user', text, time: now };

        // 直接操作数组后统一 setData
        this.data.messages.push(userMsg);
        this.setData({
            messages: this.data.messages,
            inputValue: '',
            loading: true,
            scrollToId: 'msg-loading'
        });

        const conv = this._findConv(this.data.currentConversationId);
        if (conv && (!conv.messages || conv.messages.length === 0)) {
            conv.title = text.length > 15 ? text.slice(0, 15) + '...' : text;
        }

        try {
            const uid = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
            const res = await app.request('/qa/ask', 'POST', { user_id: uid, question_text: text });
            let answer = '网络异常，请稍后重试。';
            let category = '';
            if (res.code === 0 && res.data && res.data.answer) {
                answer = res.data.answer.replace(/\\n/g, '\n');
                category = res.data.category || '';
            }
            const botMsg = { id: ++msgId, role: 'bot', text: answer, time: this._fmtTime(), category };
            this.data.messages.push(botMsg);
            this.updateSuggestions(category);
        } catch (e) {
            this.data.messages.push({
                id: ++msgId, role: 'bot',
                text: '网络异常，请稍后重试。',
                time: this._fmtTime()
            });
        }

        // 同步到会话存储
        if (conv) {
            conv.messages = this.data.messages.slice();
            conv.updatedAt = this._fmtDate(new Date());
        }
        this._saveAll();

        this.setData({
            messages: this.data.messages,
            loading: false,
            scrollToId: 'msg-bottom'
        });
    },

    async updateSuggestions(category) {
        try {
            const res = await app.request('/qa/suggest', 'POST', { category });
            if (res.code === 0 && res.data && res.data.length > 0) {
                this.setData({ quickQuestions: res.data });
            }
        } catch (e) { }
    },

    // ========== 导航 ==========
    goToAdmin() { this.setData({ showMenu: false }); wx.navigateTo({ url: '/pages/admin/admin' }); },
    goToAnswer() { this.setData({ showMenu: false }); wx.navigateTo({ url: '/pages/answer/answer' }); },

    onLogout() {
        wx.showModal({
            title: '确认退出',
            content: '确定要退出登录吗？',
            success: (res) => { if (res.confirm) app.logout(); }
        });
    },

    _fmtTime() {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    _fmtDate(d) {
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
});

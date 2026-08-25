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
        this.setData({ userInfo });
        this.loadConversations();
        // 自动选中第一个会话或创建新会话
        if (this.data.conversations.length > 0) {
            this.switchToConv(this.data.conversations[0].id);
        } else {
            this._createNewConv();
        }
    },

    onShow() {
        if (this.data.currentConversationId) {
            const msgs = this._loadMessages(this.data.currentConversationId);
            this.setData({ messages: msgs });
        }
    },

    // ========== 会话管理 ==========
    // 会话列表只存元数据，消息单独存储
    _convKey() { return 'conv_list'; },
    _msgKey(id) { return 'conv_msgs_' + id; },

    loadConversations() {
        const list = wx.getStorageSync(this._convKey()) || [];
        this.setData({ conversations: list });
    },

    _saveConvList() {
        wx.setStorageSync(this._convKey(), this.data.conversations);
    },

    _loadMessages(convId) {
        try {
            return wx.getStorageSync(this._msgKey(convId)) || [];
        } catch (e) { return []; }
    },

    _saveMessages(convId, messages) {
        wx.setStorageSync(this._msgKey(convId), messages);
    },

    _deleteMessages(convId) {
        wx.removeStorageSync(this._msgKey(convId));
    },

    _findConv(id) {
        return this.data.conversations.find(c => c.id === id);
    },

    _createNewConv() {
        const id = 'conv_' + Date.now();
        const now = this._fmtDate(new Date());
        const conv = { id, title: '新对话', createdAt: now, updatedAt: now };
        const list = [conv, ...this.data.conversations];
        this.setData({ conversations: list, currentConversationId: id, messages: [], showMenu: false, scrollToId: '' });
        this._saveConvList();
        msgId = 0;
        this._saveMessages(id, []);
    },

    startNewConversation() {
        this._createNewConv();
    },

    switchConversation(e) {
        const id = e.currentTarget.dataset.id;
        this.switchToConv(id);
    },

    switchToConv(id) {
        const conv = this._findConv(id);
        if (!conv) return;
        const msgs = this._loadMessages(id);
        msgId = msgs.length > 0 ? Math.max(...msgs.map(m => m.id)) : 0;
        this.setData({
            currentConversationId: id,
            messages: msgs,
            showMenu: false,
            scrollToId: msgs.length > 0 ? 'msg-' + msgs[msgs.length - 1].id : ''
        });
    },

    deleteConversation(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '删除对话',
            content: '确定删除这个对话吗？',
            success: (res) => {
                if (!res.confirm) return;
                const list = this.data.conversations.filter(c => c.id !== id);
                this.setData({ conversations: list });
                this._saveConvList();
                this._deleteMessages(id);
                if (this.data.currentConversationId === id) {
                    if (list.length > 0) {
                        this.switchToConv(list[0].id);
                    } else {
                        this._createNewConv();
                    }
                }
            }
        });
    },

    clearAllHistory() {
        wx.showModal({
            title: '清空历史',
            content: '确定清空所有对话记录吗？',
            success: (res) => {
                if (!res.confirm) return;
                this.data.conversations.forEach(c => this._deleteMessages(c.id));
                this.setData({ conversations: [] });
                this._saveConvList();
                this._createNewConv();
            }
        });
    },

    toggleMenu() { this.setData({ showMenu: !this.data.showMenu }); },
    closeMenu() { this.setData({ showMenu: false }); },
    openMap() {
        const mapUrl = app.globalData.baseUrl.replace('/api', '') + '/public/campus_map.jpg';
        wx.previewImage({ urls: [mapUrl], current: mapUrl });
    },

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
        const msgs = [...this.data.messages, userMsg];
        this.setData({ messages: msgs, inputValue: '', loading: true, scrollToId: 'msg-loading' });

        // 首条消息作为会话标题（此时 messages 已包含刚发送的用户消息，length === 1）
        const conv = this._findConv(this.data.currentConversationId);
        if (conv && this.data.messages.length === 1) {
            const title = text.length > 15 ? text.slice(0, 15) + '...' : text;
            const list = this.data.conversations.map(c =>
                c.id === this.data.currentConversationId ? { ...c, title, updatedAt: this._fmtDate(new Date()) } : c
            );
            this.setData({ conversations: list });
            this._saveConvList();
        }

        try {
            const uid = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
            const res = await app.request('/qa/ask', 'POST', { user_id: uid, question_text: text });
            let answer = '网络异常，请稍后重试。';
            let answerId = 0;
            if (res.code === 0 && res.data && res.data.answer) {
                answer = res.data.answer.replace(/\\n/g, '\n');
                answerId = res.data.answer_id || 0;
            }
            const botMsg = { id: ++msgId, role: 'bot', text: answer, answerId, time: this._fmtTime() };
            const finalMsgs = [...this.data.messages, botMsg];
            this.setData({ messages: finalMsgs, loading: false, scrollToId: 'msg-bottom' });
            this._saveMessages(this.data.currentConversationId, finalMsgs);
            this._touchConv(this.data.currentConversationId);
        } catch (e) {
            const botMsg = { id: ++msgId, role: 'bot', text: '网络异常，请稍后重试。', time: this._fmtTime() };
            const finalMsgs = [...this.data.messages, botMsg];
            this.setData({ messages: finalMsgs, loading: false, scrollToId: 'msg-bottom' });
            this._saveMessages(this.data.currentConversationId, finalMsgs);
            this._touchConv(this.data.currentConversationId);
        }
    },

    // 更新会话的 updatedAt 排到最前
    _touchConv(id) {
        const list = this.data.conversations.map(c =>
            c.id === id ? { ...c, updatedAt: this._fmtDate(new Date()) } : c
        );
        list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        this.setData({ conversations: list });
        this._saveConvList();
    },

    async goToAnswer() {
        this.setData({ showMenu: false });
        try {
            const uid = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
            if (uid) {
                const res = await app.request(`/user/info/${uid}`);
                if (res.code === 0 && res.data) {
                    app.globalData.userInfo = res.data;
                    wx.setStorageSync('userInfo', res.data);
                }
            }
        } catch (e) {}
        const user = app.globalData.userInfo;
        if (!user || user.auth_status !== 1) {
            wx.showModal({
                title: '需要认证',
                content: '回答问题需要先完成学生身份认证',
                confirmText: '去认证',
                success: (r) => { if (r.confirm) wx.navigateTo({ url: '/pages/verify/verify' }); }
            });
            return;
        }
        wx.navigateTo({ url: '/pages/answer/answer' });
    },
    goToVerify() { this.setData({ showMenu: false }); wx.navigateTo({ url: '/pages/verify/verify' }); },

    onFeedback(e) {
        const { idx, score } = e.currentTarget.dataset;
        const msgs = [...this.data.messages];
        if (!msgs[idx] || msgs[idx].rated || !msgs[idx].answerId) return;
        msgs[idx] = { ...msgs[idx], rated: true, score };
        this.setData({ messages: msgs });
        this._saveMessages(this.data.currentConversationId, msgs);
        const userId = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
        app.request('/qa/feedback', 'POST', {
            answer_id: msgs[idx].answerId, user_id: userId,
            score: score === 1 ? 5 : 2, comment: ''
        }).catch(() => {});
    },

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

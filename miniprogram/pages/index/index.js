const app = getApp();
let msgId = 0;

Page({
    data: {
        messages: [],
        inputValue: '',
        loading: false,
        scrollToId: '',
        quickQuestions: [
            '学校在哪里', '学费怎么交', '食堂怎么样',
            '宿舍怎么样', '报到流程是什么', '图书馆怎么借书',
            '学校有什么社团', '周边有什么好玩的', '怎么选课'
        ]
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
        const now = this._getTime();
        this.data.messages.push({ id: ++msgId, role: 'user', text, time: now });
        this.setData({
            messages: this.data.messages,
            inputValue: '',
            loading: true,
            scrollToId: 'msg-loading'
        });

        try {
            const res = await app.request('/qa/ask', 'POST', { user_id: 0, question_text: text });
            let answer = '网络异常，请稍后重试。';
            let category = '';

            if (res.code === 0 && res.data && res.data.answer) {
                answer = res.data.answer.replace(/\\n/g, '\n');
                category = res.data.category || '';
            }

            this.data.messages.push({ id: ++msgId, role: 'bot', text: answer, time: this._getTime(), category });

            // 根据回答分类动态更新快捷提问
            this.updateSuggestions(category);
        } catch (e) {
            this.data.messages.push({ id: ++msgId, role: 'bot', text: '网络异常，请稍后重试。', time: this._getTime() });
        }

        this.setData({ messages: this.data.messages, loading: false, scrollToId: 'msg-bottom' });
    },

    async updateSuggestions(category) {
        try {
            const res = await app.request('/qa/suggest', 'POST', { category });
            if (res.code === 0 && res.data && res.data.length > 0) {
                this.setData({ quickQuestions: res.data });
            }
        } catch (e) { }
    },

    _getTime() {
        const d = new Date();
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
});

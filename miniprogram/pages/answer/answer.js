const app = getApp();

Page({
    data: {
        pendingList: [],
        loading: false,
        showAnswerModal: false,
        currentQuestion: '',
        currentQuestionId: 0,
        answerText: ''
    },

    onLoad() {
        this.loadPendingQuestions();
    },

    async loadPendingQuestions() {
        this.setData({ loading: true });
        try {
            const res = await app.request('/qa/pending');
            if (res.code === 0) {
                this.setData({ pendingList: res.data || [] });
            }
        } catch (e) {
            console.error('加载待回答问题失败:', e);
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
        this.setData({ loading: false });
    },

    onSelectQuestion(e) {
        const { id, text } = e.currentTarget.dataset;
        this.setData({
            showAnswerModal: true,
            currentQuestionId: id,
            currentQuestion: text,
            answerText: ''
        });
    },

    closeModal() {
        this.setData({ showAnswerModal: false, answerText: '' });
    },

    onAnswerInput(e) {
        this.setData({ answerText: e.detail.value });
    },

    async submitAnswer() {
        const { currentQuestionId, answerText } = this.data;
        if (!answerText.trim()) {
            wx.showToast({ title: '请输入回答', icon: 'none' });
            return;
        }

        try {
            const res = await app.request('/qa/answer', 'POST', {
                question_id: currentQuestionId,
                user_id: 0,
                answer_text: answerText.trim()
            });

            if (res.code === 0) {
                wx.showToast({ title: '回答已提交', icon: 'success' });
                this.closeModal();
                this.loadPendingQuestions();
            } else {
                wx.showToast({ title: res.msg || '提交失败', icon: 'none' });
            }
        } catch (e) {
            wx.showToast({ title: '网络错误', icon: 'none' });
        }
    }
});

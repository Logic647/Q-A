const app = getApp();

Page({
    data: {
        pendingList: [],
        loading: false,
        loadError: '',
        showAnswerModal: false,
        currentQuestion: '',
        currentQuestionId: 0,
        answerText: ''
    },

    onLoad() {
        this.loadPendingQuestions();
    },

    async loadPendingQuestions() {
        this.setData({ loading: true, loadError: '' });
        try {
            const res = await app.request('/qa/pending');
            if (res.code === 0) {
                this.setData({ pendingList: res.data || [] });
            } else {
                this.setData({ loadError: res.msg || '加载失败，请稍后重试' });
            }
        } catch (e) {
            this.setData({ loadError: '网络异常，请检查网络后重试' });
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

        const userId = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;

        try {
            const res = await app.request('/qa/answer', 'POST', {
                question_id: currentQuestionId,
                user_id: userId,
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

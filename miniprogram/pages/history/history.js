const app = getApp();

Page({
    data: { history: [], loading: false, loadError: '', expandedId: 0, answerLong: {} },

    onLoad() {
        this.loadHistory();
    },

    async loadHistory() {
        const uid = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
        this.setData({ loading: true, loadError: '' });
        try {
            const res = await app.request(`/qa/history/${uid}`);
            if (res.code === 0) {
                const answerLong = {};
                (res.data || []).forEach(n => {
                    if (n.answer_text && n.answer_text.length > 120) answerLong[n.question_id] = true;
                });
                this.setData({ history: res.data || [], answerLong });
            } else {
                this.setData({ loadError: res.msg || '加载失败，请稍后重试' });
            }
        } catch (e) {
            this.setData({ loadError: '网络异常，请检查网络后重试' });
        }
        this.setData({ loading: false });
    },

    toggleExpand(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({ expandedId: this.data.expandedId === id ? 0 : id });
    }
});

const app = getApp();

Page({
    data: { history: [] },

    onLoad() {
        this.loadHistory();
    },

    async loadHistory() {
        const res = await app.request('/qa/history/0');
        if (res.code === 0) {
            this.setData({ history: res.data });
        }
    }
});

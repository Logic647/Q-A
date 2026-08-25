const app = getApp();

Page({
    data: { history: [] },

    onLoad() {
        this.loadHistory();
    },

    goBack() { wx.navigateBack(); },

    async loadHistory() {
        const uid = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
        const res = await app.request(`/qa/history/${uid}`);
        if (res.code === 0) {
            this.setData({ history: res.data });
        }
    }
});

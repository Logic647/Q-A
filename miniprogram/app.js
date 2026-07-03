App({
    globalData: {
        baseUrl: 'http://121.199.68.192/api',
        userInfo: null,
        isLoggedIn: false
    },

    onLaunch() {
        // 从本地存储恢复登录状态
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.user_id) {
            this.globalData.userInfo = userInfo;
            this.globalData.isLoggedIn = true;
        }
    },

    request(url, method = 'GET', data = {}) {
        return new Promise((resolve, reject) => {
            wx.request({
                url: this.globalData.baseUrl + url,
                method,
                data,
                header: { 'content-type': 'application/json' },
                timeout: 60000,
                success: res => resolve(res.data),
                fail: err => reject(err)
            });
        });
    },

    logout() {
        this.globalData.userInfo = null;
        this.globalData.isLoggedIn = false;
        wx.removeStorageSync('userInfo');
        wx.reLaunch({ url: '/pages/login/login' });
    }
});

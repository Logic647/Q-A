Page({
    data: {
        loading: false,
        error: ''
    },

    onLoad() {
        const app = getApp();
        if (app.globalData.isLoggedIn) {
            wx.reLaunch({ url: '/pages/index/index' });
        }
    },

    onWxLogin() {
        this.setData({ loading: true, error: '' });
        const app = getApp();

        wx.login({
            success: (loginRes) => {
                const code = loginRes.code || ('mock_' + Date.now());
                wx.request({
                    url: app.globalData.baseUrl + '/user/login',
                    method: 'POST',
                    data: { code: code, nickname: '微信用户' },
                    header: { 'content-type': 'application/json' },
                    success: (res) => {
                        const data = res.data;
                        if (data && data.code === 0 && data.data) {
                            app.globalData.userInfo = data.data;
                            app.globalData.isLoggedIn = true;
                            wx.setStorageSync('userInfo', data.data);
                            wx.showToast({ title: '登录成功', icon: 'success' });
                            setTimeout(() => {
                                wx.reLaunch({ url: '/pages/index/index' });
                            }, 500);
                        } else {
                            this.setData({ loading: false, error: (data && data.msg) || '登录失败' });
                        }
                    },
                    fail: (err) => {
                        console.error('[Login] request fail:', err);
                        this.setData({ loading: false, error: '无法连接服务器' });
                    }
                });
            },
            fail: () => {
                this.setData({ loading: false, error: '微信登录失败' });
            }
        });
    }
});

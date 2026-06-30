App({
    globalData: {
        baseUrl: 'http://127.0.0.1:3000/api',
        // baseUrl: 'http://0.0.0.0:3000/api',  // 备选
    },
    request(url, method = 'GET', data = {}) {
        return new Promise((resolve, reject) => {
            wx.request({
                url: this.globalData.baseUrl + url,
                method,
                data,
                header: { 'content-type': 'application/json' },
                timeout: 10000,
                success: res => resolve(res.data),
                fail: err => reject(err)
            });
        });
    }
});

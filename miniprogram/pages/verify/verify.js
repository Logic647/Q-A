const app = getApp();

Page({
    data: {
        authStatus: 0,
        verifyStatus: -1,
        realName: '',
        studentId: '',
        imageUrl: '',
        canSubmit: false
    },

    onLoad() { this.loadStatus(); },
    goBack() { wx.navigateBack(); },

    async loadStatus() {
        const uid = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
        if (!uid) return;
        try {
            const res = await app.request(`/user/verify-status/${uid}`);
            if (res.code === 0 && res.data) {
                this.setData({
                    authStatus: res.data.auth_status || 0,
                    verifyStatus: res.data.verify ? res.data.verify.status : -1
                });
            }
        } catch (e) {}
    },

    onNameInput(e) { this.setData({ realName: e.detail.value }); this.checkCanSubmit(); },
    onSidInput(e) { this.setData({ studentId: e.detail.value }); this.checkCanSubmit(); },
    checkCanSubmit() {
        this.setData({ canSubmit: !!(this.data.realName && this.data.studentId && this.data.imageUrl) });
    },

    chooseImage() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const tempPath = res.tempFiles[0].tempFilePath;
                // 读取为 base64
                const fs = wx.getFileSystemManager();
                fs.readFile({
                    filePath: tempPath,
                    encoding: 'base64',
                    success: (r) => {
                        const base64 = 'data:image/jpeg;base64,' + r.data;
                        this.setData({ imageUrl: base64 });
                        this.checkCanSubmit();
                    },
                    fail: () => {
                        // 失败时直接用临时路径
                        this.setData({ imageUrl: tempPath });
                        this.checkCanSubmit();
                    }
                });
            }
        });
    },

    async onSubmit() {
        const { realName, studentId, imageUrl } = this.data;
        if (!realName || !studentId || !imageUrl) return;
        const uid = app.globalData.userInfo ? app.globalData.userInfo.user_id : 0;
        wx.showLoading({ title: '提交中...' });
        try {
            const res = await app.request('/user/verify', 'POST', {
                user_id: uid, real_name: realName, student_id: studentId, image_url: imageUrl
            });
            wx.hideLoading();
            if (res.code === 0) {
                wx.showToast({ title: '已提交', icon: 'success' });
                setTimeout(() => this.loadStatus(), 500);
            } else {
                wx.showToast({ title: res.msg || '提交失败', icon: 'none' });
            }
        } catch (e) {
            wx.hideLoading();
            wx.showToast({ title: '网络错误', icon: 'none' });
        }
    }
});

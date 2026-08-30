const app = getApp();

Page({
    data: {
        authStatus: 0,
        verifyStatus: -1,
        realName: '',
        studentId: '',
        imageUrl: '',
        canSubmit: false,
        errors: {}
    },

    onLoad() { this.loadStatus(); },

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

    onNameInput(e) { this.setData({ realName: e.detail.value, 'errors.name': '' }); this.checkCanSubmit(); },
    onSidInput(e) { this.setData({ studentId: e.detail.value, 'errors.sid': '' }); this.checkCanSubmit(); },
    checkCanSubmit() {
        this.setData({ canSubmit: !!(this.data.realName && this.data.studentId && this.data.imageUrl) });
    },
    validate() {
        const errors = {};
        const name = this.data.realName.trim();
        const sid = this.data.studentId.trim();
        if (!name) errors.name = '请输入真实姓名';
        else if (name.length < 2 || name.length > 20) errors.name = '姓名长度需在 2-20 字之间';
        if (!sid) errors.sid = '请输入学号';
        else if (!/^\d{6,12}$/.test(sid)) errors.sid = '学号应为 6-12 位数字';
        this.setData({ errors });
        return !Object.keys(errors).length;
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
        if (!this.data.canSubmit || !this.validate()) return;
        const { realName, studentId, imageUrl } = this.data;
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

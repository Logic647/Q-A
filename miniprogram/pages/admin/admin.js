const app = getApp();

Page({
    data: {
        activeTab: 0,
        stats: {},
        pendingList: [],
        lowScoreList: [],
        kbList: [],
        verifyList: [],
        verifiedList: [],
        showKBModal: false,
        editingKB: null,
        kbForm: { question_text: '', answer_text: '' },
        categories: ['交通', '费用', '食堂', '报到', '宿舍', '学校', '其他'],
        kbCategoryIndex: 6,
        remarkMap: {},
        userRemarkMap: {}
    },

    onLoad() { this.loadData(); },
    onShow() { this.loadData(); },
    goBack() { wx.navigateBack(); },
    switchTab(e) { this.setData({ activeTab: parseInt(e.currentTarget.dataset.tab) }); },

    async loadData() {
        await Promise.all([
            this.loadStats(), this.loadPending(), this.loadLowScore(),
            this.loadKBList(), this.loadVerifyList(), this.loadVerifiedList()
        ]);
    },

    async loadStats() {
        try { const r = await app.request('/admin/stats'); if (r.code === 0) this.setData({ stats: r.data }); } catch (e) {}
    },
    async loadPending() {
        try { const r = await app.request('/admin/review/pending'); if (r.code === 0) this.setData({ pendingList: r.data }); } catch (e) {}
    },
    async loadLowScore() {
        try { const r = await app.request('/admin/low-score'); if (r.code === 0) this.setData({ lowScoreList: r.data }); } catch (e) {}
    },
    async loadKBList() {
        try { const r = await app.request('/admin/kb/list'); if (r.code === 0) this.setData({ kbList: r.data }); } catch (e) {}
    },
    async loadVerifyList() {
        try { const r = await app.request('/admin/verify/pending'); if (r.code === 0) this.setData({ verifyList: r.data }); } catch (e) {}
    },
    async loadVerifiedList() {
        try { const r = await app.request('/admin/verified/list'); if (r.code === 0) this.setData({ verifiedList: r.data }); } catch (e) {}
    },

    // 审核备注
    onRemarkInput(e) {
        const vid = e.currentTarget.dataset.vid;
        this.setData({ [`remarkMap.${vid}`]: e.detail.value });
    },
    onUserRemarkInput(e) {
        const uid = e.currentTarget.dataset.uid;
        this.setData({ [`userRemarkMap.${uid}`]: e.detail.value });
    },

    // 回答审核
    onApprove(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({ title: '通过', content: '通过并入库？', success: async (r) => {
            if (!r.confirm) return;
            await app.request('/admin/review', 'POST', { answer_id: id, reviewer_id: 1, action: 1, comment: '' });
            wx.showToast({ title: '已通过', icon: 'success' }); this.loadData();
        }});
    },
    onReject(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({ title: '拒绝', content: '确定拒绝？', success: async (r) => {
            if (!r.confirm) return;
            await app.request('/admin/review', 'POST', { answer_id: id, reviewer_id: 1, action: 2, comment: '' });
            wx.showToast({ title: '已拒绝', icon: 'success' }); this.loadData();
        }});
    },

    // 认证审核
    onVerifyApprove(e) {
        const { vid, uid } = e.currentTarget.dataset;
        const remark = this.data.remarkMap[vid] || '';
        wx.showModal({ title: '通过认证', content: '确认通过？', success: async (r) => {
            if (!r.confirm) return;
            await app.request('/admin/verify/review', 'POST', { verify_id: vid, user_id: uid, action: 1, remark });
            wx.showToast({ title: '已通过', icon: 'success' }); this.loadData();
        }});
    },
    onVerifyReject(e) {
        const { vid, uid } = e.currentTarget.dataset;
        const remark = this.data.remarkMap[vid] || '';
        wx.showModal({ title: '拒绝认证', content: remark ? '拒绝原因：' + remark : '确定拒绝？', success: async (r) => {
            if (!r.confirm) return;
            await app.request('/admin/verify/review', 'POST', { verify_id: vid, user_id: uid, action: 2, remark });
            wx.showToast({ title: '已拒绝', icon: 'success' }); this.loadData();
        }});
    },

    previewImage(e) { wx.previewImage({ urls: [e.currentTarget.dataset.url] }); },

    // 已认证用户管理
    onSaveUserRemark(e) {
        const uid = e.currentTarget.dataset.uid;
        const remark = this.data.userRemarkMap[uid] || '';
        app.request('/admin/verified/update', 'POST', { user_id: uid, remark }).then(r => {
            wx.showToast({ title: '已保存', icon: 'success' }); this.loadVerifiedList();
        });
    },
    onRevokeUser(e) {
        const uid = e.currentTarget.dataset.uid;
        wx.showModal({ title: '回收权限', content: '该用户将无法再回答问题，确认回收？', success: async (r) => {
            if (!r.confirm) return;
            await app.request('/admin/verified/revoke', 'POST', { user_id: uid });
            wx.showToast({ title: '已回收', icon: 'success' }); this.loadData();
        }});
    },

    // 低分重置
    onResetLowScore(e) {
        const qid = e.currentTarget.dataset.qid;
        wx.showModal({ title: '重置', content: '放回待回答列表？', success: async (r) => {
            if (!r.confirm) return;
            await app.request('/admin/low-score/reset', 'POST', { question_id: qid });
            wx.showToast({ title: '已重置', icon: 'success' }); this.loadData();
        }});
    },

    // 知识库 CRUD
    onAddKB() {
        this.setData({ showKBModal: true, editingKB: null, kbForm: { question_text: '', answer_text: '' }, kbCategoryIndex: 6 });
    },
    onEditKB(e) {
        const item = e.currentTarget.dataset.item;
        const ci = this.data.categories.indexOf(item.category);
        this.setData({ showKBModal: true, editingKB: item.kb_id, kbForm: { question_text: item.question_text, answer_text: item.answer_text }, kbCategoryIndex: ci >= 0 ? ci : 6 });
    },
    closeKBModal() { this.setData({ showKBModal: false }); },
    onKBInput(e) { this.setData({ [`kbForm.${e.currentTarget.dataset.field}`]: e.detail.value }); },
    onKBCategoryChange(e) { this.setData({ kbCategoryIndex: e.detail.value }); },

    async submitKB() {
        const { kbForm, editingKB, kbCategoryIndex } = this.data;
        const category = this.data.categories[kbCategoryIndex];
        if (!kbForm.question_text.trim() || !kbForm.answer_text.trim()) {
            wx.showToast({ title: '请填写完整', icon: 'none' }); return;
        }
        try {
            if (editingKB) {
                await app.request('/admin/kb/update', 'POST', { kb_id: editingKB, ...kbForm, category });
            } else {
                await app.request('/admin/kb/add', 'POST', { ...kbForm, category });
            }
            wx.showToast({ title: editingKB ? '已更新' : '已添加', icon: 'success' });
            this.closeKBModal(); this.loadKBList();
        } catch (e) {
            wx.showToast({ title: '操作失败', icon: 'none' });
        }
    },
    onDeleteKB(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({ title: '删除', content: '确定删除？', success: async (r) => {
            if (!r.confirm) return;
            await app.request('/admin/kb/delete', 'POST', { kb_id: id });
            wx.showToast({ title: '已删除', icon: 'success' }); this.loadKBList();
        }});
    }
});

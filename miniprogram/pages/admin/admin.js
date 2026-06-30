const app = getApp();

Page({
    data: {
        stats: {},
        pendingList: [],
        lowScoreList: [],
        kbList: [],
        showAddKB: false,
        newKB: {
            question: '',
            answer: ''
        },
        categories: ['交通', '费用', '食堂', '报到', '住宿', '教学', '设施', '活动', '周边', '安全', '其他'],
        categoryIndex: 10
    },

    onLoad() {
        this.loadData();
    },

    async loadData() {
        await Promise.all([
            this.loadStats(),
            this.loadPending(),
            this.loadLowScore(),
            this.loadKBList()
        ]);
    },

    async loadStats() {
        try {
            const res = await app.request('/admin/stats');
            if (res.code === 0) {
                this.setData({ stats: res.data });
            }
        } catch (e) {
            console.error('加载统计失败:', e);
        }
    },

    async loadPending() {
        try {
            const res = await app.request('/admin/review/pending');
            if (res.code === 0) {
                this.setData({ pendingList: res.data });
            }
        } catch (e) {
            console.error('加载待审核列表失败:', e);
        }
    },

    async loadLowScore() {
        try {
            const res = await app.request('/admin/low-score');
            if (res.code === 0) {
                this.setData({ lowScoreList: res.data });
            }
        } catch (e) {
            console.error('加载低分回答失败:', e);
        }
    },

    async loadKBList() {
        try {
            const res = await app.request('/info/hot');
            if (res.code === 0) {
                this.setData({ kbList: res.data });
            }
        } catch (e) {
            console.error('加载知识库失败:', e);
        }
    },

    async onApprove(e) {
        const answerId = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认通过',
            content: '确定通过该回答并入库？',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await app.request('/admin/review', 'POST', {
                            answer_id: answerId,
                            reviewer_id: 1,
                            action: 1,
                            comment: ''
                        });
                        wx.showToast({ title: '已通过', icon: 'success' });
                        this.loadData();
                    } catch (e) {
                        wx.showToast({ title: '操作失败', icon: 'none' });
                    }
                }
            }
        });
    },

    async onReject(e) {
        const answerId = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认拒绝',
            content: '确定拒绝该回答？',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await app.request('/admin/review', 'POST', {
                            answer_id: answerId,
                            reviewer_id: 1,
                            action: 2,
                            comment: ''
                        });
                        wx.showToast({ title: '已拒绝', icon: 'success' });
                        this.loadData();
                    } catch (e) {
                        wx.showToast({ title: '操作失败', icon: 'none' });
                    }
                }
            }
        });
    },

    onAddKB() {
        this.setData({ showAddKB: true });
    },

    closeAddKB() {
        this.setData({ showAddKB: false, newKB: { question: '', answer: '' } });
    },

    onKBQuestionInput(e) {
        this.setData({ 'newKB.question': e.detail.value });
    },

    onKBAnswerInput(e) {
        this.setData({ 'newKB.answer': e.detail.value });
    },

    onCategoryChange(e) {
        this.setData({ categoryIndex: e.detail.value });
    },

    async submitKB() {
        const { question, answer } = this.data.newKB;
        const category = this.data.categories[this.data.categoryIndex];

        if (!question.trim() || !answer.trim()) {
            wx.showToast({ title: '请填写完整', icon: 'none' });
            return;
        }

        try {
            // 这里需要后端支持添加知识库条目的接口
            // 暂时使用现有的接口
            wx.showToast({ title: '功能开发中', icon: 'none' });
            this.closeAddKB();
        } catch (e) {
            wx.showToast({ title: '添加失败', icon: 'none' });
        }
    }
});

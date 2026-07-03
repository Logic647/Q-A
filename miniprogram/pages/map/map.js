const app = getApp();

Page({
    data: {
        mapUrl: ''
    },

    onLoad() {
        this.setData({
            mapUrl: app.globalData.baseUrl.replace('/api', '') + '/public/campus_map.jpg'
        });
    },

    onImageLoad() {},

    onPreview() {
        wx.previewImage({
            urls: [this.data.mapUrl],
            current: this.data.mapUrl
        });
    },

    onClose() {
        wx.navigateBack();
    }
});

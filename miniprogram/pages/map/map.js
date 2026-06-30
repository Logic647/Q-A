const app = getApp();

Page({
    data: {
        imageLoaded: false,
        statusBarHeight: 0
    },

    onLoad() {
        const sysInfo = wx.getSystemInfoSync();
        this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 });
    },

    onImageLoad() {
        this.setData({ imageLoaded: true });
    },

    onClose() {
        wx.navigateBack();
    },

    onPreview() {
        wx.previewImage({
            urls: ['/images/campus_map.jpg'],
            current: '/images/campus_map.jpg'
        });
    },

    onBackdropTap() {
        wx.navigateBack();
    }
});

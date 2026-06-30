const app = getApp();

Page({
    data: {
        imageLoaded: false,
        scale: 1
    },

    onLoad() {
        // 获取图片信息
        wx.getImageInfo({
            src: '/images/campus_map.jpg',
            success: (res) => {
                this.setData({
                    imageWidth: res.width,
                    imageHeight: res.height,
                    imageLoaded: true
                });
            },
            fail: (err) => {
                console.error('加载地图图片失败:', err);
            }
        });
    },

    onImageLoad(e) {
        this.setData({ imageLoaded: true });
    },

    onPreview() {
        wx.previewImage({
            urls: ['/images/campus_map.jpg'],
            current: '/images/campus_map.jpg'
        });
    }
});

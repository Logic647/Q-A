from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2200, 1800
img = Image.new('RGB', (W, H), '#FFFFFF')
d = ImageDraw.Draw(img)

def F(size): return ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', size)
def FB(size): return ImageFont.truetype(r'C:\Windows\Fonts\msyhbd.ttc', size)

def rbox(x, y, w, h, fill, outline=None, lw=2):
    d.rounded_rectangle([x, y, x+w, y+h], radius=10, fill=fill, outline=outline, width=lw)

def txt(cx, cy, text, font, fill='#000000'):
    bb = d.textbbox((0,0), text, font=font)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    d.text((cx - tw//2, cy - th//2), text, font=font, fill=fill)

def arrow(x1, y1, x2, y2, color='#94a3b8'):
    d.line([(x1,y1),(x2,y2)], fill=color, width=2)
    # arrowhead
    import math
    angle = math.atan2(y2-y1, x2-x1)
    al = 10
    for da in [2.5, -2.5]:
        ax = x2 - al*math.cos(angle - da*0.3)
        ay = y2 - al*math.sin(angle - da*0.3)
        d.line([(x2,y2),(int(ax),int(ay))], fill=color, width=2)

# ====== TITLE ======
rbox(700, 20, 800, 55, '#2563eb')
txt(1100, 47, '图 1  系统总体架构图', FB(22), '#FFFFFF')

# ====== LAYER 1: 表示层 (y: 95-250) ======
rbox(40, 95, 2120, 155, '#dbeafe', '#93c5fd')
txt(120, 118, '表示层（微信小程序前端）', FB(16), '#1e40af')

box_y, box_h = 138, 80
box_w = 300
gap = 18
sx = 70
labels = [
    ('问答交互页面', '自然语言输入 / 结果展示'),
    ('信息展示页面', '报到 / 地图 / 交通 / 费用'),
    ('食堂 / 景点页面', '菜品推荐 / 周边导览'),
    ('个人中心', '认证状态 / 历史记录'),
    ('评价反馈页面', '评分 / 评价 / 统计面板'),
    ('三种用户角色', '新生 / 在校生 / 管理员'),
]
for i, (t1, t2) in enumerate(labels):
    x = sx + i*(box_w + gap)
    rbox(x, box_y, box_w, box_h, '#FFFFFF', '#60a5fa')
    txt(x + box_w//2, box_y + 28, t1, FB(14), '#1e3a8a')
    txt(x + box_w//2, box_y + 55, t2, F(11), '#6b7280')

# Arrow 1→2
arrow(1100, 250, 1100, 280)
txt(1140, 265, 'HTTPS / RESTful API', F(12), '#6b7280')

# ====== LAYER 2: 接口层 (y: 280-420) ======
rbox(40, 280, 2120, 140, '#dcfce7', '#86efac')
txt(120, 303, '接口层（Node.js + Express / Koa）', FB(16), '#166534')

box_y2, box_h2 = 325, 70
labels2 = [
    ('请求路由', '参数校验 / 权限鉴权'),
    ('身份鉴权', 'Token 验证 / RBAC'),
    ('消息队列投递', 'RabbitMQ 异步调度'),
    ('缓存查询', 'Redis 优先命中'),
    ('响应封装', 'JSON 格式返回'),
]
box_w2 = 340
sx2 = 70
for i, (t1, t2) in enumerate(labels2):
    x = sx2 + i*(box_w2 + 18)
    rbox(x, box_y2, box_w2, box_h2, '#FFFFFF', '#4ade80')
    txt(x + box_w2//2, box_y2 + 24, t1, FB(14), '#166534')
    txt(x + box_w2//2, box_y2 + 50, t2, F(11), '#6b7280')

# Arrow 2→3
arrow(600, 420, 600, 455)
arrow(1600, 420, 1600, 455)
txt(645, 437, '业务调用', F(12), '#6b7280')
txt(1645, 437, '消息消费', F(12), '#6b7280')

# ====== LAYER 3: 业务逻辑层 (y: 455-710) ======
rbox(40, 455, 2120, 255, '#fef9c3', '#fde047')
txt(120, 478, '业务逻辑层', FB(16), '#854d0e')

box_y3, box_h3 = 500, 80
labels3 = [
    ('问答引擎服务', '知识图谱查询 / 语义匹配'),
    ('知识图谱管理', '实体 / 关系 增删改查'),
    ('用户与认证服务', '注册 / 登录 / 学号认证'),
    ('内容审核服务', '审核队列 / 状态流转'),
    ('通知服务', '微信订阅消息推送'),
]
box_w3 = 360
sx3 = 70
for i, (t1, t2) in enumerate(labels3):
    x = sx3 + i*(box_w3 + 22)
    rbox(x, box_y3, box_w3, box_h3, '#FFFFFF', '#facc15')
    txt(x + box_w3//2, box_y3 + 28, t1, FB(14), '#854d0e')
    txt(x + box_w3//2, box_y3 + 55, t2, F(11), '#6b7280')

# Row 2: 反馈 + LLM
rbox(70, 600, 360, 50, '#FFFFFF', '#facc15')
txt(250, 625, '反馈与统计服务', FB(14), '#854d0e')

rbox(470, 600, 1050, 50, '#fef9c3', '#eab308')
txt(995, 625, '大语言模型推理服务（独立部署）— 意图识别 / 实体抽取 / 检索优化', FB(13), '#92400e')
txt(995, 643, '通过 RabbitMQ 异步解耦，与接口层通信', F(11), '#92400e')

# ====== LAYER 4: 数据层 (y: 740-920) ======
rbox(40, 740, 2120, 180, '#fce7f3', '#f9a8d4')
txt(120, 763, '数据层', FB(16), '#9d174d')

box_y4, box_h4 = 788, 115
labels4 = [
    ('MySQL', ['用户 / 问答 / 审核 / 反馈', '交通路线 / 费用标准', '结构化业务数据']),
    ('Neo4j', ['知识图谱三元组存储', '实体 - 关系 - 属性', 'Cypher 语义查询']),
    ('Redis', ['高频问答对缓存', '热点数据预加载', '毫秒级读写响应']),
    ('RabbitMQ', ['接口层 ↔ 推理服务', '异步解耦 / 削峰填谷', '请求调度与负载均衡']),
]
box_w4 = 450
sx4 = 70
for i, (t1, sublines) in enumerate(labels4):
    x = sx4 + i*(box_w4 + 30)
    rbox(x, box_y4, box_w4, box_h4, '#FFFFFF', '#f472b6')
    txt(x + box_w4//2, box_y4 + 22, t1, FB(16), '#9d174d')
    for j, sl in enumerate(sublines):
        txt(x + box_w4//2, box_y4 + 55 + j*20, sl, F(11), '#6b7280')

# ====== CHANNEL BOXES ======
cy = 955
rbox(70, cy, 1000, 70, '#eff6ff', '#3b82f6')
txt(570, cy+18, '通道一：知识图谱语义检索（自动应答）', FB(14), '#1e40af')
txt(570, cy+42, '用户提问 → 意图识别 → 知识图谱查询 → 缓存 / 返回 → 结果展示', F(11), '#6b7280')

rbox(1110, cy, 1050, 70, '#fefce8', '#eab308')
txt(1635, cy+18, '通道二：在校学生众包回答（人工应答）', FB(14), '#854d0e')
txt(1635, cy+42, '未匹配 → 推送学生 → 审核入库 → 通知用户 → 知识库扩充', F(11), '#6b7280')

rbox(850, 1050, 500, 42, '#2563eb')
txt(1100, 1071, '双通道路由：基于置信度阈值', FB(14), '#FFFFFF')

# ====== CROP AND SAVE ======
img_cropped = img.crop((0, 0, W, 1120))
out = r'C:\Users\Logic\Documents\系统架构图.png'
img_cropped.save(out, 'PNG', dpi=(150,150))
print(f'Done: {os.path.getsize(out)} bytes')

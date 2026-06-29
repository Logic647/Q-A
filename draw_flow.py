from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2600, 1600
img = Image.new('RGB', (W, H), '#FFFFFF')
d = ImageDraw.Draw(img)

def F(s): return ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', s)
def FB(s): return ImageFont.truetype(r'C:\Windows\Fonts\msyhbd.ttc', s)

def rbox(x, y, w, h, fill, outline=None, lw=2):
    d.rounded_rectangle([x, y, x+w, y+h], radius=8, fill=fill, outline=outline, width=lw)

def diamond(cx, cy, w, h, fill, outline=None, lw=2):
    pts = [(cx, cy-h//2), (cx+w//2, cy), (cx, cy+h//2), (cx-w//2, cy)]
    d.polygon(pts, fill=fill, outline=outline, width=lw)

def oval(cx, cy, w, h, fill, outline=None):
    d.ellipse([cx-w//2, cy-h//2, cx+w//2, cy+h//2], fill=fill, outline=outline, width=2)

def txt(cx, cy, text, font, fill='#000000'):
    bb = d.textbbox((0,0), text, font=font)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    d.text((cx-tw//2, cy-th//2), text, font=font, fill=fill)

def adn(x, y1, y2, c='#64748b'):
    d.line([(x,y1),(x,y2)], fill=c, width=2)
    d.polygon([(x-5,y2-7),(x+5,y2-7),(x,y2)], fill=c)

def adr(x1, y, x2, c='#64748b'):
    d.line([(x1,y),(x2,y)], fill=c, width=2)
    d.polygon([(x2-7,y-5),(x2-7,y+5),(x2,y)], fill=c)

def adl(x1, y, x2, c='#64748b'):
    d.line([(x1,y),(x2,y)], fill=c, width=2)
    d.polygon([(x2+7,y-5),(x2+7,y+5),(x2,y)], fill=c)

def corner(x1,y1,x2,y2,c='#64748b'):
    d.line([(x1,y1),(x1,y2)], fill=c, width=2)
    d.line([(x1,y2),(x2,y2)], fill=c, width=2)
    if x2>x1: d.polygon([(x2-7,y2-5),(x2-7,y2+5),(x2,y2)], fill=c)
    elif x2<x1: d.polygon([(x2+7,y2-5),(x2+7,y2+5),(x2,y2)], fill=c)
    elif y2>y1: d.polygon([(x2-5,y2-7),(x2+5,y2-7),(x2,y2)], fill=c)

cx = 1300
bw, bh = 360, 55
dw, dh = 400, 85

# TITLE
rbox(800, 15, 1000, 55, '#2563eb')
txt(1300, 42, '图 2  双通道智能问答流程图', FB(22), '#FFFFFF')

# START
y0 = 100
oval(cx, y0, 180, 45, '#2563eb')
txt(cx, y0, '开始', FB(16), '#FFFFFF')
adn(cx, y0+22, y0+55)

# STEP 1
y1 = y0+60
rbox(cx-bw//2, y1, bw, bh, '#dbeafe', '#3b82f6')
txt(cx, y1+bh//2, '新生在小程序中输入自然语言问题', FB(14), '#1e3a8a')
adn(cx, y1+bh, y1+bh+28)

# STEP 2
y2 = y1+bh+32
rbox(cx-bw//2, y2, bw, bh, '#dbeafe', '#3b82f6')
txt(cx, y2+bh//2, '文本预处理（分词 / 清洗 / 编码统一）', FB(14), '#1e3a8a')
adn(cx, y2+bh, y2+bh+28)

# STEP 3
y3 = y2+bh+32
rbox(cx-bw//2, y3, bw, bh, '#e0f2fe', '#0ea5e9')
txt(cx, y3+bh//2, '查询 Redis 缓存', FB(14), '#0c4a6e')
adn(cx, y3+bh, y3+bh+28)

# DIAMOND 1
y4 = y3+bh+55
diamond(cx, y4, dw, dh, '#fef9c3', '#eab308')
txt(cx, y4-6, '缓存命中？', FB(15), '#854d0e')

# YES
adr(cx+dw//2, y4, cx+dw//2+180)
txt(cx+dw//2+90, y4-16, '是', FB(13), '#16a34a')
rbox(cx+dw//2+180, y4-25, 280, 50, '#dcfce7', '#22c55e')
txt(cx+dw//2+320, y4, '直接返回缓存结果', FB(13), '#166534')
adn(cx+dw//2+320, y4+25, y4+65)
rbox(cx+dw//2+230, y4+65, 180, 35, '#22c55e')
txt(cx+dw//2+320, y4+82, '用户查看回答', FB(12), '#FFFFFF')
corner(cx+dw//2+320, y4+100, cx+dw//2+320, 1360)

# NO
txt(cx+12, y4+dh//2+5, '否', FB(13), '#dc2626')
adn(cx, y4+dh//2, y4+dh//2+40)

# STEP 4
y5 = y4+dh//2+45
rbox(cx-bw//2, y5, bw, 60, '#fef3c7', '#f59e0b')
txt(cx, y5+15, '调用大语言模型', FB(14), '#92400e')
txt(cx, y5+38, '意图识别 + 实体抽取', FB(13), '#92400e')
adn(cx, y5+60, y5+90)

# STEP 5
y6 = y5+95
rbox(cx-bw//2, y6, bw, bh, '#fef3c7', '#f59e0b')
txt(cx, y6+bh//2, '知识图谱语义检索', FB(14), '#92400e')
adn(cx, y6+bh, y6+bh+28)

# DIAMOND 2
y7 = y6+bh+55
diamond(cx, y7, dw+60, dh+10, '#fef9c3', '#eab308')
txt(cx, y7-8, '相关性置信度', FB(14), '#854d0e')
txt(cx, y7+12, '评分', FB(14), '#854d0e')

branch_top = y7+dh//2+12
mid_y = branch_top+45

# LEFT: 通道二
LX = 300
txt(cx-110, branch_top+5, '< θl', FB(13), '#dc2626')
adn(cx, y7+dh//2, mid_y)
adl(cx-dw//2-30, mid_y, LX+200)
adn(LX+130, mid_y, mid_y+45)

c2y = mid_y+50
rbox(LX-130, c2y, 660, 420, '#fefce8', '#eab308', 3)
txt(LX+200, c2y+18, '通道二：在校学生众包回答', FB(17), '#854d0e')

s2 = [
    ('① 记录问题并推送至待回答队列', '#fef9c3', '#facc15'),
    ('② 微信订阅消息通知提问新生', '#fef9c3', '#facc15'),
    ('③ 已认证在校学生提交回答', '#fef9c3', '#facc15'),
    ('④ 管理员审核回答内容', '#fef9c3', '#facc15'),
]
for i,(t,fl,ol) in enumerate(s2):
    yy = c2y+50+i*60
    rbox(LX-90, yy, 580, 45, fl, ol)
    txt(LX+200, yy+22, t, FB(14), '#854d0e')
    if i<3: adn(LX+200, yy+45, yy+60)

fby = c2y+50+4*60+5
rbox(LX-50, fby, 500, 45, '#dcfce7', '#22c55e')
txt(LX+200, fby+22, '⑤ 用户评分反馈', FB(14), '#166534')
adn(LX+200, fby+45, fby+80)

dly = fby+85
diamond(LX+200, dly, 320, 60, '#fef9c3', '#eab308')
txt(LX+200, dly, '评分 < 阈值？', FB(13), '#854d0e')

txt(LX+10, dly-5, '是', FB(12), '#dc2626')
adl(LX+200-160, dly, LX-130)
adn(LX-130, dly, dly+50)
rbox(LX-220, dly+50, 200, 38, '#fee2e2', '#ef4444')
txt(LX-120, dly+69, '触发人工复查', FB(12), '#dc2626')
corner(LX-120, dly+88, LX-120, 1360)

txt(LX+340, dly-5, '否', FB(12), '#16a34a')
adr(LX+200+160, dly, LX+500)
adn(LX+500, dly, dly+50)
rbox(LX+400, dly+50, 240, 38, '#dcfce7', '#22c55e')
txt(LX+520, dly+69, '入库扩充知识库', FB(12), '#166534')
corner(LX+520, dly+88, LX+520, 1360)

# RIGHT: 通道一
RX = 2100
txt(cx+110, branch_top+5, '≥ θh', FB(13), '#16a34a')
adr(cx+dw//2+30, mid_y, RX-200)
adn(RX-200, mid_y, mid_y+45)

c1y = mid_y+50
rbox(RX-240, c1y, 560, 310, '#eff6ff', '#3b82f6', 3)
txt(RX+40, c1y+18, '通道一：知识图谱语义检索', FB(17), '#1e40af')

s1 = [
    ('① 图数据库执行语义查询', '#dbeafe', '#60a5fa'),
    ('② 结果相关性排序与答案组装', '#dbeafe', '#60a5fa'),
    ('③ 写入 Redis 缓存（高频问答）', '#dbeafe', '#60a5fa'),
]
for i,(t,fl,ol) in enumerate(s1):
    yy = c1y+50+i*60
    rbox(RX-200, yy, 480, 45, fl, ol)
    txt(RX+40, yy+22, t, FB(13), '#1e40af')
    if i<2: adn(RX+40, yy+45, yy+60)

adn(RX+40, c1y+50+2*60+45, c1y+50+2*60+80)
rbox(RX-180, c1y+50+2*60+80, 440, 45, '#dbeafe', '#60a5fa')
txt(RX+40, c1y+50+2*60+102, '返回结构化回答给用户', FB(13), '#1e40af')
corner(RX+40, c1y+50+2*60+125, RX+40, 1360)

# MIDDLE
txt(cx, branch_top+5, 'θl ≤ x < θh', FB(12), '#d97706')
adn(cx, mid_y, mid_y+45)

mby = mid_y+50
rbox(cx-260, mby, 520, 55, '#fff7ed', '#f97316')
txt(cx, mby+15, '同时展示检索结果', FB(14), '#9a3412')
txt(cx, mby+38, '并提供"向学长学姐提问"入口', F(12), '#9a3412')
corner(cx, mby+55, cx, 1360)

# END
end_y = 1360
oval(cx, end_y, 180, 45, '#2563eb')
txt(cx, end_y, '结束', FB(16), '#FFFFFF')

# LEGEND
ly = end_y+35
items = [
    ('#dbeafe','#3b82f6','前端操作'), ('#fef3c7','#f59e0b','LLM处理'),
    ('#fef9c3','#eab308','决策判断'), ('#eff6ff','#3b82f6','通道一'),
    ('#fefce8','#eab308','通道二'), ('#dcfce7','#22c55e','成功/入库'),
    ('#fee2e2','#ef4444','异常/复查'),
]
for i,(fl,ol,lb) in enumerate(items):
    xx = 50+i*230
    rbox(xx, ly, 50, 24, fl, ol)
    txt(xx+80, ly+12, lb, F(13), '#333')

img_cropped = img.crop((0,0,W,end_y+80))
out = r'C:\Users\Logic\Documents\双通道问答流程图.png'
img_cropped.save(out,'PNG',dpi=(150,150))
print(f'Done: {os.path.getsize(out)} bytes')

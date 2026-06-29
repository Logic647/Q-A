from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1600, 1700
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

cx = 800
bw, bh = 380, 55
dw, dh = 380, 80

# TITLE
rbox(400, 15, 800, 55, '#2563eb')
txt(800, 42, '图 3  学生身份认证流程图', FB(22), '#FFFFFF')

# START
y0 = 100
oval(cx, y0, 180, 45, '#2563eb')
txt(cx, y0, '开始', FB(16), '#FFFFFF')
adn(cx, y0+22, y0+55)

# STEP 1: 学生提交注册信息
y1 = y0+60
rbox(cx-bw//2, y1, bw, bh, '#dbeafe', '#3b82f6')
txt(cx, y1+bh//2, '在校学生提交学号 + 真实姓名', FB(14), '#1e3a8a')
adn(cx, y1+bh, y1+bh+28)

# STEP 2: 学号格式校验
y2 = y1+bh+32
rbox(cx-bw//2, y2, bw, bh, '#dbeafe', '#3b82f6')
txt(cx, y2+bh//2, '系统校验学号格式（长度/前缀/年级编码）', FB(14), '#1e3a8a')
adn(cx, y2+bh, y2+bh+28)

# DIAMOND 1: 格式合法？
y3 = y2+bh+50
diamond(cx, y3, dw, dh, '#fef9c3', '#eab308')
txt(cx, y3-6, '学号格式合法？', FB(14), '#854d0e')

# NO → right → 错误提示
adr(cx+dw//2, y3, cx+dw//2+200)
txt(cx+dw//2+100, y3-16, '否', FB(13), '#dc2626')
rbox(cx+dw//2+200, y3-25, 260, 50, '#fee2e2', '#ef4444')
txt(cx+dw//2+330, y3, '提示学号格式错误', FB(13), '#dc2626')
adn(cx+dw//2+330, y3+25, y3+65)
corner(cx+dw//2+330, y3+65, cx+dw//2+330, y1+bh//2)
adl(cx+dw//2+330, y1+bh//2, cx-bw//2)

# YES → down
txt(cx+12, y3+dh//2+5, '是', FB(13), '#16a34a')
adn(cx, y3+dh//2, y3+dh//2+40)

# STEP 3: 发送验证码
y4 = y3+dh//2+45
rbox(cx-bw//2, y4, bw, 70, '#e0f2fe', '#0ea5e9')
txt(cx, y4+18, '系统向学校邮箱 / 手机发送验证码', FB(14), '#0c4a6e')
txt(cx, y4+45, '（验证码有效期 5 分钟，最多尝试 3 次）', F(11), '#64748b')
adn(cx, y4+70, y4+100)

# STEP 4: 输入验证码
y5 = y4+105
rbox(cx-bw//2, y5, bw, bh, '#dbeafe', '#3b82f6')
txt(cx, y5+bh//2, '学生输入收到的验证码', FB(14), '#1e3a8a')
adn(cx, y5+bh, y5+bh+28)

# DIAMOND 2: 验证码正确？
y6 = y5+bh+50
diamond(cx, y6, dw, dh, '#fef9c3', '#eab308')
txt(cx, y6-6, '验证码正确？', FB(14), '#854d0e')

# NO → right → 失败
adr(cx+dw//2, y6, cx+dw//2+180)
txt(cx+dw//2+90, y6-16, '否', FB(13), '#dc2626')
rbox(cx+dw//2+180, y6-25, 240, 50, '#fee2e2', '#ef4444')
txt(cx+dw//2+300, y6, '验证码错误/过期', FB(13), '#dc2626')
adn(cx+dw//2+300, y6+25, y6+65)
rbox(cx+dw//2+220, y6+65, 160, 35, '#fee2e2', '#ef4444')
txt(cx+dw//2+300, y6+82, '返回重新输入', FB(12), '#dc2626')
corner(cx+dw//2+300, y6+100, cx+dw//2+300, y5+bh//2)
adl(cx+dw//2+300, y5+bh//2, cx-bw//2)

# YES → down
txt(cx+12, y6+dh//2+5, '是', FB(13), '#16a34a')
adn(cx, y6+dh//2, y6+dh//2+40)

# STEP 5: 比对学生信息
y7 = y6+dh//2+45
rbox(cx-bw//2, y7, bw, 70, '#fef3c7', '#f59e0b')
txt(cx, y7+18, '将学号 + 姓名与学校学生信息库', FB(14), '#92400e')
txt(cx, y7+45, '进行比对验证', FB(14), '#92400e')
adn(cx, y7+70, y7+100)

# DIAMOND 3: 匹配成功？
y8 = y7+105
diamond(cx, y8, dw, dh, '#fef9c3', '#eab308')
txt(cx, y8-6, '信息匹配成功？', FB(14), '#854d0e')

# NO → right → 拒绝
adr(cx+dw//2, y8, cx+dw//2+180)
txt(cx+dw//2+90, y8-16, '否', FB(13), '#dc2626')
rbox(cx+dw//2+180, y8-25, 240, 50, '#fee2e2', '#ef4444')
txt(cx+dw//2+300, y8, '学号或姓名不匹配', FB(13), '#dc2626')
adn(cx+dw//2+300, y8+25, y8+65)
rbox(cx+dw//2+220, y8+65, 160, 35, '#fee2e2', '#ef4444')
txt(cx+dw//2+300, y8+82, '拒绝认证申请', FB(12), '#dc2626')
corner(cx+dw//2+300, y8+100, cx+dw//2+300, y1+bh//2)
adl(cx+dw//2+300, y1+bh//2, cx-bw//2)

# YES → down
txt(cx+12, y8+dh//2+5, '是', FB(13), '#16a34a')
adn(cx, y8+dh//2, y8+dh//2+40)

# STEP 6: 标记已认证
y9 = y8+dh//2+45
rbox(cx-bw//2, y9, bw, bh, '#dcfce7', '#22c55e')
txt(cx, y9+bh//2, '将账号标记为"已认证"状态', FB(14), '#166534')
adn(cx, y9+bh, y9+bh+28)

# STEP 7: 赋予权限
y10 = y9+bh+32
rbox(cx-bw//2, y10, bw, bh, '#dcfce7', '#22c55e')
txt(cx, y10+bh//2, '赋予权限：浏览待答问题 / 提交回答', FB(14), '#166534')
adn(cx, y10+bh, y10+bh+28)

# STEP 8: 显示认证标识
y11 = y10+bh+32
rbox(cx-bw//2, y11, bw, 70, '#dcfce7', '#22c55e')
txt(cx, y11+18, '个人主页显示"已认证学生"标识', FB(14), '#166534')
txt(cx, y11+45, '增强回答可信度感知', F(12), '#166534')
adn(cx, y11+70, y11+100)

# END
y12 = y11+105
oval(cx, y12, 180, 45, '#2563eb')
txt(cx, y12, '认证完成', FB(16), '#FFFFFF')

# LEGEND
ly = y12+40
items = [
    ('#dbeafe','#3b82f6','前端输入/操作'),
    ('#e0f2fe','#0ea5e9','系统发送'),
    ('#fef3c7','#f59e0b','数据库比对'),
    ('#fef9c3','#eab308','决策判断'),
    ('#dcfce7','#22c55e','认证成功'),
    ('#fee2e2','#ef4444','失败/拒绝'),
]
for i,(fl,ol,lb) in enumerate(items):
    xx = 50+i*250
    rbox(xx, ly, 50, 24, fl, ol)
    txt(xx+85, ly+12, lb, F(13), '#333')

img_cropped = img.crop((0,0,W,y12+80))
out = r'C:\Users\Logic\Documents\身份认证流程图.png'
img_cropped.save(out,'PNG',dpi=(150,150))
print(f'Done: {os.path.getsize(out)} bytes')

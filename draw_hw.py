from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2400, 1600
img = Image.new('RGB', (W, H), '#FFFFFF')
d = ImageDraw.Draw(img)

def F(s): return ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', s)
def FB(s): return ImageFont.truetype(r'C:\Windows\Fonts\msyhbd.ttc', s)

def rbox(x, y, w, h, fill, outline=None, lw=2):
    d.rounded_rectangle([x, y, x+w, y+h], radius=8, fill=fill, outline=outline, width=lw)

def oval(cx, cy, w, h, fill, outline=None):
    d.ellipse([cx-w//2, cy-h//2, cx+w//2, cy+h//2], fill=fill, outline=outline, width=2)

def txt(cx, cy, text, font, fill='#000000'):
    bb = d.textbbox((0,0), text, font=font)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    d.text((cx-tw//2, cy-th//2), text, font=font, fill=fill)

def adn(x, y1, y2, c='#64748b', w=2):
    d.line([(x,y1),(x,y2)], fill=c, width=w)
    d.polygon([(x-5,y2-7),(x+5,y2-7),(x,y2)], fill=c)

def adr(x1, y, x2, c='#64748b', w=2):
    d.line([(x1,y),(x2,y)], fill=c, width=w)
    d.polygon([(x2-7,y-5),(x2-7,y+5),(x2,y)], fill=c)

def adl(x1, y, x2, c='#64748b', w=2):
    d.line([(x1,y),(x2,y)], fill=c, width=w)
    d.polygon([(x2+7,y-5),(x2+7,y+5),(x2,y)], fill=c)

def adu(x, y1, y2, c='#64748b', w=2):
    d.line([(x,y1),(x,y2)], fill=c, width=w)
    d.polygon([(x-5,y2+7),(x+5,y2+7),(x,y2)], fill=c)

def doublearrow_v(x, y1, y2, c='#64748b', w=2):
    d.line([(x,y1),(x,y2)], fill=c, width=w)
    d.polygon([(x-5,y2-7),(x+5,y2-7),(x,y2)], fill=c)
    d.polygon([(x-5,y1+7),(x+5,y1+7),(x,y1)], fill=c)

def doublearrow_h(x1, y, x2, c='#64748b', w=2):
    d.line([(x1,y),(x2,y)], fill=c, width=w)
    d.polygon([(x2-7,y-5),(x2-7,y+5),(x2,y)], fill=c)
    d.polygon([(x1+7,y-5),(x1+7,y+5),(x1,y)], fill=c)

# TITLE
rbox(750, 15, 900, 55, '#2563eb')
txt(1200, 42, '图 4  系统硬件部署架构图', FB(22), '#FFFFFF')

# ====== USER LAYER ======
uy = 100
rbox(600, uy, 1200, 60, '#f8fafc', '#94a3b8')
txt(1200, uy+15, '用户层', FB(14), '#475569')

# User icons
users = [('新生用户', '#dbeafe', '#3b82f6'), ('在校学生', '#fef9c3', '#eab308'), ('管理员', '#fce7f3', '#ec4899')]
for i,(name,fill,ol) in enumerate(users):
    ux = 780 + i*300
    rbox(ux, uy+28, 180, 28, fill, ol)
    txt(ux+90, uy+42, name, FB(12), '#333')

# Arrow down to Internet
adn(1200, uy+60, uy+95)
txt(1220, uy+75, 'HTTPS', F(11), '#6b7280')

# ====== INTERNET ======
iy = uy+100
rbox(700, iy, 1000, 40, '#e2e8f0', '#94a3b8')
txt(1200, iy+20, '互联网 / 微信云服务', FB(14), '#475569')
adn(1200, iy+40, iy+70)

# ====== NGINX LOAD BALANCER ======
ny = iy+75
rbox(900, ny, 600, 55, '#2563eb', '#1d4ed8')
txt(1200, ny+15, 'Nginx 负载均衡器', FB(15), '#FFFFFF')
txt(1200, ny+35, 'HTTPS 终结 / 请求分发 / 限流 / 静态资源缓存', F(11), '#dbeafe')

# Cloud label
rbox(950, ny-20, 180, 18, '#dbeafe', '#93c5fd')
txt(1040, ny-11, '公有云 DMZ 区', F(10), '#1e40af')

adn(1200, ny+55, ny+85)

# ====== FIREWALL / VPC BOUNDARY ======
fy = ny+90
d.line([(600, fy),(1800, fy)], fill='#ef4444', width=2)
d.line([(600, fy+4),(1800, fy+4)], fill='#ef4444', width=2)
txt(620, fy+8, '防火墙 / VPC 内网边界', F(11), '#ef4444')

adn(1200, fy+5, fy+40)

# ====== APPLICATION SERVERS (VPC) ======
asy = fy+45
rbox(550, asy, 1300, 140, '#f0fdf4', '#86efac')
txt(600, asy+15, '应用服务器集群（VPC 内网）', FB(13), '#166534')

# App server instances
aservers = ['Node.js 实例 1\n4核 8GB', 'Node.js 实例 2\n4核 8GB', 'Node.js 实例 3\n4核 8GB', 'Node.js 实例 4\n4核 8GB']
for i,name in enumerate(aservers):
    ax = 620 + i*290
    rbox(ax, asy+40, 250, 80, '#dcfce7', '#4ade80')
    lines = name.split('\n')
    txt(ax+125, asy+65, lines[0], FB(13), '#166534')
    txt(ax+125, asy+88, lines[1], F(11), '#6b7280')

# Scale label
rbox(620+4*290, asy+60, 160, 30, '#fef9c3', '#facc15')
txt(620+4*290+80, asy+75, '可水平扩展 →', F(11), '#854d0e')

# ====== VPC INTERNAL NETWORK ======
vpc_y = asy + 155
rbox(400, vpc_y, 1600, 10, '#e2e8f0', '#94a3b8')
txt(1200, vpc_y+20, 'VPC 内网高速通道（1~10Gbps）', F(11), '#6b7280')

# ====== BACKEND SERVICES ======
bk_y = vpc_y + 45
rbox(300, bk_y, 1800, 350, '#fdf4ff', '#d946ef', 1)
txt(350, bk_y+12, '后端服务集群（VPC 内网）', FB(13), '#86198f')

# MySQL
mysql_x = 350
rbox(mysql_x, bk_y+40, 350, 130, '#fce7f3', '#f472b6')
txt(mysql_x+175, bk_y+58, 'MySQL 数据库', FB(14), '#9d174d')
txt(mysql_x+175, bk_y+80, '4 核 / 16GB / 100GB SSD', F(11), '#6b7280')
txt(mysql_x+175, bk_y+98, '用户 / 问答 / 审核 / 反馈', F(11), '#6b7280')
txt(mysql_x+175, bk_y+116, '交通路线 / 费用标准', F(11), '#6b7280')
txt(mysql_x+175, bk_y+138, '可替换为云托管数据库', F(10), '#94a3b8')

# Neo4j
neo_x = 750
rbox(neo_x, bk_y+40, 350, 130, '#fce7f3', '#f472b6')
txt(neo_x+175, bk_y+58, 'Neo4j 图数据库', FB(14), '#9d174d')
txt(neo_x+175, bk_y+80, '4 核 / 16GB / 100GB SSD', F(11), '#6b7280')
txt(neo_x+175, bk_y+98, '知识图谱三元组', F(11), '#6b7280')
txt(neo_x+175, bk_y+116, '实体-关系-属性 / Cypher', F(11), '#6b7280')
txt(neo_x+175, bk_y+138, '可替换为云托管数据库', F(10), '#94a3b8')

# Redis
redis_x = 1150
rbox(redis_x, bk_y+40, 300, 130, '#fef9c3', '#facc15')
txt(redis_x+150, bk_y+58, 'Redis 缓存服务器', FB(14), '#854d0e')
txt(redis_x+150, bk_y+80, '2 核 / 4GB', F(11), '#6b7280')
txt(redis_x+150, bk_y+98, '高频问答对缓存', F(11), '#6b7280')
txt(redis_x+150, bk_y+116, '会话信息存储', F(11), '#6b7280')
txt(redis_x+150, bk_y+138, '可配置 Sentinel 主从热备', F(10), '#94a3b8')

# RabbitMQ
rmq_x = 1500
rbox(rmq_x, bk_y+40, 300, 130, '#e0f2fe', '#0ea5e9')
txt(rmq_x+150, bk_y+58, 'RabbitMQ 消息队列', FB(14), '#0c4a6e')
txt(rmq_x+150, bk_y+80, '2 核 / 4GB', F(11), '#6b7280')
txt(rmq_x+150, bk_y+98, '接口层 ↔ 推理服务', F(11), '#6b7280')
txt(rmq_x+150, bk_y+116, '异步解耦 / 削峰填谷', F(11), '#6b7280')
txt(rmq_x+150, bk_y+138, '可配置镜像队列持久化', F(10), '#94a3b8')

# ====== INFERENCE SERVERS ======
inf_y = bk_y + 190
rbox(1100, inf_y, 500, 100, '#fff7ed', '#f97316', 2)
txt(1350, inf_y+15, '推理服务器集群', FB(14), '#9a3412')
txt(1350, inf_y+38, 'LLM 意图识别 / 实体抽取 / 检索优化', F(12), '#9a3412')
txt(1350, inf_y+58, '8 核 / 16GB / 可选 GPU 加速', F(11), '#6b7280')
txt(1350, inf_y+76, '1~2 台实例，作为 MQ 消费者异步处理', F(10), '#94a3b8')

# Connect RabbitMQ to Inference
doublearrow_v(rmq_x+150, bk_y+170, inf_y, '#0ea5e9')

# Connect App servers to backend services
doublearrow_v(750, asy+120, bk_y, '#86efac')
doublearrow_v(1200, asy+120, bk_y, '#86efac')
doublearrow_v(1650, asy+120, bk_y, '#86efac')

# ====== MONITORING BOX ======
mon_y = bk_y + 310
rbox(350, mon_y, 450, 50, '#f1f5f9', '#94a3b8')
txt(575, mon_y+25, '监控与运维（可选）：Prometheus + Grafana', F(12), '#475569')

# ====== LEGEND ======
ly = bk_y + 380
items = [
    ('#2563eb','#1d4ed8','网络/负载均衡'),
    ('#dcfce7','#4ade80','应用服务器'),
    ('#fce7f3','#f472b6','数据库'),
    ('#fef9c3','#facc15','缓存'),
    ('#e0f2fe','#0ea5e9','消息队列'),
    ('#fff7ed','#f97316','推理服务'),
    ('#fee2e2','#ef4444','安全边界'),
]
for i,(fl,ol,lb) in enumerate(items):
    xx = 350+i*260
    rbox(xx, ly, 50, 24, fl, ol)
    txt(xx+80, ly+12, lb, F(13), '#333')

# Network bandwidth labels
txt(500, iy+25, '外网带宽 5~50Mbps', F(10), '#94a3b8')
txt(1600, vpc_y+20, '内网带宽 1~10Gbps', F(10), '#94a3b8')

# Save
out = r'C:\Users\Logic\Documents\硬件部署架构图.png'
img.save(out, 'PNG', dpi=(150,150))
print(f'Done: {os.path.getsize(out)} bytes')

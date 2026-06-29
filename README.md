# 无锡学院新生入学智能问答系统 - 知识图谱版本

## 技术栈

- **前端**: 微信小程序
- **后端**: Node.js + Express
- **数据库**: SQL Server (业务数据) + Neo4j (知识图谱)
- **缓存**: Redis
- **消息队列**: RabbitMQ
- **大模型**: MiMo-2.5-pro

## 快速开始

### 1. 安装依赖
```bash
cd server
npm install
```

### 2. 启动服务
- SQL Server: 确保 SQL Server 服务运行
- Neo4j: 安装并启动 Neo4j Desktop 或 Neo4j Community
- Redis: 安装并启动 Redis
- RabbitMQ: 安装并启动 RabbitMQ

### 3. 初始化知识图谱
```bash
node init_kg.js
```

### 4. 启动服务器
```bash
node app.js
```

## 知识图谱结构

### 节点类型
- School (学校)
- TransportHub (交通枢纽)
- Fee (费用)
- Cafeteria (食堂)
- Dish (菜品)
- Building (建筑)
- EnrollmentStep (报到环节)
- Attraction (景点)

### 关系类型
- School -可达-> TransportHub
- School -收取-> Fee
- School -拥有-> Cafeteria
- Cafeteria -提供-> Dish
- School -拥有-> Building
- School -设置-> EnrollmentStep
- School -毗邻-> Attraction

## 问答匹配流程

1. 用户输入问题
2. 识别用户意图（交通/费用/食堂/报到等）
3. Neo4j 图查询获取相关节点
4. 格式化答案返回
5. 缓存到 Redis
6. 未匹配时发送到消息队列
7. 调用大模型回答

## 环境变量

在 `config/neo4j.js` 中配置 Neo4j 连接信息：
```javascript
const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'your_password')
);
```

-- SQL Server 数据迁移脚本
-- 用于在新服务器上创建表结构和初始数据

-- 1. 用户表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user' AND xtype='U')
CREATE TABLE [user] (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    openid NVARCHAR(100) UNIQUE,
    nickname NVARCHAR(50) DEFAULT '微信用户',
    real_name NVARCHAR(50),
    student_id NVARCHAR(50),
    phone NVARCHAR(20),
    email NVARCHAR(100),
    college NVARCHAR(100),
    major NVARCHAR(100),
    enrollment_year NVARCHAR(10),
    role TINYINT DEFAULT 0,
    auth_status TINYINT DEFAULT 0,
    avatar_url NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- 2. 用户认证表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_verify' AND xtype='U')
CREATE TABLE user_verify (
    verify_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    real_name NVARCHAR(50),
    student_id NVARCHAR(50),
    image_url NVARCHAR(MAX),
    remark NVARCHAR(200) DEFAULT '',
    status TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    reviewed_at DATETIME
);

-- 3. 问题表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='question' AND xtype='U')
CREATE TABLE question (
    question_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT DEFAULT 0,
    question_text NVARCHAR(500),
    category NVARCHAR(50) DEFAULT '未分类',
    status TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

-- 4. 回答表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answer' AND xtype='U')
CREATE TABLE answer (
    answer_id INT IDENTITY(1,1) PRIMARY KEY,
    question_id INT,
    responder_id INT DEFAULT 0,
    answer_text NVARCHAR(MAX),
    source TINYINT DEFAULT 1,
    review_status TINYINT DEFAULT 1,
    avg_score DECIMAL(3,2) DEFAULT 0,
    score_count INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_answer_question FOREIGN KEY (question_id) REFERENCES question(question_id)
);

-- 2. 审核记录表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='review' AND xtype='U')
CREATE TABLE review (
    review_id INT IDENTITY(1,1) PRIMARY KEY,
    answer_id INT NOT NULL,
    reviewer_id INT,
    action TINYINT,
    comment NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_review_answer FOREIGN KEY (answer_id) REFERENCES answer(answer_id)
);

-- 3. 反馈评价表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='feedback' AND xtype='U')
CREATE TABLE feedback (
    feedback_id INT IDENTITY(1,1) PRIMARY KEY,
    answer_id INT NOT NULL,
    user_id INT,
    score TINYINT,
    comment NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE()
);

-- 4. 知识库表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='knowledge_base' AND xtype='U')
CREATE TABLE knowledge_base (
    kb_id INT IDENTITY(1,1) PRIMARY KEY,
    question_text NVARCHAR(500),
    answer_text NVARCHAR(MAX),
    category NVARCHAR(50),
    keywords NVARCHAR(500),
    source NVARCHAR(50),
    hit_count INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

-- 5. 用户认证表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_verify' AND xtype='U')
CREATE TABLE user_verify (
    verify_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    real_name NVARCHAR(50),
    student_id NVARCHAR(50),
    image_url NVARCHAR(500),
    status TINYINT DEFAULT 0,
    remark NVARCHAR(200) DEFAULT '',
    created_at DATETIME DEFAULT GETDATE(),
    reviewed_at DATETIME
);

PRINT '数据库表结构创建完成';

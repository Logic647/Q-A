-- ============================================================
-- 新生入学智能问答系统 - SQL Server 建表脚本（修复版）
-- 数据库名称: FreshmanQA
-- 使用方式：直接在 SSMS 中执行全文
-- ============================================================

-- ========== 1. 清理旧环境 ==========
USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'FreshmanQA')
BEGIN
    ALTER DATABASE FreshmanQA SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE FreshmanQA;
END
GO

-- ========== 2. 创建数据库（使用默认路径） ==========
CREATE DATABASE FreshmanQA;
GO

USE FreshmanQA;
GO

-- ========== 3. 用户表 ==========
CREATE TABLE [user] (
    user_id         INT IDENTITY(1,1) PRIMARY KEY,
    openid          NVARCHAR(64) NOT NULL,
    nickname        NVARCHAR(50),
    real_name       NVARCHAR(20),
    student_id      NVARCHAR(20),
    phone           NVARCHAR(20),
    email           NVARCHAR(100),
    college         NVARCHAR(50),
    major           NVARCHAR(50),
    enrollment_year INT,
    role            TINYINT NOT NULL DEFAULT 0,
    auth_status     TINYINT NOT NULL DEFAULT 0,
    avatar_url      NVARCHAR(256),
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_user_openid UNIQUE (openid)
);
GO

CREATE INDEX IX_user_role ON [user](role);
CREATE INDEX IX_user_auth_status ON [user](auth_status);
CREATE INDEX IX_user_student_id ON [user](student_id);
GO

-- ========== 4. 在校学生信息库 ==========
CREATE TABLE student_info (
    info_id         INT IDENTITY(1,1) PRIMARY KEY,
    student_id      NVARCHAR(20) NOT NULL UNIQUE,
    real_name       NVARCHAR(20) NOT NULL,
    college         NVARCHAR(50),
    major           NVARCHAR(50),
    grade           NVARCHAR(10),
    phone           NVARCHAR(20),
    email           NVARCHAR(100),
    is_active       BIT NOT NULL DEFAULT 1
);
GO

-- ========== 5. 知识库FAQ表 ==========
CREATE TABLE knowledge_base (
    kb_id           INT IDENTITY(1,1) PRIMARY KEY,
    question_text   NVARCHAR(500) NOT NULL,
    answer_text     NVARCHAR(MAX) NOT NULL,
    category        NVARCHAR(50) NOT NULL,
    keywords        NVARCHAR(200),
    source          NVARCHAR(50) DEFAULT 'AI采集',
    hit_count       INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_kb_category ON knowledge_base(category);
GO

-- ========== 6. 问题表 ==========
CREATE TABLE question (
    question_id     INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT NOT NULL,
    question_text   NVARCHAR(500) NOT NULL,
    category        NVARCHAR(50),
    channel         TINYINT,
    kb_id           INT,
    status          TINYINT NOT NULL DEFAULT 0,
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_question_user FOREIGN KEY (user_id) REFERENCES [user](user_id),
    CONSTRAINT FK_question_kb FOREIGN KEY (kb_id) REFERENCES knowledge_base(kb_id)
);
GO

CREATE INDEX IX_question_user ON question(user_id);
CREATE INDEX IX_question_status ON question(status);
GO

-- ========== 7. 回答表 ==========
CREATE TABLE answer (
    answer_id       INT IDENTITY(1,1) PRIMARY KEY,
    question_id     INT NOT NULL,
    responder_id    INT,
    answer_text     NVARCHAR(MAX) NOT NULL,
    source          TINYINT NOT NULL,
    review_status   TINYINT NOT NULL DEFAULT 0,
    avg_score       DECIMAL(3,2) DEFAULT 0,
    score_count     INT NOT NULL DEFAULT 0,
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_answer_question FOREIGN KEY (question_id) REFERENCES question(question_id),
    CONSTRAINT FK_answer_responder FOREIGN KEY (responder_id) REFERENCES [user](user_id)
);
GO

CREATE INDEX IX_answer_question ON answer(question_id);
CREATE INDEX IX_answer_review ON answer(review_status);
GO

-- ========== 8. 审核记录表 ==========
CREATE TABLE review (
    review_id       INT IDENTITY(1,1) PRIMARY KEY,
    answer_id       INT NOT NULL,
    reviewer_id     INT NOT NULL,
    action          TINYINT NOT NULL,
    comment         NVARCHAR(500),
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_review_answer FOREIGN KEY (answer_id) REFERENCES answer(answer_id),
    CONSTRAINT FK_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES [user](user_id)
);
GO

-- ========== 9. 反馈评价表 ==========
CREATE TABLE feedback (
    feedback_id     INT IDENTITY(1,1) PRIMARY KEY,
    answer_id       INT NOT NULL,
    user_id         INT NOT NULL,
    score           TINYINT NOT NULL,
    comment         NVARCHAR(500),
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_feedback_answer FOREIGN KEY (answer_id) REFERENCES answer(answer_id),
    CONSTRAINT FK_feedback_user FOREIGN KEY (user_id) REFERENCES [user](user_id),
    CONSTRAINT CK_feedback_score CHECK (score BETWEEN 1 AND 5)
);
GO

CREATE INDEX IX_feedback_answer ON feedback(answer_id);
GO

-- ========== 10. 报到流程表 ==========
CREATE TABLE enrollment_step (
    step_id         INT IDENTITY(1,1) PRIMARY KEY,
    step_order      INT NOT NULL UNIQUE,
    step_name       NVARCHAR(100) NOT NULL,
    description     NVARCHAR(500),
    location        NVARCHAR(100),
    materials       NVARCHAR(200),
    tips            NVARCHAR(500),
    is_active       BIT NOT NULL DEFAULT 1
);
GO

-- ========== 11. 校园建筑表 ==========
CREATE TABLE campus_building (
    building_id     INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(50) NOT NULL,
    building_type   NVARCHAR(20) NOT NULL,
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    description     NVARCHAR(500),
    floor_info      NVARCHAR(200),
    open_time       NVARCHAR(50),
    is_active       BIT NOT NULL DEFAULT 1
);
GO

CREATE INDEX IX_building_type ON campus_building(building_type);
GO

-- ========== 12. 交通路线表 ==========
CREATE TABLE transport_route (
    route_id        INT IDENTITY(1,1) PRIMARY KEY,
    start_point     NVARCHAR(100) NOT NULL,
    end_point       NVARCHAR(100) NOT NULL DEFAULT N'学校',
    transport_type  NVARCHAR(20) NOT NULL,
    route_detail    NVARCHAR(500) NOT NULL,
    duration        NVARCHAR(50),
    cost            NVARCHAR(50),
    tips            NVARCHAR(200),
    is_active       BIT NOT NULL DEFAULT 1
);
GO

-- ========== 13. 费用表 ==========
CREATE TABLE fee (
    fee_id          INT IDENTITY(1,1) PRIMARY KEY,
    fee_name        NVARCHAR(50) NOT NULL,
    fee_type        NVARCHAR(20) NOT NULL,
    amount          NVARCHAR(100),
    pay_method      NVARCHAR(200),
    pay_time        NVARCHAR(100),
    description     NVARCHAR(500),
    tips            NVARCHAR(500),
    is_active       BIT NOT NULL DEFAULT 1
);
GO

-- ========== 14. 食堂表 ==========
CREATE TABLE cafeteria (
    cafeteria_id    INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(50) NOT NULL,
    location        NVARCHAR(100),
    building_id     INT,
    open_time       NVARCHAR(100),
    description     NVARCHAR(500),
    avg_score       DECIMAL(3,2) DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_cafeteria_building FOREIGN KEY (building_id) REFERENCES campus_building(building_id)
);
GO

-- ========== 15. 菜品表 ==========
CREATE TABLE dish (
    dish_id         INT IDENTITY(1,1) PRIMARY KEY,
    cafeteria_id    INT NOT NULL,
    name            NVARCHAR(50) NOT NULL,
    dish_type       NVARCHAR(20),
    price           DECIMAL(6,2),
    avg_score       DECIMAL(3,2) DEFAULT 0,
    recommend_count INT NOT NULL DEFAULT 0,
    description     NVARCHAR(200),
    is_active       BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_dish_cafeteria FOREIGN KEY (cafeteria_id) REFERENCES cafeteria(cafeteria_id)
);
GO

CREATE INDEX IX_dish_cafeteria ON dish(cafeteria_id);
GO

-- ========== 16. 周边景点表 ==========
CREATE TABLE attraction (
    attraction_id   INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(50) NOT NULL,
    attr_type       NVARCHAR(20),
    distance        NVARCHAR(50),
    transport       NVARCHAR(100),
    description     NVARCHAR(500),
    image_url       NVARCHAR(256),
    is_active       BIT NOT NULL DEFAULT 1
);
GO

-- ========== 17. 验证码表 ==========
CREATE TABLE verify_code (
    code_id         INT IDENTITY(1,1) PRIMARY KEY,
    target          NVARCHAR(100) NOT NULL,
    code            NVARCHAR(10) NOT NULL,
    purpose         NVARCHAR(20) NOT NULL DEFAULT 'auth',
    attempts        INT NOT NULL DEFAULT 0,
    is_used         BIT NOT NULL DEFAULT 0,
    expires_at      DATETIME2 NOT NULL,
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_verify_target ON verify_code(target, purpose);
GO

-- ========== 18. 触发器：审核通过后更新问题状态 ==========
CREATE TRIGGER trg_review_approved
ON review
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE q
    SET q.status = 1
    FROM question q
    INNER JOIN answer a ON q.question_id = a.question_id
    INNER JOIN inserted i ON a.answer_id = i.answer_id
    WHERE i.action = 1;
END;
GO

-- ========== 19. 触发器：反馈评分后更新回答平均分 ==========
CREATE TRIGGER trg_feedback_score
ON feedback
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE a
    SET a.avg_score = (
        SELECT AVG(CAST(f.score AS DECIMAL(3,2)))
        FROM feedback f WHERE f.answer_id = a.answer_id
    ),
    a.score_count = (
        SELECT COUNT(*) FROM feedback f WHERE f.answer_id = a.answer_id
    )
    FROM answer a
    INNER JOIN inserted i ON a.answer_id = i.answer_id;
END;
GO

PRINT '===== 全部建表完成，共 17 张表 + 2 个触发器 =====';
GO

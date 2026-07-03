USE FreshmanQA;

CREATE TABLE IF NOT EXISTS `user` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `openid` VARCHAR(100) UNIQUE,
    `nickname` VARCHAR(50) DEFAULT '微信用户',
    `real_name` VARCHAR(50),
    `student_id` VARCHAR(50),
    `phone` VARCHAR(20),
    `email` VARCHAR(100),
    `college` VARCHAR(100),
    `major` VARCHAR(100),
    `enrollment_year` VARCHAR(10),
    `role` TINYINT DEFAULT 0,
    `auth_status` TINYINT DEFAULT 0,
    `avatar_url` VARCHAR(500),
    `created_at` DATETIME DEFAULT NOW(),
    `updated_at` DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_verify` (
    `verify_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `real_name` VARCHAR(50),
    `student_id` VARCHAR(50),
    `image_url` TEXT,
    `remark` VARCHAR(200) DEFAULT '',
    `status` TINYINT DEFAULT 0,
    `created_at` DATETIME DEFAULT NOW(),
    `reviewed_at` DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `question` (
    `question_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT 0,
    `question_text` VARCHAR(500),
    `category` VARCHAR(50) DEFAULT '未分类',
    `status` TINYINT DEFAULT 0,
    `created_at` DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `answer` (
    `answer_id` INT AUTO_INCREMENT PRIMARY KEY,
    `question_id` INT,
    `responder_id` INT DEFAULT 0,
    `answer_text` TEXT,
    `source` TINYINT DEFAULT 1,
    `review_status` TINYINT DEFAULT 1,
    `avg_score` DECIMAL(3,2) DEFAULT 0,
    `score_count` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT NOW(),
    FOREIGN KEY (`question_id`) REFERENCES `question`(`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `review` (
    `review_id` INT AUTO_INCREMENT PRIMARY KEY,
    `answer_id` INT NOT NULL,
    `reviewer_id` INT,
    `action` TINYINT,
    `comment` VARCHAR(500),
    `created_at` DATETIME DEFAULT NOW(),
    FOREIGN KEY (`answer_id`) REFERENCES `answer`(`answer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `feedback` (
    `feedback_id` INT AUTO_INCREMENT PRIMARY KEY,
    `answer_id` INT NOT NULL,
    `user_id` INT,
    `score` TINYINT,
    `comment` VARCHAR(500),
    `created_at` DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `knowledge_base` (
    `kb_id` INT AUTO_INCREMENT PRIMARY KEY,
    `question_text` VARCHAR(500),
    `answer_text` TEXT,
    `category` VARCHAR(50),
    `keywords` VARCHAR(500),
    `source` VARCHAR(50),
    `hit_count` INT DEFAULT 0,
    `is_active` TINYINT DEFAULT 1,
    `created_at` DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

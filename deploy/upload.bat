@echo off
REM 本地上传脚本 - 将代码上传到阿里云 ECS
REM 使用方法: upload.bat

set SERVER=你的服务器IP
set USER=root
set REMOTE_DIR=/opt/qa-server

echo ==========================================
echo   上传代码到阿里云 ECS
echo ==========================================

echo [1/3] 上传 server 目录...
scp -r server\* %USER%@%SERVER%:%REMOTE_DIR%/server/

echo [2/3] 上传 deploy 脚本...
scp -r deploy\* %USER%@%SERVER%:%REMOTE_DIR%/deploy/

echo [3/3] 上传前端代码...
scp -r miniprogram\* %USER%@%SERVER%:%REMOTE_DIR%/miniprogram/

echo.
echo 上传完成！
echo 请 SSH 登录服务器执行: cd /opt/qa-server && bash deploy/deploy.sh
pause

@echo off
echo Generating Prisma Client...
cd /d "%~dp0"
call npm run prisma:generate
echo.
echo Prisma Client generated successfully!
echo.
pause

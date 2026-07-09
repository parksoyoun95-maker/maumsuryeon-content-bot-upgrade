@echo off
chcp 65001 > nul
echo --------------------------------------------------
echo  마음수련 콘텐츠 앱 - GitHub 업로드 및 배포 시작
echo --------------------------------------------------
echo.
echo 변경 사항을 GitHub에 업로드(Push)합니다.
echo 처음 실행하는 경우 GitHub 로그인 팝업 창이 뜰 수 있습니다.
echo.

set "PATH=%PATH%;C:\Users\SAMSUNG\.gemini\antigravity\PortableGit\cmd"

git push origin main

echo.
if %errorlevel% equ 0 (
    echo [성공] GitHub에 정상적으로 업로드되었습니다!
    echo Vercel에서 수 분 내로 자동 배포가 완료됩니다.
) else (
    echo [오류] 업로드에 실패했습니다. GitHub 로그인 상태나 권한을 확인해 주세요.
)
echo.
echo 이 창을 닫으려면 아무 키나 누르세요.
pause > nul

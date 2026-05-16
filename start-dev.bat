@echo off
echo Starting Kaizen backend and frontend with automatic reload...
start "Kaizen Backend" cmd /k pushd "%~dp0kaizenbackend" ^&^& dotnet watch run
start "Kaizen Frontend" cmd /k pushd "%~dp0kaizenfrontend" ^&^& npm run dev

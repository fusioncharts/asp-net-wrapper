@echo off
echo.
echo.
echo.
echo Clearing folder structure...
rd /s /q "..\production\asp-net-wrapper\." 1>nul 2>&1
mkdir "..\production\asp-net-wrapper" 1>nul 2>&1
mkdir "..\production\asp-net-wrapper\Bin" 1>nul 2>&1
mkdir "..\production\asp-net-wrapper\Src" 1>nul 2>&1
del /q "..\production\asp-net-wrapper.zip" 1>nul 2>&1
echo.

echo Copying production ready files...
xcopy /y /s /e "..\sample\*.*" "..\production\asp-net-wrapper"  1>nul 2>&1
move "..\production\asp-net-wrapper\App_Code\FusionCharts.cs" "..\production\asp-net-wrapper\Src\." 1>nul 2>&1
copy /y "..\FusionCharts\FusionCharts\bin\Release\FusionCharts.dll" "..\production\asp-net-wrapper\Bin\."  1>nul 2>&1
copy /y "..\FusionCharts\FusionCharts\bin\Release\FusionCharts.xml" "..\production\asp-net-wrapper\Bin\."  1>nul 2>&1
copy /y "..\readme.md" "..\production\asp-net-wrapper\."  1>nul 2>&1

echo.
echo Packaging MVC sample...
copy /y "..\production\asp-net-wrapper\Src\FusionCharts.cs" "..\FusionChartsMVC3\App_Code\."  1>nul 2>&1
7za.exe a -r "..\production\FusionCharts-mvc-Example.zip" "..\FusionChartsMVC3"  1>nul 2>&1
move "..\production\FusionCharts-mvc-Example.zip" "..\production\asp-net-wrapper\" 1>nul 2>&1
echo Making production package...
7za.exe a -r "..\production\asp-net-wrapper.zip" "..\production\asp-net-wrapper"  1>nul 2>&1
rd /s /q "..\production\asp-net-wrapper\." 1>nul 2>&1
echo.
echo Done!!!
pause
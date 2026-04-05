@echo off
mkdir build
cd build
cmake ..
cmake --build . --config Release
cd ..
echo Build complete. Executable in build\Release\nova-shield.exe

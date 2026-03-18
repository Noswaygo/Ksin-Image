const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 开始构建应用...\n');

try {
  // 1. 构建 Vite 项目
  console.log('📦 构建 Vite 项目...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. 使用 electron-builder --dir 构建(不打包成安装程序,只生成可执行文件)
  console.log('📦 构建 Electron 应用...');
  execSync('npx electron-builder --dir', { stdio: 'inherit' });

  console.log('\n✅ 构建完成!');
  console.log('🚀 可执行文件位置:');
  console.log('   dist\Ksin Image-win32-x64\Ksin Image.exe');
  console.log('\n💡 提示: 直接运行这个 exe 文件测试任务栏图标');
} catch (error) {
  console.error('\n❌ 构建失败:', error.message);
  process.exit(1);
}

#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceIcon = path.join(__dirname, 'src/assets/icon.ico');
const buildDir = path.join(__dirname, 'build');
const targetIcon = path.join(buildDir, 'icon.ico');

// 创建 build 目录
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
  console.log('Created build directory');
}

// 复制图标文件
fs.copyFileSync(sourceIcon, targetIcon);
console.log('Copied icon to build/icon.ico');

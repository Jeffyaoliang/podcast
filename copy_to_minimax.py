# -*- coding: utf-8 -*-
"""
将播客项目文件复制到 minimax 文件夹
"""
import os
import shutil

def copy_project_to_minimax():
    src_base = '.'
    dst_base = 'minimax'
    
    # 需要复制的文件列表
    files_to_copy = [
        'README.md',
        'README_RSS.md',
        'RSS测试指南.md',
        'index.html',
        'package.json',
        'package-lock.json',
        'vite.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        '.gitignore',
    ]
    
    # 需要复制的文件夹
    dirs_to_copy = ['src']
    
    # 创建目标目录
    if not os.path.exists(dst_base):
        os.makedirs(dst_base)
    
    # 复制文件
    for file in files_to_copy:
        src_path = os.path.join(src_base, file)
        dst_path = os.path.join(dst_base, file)
        if os.path.exists(src_path):
            shutil.copy2(src_path, dst_path)
            print(f'已复制: {file}')
        else:
            print(f'文件不存在: {file}')
    
    # 复制目录
    for dir_name in dirs_to_copy:
        src_dir = os.path.join(src_base, dir_name)
        dst_dir = os.path.join(dst_base, dir_name)
        if os.path.exists(src_dir):
            shutil.copytree(src_dir, dst_dir)
            print(f'已复制目录: {dir_name}')
        else:
            print(f'目录不存在: {dir_name}')
    
    # 创建 .gitignore（如不存在）
    gitignore_path = os.path.join(dst_base, '.gitignore')
    if not os.path.exists(gitignore_path):
        with open(gitignore_path, 'w', encoding='utf-8') as f:
            f.write('''# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
.next/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Testing
coverage/

# Misc
*.log
.temp_huanhuan/
''')
        print('已创建 .gitignore')
    
    print('\n项目文件已复制到 minimax 文件夹')

if __name__ == '__main__':
    copy_project_to_minimax()


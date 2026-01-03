#!/usr/bin/env python3
"""
添加 code-index-mcp 到 Claude 项目配置
"""
import json
import os
from pathlib import Path

# 配置文件路径
config_path = Path.home() / ".claude.json"
project_path = Path.cwd()

# 备份配置文件
backup_path = config_path.with_suffix('.json.backup')
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

# 备份
with open(backup_path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print(f"✅ 已备份配置文件到: {backup_path}")

# 项目标识符
project_key = str(project_path)

# 确保项目存在
if project_key not in config['projects']:
    config['projects'][project_key] = {}
    print(f"✅ 创建项目配置: {project_key}")

# 获取项目配置
project_config = config['projects'][project_key]

# 初始化 mcpServers（如果不存在）
if 'mcpServers' not in project_config:
    project_config['mcpServers'] = {}

# 添加 code-index-mcp
project_config['mcpServers']['code-index'] = {
    "type": "stdio",
    "command": "uvx",
    "args": [
        "code-index-mcp",
        "--project-path", str(project_path)
    ],
    "env": {}
}

# 保存配置
with open(config_path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print(f"✅ 已添加 code-index-mcp 到项目配置")
print(f"📁 项目路径: {project_path}")
print(f"🔧 配置已保存到: {config_path}")
print("\n" + "="*60)
print("📝 接下来的步骤：")
print("1. 重启 Claude Code CLI")
print("2. 在对话中使用以下命令测试：")
print("   - 设置项目路径（自动完成）")
print("   - 搜索文件: 'Find all TypeScript files'")
print("   - 构建深度索引: 'Build deep index for this project'")
print("   - 获取文件摘要: 'Get summary of src/app/page.tsx'")
print("="*60)

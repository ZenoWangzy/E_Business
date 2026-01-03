#!/bin/bash
# Code Index MCP 测试和验证脚本

echo "🔍 Code Index MCP 状态检查"
echo "======================================"
echo ""

# 1. 检查配置
echo "✅ 步骤 1: 检查配置文件"
echo "项目路径: /Users/ZenoWang/Documents/project/E_Business"
python3 -c "
import json
with open('/Users/ZenoWang/.claude.json') as f:
    config = json.load(f)
    project = config['projects'].get('/Users/ZenoWang/Documents/project/E_Business', {})
    mcp_servers = project.get('mcpServers', {})
    print('配置的 MCP 服务器:')
    for name in mcp_servers.keys():
        print(f"  - {name}')
    if 'code-index' in mcp_servers:
        print('\n✅ code-index 已配置!')
        print('命令:', ' '.join(mcp_servers['code-index']['args']))
    else:
        print('\n❌ code-index 未找到')
"
echo ""

# 2. 检查 uvx
echo "✅ 步骤 2: 检查 uvx 是否可用"
if command -v uvx &> /dev/null; then
    echo "✅ uvx 已安装: $(which uvx)"
    uvx --version 2>&1 | head -1
else
    echo "❌ uvx 未安装"
    echo "安装命令: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi
echo ""

# 3. 测试 code-index-mcp 包
echo "✅ 步骤 3: 测试 code-index-mcp 包"
echo "运行: uvx code-index-mcp --help"
uvx code-index-mcp --help 2>&1 | head -20
echo ""

# 4. 项目结构快速检查
echo "✅ 步骤 4: 项目结构概览"
echo "Backend 文件: $(find backend -name '*.py' 2>/dev/null | wc -l | xargs) Python 文件"
echo "Frontend 文件: $(find frontend/src -name '*.tsx' -o -name '*.ts' 2>/dev/null | wc -l | xargs) TypeScript 文件"
echo ""

echo "======================================"
echo "🎯 接下来可以尝试的命令："
echo ""
echo "1. 初始化项目索引："
echo "   \"请为 E_Business 项目创建代码索引\""
echo ""
echo "2. 查找文件："
echo "   \"列出所有 Python 文件\""
echo "   \"查找所有 TypeScript 组件\""
echo ""
echo "3. 搜索代码："
echo "   \"搜索所有包含 API 的代码\""
echo "   \"查找 TODO 注释\""
echo ""
echo "4. 分析文件："
echo "   \"分析 backend/app/main.py\""
echo "   \"获取 frontend/src/app/layout.tsx 的摘要\""
echo ""
echo "======================================"
echo "📖 完整使用指南: CLAUDE_CODE_INDEX_GUIDE.md"

# 测试账号密码哈希不匹配

**问题**: 使用源码中注释的测试账号 `test@example.com` 和密码 `CorrectPass123!` 登录失败，报错 "CredentialsSignin"。
**影响**: 开发人员无法使用默认测试账号登录系统进行调试。

## ❌ 错误状态

数据库中 `users` 表存储的 `hashed_password` 与源码中记录的密码不匹配。这通常是因为：
1. 数据库是由旧的 seed 数据初始化的，而代码中的密码注释已更新。
2. 或者 Docker 容器重建过程中，数据卷保留了旧的脏数据。

**排查脚本 (验证失败)**:
```python
import bcrypt
# 数据库里的 hash
stored_hash = '$2b$12$rOS0j3X6z8UvrIZL/Ri7seRJ0JaSDanLeIZqPBj2mZ8gxFFdKMjQi'
password = 'CorrectPass123!'
# 结果为 False
print(bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')))
```

## ✅ 修复方案

使用 Python `bcrypt` 库生成新的密码哈希，并强制更新数据库。

**1. 生成新哈希**:
```python
import bcrypt
password = "Password123!"
# 生成带随机 salt 的哈希
new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(new_hash)
# 输出示例: $2b$12$Bg6kopr.QF4SdEX.qe0R9u/fcpSVjOQEMV9kn7nZ9a9.tFZ3YkjVW
```

**2. 更新数据库**:
```sql
UPDATE users 
SET hashed_password = '$2b$12$Bg6kopr.QF4SdEX.qe0R9u/fcpSVjOQEMV9kn7nZ9a9.tFZ3YkjVW' 
WHERE email = 'test@example.com';
```

**3. 更新 .env 配置 (保持文档一致性)**:
```properties
# .env
# 测试帐号：test@example.com
# 测试密码：Password123!
```

## 💡 核心要点

- **Bcrypt 特性**: `bcrypt` 每次哈希都会生成不同的 salt，所以不能通过直接对比两个 hash 字符串来判断密码是否相同，必须使用 `bcrypt.checkpw`。
- **环境隔离**: Docker 开发环境的数据卷 (`postgres_data`) 是持久化的。如果修改了 seed 脚本或代码中的默认密码，必须手动清理 volume 或更新数据库，否则旧数据会一直存在。
- **验证优先**: 遇到 "密码错误" 时，优先写一个小脚本直接验证 `bcrypt.checkpw(input, db_hash)`，可以迅速区分是 "输入错误" 还是 "数据库数据错误"。

## 📚 相关

- [Security Utils](../backend/app/core/security.py)

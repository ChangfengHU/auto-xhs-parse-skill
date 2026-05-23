# xhs-parse

小红书帖子解析，纯 HTTP，约2秒，支持图文和视频笔记。输入小红书分享链接，返回标题、图片列表、视频地址、作者信息、互动数据等。

---

## 1. 直接执行 CLI

不需要安装 skill，一条命令直接调用：

```bash
bash <(curl -fsSL https://skill.vyibc.com/xhs-parse.sh) --mode=parse --url='https://www.xiaohongshu.com/explore/xxx'
```

---

## 2. 安装为 Claude Code Skill

```bash
bash <(curl -fsSL 'https://skill.vyibc.com/install-xhs-parse.sh')
```

安装后 skill 会写入：

- `~/.claude/skills/xhs-parse/SKILL.md`
- `~/.claude/skills/xhs-parse/scripts/run.sh`

### 安装完成后如何使用

对 Claude 说以下任意一句，skill 会自动触发：

- `解析小红书`
- `小红书去水印`
- `帮我解析这个小红书链接`
- `xhs-parse`

---

## 3. 支持的调用模式

| 模式 | 说明 |
|------|------|
| `parse` | 解析小红书分享链接，返回图片列表或视频地址 |

---

## 4. 调用示例

### 解析小红书帖子

```bash
bash <(curl -fsSL https://skill.vyibc.com/xhs-parse.sh) --mode=parse --url='https://www.xiaohongshu.com/explore/xxx'
```

---

## 5. 发布

本地发布（需在仓库目录下）：

```bash
./scripts/publish-skill.sh
```

从 GitHub `main` 远程发布：

```bash
bash <(curl -fsSL https://skill.vyibc.com/publish-xhs-parse.sh)
```

---

## 6. 仓库结构

```text
README.md
scripts/
  xhs-parse.sh                    # CLI 直接执行入口
  publish-xhs-parse.sh             # 远程一键发布
  publish-skill.sh             # 本地发布
  upload-file.sh               # R2 上传工具
skills/
  xhs-parse/
    SKILL.md                   # Claude Code skill 定义
    scripts/run.sh             # 唯一核心执行逻辑
```

`scripts/xhs-parse.sh` 和安装后的 `skills/xhs-parse/scripts/run.sh` 来自同一份脚本。

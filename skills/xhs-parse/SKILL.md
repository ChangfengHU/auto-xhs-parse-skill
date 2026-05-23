---
name: xhs-parse
description: "当用户说"解析小红书"、"小红书去水印"、"帮我解析这个小红书链接"、"xhs-parse" 时自动触发。小红书帖子解析，纯 HTTP，约2秒，支持图文和视频笔记。输入小红书分享链接，返回标题、图片列表、视频地址、作者信息、互动数据等。"
---

# Xhs Parse

## 作用

小红书帖子解析，纯 HTTP，约2秒，支持图文和视频笔记。输入小红书分享链接，返回标题、图片列表、视频地址、作者信息、互动数据等。

## 执行

```bash
~/.claude/skills/xhs-parse/scripts/run.sh --mode=parse --url="<url>" --cookie="<cookie>"
```

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--mode` | 是 | 调用模式，可选值：`parse` |
| `--url` | 否 | 解析小红书分享链接，返回图片列表或视频地址 |
| `--cookie` | 否 | 小红书 Cookie，提高成功率，格式如 `a1=xxx; webId=xxx` |

## 直接执行

```bash
bash <(curl -fsSL https://skill.vyibc.com/xhs-parse.sh) --mode=parse --url='https://www.xiaohongshu.com/explore/xxx'
```

## 返回结果（页面展示字段）

成功后返回 JSON，以下是页面上会展示给用户的字段：

### 通用字段

| 字段 | 说明 |
|------|------|
| `mediaType` | `"image"` = 图文笔记，`"video"` = 视频笔记 |
| `title` | 笔记标题，展示在卡片顶部 |
| `desc` | 正文描述内容 |
| `coverUrl` | 封面图地址，用于笔记预览缩略图 |
| `noteData.author.name` | 博主昵称 |
| `noteData.author.profileUrl` | 博主主页链接 |
| `noteData.stats.likes` | 点赞数 |
| `noteData.stats.collects` | 收藏数 |
| `noteData.stats.comments` | 评论数 |
| `noteData.publishTime` | 发布时间（格式：2024/1/1 12:00:00） |

### 图文笔记专属字段（`mediaType = "image"`）

| 字段 | 说明 |
|------|------|
| `images[].originalUrl` | 高清原图下载地址（用于下载按钮） |
| `images[].previewUrl` | 预览图地址（用于展示缩略图） |
| `images[].liveUrl` | Live Photo 对应的短视频（有则展示） |
| `imageCount` | 图片总数 |
| `liveCount` | Live Photo 数量 |

### 视频笔记专属字段（`mediaType = "video"`）

| 字段 | 说明 |
|------|------|
| `videoUrl` | 视频播放/下载地址（直接可用） |

> 注意：若返回错误"未找到 __INITIAL_STATE__"，通常是 IP 被限流，传入 `--cookie` 参数可解决。


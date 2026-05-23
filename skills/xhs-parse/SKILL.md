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
| `--cookie` | 否 | 解析小红书分享链接，返回图片列表或视频地址 |

## 直接执行

```bash
bash <(curl -fsSL https://skill.vyibc.com/xhs-parse.sh) --mode=parse --url='https://www.xiaohongshu.com/explore/xxx'
```


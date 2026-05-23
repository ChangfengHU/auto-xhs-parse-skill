const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BASE_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'zh-CN,zh;q=0.9',
  referer: 'https://www.xiaohongshu.com/explore',
  'user-agent': USER_AGENT,
};

// ── 工具 ────────────────────────────────────────────────────────────────────

function safeGet(obj, path, def = '') {
  try { return path.split('.').reduce((a, k) => a?.[k], obj) ?? def; }
  catch { return def; }
}

const toNum = v => { const n = parseInt(String(v ?? '0'), 10); return Number.isFinite(n) ? n : 0; };

function formatXhsTime(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return '';
  return new Date(raw).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function trimTrailingUrlPunctuation(url) {
  return url.trim().replace(/[.,!?;:，。！？；：、)\]）】》]+$/u, '');
}

// ── URL 提取与规范化 ─────────────────────────────────────────────────────────

function extractXhsUrl(input) {
  const text = input.trim();
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    const candidate = trimTrailingUrlPunctuation(match[0]);
    try {
      const host = new URL(candidate).hostname.toLowerCase();
      if (host === 'xhslink.com' || host.endsWith('.xhslink.com') ||
          host === 'xiaohongshu.com' || host.endsWith('.xiaohongshu.com')) {
        return candidate;
      }
    } catch { continue; }
  }
  const bare = text.match(/(?:^|[\s"'<>])((?:www\.)?(?:xiaohongshu\.com|xhslink\.com)\/[^\s"'<>]+)/i);
  if (bare?.[1]) return 'https://' + trimTrailingUrlPunctuation(bare[1]);
  throw new Error('未找到有效的小红书链接');
}

async function resolveUrl(raw, cookieStr) {
  let url = extractXhsUrl(raw);

  if (url.includes('xhslink.com')) {
    const hdrs = { ...BASE_HEADERS };
    if (cookieStr) hdrs['cookie'] = cookieStr;
    const res = await fetch(url, { method: 'HEAD', headers: hdrs, redirect: 'follow' }).catch(() => null);
    if (res?.url) url = res.url;
  }

  const noteIdMatch = url.match(/(?:explore|discovery\/item)\/([a-f0-9]+)/);
  if (!noteIdMatch) return url;

  const noteId = noteIdMatch[1];
  const tokenMatch = url.match(/xsec_token=([^&\s]+)/);
  const xsecToken = tokenMatch ? tokenMatch[1] : '';
  return `https://www.xiaohongshu.com/discovery/item/${noteId}${xsecToken ? `?xsec_token=${xsecToken}&xsec_source=pc_feed` : ''}`;
}

// ── HTML 解析：__INITIAL_STATE__ ─────────────────────────────────────────────

function extractInitialState(html) {
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const text = m[1].trim();
    if (!text.includes('window.__INITIAL_STATE__')) continue;
    try {
      const valueStr = text
        .replace(/^[\s\S]*?window\.__INITIAL_STATE__\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .trim();
      // 先尝试 JSON.parse（undefined → null），CF Workers 无 Node vm 模块
      try { return JSON.parse(valueStr.replace(/\bundefined\b/g, 'null')); } catch { /* fallthrough */ }
      // 兜底：Function() 构造器（V8 原生支持，处理 JS 对象字面量）
      // eslint-disable-next-line no-new-func
      return new Function('return (' + valueStr + ')')();
    } catch { continue; }
  }
  return null;
}

function extractNoteData(state) {
  // 路径1：state.note.noteDetailMap
  try {
    if (state.note?.noteDetailMap) {
      const key = Object.keys(state.note.noteDetailMap)[0];
      const note = state.note.noteDetailMap[key]?.note;
      if (note?.noteId) return note;
    }
    if (state.note?.noteId) return state.note;
    if (state.note?.data?.noteId) return state.note.data;
    if (state.note?.data?.noteData?.noteId) return state.note.data.noteData;
  } catch { /* continue */ }
  // 路径2：旧版顶层 noteDetailMap
  try {
    if (state.noteDetailMap) {
      const key = Object.keys(state.noteDetailMap)[0];
      const note = state.noteDetailMap[key]?.note;
      if (note?.noteId) return note;
    }
  } catch { /* continue */ }
  // 路径3：移动端旧版
  try { if (state?.noteData?.data?.noteData?.noteId) return state.noteData.data.noteData; } catch { /* ignore */ }
  // 路径4：feed
  try {
    if (state.feed?.noteDetailMap) {
      const key = Object.keys(state.feed.noteDetailMap)[0];
      const note = state.feed.noteDetailMap[key]?.note;
      if (note?.noteId) return note;
    }
  } catch { /* ignore */ }
  return null;
}

// ── 图片 & 视频构建 ──────────────────────────────────────────────────────────

function toOriginalUrl(url) {
  if (!url) return '';
  const token = url.replace(/^https?:\/\/[^/]+\//, '').split('!')[0];
  return token ? `https://sns-img-bd.xhscdn.com/${token}` : url;
}

function buildImages(imageList) {
  return (imageList || []).map((img, idx) => {
    const rawUrl = img.urlDefault || img.url || '';
    const liveRaw = img.stream?.h264?.[0]?.masterUrl ?? '';
    return {
      index: idx + 1,
      previewUrl: rawUrl,
      originalUrl: toOriginalUrl(rawUrl),
      liveUrl: liveRaw ? decodeURIComponent(liveRaw) : undefined,
      width: toNum(img.width),
      height: toNum(img.height),
    };
  });
}

function buildVideo(noteData, coverUrl) {
  const originKey = safeGet(noteData, 'video.consumer.originVideoKey');
  if (originKey) return { url: `https://sns-video-bd.xhscdn.com/${originKey}`, coverUrl };

  const h264 = safeGet(noteData, 'video.media.stream.h264') ?? [];
  const h265 = safeGet(noteData, 'video.media.stream.h265') ?? [];
  const streams = [...(Array.isArray(h264) ? h264 : []), ...(Array.isArray(h265) ? h265 : [])];
  if (!streams.length) return undefined;

  streams.sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
  const best = streams[streams.length - 1];
  const url = best.backupUrls?.[0] || best.masterUrl || '';
  return url ? { url, coverUrl } : undefined;
}

// ── 响应构建 ─────────────────────────────────────────────────────────────────

function buildResponse(noteData, resolvedUrl) {
  const interact = noteData.interactInfo ?? {};
  const tags = (noteData.tagList ?? []).map(t => t.name ?? '').filter(Boolean);
  const images = buildImages(noteData.imageList);
  const coverUrl = images[0]?.previewUrl || images[0]?.originalUrl || '';
  const video = buildVideo(noteData, coverUrl);
  const mediaType = noteData.type === 'video' ? 'video' : images.length > 0 ? 'image' : 'unknown';
  const authorId = String(safeGet(noteData, 'user.userId') || '');

  return {
    success: true,
    platform: 'xiaohongshu',
    mediaType,
    noteId: noteData.noteId,
    title: noteData.title ?? '',
    desc: noteData.desc ?? '',
    coverUrl,
    videoUrl: video?.url || '',
    images: images.map(img => ({
      index: img.index,
      previewUrl: img.previewUrl,
      originalUrl: img.originalUrl,
      liveUrl: img.liveUrl,
      width: img.width,
      height: img.height,
    })),
    imageCount: mediaType === 'image' ? images.length : 0,
    liveCount: images.filter(img => img.liveUrl).length,
    noteData: {
      noteId: noteData.noteId,
      postUrl: resolvedUrl,
      title: noteData.title ?? '',
      desc: noteData.desc ?? '',
      type: mediaType,
      author: {
        id: authorId,
        name: String(safeGet(noteData, 'user.nickname') || safeGet(noteData, 'user.nickName') || ''),
        avatar: String(safeGet(noteData, 'user.avatar') || safeGet(noteData, 'user.avatarUrl') || ''),
        profileUrl: authorId ? `https://www.xiaohongshu.com/user/profile/${authorId}` : '',
      },
      stats: {
        likes: toNum(interact.likedCount),
        comments: toNum(interact.commentCount),
        shares: toNum(interact.shareCount),
        collects: toNum(interact.collectedCount),
      },
      tags,
      publishTime: formatXhsTime(noteData.time),
      ipLocation: String(noteData.ipLocation || ''),
      coverUrl,
    },
  };
}

// ── Worker 入口 ──────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('xhs-parse worker ok', { status: 200 });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let body = {};
    try { body = await request.json(); } catch (_) {}

    const input = (body.url || '').trim();
    if (!input) {
      return Response.json({ error: '请提供小红书链接' }, { status: 400 });
    }

    const cookieStr = (body.cookie || '').trim();

    let resolvedUrl;
    try {
      resolvedUrl = await resolveUrl(input, cookieStr);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }

    const headers = { ...BASE_HEADERS };
    if (cookieStr) headers['cookie'] = cookieStr;

    let html;
    try {
      const res = await fetch(resolvedUrl, { headers, redirect: 'follow' });
      if (!res.ok) {
        return Response.json({ error: `请求失败 HTTP ${res.status}，Cookie 可能已失效或链接已过期` }, { status: 500 });
      }
      html = await res.text();
    } catch (e) {
      return Response.json({ error: '页面请求失败: ' + e.message }, { status: 500 });
    }

    const state = extractInitialState(html);
    if (!state) {
      return Response.json(
        { error: '页面数据解析失败：未找到 __INITIAL_STATE__。请传入有效 Cookie 或检查链接是否正确' },
        { status: 500 }
      );
    }

    const noteData = extractNoteData(state);
    if (!noteData) {
      return Response.json(
        { error: '帖子数据提取失败：请确认链接是帖子详情页' },
        { status: 500 }
      );
    }

    return Response.json(buildResponse(noteData, resolvedUrl));
  },
};

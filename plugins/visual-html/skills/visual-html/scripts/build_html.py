#!/usr/bin/env python3
"""内容の JSON から、デジタル庁デザインシステムの単一 HTML を組み立てる。

使い方: python3 build_html.py SPEC.json OUTPUT.html [--source 原文.md] [--open]

入力の形式が多少ずれていても止めない。補正した内容は標準エラー出力に警告として出し、HTML は必ず出力する。
止まるのは JSON として読めない場合と、ファイルが読み書きできない場合だけ。
"""
import argparse
import html
import json
import platform
import re
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
CSS_PATH = SKILL_DIR / "assets" / "dads.css"

# 色だけで意味を伝えないため、アイコンの形も種別ごとに変える
ICONS = {
    "success": '<circle cx="12" cy="12" r="11" fill="#197a4b"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    "warning": '<path d="M12 2 L23 21 H1 Z" fill="#c74700"/><path d="M12 9 V14.5 M12 17 V18" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
    "error": '<circle cx="12" cy="12" r="11" fill="#ce0000"/><path d="M8 8 L16 16 M16 8 L8 16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
    "info": '<circle cx="12" cy="12" r="11" fill="#0017c1"/><path d="M12 11 V17 M12 7 V8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
}
TAG_KINDS = {"success", "info", "warning", "error", "gray"}

# ステップナビゲーションの状態。原本のアイコンに、色や形だけで伝えないための表示文字を添える
STEP_STATES = {
    "completed": (
        "完了",
        '<circle cx="12" cy="12" r="12" fill="#666"/><path d="M10 17.5 19.8 8l-1.5-1.5-8.1 8-4.1-4L4.5 12l5.6 5.5Z" fill="#fff"/>',
    ),
    "reached": ("到達済み", ""),
    "editing": (
        "編集中",
        '<path d="M5.8 20c-.5 0-1-.2-1.3-.5-.3-.4-.5-.8-.5-1.3V5.6c0-.5.2-.9.5-1.3.4-.3.8-.5 1.3-.5h8L12 5.6H5.8v12.6h12.6V12l1.8-1.8v8c0 .5-.2 1-.5 1.3-.4.3-.8.5-1.3.5H5.8Zm3.6-5.4v-3.8l8.3-8.3a1.8 1.8 0 0 1 2.5 0l1.3 1.3.4.6a1.7 1.7 0 0 1 0 1.3c-.1.3-.2.5-.4.6l-8.3 8.3H9.4Zm1.8-1.8h1.3l5.2-5.2L17 7l-.7-.7-5.2 5.2v1.3Z" fill="#333"/>',
    ),
    "error": (
        "エラー",
        '<path d="M1 21 12 2l11 19H1Zm3.5-2h15L12 6 4.5 19Zm7.5-1c.3 0 .5-.1.7-.3.2-.2.3-.4.3-.7a1 1 0 0 0-.3-.7 1 1 0 0 0-.7-.3 1 1 0 0 0-.7.3 1 1 0 0 0-.3.7c0 .3.1.5.3.7.2.2.4.3.7.3Zm-1-3h2v-5h-2v5Z" fill="#ec0000"/>',
    ),
    "skipped": ("スキップ", ""),
}

warnings = []


def warn(message):
    warnings.append(message)


def esc(value):
    return html.escape(str(value), quote=True)


def inline(value):
    # 先にエスケープしてから記法を置換するため、入力に含まれるタグは実行されない
    out = esc(value)
    # 表のセルなど文字列の中に状態のラベルを置くための記法: [[warning|未確認]]
    out = re.sub(r"\[\[(" + "|".join(sorted(TAG_KINDS)) + r")\|([^\]]+)\]\]", r'<span class="tag tag--\1">\2</span>', out)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    return out


def as_list(value):
    # 配列を期待する場所に文字列や単独のオブジェクトが来ても、1 件の配列として扱う
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def as_dict(value, where):
    if isinstance(value, dict):
        return value
    warn(f"{where}: オブジェクトを期待しましたが {type(value).__name__} でした。text として扱います")
    return {"text": value, "title": value, "label": value}


def get(d, key, default="", where=""):
    if key not in d:
        if where:
            warn(f"{where}: '{key}' がありません")
        return default
    return d[key]


def to_float(value, default=0.0, where=""):
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        warn(f"{where}: '{value}' を数値として読めません。{default} として扱います")
        return default


def safe_url(value, where):
    # href に入れる値なので、javascript: などのスキームを除くため http(s) とページ内リンクだけ許可する
    url = str(value).strip()
    if re.match(r"(https?://|#)", url, re.I):
        return url
    warn(f"{where}: url '{url}' は http(s) かページ内リンクではないため、リンクにしません")
    return ""


def tag_html(t, where):
    t = t if isinstance(t, dict) else {"text": t}
    kind = t.get("kind", "info")
    if kind not in TAG_KINDS:
        warn(f"{where}: tag.kind '{kind}' は未対応です。info として扱います")
        kind = "info"
    return f'<span class="tag tag--{kind}">{esc(t.get("text", ""))}</span>'


def render_text(b, where):
    cls = ' class="note"' if b.get("note") else ""
    return f"<p{cls}>{inline(get(b, 'text', where=where))}</p>"


def render_summary(b, where):
    items = "".join(f"<li>{inline(i)}</li>" for i in as_list(get(b, "items", [], where)))
    return f'<div class="summary-box"><ul>{items}</ul></div>'


def render_cards(b, where):
    cards = []
    for n, raw in enumerate(as_list(get(b, "items", [], where)), 1):
        c = as_dict(raw, f"{where} cards[{n}]")
        cls = "card card--emphasis" if c.get("emphasis") else "card"
        value = str(c.get("value", ""))
        unit = f"<small>{esc(c['unit'])}</small>" if c.get("unit") else ""
        # 数値カードだけ大きな文字にし、文章の値(「B案を推奨」など)は折り返せる大きさにする
        value_cls = "card__value card__value--number" if re.fullmatch(r"[\d,.\-+]+", value) else "card__value"
        tag = f'{tag_html(c["tag"], f"{where} cards[{n}]")} ' if c.get("tag") else ""
        note = inline(c["note"]) if c.get("note") else ""
        sub = f'<p class="card__sub">{tag}{note}</p>' if (tag or note) else ""
        label = f'<p class="card__label">{inline(c["label"])}</p>' if c.get("label") else ""
        cards.append(f'<li class="{cls}">{label}<p class="{value_cls}">{esc(value)}{unit}</p>{sub}</li>')
    return f'<ul class="cards">{"".join(cards)}</ul>'


def render_table(b, where):
    headers = [str(h) for h in as_list(get(b, "headers", [], where))]
    rows = [as_list(r) for r in as_list(get(b, "rows", [], where))]
    width = max([len(headers)] + [len(r) for r in rows]) if (headers or rows) else 0
    if headers and len(headers) < width:
        warn(f"{where}: 見出しが {len(headers)} 列で、行の最大 {width} 列より少ないため、空の見出しで補います")
    headers = headers + [""] * (width - len(headers))
    nums = {i for i in as_list(b.get("num_columns", [])) if isinstance(i, int)}
    row_headers = b.get("row_headers", False)
    cap = f"<caption>{esc(b['caption'])}</caption>" if b.get("caption") else ""
    num_attr = ' class="num"'
    head = "".join(f'<th scope="col"{num_attr if i in nums else ""}>{esc(h)}</th>' for i, h in enumerate(headers))
    body = []
    for row in rows:
        if len(row) != width:
            warn(f"{where}: 行の列数 {len(row)} を {width} 列に揃えます: {row}")
            row = (row + [""] * width)[:width]
        cells = []
        for i, cell in enumerate(row):
            if i == 0 and row_headers:
                cells.append(f'<th scope="row">{inline(cell)}</th>')
            else:
                cells.append(f"<td{num_attr if i in nums else ''}>{inline(cell)}</td>")
        body.append(f'<tr>{"".join(cells)}</tr>')
    return f'<div class="table-wrap"><table>{cap}<thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


def render_flow(b, where):
    orientation = b.get("orientation", "vertical")
    if orientation not in ("vertical", "horizontal"):
        warn(f"{where}: flow.orientation '{orientation}' は未対応です。vertical として扱います")
        orientation = "vertical"
    raw_items = as_list(get(b, "items", [], where))
    items = [as_dict(raw, f"{where} flow[{n}]") for n, raw in enumerate(raw_items, 1)]
    total = len(items)
    reached = 0
    steps = []
    for n, it in enumerate(items, 1):
        state = it.get("state")
        if state and state not in STEP_STATES:
            warn(f"{where} flow[{n}]: state '{state}' は未対応です。状態なしとして扱います")
            state = None
        if state in ("completed", "reached", "editing", "error"):
            reached = n
        attrs = f' data-state="{state}"' if state else ""
        attrs += " data-first" if n == 1 else ""
        attrs += " data-last" if n == total else ""
        attrs += ' aria-current="true"' if it.get("current") else ""
        marker = ""
        if state:
            state_label, icon = STEP_STATES[state]
            icon_html = (
                f'<span class="dads-step-navigation__state-icon"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">{icon}</svg></span>'
                if icon
                else ""
            )
            marker = f'{icon_html}<span class="dads-step-navigation__state-label">{state_label}</span>'
        label = str(it.get("label", "")).strip()
        # 番号は丸の中に自動で出るため、label に番号だけを書くと同じ数字が 2 回並ぶ
        if re.fullmatch(r"(step\s*|ステップ\s*)?\d+[.)]?", label, re.I):
            warn(f"{where} flow[{n}]: label '{label}' は手順の番号と重なるため表示しません")
            label = ""
        period = f'<p class="dads-step-navigation__period">{inline(label)}</p>' if label else ""
        text = f'<p>{inline(it["text"])}</p>' if it.get("text") else ""
        description = f'<div class="dads-step-navigation__description">{period}{text}</div>' if (period or text) else ""
        steps.append(
            f'<li class="dads-step-navigation__step"{attrs}><span class="dads-step-navigation__header">'
            f'<span class="dads-u-visually-hidden">ステップ</span>'
            f'<span class="dads-step-navigation__number">{n}{marker}</span>'
            f'<span class="dads-step-navigation__title">{inline(it.get("title", ""))}</span></span>{description}</li>'
        )
    progress = (
        f'<p class="dads-u-visually-hidden">全{total}ステップ中、{reached}ステップ目まで到達済み</p>'
        if reached
        else ""
    )
    # 横向きは既定の幅 320px だと 4 ステップ以上で横スクロールになるため、本文幅に収まるよう縮める
    width = f' style="--_step-width: {max(160, min(320, 960 // max(total, 1)))}; --_step-min-width: 120;"' if orientation == "horizontal" else ""
    return (
        f'<div class="dads-step-navigation" data-orientation="{orientation}" data-size="normal"{width}>'
        f'{progress}<ul>{"".join(steps)}</ul></div>'
    )


def render_list_items(items, tag, spacing, where):
    out = []
    for n, raw in enumerate(as_list(items), 1):
        if isinstance(raw, dict):
            sub = raw.get("items")
            nested = render_list_items(sub, tag, spacing, f"{where}[{n}]") if sub else ""
            out.append(f"<li>{inline(raw.get('text', ''))}{nested}</li>")
        else:
            out.append(f"<li>{inline(raw)}</li>")
    return f'<{tag} class="dads-list" data-spacing="{spacing}">{"".join(out)}</{tag}>'


def render_list(b, where):
    spacing = b.get("spacing", 4)
    if spacing not in (4, 8, 12):
        warn(f"{where}: list.spacing '{spacing}' は未対応です。4 として扱います")
        spacing = 4
    return render_list_items(get(b, "items", [], where), "ol" if b.get("ordered") else "ul", spacing, where)


def render_description_list(b, where):
    rows = []
    for n, raw in enumerate(as_list(get(b, "items", [], where)), 1):
        if isinstance(raw, (list, tuple)) and len(raw) == 2:
            term, text = raw
        else:
            it = as_dict(raw, f"{where} items[{n}]")
            term, text = get(it, "term", "", f"{where} items[{n}]"), it.get("text", "")
        rows.append(f"<div><dt>{inline(term)}</dt><dd>{inline(text)}</dd></div>")
    marker = ' data-marker="bullet"' if b.get("marker") == "bullet" else ""
    return f'<dl class="dads-description-list"{marker}>{"".join(rows)}</dl>'


def render_quote(b, where):
    paragraphs = "".join(f"<p>{inline(p)}</p>" for p in as_list(get(b, "text", [], where)))
    source = f'<p class="dads-blockquote__source">出典: {inline(b["source"])}</p>' if b.get("source") else ""
    return f'<blockquote class="dads-blockquote">{paragraphs}{source}</blockquote>'


def render_divider(b, where):
    return '<hr class="dads-divider">'


def render_accordion(b, where, base):
    chevron = '<path d="M3.3 7.3L12 16L20.7 7.3" fill="none" stroke="currentcolor" stroke-width="2"/>'
    items = []
    for n, raw in enumerate(as_list(get(b, "items", [], where)), 1):
        it = as_dict(raw, f"{where} accordion[{n}]")
        opened = " open" if it.get("open") else ""
        if it.get("blocks"):
            body = "".join(render_block(blk, f"{where} accordion[{n}] blocks[{m}]", base) for m, blk in enumerate(as_list(it["blocks"]), 1))
        else:
            body = f'<div class="block"><p>{inline(it.get("text", ""))}</p></div>'
        items.append(
            f'<details class="dads-accordion"{opened}><summary class="dads-accordion__summary">'
            f'<span class="dads-accordion__icon"><svg class="dads-accordion__icon-svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">{chevron}</svg></span>'
            f'<h3>{inline(get(it, "title", "", f"{where} accordion[{n}]"))}</h3></summary>'
            f'<div class="dads-accordion__content">{body}</div></details>'
        )
    return f'<div>{"".join(items)}</div>'


def render_resources(b, where):
    style = b.get("style", "list")
    if style not in ("list", "frame"):
        warn(f"{where}: resources.style '{style}' は未対応です。list として扱います")
        style = "list"
    items = []
    for n, raw in enumerate(as_list(get(b, "items", [], where)), 1):
        it = as_dict(raw, f"{where} resources[{n}]")
        w = f"{where} resources[{n}]"
        title = inline(get(it, "title", "", w))
        url = safe_url(it["url"], w) if it.get("url") else ""
        if url:
            title = f'<a href="{esc(url)}">{title}</a>'
        label = f'<div class="dads-resource-list__label">{tag_html(it["tag"], w)}</div>' if it.get("tag") else ""
        support = f'<div class="dads-resource-list__support"><p>{inline(it["text"])}</p></div>' if it.get("text") else ""
        sub = f'<div class="dads-resource-list__sub"><p>{inline(it["sub"])}</p></div>' if it.get("sub") else ""
        items.append(
            f'<li><div class="dads-resource-list" data-style="{style}"><div class="dads-resource-list__body">'
            f'<div class="dads-resource-list__contents">{label}<h3 class="dads-resource-list__title">{title}</h3>{support}</div>'
            f"{sub}</div></div></li>"
        )
    return f'<ul class="dads-resource-list__items">{"".join(items)}</ul>'


def render_banner(b, where):
    kind = b.get("kind", "info")
    if kind not in ICONS:
        warn(f"{where}: banner.kind '{kind}' は未対応です。info として扱います")
        kind = "info"
    mod = "" if kind == "info" else f" banner--{kind}"
    return (
        f'<div class="banner{mod}"><svg class="banner__icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[kind]}</svg>'
        f'<div><h3>{inline(get(b, "title", where=where))}</h3><p>{inline(b.get("text", ""))}</p></div></div>'
    )


def render_bars(b, where):
    maximum = to_float(b.get("max", 100), 100.0, where) or 100.0
    items = []
    for n, raw in enumerate(as_list(get(b, "items", [], where)), 1):
        it = as_dict(raw, f"{where} bars[{n}]")
        value = to_float(it.get("value", 0), 0.0, f"{where} bars[{n}]")
        width = max(0.0, min(100.0, value / maximum * 100))
        low = " bar-fill--low" if it.get("tone") == "low" else ""
        display = esc(it.get("display", it.get("value", "")))
        items.append(
            f'<li><span>{esc(it.get("label", ""))}</span><div class="bar-track" aria-hidden="true">'
            f'<div class="bar-fill{low}" style="width:{width:.1f}%"></div></div><span class="bar-value">{display}</span></li>'
        )
    title = f"<h3>{esc(b['title'])}</h3>" if b.get("title") else ""
    return f'{title}<ul class="bar-list">{"".join(items)}</ul>'


def render_details(b, where):
    return f"<details><summary>{esc(get(b, 'summary', '詳細', where))}</summary><p>{inline(get(b, 'text', where=where))}</p></details>"


FRONTMATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?", re.S)
# SPEC のうち文字列として照合しないキー。識別子や設定値で、原文に書かれていなくてよい
NON_TEXT_KEYS = {
    "type", "kind", "tone", "id", "lang", "path", "html", "source_url", "tag_kind",
    "url", "state", "orientation", "style", "marker",
}


def split_frontmatter(text):
    m = FRONTMATTER.match(text)
    return (m.group(1), text[m.end():]) if m else ("", text)


def frontmatter_value(front, keys):
    for key in keys:
        m = re.search(rf"^{key}:\s*[\"']?(.+?)[\"']?\s*$", front, re.M)
        if m:
            return m.group(1)
    return ""


def render_raw_markdown(b, where, base):
    path = (base / str(get(b, "path", "", where))).resolve()
    try:
        # frontmatter は公開する資料に不要なため、原文表示から除く
        _, text = split_frontmatter(path.read_text(encoding="utf-8"))
    except OSError as e:
        warn(f"{where}: 原文 {path} を読めません({e.__class__.__name__})。このブロックを省略します")
        return ""
    return f'<details><summary>{esc(b.get("summary", "原文(Markdown)"))}</summary><pre class="raw-md">{esc(text)}</pre></details>'


def render_figure(b, where):
    # html は SVG など作者が書いた断片をそのまま入れる口。ユーザー入力由来の文字列を入れない
    title = f"<h3>{esc(b['title'])}</h3>" if b.get("title") else ""
    caption = f"<figcaption>{inline(b['caption'])}</figcaption>" if b.get("caption") else ""
    return f"<figure>{title}{get(b, 'html', where=where)}{caption}</figure>"


RENDERERS = {
    "text": render_text, "summary": render_summary, "cards": render_cards, "table": render_table,
    "flow": render_flow, "banner": render_banner, "bars": render_bars, "details": render_details,
    "figure": render_figure, "list": render_list, "description_list": render_description_list,
    "quote": render_quote, "divider": render_divider, "resources": render_resources,
}


def render_block(raw, where, base):
    if isinstance(raw, str):
        raw = {"type": "text", "text": raw}
    b = as_dict(raw, where)
    t = b.get("type")
    if t == "raw_markdown":
        inner = render_raw_markdown(b, where, base)
    elif t == "accordion":
        inner = render_accordion(b, where, base)
    elif t in RENDERERS:
        inner = RENDERERS[t](b, where)
    elif b.get("text"):
        warn(f"{where}: 未知の type '{t}'。text として表示します")
        inner = render_text(b, where)
    else:
        warn(f"{where}: 未知の type '{t}' で、表示できる text もないため省略します")
        return ""
    return f'<div class="block">{inner}</div>' if inner else ""


def make_ids(sections):
    # 属性に入れる値なので、英数字、ハイフン、アンダースコア以外は置き換える。重複は連番で避ける
    used = {"main", "toc-title"}
    ids = []
    for n, s in enumerate(sections, 1):
        base = re.sub(r"[^A-Za-z0-9_-]", "-", str(s.get("id") or f"s{n}")).strip("-") or f"s{n}"
        sid, k = base, 2
        while sid in used or f"h-{sid}" in used:
            sid, k = f"{base}-{k}", k + 1
        used.add(sid)
        ids.append(sid)
    return ids


def build(spec, base):
    if not isinstance(spec, dict):
        warn("最上位がオブジェクトではありません。本文のない空の資料にします")
        spec = {}
    title = spec.get("title") or "無題"
    if not spec.get("title"):
        warn("title がありません。「無題」にします")
    sections = [as_dict(s, f"sections[{n}]") for n, s in enumerate(as_list(spec.get("sections")), 1)]
    ids = make_ids(sections)

    parts = ['<a class="skip-link" href="#main">本文へスキップ</a>']
    if spec.get("organization") or spec.get("meta"):
        parts.append(
            f'<header class="site-header"><div class="site-header__inner">'
            f'<div class="site-header__name">{esc(spec.get("organization", ""))}</div>'
            f'<div class="site-header__meta">{esc(spec.get("meta", ""))}</div></div></header>'
        )

    head = ['<div class="page-title">']
    if spec.get("eyebrow"):
        head.append(f'<p class="eyebrow">{esc(spec["eyebrow"])}</p>')
    head.append(f"<h1>{esc(title)}</h1>")
    if spec.get("lead"):
        # 要約は大きな文字で 2〜3 行に収まるため、文字単位で折り返すと「観察した／症状」のように修飾語と名詞が別の行に分かれて目立つ。dads.css の .lead で文字間の折り返しを止め、読点と句点の後だけで折り返す
        lead = re.sub(r"([、。])", r"\1<wbr>", inline(spec["lead"]))
        head.append(f'<p class="lead">{lead}</p>')
    pairs = [p for p in as_list(spec.get("meta_list")) if isinstance(p, (list, tuple)) and len(p) == 2]
    if pairs:
        dl = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in pairs)
        head.append(f'<dl class="meta-list">{dl}</dl>')
    head.append("</div>")

    toc = ""
    if spec.get("toc", len(sections) >= 5):
        links = "".join(f'<li><a href="#{i}">{esc(s.get("heading", ""))}</a></li>' for i, s in zip(ids, sections))
        toc = f'<nav class="toc" aria-labelledby="toc-title"><h2 id="toc-title">このページの目次</h2><ol>{links}</ol></nav>'

    secs = []
    for n, (sid, s) in enumerate(zip(ids, sections), 1):
        where = f"sections[{n}]"
        heading = s.get("heading") or f"セクション{n}"
        if not s.get("heading"):
            warn(f"{where}: heading がありません。「{heading}」にします")
        blocks = "".join(render_block(b, f"{where} blocks[{m}]", base) for m, b in enumerate(as_list(s.get("blocks")), 1))
        secs.append(f'<section id="{sid}" aria-labelledby="h-{sid}"><h2 id="h-{sid}">{esc(heading)}</h2>{blocks}</section>')

    parts.append(f'<main id="main" class="container">{"".join(head)}{toc}{"".join(secs)}</main>')
    # フッターは出典 URL があるときだけ出す(SKILL.md の方針)
    if spec.get("source_url"):
        url = esc(spec["source_url"])
        parts.append(f'<footer class="site-footer"><div class="container">出典: <a href="{url}">{url}</a></div></footer>')

    css = CSS_PATH.read_text(encoding="utf-8")
    lang = re.sub(r"[^A-Za-z-]", "", str(spec.get("lang", "ja"))) or "ja"
    return (
        f'<!DOCTYPE html>\n<html lang="{lang}">\n<head>\n<meta charset="UTF-8">\n'
        f'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        f"<title>{esc(title)}</title>\n<style>\n{css}</style>\n</head>\n<body>\n{chr(10).join(parts)}\n</body>\n</html>\n"
    )


def iter_strings(value, key=""):
    if isinstance(value, str):
        if key not in NON_TEXT_KEYS:
            yield value
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from iter_strings(v, k)
    elif isinstance(value, list):
        for v in value:
            yield from iter_strings(v, key)


def apply_source(spec, source_text):
    # title と出典 URL は原文の frontmatter から補い、AI の転記ミスを避ける。spec に書かれていれば spec を優先する
    if not isinstance(spec, dict):
        return spec
    front, body = split_frontmatter(source_text)
    if not spec.get("title"):
        title = frontmatter_value(front, ["title"])
        if not title:
            m = re.search(r"^#\s+(.+?)\s*$", body, re.M)
            title = m.group(1) if m else ""
        if title:
            spec["title"] = title
    if not spec.get("source_url"):
        url = frontmatter_value(front, ["source_url", "url", "source", "link"])
        if url.startswith("http"):
            spec["source_url"] = url
    return spec


def check_against_source(spec, source_text):
    # 原文に見つからない数値と識別子を警告する。集計して作った値も警告に出るため、警告は確認のきっかけにとどめる
    flat = source_text.replace(",", "")
    numbers, identifiers = {}, {}
    for s in iter_strings(spec):
        for raw in re.findall(r"\d[\d,]*(?:\.\d+)?", s):
            n = raw.replace(",", "")
            if len(n.replace(".", "")) >= 2:
                numbers.setdefault(n, raw)
        for ident in re.findall(r"`([^`]+)`", s):
            identifiers.setdefault(ident, ident)
    for n, raw in numbers.items():
        if n not in flat:
            warn(f"原文にない数値: '{raw}'。原文からの転記ミスか、集計して作った値かを確認してください")
    for ident in identifiers:
        if ident not in source_text:
            warn(f"原文にない識別子: `{ident}`。原文からの転記ミスか、補足として足した語かを確認してください")


def open_in_viewer(path):
    system = platform.system()
    if system == "Darwin":
        command = ["open", str(path)]
    elif system == "Windows":
        command = ["explorer.exe", str(path)]
    else:
        try:
            is_wsl = "microsoft" in Path("/proc/version").read_text().lower()
        except OSError:
            is_wsl = False
        if is_wsl:
            # explorer.exe は Windows 側のパスしか開けないため、wslpath で変換する
            windows_path = subprocess.run(["wslpath", "-w", str(path)], capture_output=True, text=True).stdout.strip()
            command = ["explorer.exe", windows_path]
        else:
            command = ["xdg-open", str(path)]
    try:
        # explorer.exe は開けたときも終了コード 1 を返すため、終了コードは見ない
        subprocess.run(command, check=False)
    except OSError as e:
        warn(f"HTML を自動で開けませんでした({command[0]}: {e})。出力されたパスを手で開いてください")


def main(argv):
    parser = argparse.ArgumentParser(description="内容の JSON からデジタル庁デザインシステムの HTML を組み立てる")
    parser.add_argument("spec")
    parser.add_argument("output")
    parser.add_argument("--source", help="原文の Markdown。数値と識別子を照合し、title と出典 URL を frontmatter から補う")
    parser.add_argument("--open", action="store_true", help="出力した HTML を OS の既定のアプリで開く(macOS は open、WSL は explorer.exe)")
    args = parser.parse_args(argv[1:])
    spec_path, out_path = Path(args.spec).resolve(), Path(args.output)
    try:
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        print(f"error: {spec_path} を JSON として読めません: {e}", file=sys.stderr)
        return 1
    if args.source:
        try:
            source_text = Path(args.source).read_text(encoding="utf-8")
        except OSError as e:
            print(f"error: 原文 {args.source} を読めません: {e}", file=sys.stderr)
            return 1
        spec = apply_source(spec, source_text)
        check_against_source(spec, source_text)
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(build(spec, spec_path.parent), encoding="utf-8")
    except OSError as e:
        print(f"error: {out_path} に書き込めません: {e}", file=sys.stderr)
        return 1
    if args.open:
        open_in_viewer(out_path.resolve())
    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)
    print(out_path.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

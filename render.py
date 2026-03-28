#!/usr/bin/env python3
"""
정기그래픽 자동화 v4 — 렌더링 스크립트

처리된 YAML을 읽어 Jinja2 HTML 템플릿 + Playwright로 PNG를 생성한다.

사용법:
    python render.py                           # output/ 에서 최신 YAML 사용
    python render.py --input output/232호.yaml
    python render.py --article 3               # 3번 아티클만 재렌더
"""

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright

# ── 설정 ──

TYPE_LABELS = {
    "curation": "Curation",
    "gray": "Gray",
    "branded": "Branded",
}

TYPE_NAMES_KR = {
    "curation": "큐레이션",
    "gray": "그레이",
    "branded": "브랜디드",
}

TEMPLATES = [
    {"name": "story_cover.html", "width": 1080, "height": 1920, "suffix": "1"},
    {"name": "post_cover.html", "width": 1080, "height": 1350, "suffix": "2"},
]

INTRO_TEMPLATE = {"name": "intro_page.html", "width": 1080, "height": 1350}

ASSET_FILES = [
    "큐레이션 마지막장.png",
    "그레이 마지막장.png",
    "브랜디드 마지막장.png",
]


def find_latest_yaml() -> Path:
    """output/ 에서 가장 최근 처리된 YAML 파일 찾기 (_raw 제외)"""
    output_dir = Path("output")
    if not output_dir.exists():
        return None
    yamls = sorted(
        [f for f in output_dir.glob("*.yaml") if "_raw" not in f.name],
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    return yamls[0] if yamls else None


def prepare_template_data(article: dict) -> dict:
    """아티클 데이터를 템플릿 변수로 변환"""
    art_type = article.get("type", "curation")
    title_2line = article.get("title_2line", article["title"])
    subtitle_2line = article.get("subtitle_2line", article.get("subtitle", ""))

    assets_abs = str(Path("assets").resolve())

    return {
        "type": art_type,
        "type_label": TYPE_LABELS.get(art_type, art_type.capitalize()),
        "title": article["title"],
        "title_2line": title_2line.replace("\n", "<br>"),
        "subtitle": article.get("subtitle", ""),
        "subtitle_2line": subtitle_2line.replace("\n", "<br>"),
        "editor": article.get("editor", ""),
        "hero_image": article.get("hero_image", ""),
        "article_title": article["title"],
        "title_position": article.get("title_position", "bottom"),
        "assets_dir": assets_abs,
    }


def split_into_paragraphs(text: str) -> list:
    """서문 텍스트를 단락 리스트로 분할"""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text]
    return paragraphs


def render_article(browser, jinja_env, article, output_dir, total_count, current_count):
    """단일 아티클의 모든 이미지 렌더링"""
    data = prepare_template_data(article)
    art_no = article["no"]
    art_type = article.get("type", "curation")
    art_order = article.get("order", art_no)
    type_kr = TYPE_NAMES_KR.get(art_type, art_type)
    rendered = []

    # 1. 스토리 표지 + 게시물 표지
    for tpl_info in TEMPLATES:
        current_count[0] += 1
        filename = f"{type_kr} {art_order}-{tpl_info['suffix']}.png"
        print(f"  [{current_count[0]}/{total_count}] {filename}")

        tpl = jinja_env.get_template(tpl_info["name"])
        html = tpl.render(**data)

        with tempfile.NamedTemporaryFile(
            suffix=".html", delete=False, mode="w", encoding="utf-8"
        ) as f:
            f.write(html)
            tmp_path = f.name

        page = browser.new_page(
            viewport={"width": tpl_info["width"], "height": tpl_info["height"]}
        )
        page.goto(f"file://{tmp_path}", wait_until="networkidle")
        out_path = output_dir / filename
        page.screenshot(path=str(out_path), full_page=False)
        page.close()
        os.unlink(tmp_path)
        rendered.append(filename)

    # 2. 서문 페이지들
    intro_pages = article.get("intro_pages", [])
    for page_idx, page_text in enumerate(intro_pages):
        current_count[0] += 1
        suffix = str(page_idx + 3)
        filename = f"{type_kr} {art_order}-{suffix}.png"
        print(f"  [{current_count[0]}/{total_count}] {filename}")

        intro_data = {
            **data,
            "intro_paragraphs": split_into_paragraphs(page_text),
        }

        tpl = jinja_env.get_template(INTRO_TEMPLATE["name"])
        html = tpl.render(**intro_data)

        with tempfile.NamedTemporaryFile(
            suffix=".html", delete=False, mode="w", encoding="utf-8"
        ) as f:
            f.write(html)
            tmp_path = f.name

        pg = browser.new_page(
            viewport={
                "width": INTRO_TEMPLATE["width"],
                "height": INTRO_TEMPLATE["height"],
            }
        )
        pg.goto(f"file://{tmp_path}", wait_until="networkidle")
        out_path = output_dir / filename
        pg.screenshot(path=str(out_path), full_page=False)
        pg.close()
        os.unlink(tmp_path)
        rendered.append(filename)

    return rendered


def copy_fixed_assets(output_dir: Path):
    """고정 이미지(마지막장) 복사"""
    assets_dir = Path("assets")
    if not assets_dir.exists():
        print("  [WARN] assets/ 폴더 없음 — 마지막장 복사 건너뜀")
        return

    for filename in ASSET_FILES:
        src = assets_dir / filename
        if src.exists():
            shutil.copy2(src, output_dir / filename)
            print(f"  [COPY] {filename}")
        else:
            print(f"  [SKIP] {filename} — 파일 없음")


def count_total_images(articles):
    """전체 렌더링할 이미지 수 계산"""
    total = 0
    for art in articles:
        total += len(TEMPLATES)
        total += len(art.get("intro_pages", []))
    return total


def main():
    parser = argparse.ArgumentParser(
        description="정기그래픽 v4 — YAML → PNG 렌더링"
    )
    parser.add_argument(
        "--input", default="", help="처리된 YAML 파일 경로 (기본: output/에서 최신 파일)"
    )
    parser.add_argument(
        "--article", type=int, default=0, help="특정 아티클 번호만 재렌더 (예: --article 3)"
    )
    args = parser.parse_args()

    # 1. YAML 파일 찾기
    if args.input:
        yaml_path = Path(args.input)
    else:
        yaml_path = find_latest_yaml()

    if not yaml_path or not yaml_path.exists():
        print("❌ 처리된 YAML 파일을 찾을 수 없습니다.")
        print("   먼저 /process-yaml 을 실행하세요.")
        sys.exit(1)

    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    issue = data["issue"]
    date = data["date"]
    articles = data["articles"]

    # 2. 특정 아티클 필터
    if args.article:
        articles = [a for a in articles if a["no"] == args.article]
        if not articles:
            print(f"❌ {args.article}번 아티클을 찾을 수 없습니다.")
            sys.exit(1)

    # 3. 출력 폴더 생성
    output_dir = Path("Editorial") / f"{issue}호_{date}"
    output_dir.mkdir(parents=True, exist_ok=True)

    total = count_total_images(articles)
    print(f"\n🎨 {issue}호 렌더링 시작 ({len(articles)}개 아티클, {total}장)")
    print(f"   출력: {output_dir}/")

    # 4. 렌더링
    jinja_env = Environment(loader=FileSystemLoader("templates"))
    current_count = [0]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for article in articles:
            art_type = article.get("type", "curation")
            type_kr = TYPE_NAMES_KR.get(art_type, art_type)
            intro_count = len(article.get("intro_pages", []))
            print(f"\n  📄 [{type_kr}] {article['title']} (표지 2장 + 서문 {intro_count}장)")

            render_article(browser, jinja_env, article, output_dir, total, current_count)

        browser.close()

    # 5. 고정 이미지 복사
    if not args.article:
        print(f"\n  📎 마지막장 복사")
        copy_fixed_assets(output_dir)

    # 6. 완료
    generated = list(output_dir.glob("*.png"))
    print(f"\n✅ 완료!")
    print(f"   폴더: {output_dir}")
    print(f"   파일: {len(generated)}개 PNG")


if __name__ == "__main__":
    main()

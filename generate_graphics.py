#!/usr/bin/env python3
"""
antiegg 매거진 정기그래픽 자동화 스크립트 (Phase 1)

Ghost CMS API에서 아티클 데이터를 추출하고,
Claude Haiku로 서문을 분할하여 Figma Buzz용 XLSX를 생성한다.

사용법:
    python generate_graphics.py --slugs "slug1,slug2,slug3" --issue 230
    python generate_graphics.py --limit 10 --issue 231
    python generate_graphics.py --limit 5
"""

import argparse
import os
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from openpyxl import Workbook

# ─────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────

GHOST_URL = "https://square.antiegg.kr/ghost/api/content"
GHOST_KEY = "508bef5f0005054b991088cd38"

CLAUDE_MODEL = "claude-3-haiku-20240307"

SPLIT_PROMPT = """당신은 카드뉴스 텍스트 편집자입니다.
주어진 서문을 인스타그램 카드뉴스 페이지용으로 분할해주세요.

## 장수 결정
- 서문이 300자 이하면 2장으로 나누세요
- 서문이 350자 이상이면 3장으로 나누세요
- 300~350자 사이면 문장 끊김이 자연스러운 쪽으로 선택하세요

## 각 페이지 구성
- 페이지당 130~170자 (평균 150자 목표)
- 페이지당 2개 단락 배치 (때에 따라 3개도 가능)
- 1개 단락 = 1~3문장
- 단락 사이는 빈 줄 하나로 구분

## 금지 사항
- 문장을 중간에 끊지 마세요 (마침표/물음표/느낌표 단위로만 끊기)
- 문장 순서를 바꾸지 마세요
- 원문에 없는 문장을 추가하지 마세요

## 편집 지침
- 원문의 모든 문장을 사용할 필요 없습니다. 핵심만 선별하세요
- 마지막 페이지의 마지막 단락은 "~봅니다", "~합니다" 류의 마무리 문장으로 끝내세요
- 각 페이지가 독립적으로 읽혀도 의미가 통해야 합니다

## 출력 형식
각 페이지를 ===PAGE=== 로 구분해서 출력하세요. 다른 설명 없이 분할된 텍스트만 출력하세요.

## 서문
{intro_text}"""


# ─────────────────────────────────────────────
# Ghost API
# ─────────────────────────────────────────────

def fetch_posts_by_slugs(slugs: list[str]) -> list[dict]:
    """slug 목록으로 아티클 가져오기"""
    posts = []
    for slug in slugs:
        url = f"{GHOST_URL}/posts/slug/{slug}/"
        params = {"key": GHOST_KEY, "include": "authors,tags", "formats": "html"}
        try:
            resp = requests.get(url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            if data.get("posts"):
                posts.append(data["posts"][0])
                print(f"  [OK] {data['posts'][0]['title']}")
            else:
                print(f"  [SKIP] slug '{slug}' — 아티클 없음")
        except Exception as e:
            print(f"  [ERROR] slug '{slug}' — {e}")
    return posts


def fetch_recent_posts(limit: int = 20) -> list[dict]:
    """최근 아티클 가져오기"""
    url = f"{GHOST_URL}/posts/"
    params = {
        "key": GHOST_KEY,
        "include": "authors,tags",
        "formats": "html",
        "limit": limit,
        "order": "published_at desc",
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        posts = data.get("posts", [])
        for p in posts:
            print(f"  [OK] {p['title']}")
        return posts
    except Exception as e:
        print(f"  [ERROR] 아티클 목록 조회 실패 — {e}")
        return []


# ─────────────────────────────────────────────
# 서문 추출 (HTML 파싱)
# ─────────────────────────────────────────────

def extract_intro(html: str) -> str:
    """첫 소제목(h2/h3/h4) 또는 구분선(hr) 이전의 p 태그 텍스트 추출"""
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = []
    stop_tags = {"h2", "h3", "h4", "hr"}

    for elem in soup.children:
        tag_name = getattr(elem, "name", None)
        if tag_name in stop_tags and paragraphs:
            break
        if tag_name == "p":
            text = elem.get_text(strip=True)
            if text:
                paragraphs.append(text)

    if not paragraphs:
        all_p = soup.find_all("p")
        for p in all_p[:3]:
            text = p.get_text(strip=True)
            if text:
                paragraphs.append(text)

    return "\n".join(paragraphs)


# ─────────────────────────────────────────────
# 서문 분할 (Claude Haiku)
# ─────────────────────────────────────────────

def split_intro_with_claude(intro_text: str) -> list[str]:
    """Claude Haiku로 서문을 2~3 페이지로 분할"""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("  [WARN] ANTHROPIC_API_KEY 없음 — 분할 건너뜀")
        return [intro_text]

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": SPLIT_PROMPT.format(intro_text=intro_text),
                }
            ],
        )

        result = message.content[0].text
        pages = [p.strip() for p in result.split("===PAGE===") if p.strip()]

        if not pages:
            print("  [WARN] 분할 결과 없음 — 원문 사용")
            return [intro_text]

        return pages

    except Exception as e:
        print(f"  [WARN] Claude API 오류 — {e}")
        return [intro_text]


# ─────────────────────────────────────────────
# 아티클 데이터 가공
# ─────────────────────────────────────────────

def extract_content_type(tags: list[dict]) -> str:
    """태그에서 콘텐츠 종류 추출"""
    type_keywords = {"curation", "gray", "branded"}
    for tag in tags:
        name = tag.get("name", "").strip().lower()
        if name in type_keywords:
            return tag["name"]
    return ""


def process_post(post: dict) -> dict:
    """Ghost API 응답에서 필요한 데이터 추출"""
    title = post.get("title", "")
    author = post.get("authors", [{}])[0].get("name", "")
    subtitle = post.get("custom_excerpt", "") or ""
    feature_image = post.get("feature_image", "") or ""
    tags = post.get("tags", [])
    content_type = extract_content_type(tags)
    html = post.get("html", "")

    intro = extract_intro(html)

    return {
        "제목": title,
        "에디터명": author,
        "부제목": subtitle,
        "대표이미지": feature_image,
        "콘텐츠종류": content_type,
        "발췌문": intro,
    }


# ─────────────────────────────────────────────
# XLSX 생성
# ─────────────────────────────────────────────

def create_xlsx(articles: list[dict], issue: str, output_path: str):
    """Buzz용 XLSX 파일 생성"""
    wb = Workbook()
    ws = wb.active
    ws.title = "시트1"

    headers = ["호수", "No", "콘텐츠종류", "제목", "부제목", "에디터명",
               "서문_1", "서문_2", "서문_3", "대표이미지URL"]
    ws.append(headers)

    # 헤더 스타일
    from openpyxl.styles import Font
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for i, article in enumerate(articles):
        pages = article.get("서문_분할", [article.get("발췌문", "")])
        row = [
            f"{issue}호" if issue else "",
            i + 1,
            article.get("콘텐츠종류", ""),
            article.get("제목", ""),
            article.get("부제목", ""),
            article.get("에디터명", ""),
            pages[0] if len(pages) > 0 else "",
            pages[1] if len(pages) > 1 else "",
            pages[2] if len(pages) > 2 else "",
            article.get("대표이미지", ""),
        ]
        ws.append(row)

    # 열 너비 조정
    col_widths = {"A": 8, "B": 5, "C": 12, "D": 30, "E": 30, "F": 10,
                  "G": 40, "H": 40, "I": 40, "J": 50}
    for col, width in col_widths.items():
        ws.column_dimensions[col].width = width

    wb.save(output_path)


# ─────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="antiegg 정기그래픽 자동화 — Ghost API → 서문 분할 → XLSX"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--slugs", type=str, help="아티클 slug 목록 (콤마 구분)")
    group.add_argument("--limit", type=int, help="최근 N개 아티클 가져오기")
    parser.add_argument("--issue", type=str, default="", help="호수 (예: 230)")
    parser.add_argument("--no-split", action="store_true",
                        help="서문 분할 건너뛰기 (API 호출 없이 원문 유지)")
    parser.add_argument("--output", type=str, default="",
                        help="출력 파일 경로 (기본: ~/Desktop/정기그래픽_{issue}호.xlsx)")

    args = parser.parse_args()

    # 1. Ghost API에서 아티클 가져오기
    print("\n📥 아티클 가져오는 중...")
    if args.slugs:
        slug_list = [s.strip() for s in args.slugs.split(",") if s.strip()]
        posts = fetch_posts_by_slugs(slug_list)
    else:
        posts = fetch_recent_posts(args.limit)

    if not posts:
        print("\n❌ 가져온 아티클이 없습니다.")
        sys.exit(1)

    print(f"\n총 {len(posts)}개 아티클 가져옴")

    # 2. 아티클 데이터 가공
    print("\n📝 아티클 데이터 추출 중...")
    articles = []
    for post in posts:
        article = process_post(post)
        intro_preview = article["발췌문"][:50] + "..." if len(article["발췌문"]) > 50 else article["발췌문"]
        print(f"  [{article['콘텐츠종류'] or '?'}] {article['제목']}")
        print(f"       서문: {intro_preview} ({len(article['발췌문'])}자)")
        articles.append(article)

    # 3. 서문 분할
    if args.no_split:
        print("\n⏭️  서문 분할 건너뜀 (--no-split)")
        for article in articles:
            article["서문_분할"] = [article["발췌문"]]
    else:
        print("\n✂️  서문 분할 중 (Claude Haiku)...")
        for article in articles:
            print(f"  분할: {article['제목']}")
            pages = split_intro_with_claude(article["발췌문"])
            article["서문_분할"] = pages
            print(f"       → {len(pages)}장으로 분할됨")

    # 4. XLSX 생성
    if args.output:
        output_path = args.output
    else:
        issue_suffix = f"_{args.issue}호" if args.issue else "_output"
        output_path = str(
            Path.home() / "Desktop" / f"정기그래픽{issue_suffix}.xlsx"
        )

    print(f"\n📊 XLSX 생성 중...")
    create_xlsx(articles, args.issue, output_path)

    print(f"\n✅ 완료!")
    print(f"   파일: {output_path}")
    print(f"   아티클: {len(articles)}개")

    # 분할 결과 요약
    for i, article in enumerate(articles):
        pages = article.get("서문_분할", [])
        print(f"   {i+1}. {article['제목']} — {len(pages)}장")


if __name__ == "__main__":
    main()

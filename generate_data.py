#!/usr/bin/env python3
"""
정기그래픽 자동화 v4 — 데이터 수집 스크립트

Ghost CMS API에서 아티클 데이터를 추출하고,
서문을 추출하여 raw YAML을 생성한다.
Notion DB에서 아티클을 자동 수집할 수 있다.

사용법:
    python generate_data.py                                    # input.yaml 기반
    python generate_data.py --from-notion --issue 232          # Notion DB 자동 수집
    python generate_data.py --input custom_input.yaml          # 커스텀 입력 파일
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests
import yaml
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

GHOST_URL = "https://square.antiegg.kr/ghost/api/content"
GHOST_KEY = os.environ.get("GHOST_KEY", "")

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
NOTION_DB_ID = os.environ.get("NOTION_DB_ID", "33cffeb1f49847a9abe5d831328e7d60")
NOTION_STATUS_FILTER = "수목금 / 그래픽 이미지 작업"

TYPE_MAP = {"CURATION": "curation", "GRAY": "gray", "BRANDED": "branded", "INSPIRATION": "curation"}


def normalize_url(url: str) -> str:
    """URL에 https:// 없으면 추가"""
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    return url.rstrip("/")


def url_to_slug(url: str) -> str:
    """Ghost 아티클 URL에서 slug 추출"""
    url = normalize_url(url)
    path = urlparse(url).path
    return path.strip("/").split("/")[-1]


def fetch_from_notion() -> list:
    """Notion DB에서 '그래픽 이미지 작업' 상태 아티클 수집"""
    url = f"https://api.notion.com/v1/databases/{NOTION_DB_ID}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    payload = {
        "filter": {
            "property": "상태",
            "select": {"equals": NOTION_STATUS_FILTER},
        }
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"❌ Notion API 오류: {e}")
        sys.exit(1)

    results = resp.json().get("results", [])
    articles = []

    for r in results:
        props = r["properties"]
        title_arr = props.get("아티클 제목", {}).get("title", [])
        title = title_arr[0].get("plain_text", "") if title_arr else ""
        cms_url = props.get("Square CMS", {}).get("url", "")
        ct_select = props.get("🔴 콘텐츠 종류", {}).get("select")
        ct_name = ct_select.get("name", "") if ct_select else ""
        pub_date = props.get("발행일", {}).get("date")
        date_str = pub_date.get("start", "") if pub_date else ""

        if not cms_url:
            print(f"  [SKIP] '{title}' — Square CMS URL 없음")
            continue

        articles.append({
            "url": normalize_url(cms_url),
            "type": TYPE_MAP.get(ct_name.upper(), ct_name.lower()),
            "notion_title": title,
            "date": date_str,
        })

    return articles


def assign_type_orders(articles: list) -> None:
    """유형별 순번(order) 할당 — order가 없는 아티클에 자동 부여"""
    type_counters = {}
    for art in articles:
        if "order" in art and art["order"]:
            continue
        art_type = art.get("type", "curation")
        type_counters[art_type] = type_counters.get(art_type, 0) + 1
        art["order"] = type_counters[art_type]


def fetch_post_by_slug(slug: str) -> Optional[dict]:
    """단일 slug로 아티클 가져오기"""
    url = f"{GHOST_URL}/posts/slug/{slug}/"
    params = {"key": GHOST_KEY, "include": "authors,tags", "formats": "html"}
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("posts"):
            print(f"  [OK] {data['posts'][0]['title']}")
            return data["posts"][0]
        else:
            print(f"  [SKIP] slug '{slug}' — 아티클 없음")
    except Exception as e:
        print(f"  [ERROR] slug '{slug}' — {e}")
    return None


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


def process_article(post: dict, article_input: dict, no: int) -> dict:
    """Ghost API 응답 + input.yaml 데이터를 결합하여 raw 아티클 데이터 생성"""
    title = post.get("title", "")
    editor = post.get("authors", [{}])[0].get("name", "")
    subtitle = post.get("custom_excerpt", "") or ""
    hero_image = post.get("feature_image", "") or ""
    html = post.get("html", "")
    slug = url_to_slug(article_input["url"])

    intro_raw = extract_intro(html)
    content_type = article_input.get("type", "")

    return {
        "no": no,
        "type": content_type,
        "order": article_input.get("order", None),
        "slug": slug,
        "title": title,
        "subtitle": subtitle,
        "editor": editor,
        "hero_image": hero_image,
        "intro_raw": intro_raw,
        "intro_char_count": len(intro_raw),
    }


def main():
    parser = argparse.ArgumentParser(
        description="정기그래픽 v4 — Ghost API → raw YAML"
    )
    parser.add_argument(
        "--input", default="input.yaml", help="입력 YAML 파일 경로 (기본: input.yaml)"
    )
    parser.add_argument(
        "--from-notion", action="store_true", help="Notion DB에서 아티클 자동 수집"
    )
    parser.add_argument(
        "--issue", type=int, default=0, help="호수 지정 (--from-notion 사용 시 필수)"
    )
    args = parser.parse_args()

    if not GHOST_KEY:
        print("❌ GHOST_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
        sys.exit(1)

    # ── 데이터 소스 결정 ──
    if args.from_notion:
        if not NOTION_API_KEY:
            print("❌ NOTION_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
            sys.exit(1)
        if not args.issue:
            print("❌ --from-notion 사용 시 --issue 호수를 지정하세요.")
            print("   예: python generate_data.py --from-notion --issue 232")
            sys.exit(1)

        print(f"\n📋 Notion DB에서 아티클 수집 중...")
        notion_articles = fetch_from_notion()
        if not notion_articles:
            print("❌ Notion에서 가져온 아티클이 없습니다.")
            sys.exit(1)

        issue = args.issue
        date = notion_articles[0].get("date", "")
        articles_input = notion_articles
        print(f"   {len(articles_input)}개 아티클 발견 (발행일: {date})")

    else:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"❌ 입력 파일을 찾을 수 없습니다: {input_path}")
            sys.exit(1)

        with open(input_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        issue = config["issue"]
        date = config["date"]
        articles_input = config["articles"]

    # ── Ghost API에서 아티클 데이터 수집 ──
    print(f"\n📥 {issue}호 아티클 가져오는 중... ({len(articles_input)}개)")

    articles = []
    for i, art_input in enumerate(articles_input, 1):
        slug = url_to_slug(art_input["url"])
        post = fetch_post_by_slug(slug)
        if post:
            article = process_article(post, art_input, i)
            print(f"       서문: {article['intro_char_count']}자")
            articles.append(article)

    if not articles:
        print("\n❌ 가져온 아티클이 없습니다.")
        sys.exit(1)

    # ── 유형별 순번 할당 ──
    assign_type_orders(articles)

    # ── raw YAML 출력 ──
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    output_data = {
        "issue": issue,
        "date": str(date),
        "articles": articles,
    }

    output_path = output_dir / f"{issue}호_raw.yaml"
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(
            output_data,
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )

    print(f"\n✅ 완료!")
    print(f"   파일: {output_path}")
    print(f"   아티클: {len(articles)}개")
    for art in articles:
        type_kr = {"curation": "큐레이션", "gray": "그레이", "branded": "브랜디드"}.get(art["type"], art["type"])
        print(f"   {type_kr} {art['order']}. {art['title']} — {art['intro_char_count']}자")
    print(f"\n다음 단계: /process-yaml {output_path}")


if __name__ == "__main__":
    main()

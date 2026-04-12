"""Citation verification — fetches each candidate URL, validates it, extracts metadata.

This is the trust layer that prevents Claude from displaying hallucinated/broken links.
Verification statuses: verified | weak-match | rejected
"""
import asyncio
import re
from typing import Optional, Tuple, List, Dict
from urllib.parse import urlparse, urlunparse
import httpx
from bs4 import BeautifulSoup
from app.core.config import settings
from app.services.trusted_domains import lookup_domain
from app.schemas.schemas import Reference


def _normalize_url(url: str) -> str:
    try:
        p = urlparse(url.strip())
        if not p.scheme:
            p = p._replace(scheme="https")
        return urlunparse(p)
    except Exception:
        return url


def _domain_of(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().lstrip("www.")
    except Exception:
        return ""


def _title_similarity(a: str, b: str) -> float:
    """Loose token-overlap similarity. Catches obvious mismatches without being too strict."""
    if not a or not b:
        return 0.0
    ta = set(re.findall(r"\w+", a.lower()))
    tb = set(re.findall(r"\w+", b.lower()))
    if not ta or not tb:
        return 0.0
    common = ta & tb
    return len(common) / max(len(ta), len(tb))


def _extract_year(text: str) -> Optional[int]:
    if not text:
        return None
    matches = re.findall(r"(19|20)\d{2}", text)
    if not matches:
        return None
    years = [int(m + re.search(r"(19|20)(\d{2})", text).group(2)) for m in matches[:1]]
    # simpler:
    all_years = re.findall(r"(?:19|20)\d{2}", text)
    if not all_years:
        return None
    nums = sorted(set(int(y) for y in all_years), reverse=True)
    return nums[0] if nums else None


async def _fetch(client: httpx.AsyncClient, url: str) -> Optional[httpx.Response]:
    try:
        r = await client.get(url, follow_redirects=True, timeout=settings.VERIFY_TIMEOUT_SECONDS)
        if r.status_code < 400:
            return r
    except Exception:
        return None
    return None


def _parse_page(html: str) -> Dict:
    soup = BeautifulSoup(html, "lxml")
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    # OG title fallback
    og = soup.find("meta", property="og:title")
    if og and og.get("content") and not title:
        title = og["content"].strip()
    # canonical
    canonical = None
    link = soup.find("link", rel="canonical")
    if link and link.get("href"):
        canonical = link["href"]
    # citation_publication_date
    year = None
    for meta_name in ("citation_publication_date", "citation_date", "article:published_time", "DC.Date"):
        m = soup.find("meta", attrs={"name": meta_name}) or soup.find("meta", attrs={"property": meta_name})
        if m and m.get("content"):
            year = _extract_year(m["content"])
            if year:
                break
    journal = None
    j = soup.find("meta", attrs={"name": "citation_journal_title"})
    if j and j.get("content"):
        journal = j["content"]
    authors = None
    a = soup.find_all("meta", attrs={"name": "citation_author"})
    if a:
        authors = ", ".join(x.get("content", "") for x in a[:5] if x.get("content"))
    return {
        "title": title,
        "canonical": canonical,
        "year": year,
        "journal": journal,
        "authors": authors,
    }


async def verify_one(client: httpx.AsyncClient, candidate: Dict) -> Optional[Dict]:
    """Verify a single candidate reference. Returns enriched dict or None if rejected."""
    url = _normalize_url(candidate.get("url", ""))
    claimed_title = candidate.get("title", "")
    if not url or not url.startswith("http"):
        return None

    resp = await _fetch(client, url)
    if not resp:
        return None

    final_url = str(resp.url)
    domain = _domain_of(final_url)
    source_type, trust = lookup_domain(domain)

    parsed = _parse_page(resp.text)
    page_title = parsed["title"] or ""

    sim = _title_similarity(claimed_title, page_title) if claimed_title and page_title else 0.5
    # accept if either: known trusted domain, OR title similarity decent
    status = "rejected"
    if trust >= 0.8 and sim >= 0.15:
        status = "verified"
    elif trust >= 0.6 and sim >= 0.25:
        status = "verified"
    elif sim >= 0.4:
        status = "verified"
    elif trust >= 0.7:
        status = "weak-match"
    else:
        return None

    year = candidate.get("year") or parsed["year"]
    badges: List[str] = []
    if source_type == "guideline":
        badges.append("Guideline")
    if source_type == "review":
        badges.append("Review")
    if source_type == "society":
        badges.append("Society")
    if source_type == "journal":
        badges.append("Journal")
    if source_type == "public_health":
        badges.append("Public Health")
    if year and year >= 2024:
        badges.append(f"Updated {year}")
    if year and year >= 2025:
        badges.append("New")
    if year and year < 2015:
        badges.append("Landmark")

    return {
        "url": final_url,
        "canonical_url": parsed["canonical"] or final_url,
        "title": page_title or claimed_title,
        "domain": domain,
        "source_type": source_type or candidate.get("source_type"),
        "publication_year": year,
        "update_year": parsed["year"],
        "badges": badges,
        "verified_status": status,
        "why_cited": candidate.get("why_cited"),
        "excerpt": candidate.get("excerpt"),
        "authors": parsed["authors"],
        "journal": parsed["journal"],
    }


async def verify_candidates(candidates: List[Dict], max_keep: int = 15) -> List[Reference]:
    """Verify many candidates concurrently, return up to max_keep verified refs as Reference objects."""
    if not candidates:
        return []

    sem = asyncio.Semaphore(settings.MAX_CONCURRENT_VERIFICATIONS)

    async with httpx.AsyncClient(
        headers={"User-Agent": "openEBM/1.0 (medical evidence verifier)"},
        timeout=settings.VERIFY_TIMEOUT_SECONDS,
    ) as client:
        async def guarded(c):
            async with sem:
                return await verify_one(client, c)

        results = await asyncio.gather(*[guarded(c) for c in candidates], return_exceptions=True)

    verified: List[Dict] = []
    seen_canon = set()
    for r in results:
        if not r or isinstance(r, Exception):
            continue
        if r["verified_status"] != "verified":
            continue
        key = r.get("canonical_url") or r["url"]
        if key in seen_canon:
            continue
        seen_canon.add(key)
        verified.append(r)

    # rank: trusted domain + recent year first
    def score(r):
        _, trust = lookup_domain(r.get("domain", ""))
        year_bonus = (r.get("publication_year") or 2000) / 2030
        return trust + year_bonus

    verified.sort(key=score, reverse=True)
    verified = verified[:max_keep]

    refs: List[Reference] = []
    for i, v in enumerate(verified, start=1):
        refs.append(Reference(n=i, **v))
    return refs

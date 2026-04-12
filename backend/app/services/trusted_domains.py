"""Curated list of trusted medical domains for trust scoring.
This is NOT a hard limit on Claude's source universe — Claude considers any reputable medical
source. This list only boosts trust scoring during verification.
"""

TRUSTED_DOMAINS = {
    # Top journals
    "nejm.org": ("journal", 1.0),
    "jamanetwork.com": ("journal", 1.0),
    "thelancet.com": ("journal", 1.0),
    "bmj.com": ("journal", 1.0),
    "nature.com": ("journal", 0.95),
    "cell.com": ("journal", 0.95),
    "annals.org": ("journal", 0.95),
    "academic.oup.com": ("journal", 0.9),
    "ahajournals.org": ("journal", 0.95),
    "ascopubs.org": ("journal", 0.95),
    "atsjournals.org": ("journal", 0.9),
    "sciencedirect.com": ("journal", 0.85),
    "springer.com": ("journal", 0.85),
    "wiley.com": ("journal", 0.85),
    "pubmed.ncbi.nlm.nih.gov": ("reference", 0.95),
    "ncbi.nlm.nih.gov": ("reference", 0.95),
    "cochranelibrary.com": ("review", 1.0),

    # Public health agencies
    "who.int": ("public_health", 1.0),
    "cdc.gov": ("public_health", 1.0),
    "nih.gov": ("public_health", 1.0),
    "fda.gov": ("public_health", 1.0),
    "ema.europa.eu": ("public_health", 0.95),
    "ecdc.europa.eu": ("public_health", 0.95),
    "nice.org.uk": ("guideline", 1.0),
    "sign.ac.uk": ("guideline", 0.95),

    # Specialty societies
    "idsociety.org": ("society", 0.95),
    "acc.org": ("society", 0.95),
    "heart.org": ("society", 0.95),
    "diabetes.org": ("society", 0.95),
    "ada.org": ("society", 0.9),
    "asco.org": ("society", 0.95),
    "ash.org": ("society", 0.9),
    "thoracic.org": ("society", 0.9),
    "rheumatology.org": ("society", 0.9),
    "aafp.org": ("society", 0.9),
    "acog.org": ("society", 0.95),
    "aap.org": ("society", 0.95),
    "aan.com": ("society", 0.9),
    "acponline.org": ("society", 0.9),
    "esc.eu": ("society", 0.95),
    "easl.eu": ("society", 0.9),
    "easd.org": ("society", 0.9),

    # Academic/reference
    "uptodate.com": ("reference", 0.9),
    "merckmanuals.com": ("reference", 0.85),
    "msdmanuals.com": ("reference", 0.85),
    "medlineplus.gov": ("reference", 0.9),
    "mayoclinic.org": ("reference", 0.85),
    "clevelandclinic.org": ("reference", 0.85),
    "hopkinsmedicine.org": ("reference", 0.9),
    "harvard.edu": ("reference", 0.9),
    "stanford.edu": ("reference", 0.9),
}


def lookup_domain(domain: str):
    domain = (domain or "").lower().lstrip("www.")
    # exact then suffix
    if domain in TRUSTED_DOMAINS:
        return TRUSTED_DOMAINS[domain]
    for d, info in TRUSTED_DOMAINS.items():
        if domain.endswith("." + d) or domain == d:
            return info
    return (None, 0.4)  # unknown but not rejected

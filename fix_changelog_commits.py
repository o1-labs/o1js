import re
import requests
import os

REPO = "o1-labs/o1js"
CHANGELOG_PATH = "CHANGELOG.md"
GITHUB_TOKEN = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}

# Because incremental releases only occurred after 2.3.0, we will exclude the rest of the versions in the automation.

def get_commit_map_from_changelog(changelog: str) -> dict:
    """
    Parses the CHANGELOG.md content and extracts commit hashes from compare URLs.
    Returns a dict like: { "2.6.0": ("065a15f", "6b6d8b9") }
    """
    commit_map = {}
    pattern = re.compile(
        r'## \[(\d+\.\d+\.\d+)\]\(https://github.com/o1-labs/o1js/compare/([a-f0-9]+)\.\.\.([a-f0-9]+)\)'
    )
    for version, from_commit, to_commit in pattern.findall(changelog):
        commit_map[version] = (from_commit, to_commit)
    return commit_map

def get_commit_range_from_permalink(version1, version2):
    url = f"https://api.github.com/repos/{REPO}/compare/{version1}...{version2}"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 200:
        permalink = resp.json().get("permalink_url", "")
        match = re.search(r'/compare/[^:]+:([a-f0-9]+)\.\.\.[^:]+:([a-f0-9]+)', permalink)
        if match:
            return match.group(1), match.group(2)
    else:
        print(f"❌ GitHub API failed for {version1}...{version2} → {resp.status_code}")
    return None, None

def build_commit_map(versions):
    commit_map = {}
    for i in range(len(versions) - 1):
        newer, older = versions[i], versions[i + 1]
        from_commit, to_commit = get_commit_range_from_permalink(older, newer)
        if from_commit and to_commit:
            commit_map[newer] = (from_commit, to_commit)
            print(f"✅ {older} → {newer}: {from_commit}...{to_commit}")
        else:
            print(f"⚠️ Could not determine commits for {older}...{newer}")
    return commit_map

def fix_changelog_links():
    with open(CHANGELOG_PATH, "r", encoding="utf-8") as f:
        changelog = f.read()

    # Step 1: Extract versions from changelog
    version_pattern = re.compile(r'## \[(\d+\.\d+\.\d+)\]\([^)]+\)')
    versions = version_pattern.findall(changelog)

    # Step 2: Extract initial commit map from URLs already present
    commit_map = get_commit_map_from_changelog(changelog)

    # Step 3: Attempt to improve/validate commit_map via GitHub API
    for i in range(len(versions) - 1):
        newer, older = versions[i], versions[i + 1]
        from_commit, to_commit = get_commit_range_from_permalink(older, newer)
        if from_commit and to_commit:
            commit_map[newer] = (from_commit, to_commit)
            print(f"✅ Updated {older} → {newer}: {from_commit}...{to_commit}")
        else:
            print(f"⚠️ Keeping existing commit range for {newer}: {commit_map[newer][0]}...{commit_map[newer][1]} (API call failed)")

    # Step 4: Update [Unreleased] section
    if versions and versions[0] in commit_map:
        unreleased_commit = commit_map[versions[0]][1]  # to_commit of latest version
        unreleased_pattern = re.compile(
            r'\[Unreleased\]\(https://github.com/.+?/compare/[a-f0-9]+\.\.\.HEAD\)'
        )
        new_unreleased = f"[Unreleased](https://github.com/{REPO}/compare/{unreleased_commit}...HEAD)"
        changelog = unreleased_pattern.sub(new_unreleased, changelog)
        print(f"🔁 Updated [Unreleased] → {unreleased_commit}...HEAD")
    else:
        print("⚠️ Could not update [Unreleased] — latest version not found in commit_map.")

    # Step 5: Replace compare URLs in CHANGELOG
    for version, (from_commit, to_commit) in commit_map.items():
        pattern = (
            re.escape(f"[{version}](https://github.com/{REPO}/compare/") +
            r"[a-f0-9]+\.\.\.[a-f0-9]+" +
            r"\)"
        )
        new_url = f"[{version}](https://github.com/{REPO}/compare/{from_commit}...{to_commit})"
        changelog = re.sub(pattern, new_url, changelog)

    # Step 6: Write back to file
    with open(CHANGELOG_PATH, "w", encoding="utf-8") as f:
        f.write(changelog)

    print("✅ CHANGELOG.md updated.")

if __name__ == "__main__":
    fix_changelog_links()

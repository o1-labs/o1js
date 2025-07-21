const fs = require("fs");
const https = require("https");

const REPO = "o1-labs/o1js";
const CHANGELOG_PATH = "CHANGELOG.md";
const GITHUB_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const HEADERS = GITHUB_TOKEN
  ? { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "node.js" }
  : { "User-Agent": "node.js" };

// Because incremental releases only occurred after 2.3.0, we will exclude the rest of the versions in the automation.

function getJSON(url) {
  return new Promise((resolve, reject) => {
    const options = { headers: HEADERS };
    https
      .get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            console.warn(`❌ GitHub API error ${res.statusCode} for ${url}`);
            resolve(null);
          }
        });
      })
      .on("error", reject);
  });
}

function getCommitMapFromChangelog(changelog) {
  const commitMap = {};
  const regex = /## \[(\d+\.\d+\.\d+)\]\(https:\/\/github\.com\/o1-labs\/o1js\/compare\/([a-f0-9]+)\.\.\.([a-f0-9]+)\)/g;
  let match;
  while ((match = regex.exec(changelog))) {
    const [_, version, fromCommit, toCommit] = match;
    commitMap[version] = [fromCommit, toCommit];
  }
  return commitMap;
}

async function getCommitRangeFromPermalink(version1, version2) {
  const url = `https://api.github.com/repos/${REPO}/compare/${version1}...${version2}`;
  const response = await getJSON(url);
  if (response && response.permalink_url) {
    const match = response.permalink_url.match(
      /\/compare\/[^:]+:([a-f0-9]+)\.\.\.[^:]+:([a-f0-9]+)/
    );
    if (match) {
      return [match[1], match[2]];
    }
  }
  return [null, null];
}

async function fixChangelogLinks() {
  let changelog = fs.readFileSync(CHANGELOG_PATH, "utf-8");

  // Step 1: Extract versions from changelog
  const versionPattern = /## \[(\d+\.\d+\.\d+)\]\([^)]+\)/g;
  const versions = [...changelog.matchAll(versionPattern)].map((m) => m[1]);

  // Step 2: Extract initial commit map
  const commitMap = getCommitMapFromChangelog(changelog);

  // Step 3: Improve/validate commit map
  for (let i = 0; i < versions.length - 1; i++) {
    const newer = versions[i];
    const older = versions[i + 1];
    const [fromCommit, toCommit] = await getCommitRangeFromPermalink(older, newer);
    if (fromCommit && toCommit) {
      commitMap[newer] = [fromCommit, toCommit];
      console.log(`✅ Updated ${older} → ${newer}: ${fromCommit}...${toCommit}`);
    } else if (commitMap[newer]) {
      console.warn(
        `⚠️ Keeping existing commit range for ${newer}: ${commitMap[newer][0]}...${commitMap[newer][1]}`
      );
    } else {
      console.warn(`⚠️ Could not determine commits for ${older}...${newer}`);
    }
  }

  // Step 4: Update [Unreleased] section
  if (versions.length && commitMap[versions[0]]) {
    const unreleasedCommit = commitMap[versions[0]][1];
    const unreleasedPattern = /\[Unreleased\]\(https:\/\/github\.com\/.+?\/compare\/[a-f0-9]+\.\.\.HEAD\)/;
    const newUnreleased = `[Unreleased](https://github.com/${REPO}/compare/${unreleasedCommit}...HEAD)`;
    changelog = changelog.replace(unreleasedPattern, newUnreleased);
    console.log(`🔁 Updated [Unreleased] → ${unreleasedCommit}...HEAD`);
  } else {
    console.warn("⚠️ Could not update [Unreleased] — latest version not found in commitMap.");
  }

  // Step 5: Replace compare URLs
  for (const [version, [from, to]] of Object.entries(commitMap)) {
    const pattern = new RegExp(
      `\\[${version}\\]\\(https://github\\.com/${REPO.replace(
        /\//g,
        "\\/"
      )}\\/compare\\/[a-f0-9]+\\.\\.\\.[a-f0-9]+\\)`,
      "g"
    );
    const newUrl = `[${version}](https://github.com/${REPO}/compare/${from}...${to})`;
    changelog = changelog.replace(pattern, newUrl);
  }

  // Step 6: Write updated changelog
  fs.writeFileSync(CHANGELOG_PATH, changelog, "utf-8");
  console.log("✅ CHANGELOG.md updated.");
}

fixChangelogLinks().catch((err) => {
  console.error("Unhandled error:", err);
});

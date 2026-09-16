#!/usr/bin/env node
// Verifies that every third-party action in .github/workflows/ is pinned to a
// full commit SHA, and that the SHA still matches the release tag named in the
// trailing comment.
//
// A pin without a verifier is a to-do wearing a guarantee's costume: nothing
// checks that `@3d3c42e…  # v7.0.1` is still telling the truth, and a pin whose
// comment has drifted from its SHA is worse than a bare tag, because it reads
// as reviewed. This is that check.
//
// The comment must name an immutable release tag (v7.0.1), never a floating
// major (v7). Floating majors are repointed on every release, so a mismatch
// against one would be routine noise; against a patch tag it is a tag that
// moved under us, which is the supply-chain case worth failing a build over.
//
// Network reads are unauthenticated-capable but use GITHUB_TOKEN when present
// (CI always has one) to stay clear of the 60/hr anonymous rate limit.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const WORKFLOW_DIR = ".github/workflows";
const SHA_RE = /^[0-9a-f]{40}$/;
// `v7.0.1` and `2.37.2` are both real release tags in use here; the `v` is optional.
const TAG_RE = /^v?\d+\.\d+\.\d+$/;
// `uses: owner/repo@ref` or `owner/repo/sub@ref`, with an optional `# tag`.
const USES_RE = /^\s*-?\s*uses:\s*["']?([^"'\s@]+)@([^"'\s]+)["']?\s*(?:#\s*(\S+))?/;

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function resolveTag(repo, tag) {
  const headers = { accept: "application/vnd.github+json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`,
    { headers, signal: AbortSignal.timeout(15000) },
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status} resolving ${repo}@${tag}`);
  const body = await res.json();
  // An annotated tag points at a tag object; dereference it to the commit.
  if (body.object?.type === "tag") {
    const res2 = await fetch(body.object.url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res2.ok) throw new Error(`GitHub API ${res2.status} dereferencing ${repo}@${tag}`);
    return (await res2.json()).object.sha;
  }
  return body.object.sha;
}

const files = (await readdir(WORKFLOW_DIR)).filter((f) => /\.ya?ml$/.test(f)).sort();
const problems = [];
const checked = [];

for (const file of files) {
  const full = path.join(WORKFLOW_DIR, file);
  const lines = (await readFile(full, "utf8")).split("\n");

  for (const [i, line] of lines.entries()) {
    if (/^\s*#/.test(line)) continue;           // a commented-out step is not a step
    const m = USES_RE.exec(line);
    if (!m) continue;

    const [, ref, pin, comment] = m;
    const where = `${full}:${i + 1}`;
    if (ref.startsWith("./") || ref.startsWith("docker://")) continue; // local / docker

    const repo = ref.split("/").slice(0, 2).join("/");

    if (!SHA_RE.test(pin)) {
      problems.push(`${where}\n    ${ref}@${pin} is pinned to a tag, not a commit SHA.\n    A tag is mutable: whoever controls it controls this workflow's secrets.`);
      continue;
    }
    if (!comment) {
      problems.push(`${where}\n    ${ref} is SHA-pinned but carries no "# vX.Y.Z" comment.\n    Nothing records which release this SHA is, so nothing can check it.`);
      continue;
    }
    if (!TAG_RE.test(comment)) {
      problems.push(`${where}\n    ${ref} names "${comment}", which is not an immutable release tag.\n    Use a full vX.Y.Z tag — floating majors move every release and cannot be verified.`);
      continue;
    }

    try {
      const actual = await resolveTag(repo, comment);
      if (actual !== pin) {
        problems.push(`${where}\n    ${repo} ${comment} resolves to ${actual}\n    but this workflow pins  ${pin}.\n    Either the pin is stale, or the tag was moved upstream. Do not "fix" this by\n    updating the SHA until you know which.`);
      } else {
        checked.push(`  ok  ${repo}@${comment.padEnd(9)} ${pin.slice(0, 12)}…  (${file})`);
      }
    } catch (err) {
      problems.push(`${where}\n    Could not verify ${repo}@${comment}: ${err.message}`);
    }
  }
}

if (checked.length) {
  console.log(`Verified ${checked.length} action pin(s):`);
  console.log(checked.join("\n"));
}

if (problems.length) {
  console.error(`\n${problems.length} action pin problem(s):\n`);
  console.error(problems.join("\n\n"));
  process.exit(1);
}

if (!checked.length) {
  console.error("No action pins found at all — the checker is probably looking in the wrong place.");
  process.exit(1);
}

console.log("\nAll action pins verified.");

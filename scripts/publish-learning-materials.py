"""Publish exact user-selected files without adding binary data to Pages."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time
import zipfile

REPO = "zyt20001010/e3-learning-site"
BRANCH = "codex/learning-assets"
TAG = "learning-materials-2026-11-03"
TOKEN = os.environ.get("GH_TOKEN", "")

def api(path, body=None, method=None, raw=False):
    headers = {"Authorization": "Bearer " + TOKEN, "User-Agent": "E3-materials-publisher",
               "Accept": "application/vnd.github.raw+json" if raw else "application/vnd.github+json"}
    payload = None if body is None else json.dumps(body).encode()
    if payload is not None:
        headers["Content-Type"] = "application/json"
    with urlopen(Request("https://api.github.com/repos/" + REPO + "/" + path,
                         headers=headers, data=payload, method=method), timeout=180) as response:
        result = response.read()
    return result if raw else json.loads(result)

def command(args, cwd=None, check=True):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError("Command failed: " + args[0] + " " + result.stderr[-1200:])
    return result

def verify(path, expected):
    if not path.is_file() or path.stat().st_size != expected["bytes"]:
        return False
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest() == expected["sha256"]

def download(url, target, expected):
    if urlparse(url).scheme != "https":
        raise ValueError("Only HTTPS sources are accepted")
    temporary = target.with_name(target.name + ".partial")
    target.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    try:
        with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0 E3 learning materials verification"}), timeout=120) as response:
            if response.status != 200:
                raise ValueError("Unexpected HTTP status")
            with temporary.open("wb") as stream:
                while True:
                    block = response.read(1024 * 1024)
                    if not block:
                        break
                    stream.write(block); digest.update(block); size += len(block)
                    if size > expected["bytes"]:
                        raise ValueError("Source size changed")
        if size != expected["bytes"] or digest.hexdigest() != expected["sha256"]:
            raise ValueError("Source differs from the reviewed file")
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)

def main():
    if os.environ.get("GITHUB_REPOSITORY") != REPO or not TOKEN:
        raise ValueError("Unexpected publication environment")
    source = os.environ["GITHUB_SHA"]
    manifest = json.loads(api("contents/.github/learning-materials.json?ref=" + source, raw=True))
    root = Path(tempfile.mkdtemp(prefix="learning-assets-"))
    askpass = root / "askpass.sh"
    askpass.write_text('#!/bin/sh\ncase "$1" in *Username*) printf "%s" "x-access-token";; *Password*) printf "%s" "$GH_TOKEN";; esac\n')
    askpass.chmod(0o700)
    os.environ.update(GIT_ASKPASS=str(askpass), GIT_TERMINAL_PROMPT="0")
    remote = "https://github.com/" + REPO + ".git"
    git = ["git", "-c", "credential.helper="]
    existing = command(git + ["ls-remote", "--exit-code", remote, "refs/heads/" + BRANCH], check=False)
    library = root / "library"
    if existing.returncode == 0:
        command(git + ["clone", "--depth", "1", "--single-branch", "--branch", BRANCH, remote, str(library)])
    elif existing.returncode == 2:
        library.mkdir(); command(git + ["init", "-b", BRANCH], library)
        command(git + ["remote", "add", "origin", remote], library)
    else:
        raise RuntimeError("Could not inspect the materials branch")
    old = library / "manifest.json"
    previous = {item["sha256"]: item for item in json.loads(old.read_text()).get("assets", [])} if old.exists() else {}
    for item in manifest["assets"]:
        prior = previous.get(item["sha256"])
        if item["mode"] == "repository" and prior and prior.get("mode") == "repository" and prior["repositoryPath"] != item["repositoryPath"]:
            source_path, target_path = library / prior["repositoryPath"], library / item["repositoryPath"]
            if verify(source_path, item):
                target_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source_path, target_path); source_path.unlink()
    bundle_zip = None
    needs_bundle = any(item.get("localEntry") and (
        (item["mode"] == "repository" and not verify(library / item["repositoryPath"], item)) or
        (item["mode"] == "release" and previous.get(item["sha256"], {}).get("state") != "ready"))
        for item in manifest["assets"])
    if manifest.get("bundle") and needs_bundle:
        bundle = manifest["bundle"]
        archive = root / "local-materials.zip"
        with archive.open("wb") as stream:
            parts = bundle["parts"]
            for offset in range(0, len(parts), 8):
                batch = parts[offset:offset + 8]
                def part(entry):
                    path = root / (entry["sha256"] + ".part")
                    download(entry["url"], path, entry)
                    return path
                with ThreadPoolExecutor(max_workers=8) as pool:
                    for path in pool.map(part, batch):
                        with path.open("rb") as chunk:
                            shutil.copyfileobj(chunk, stream)
                        path.unlink()
                print(f"Verified local bundle parts {min(offset + 8, len(parts))}/{len(parts)}", flush=True)
        if not verify(archive, bundle):
            raise ValueError("Local bundle differs from the selected files")
        bundle_zip = zipfile.ZipFile(archive)
    release = None
    def get_release():
        nonlocal release
        if release is not None:
            return release
        try:
            release = api("releases/tags/" + TAG)
        except HTTPError as error:
            if error.code != 404:
                raise
            release = api("releases", {"tag_name": TAG, "target_commitish": source,
                "name": "Learning materials · 2026-11-03", "body": "Exact file copies selected for the learning atlas. Original attribution and version information are preserved in each file and the website catalogue."})
        return release
    results, failures = {}, []
    def prepare(item):
        sha = item["sha256"]
        target = library / item["repositoryPath"] if item["mode"] == "repository" else root / item["filename"]
        if item["mode"] == "repository" and verify(target, item):
            return item, target
        prior = previous.get(sha)
        if item["mode"] == "release" and prior and prior.get("state") == "ready":
            return item, None
        target.parent.mkdir(parents=True, exist_ok=True)
        if item.get("localEntry"):
            if bundle_zip is None:
                raise ValueError("Local bundle not supplied")
            target.write_bytes(bundle_zip.read(item["localEntry"]))
            if not verify(target, item):
                raise ValueError("Local file verification failed")
            return item, target
        errors = []
        for url in item.get("sources", []):
            for attempt in range(2):
                try:
                    download(url, target, item)
                    return item, target
                except Exception as error:
                    errors.append(type(error).__name__ + ": " + str(error)[:180])
                    time.sleep(2)
        raise RuntimeError("; ".join(errors) or "No source provided")
    with ThreadPoolExecutor(max_workers=6) as pool:
        pending = {pool.submit(prepare, item): item for item in manifest["assets"]}
        for future in as_completed(pending):
            item = pending[future]
            try:
                item, path = future.result()
                record = {key: value for key, value in item.items() if key not in ["sources", "localEntry"]}
                if item["mode"] == "release":
                    if path is None:
                        record.update(previous[item["sha256"]])
                    else:
                        rel = get_release()
                        asset = next((asset for asset in rel["assets"] if asset["name"] == item["filename"]), None)
                        if asset is None:
                            command(["gh", "release", "upload", TAG, str(path), "--repo", REPO])
                            rel = api("releases/tags/" + TAG); release = rel
                            asset = next(asset for asset in rel["assets"] if asset["name"] == item["filename"])
                        if asset["size"] != item["bytes"] or asset.get("digest") != "sha256:" + item["sha256"]:
                            raise ValueError("Release asset differs from the selected file")
                        record["releaseUrl"] = asset["browser_download_url"]
                        record["releaseId"] = asset["id"]
                record["state"] = "ready"; results[item["sha256"]] = record
                print(f"Verified {len(results)}/{len(manifest['assets'])}: {item['filename']}", flush=True)
            except Exception as error:
                failures.append({"sha256": item["sha256"], "filename": item["filename"], "error": type(error).__name__ + ": " + str(error)[:300]})
                print("Source pending: " + item["filename"], flush=True)
    if bundle_zip:
        bundle_zip.close()
    previous.update(results)
    report = {"sourceCommit": source, "assets": list(previous.values()), "failures": failures,
              "requested": len(manifest["assets"]), "verified": len(results)}
    (library / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    command(git + ["config", "user.name", "github-actions[bot]"], library)
    command(git + ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], library)
    command(git + ["add", "files", "manifest.json"], library)
    changed = command(git + ["diff", "--cached", "--quiet"], library, check=False).returncode
    if changed:
        command(git + ["commit", "-m", "Publish verified learning file copies"], library)
        command(git + ["push", "origin", BRANCH], library)
    commit = command(git + ["rev-parse", "HEAD"], library).stdout.strip()
    print(json.dumps({"assetCommit": commit, "verified": len(results), "pending": len(failures), "branch": BRANCH}), flush=True)
    if failures:
        raise RuntimeError("Some sources require the saved local copies; verified files are retained")

if __name__ == "__main__":
    main()

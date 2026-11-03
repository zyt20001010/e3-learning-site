"""Publish only explicitly licensed, checksum-verified public textbook PDFs."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse
import hashlib
import json
import os
import re
import subprocess
import urllib.request

manifest = json.loads(Path("release.json").read_text())
repository = os.environ["GITHUB_REPOSITORY"]
commit = os.environ["GITHUB_SHA"]
tag = manifest["tag"]
assert re.fullmatch(r"textbooks-[0-9-]+", tag)
assert repository == "zyt20001010/e3-learning-site"
output = Path("verified-textbooks")
output.mkdir(exist_ok=True)

def acquire(asset):
    assert asset["redistributionAllowed"] is True
    assert asset["license"] == "CC BY-NC-SA 4.0"
    assert urlparse(asset["sourceUrl"]).scheme == "https"
    assert urlparse(asset["sourceUrl"]).hostname == "assets.openstax.org"
    assert re.fullmatch(r"[a-z0-9-]+\.pdf", asset["filename"])
    assert re.fullmatch(r"[a-f0-9]{64}", asset["sha256"])
    file = output / asset["filename"]
    digest = hashlib.sha256()
    size = 0
    request = urllib.request.Request(asset["sourceUrl"], headers={"User-Agent":"Mozilla/5.0 E3-learning-materials/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response, file.open("wb") as stream:
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > asset["bytes"]: raise ValueError("Upstream file size changed: " + asset["filename"])
            digest.update(chunk); stream.write(chunk)
    assert size == asset["bytes"], "Incomplete upstream textbook"
    assert digest.hexdigest() == asset["sha256"], "Upstream textbook checksum changed"
    with file.open("rb") as stream: assert stream.read(5) == b"%PDF-"
    print("Verified", asset["filename"], size, digest.hexdigest(), flush=True)
    return file

with ThreadPoolExecutor(max_workers=3) as pool:
    files = list(pool.map(acquire, manifest["assets"]))

notes = ["公开教材的未修改官方 PDF 副本。原作者、出版社、许可与书内声明全部保留。\n"]
for asset in manifest["assets"]:
    notes.append(f"- **{asset['title']}** — OpenStax / Rice University；{asset['license']}。")
    notes.append(f"  原文与署名：{asset['sourcePage']}\n  许可：https://creativecommons.org/licenses/by-nc-sa/4.0/\n  SHA-256：`{asset['sha256']}`\n")
notes.append("\n本站用于非商业个人学习。请按每份材料的原许可使用；这些许可不改变网站其他内容的权利。")
Path("release-notes.md").write_text("\n".join(notes))

def gh(*args, check=True):
    return subprocess.run(["gh", *args], capture_output=True, text=True, check=check)

probe = gh("api", f"repos/{repository}/releases/tags/{tag}", check=False)
if probe.returncode:
    if "404" not in probe.stderr: raise RuntimeError(probe.stderr)
    gh("release", "create", tag, "--repo", repository, "--target", commit,
       "--title", manifest["title"], "--notes-file", "release-notes.md")
    existing = {}
else:
    existing = {asset["name"]:asset for asset in json.loads(probe.stdout)["assets"]}

for asset, file in zip(manifest["assets"], files):
    prior = existing.get(asset["filename"])
    if prior:
        assert prior.get("size") == asset["bytes"]
        assert prior.get("digest") == "sha256:" + asset["sha256"], "Existing asset differs; use a new release tag"
        print("Already verified", asset["filename"])
        continue
    gh("release", "upload", tag, str(file), "--repo", repository)
    print("Uploaded", asset["filename"], flush=True)

print(f"https://github.com/{repository}/releases/tag/{tag}")

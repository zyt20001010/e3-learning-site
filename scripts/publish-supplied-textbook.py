"""Reassemble a supplied file and publish only the reviewed website paths."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
import base64
import hashlib
import json
import os
import sys

REPOSITORY = "zyt20001010/e3-learning-site"
MANIFEST = ".github/supplied-textbook-parts.json"
TEXT_PATHS = {".gitignore", "README.md", "index.html", "materials/README.md", "materials/catalog.json"}
PDF_PATH = "materials/how-to-prove-it-3rd-2019.pdf"

def verified(data, entry):
    if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
        raise ValueError("File verification failed: " + entry["path"])
    return data

def collect(manifest, read):
    if {entry["path"] for entry in manifest["textFiles"]} != TEXT_PATHS:
        raise ValueError("Unexpected website file list")
    if manifest["pdf"]["path"] != PDF_PATH:
        raise ValueError("Unexpected textbook destination")
    parts = manifest["parts"]
    if [entry["path"] for entry in parts] != [f".github/textbook-parts/proof/part-{i:03d}.bin" for i in range(len(parts))]:
        raise ValueError("Unexpected textbook parts")
    with ThreadPoolExecutor(max_workers=4) as pool:
        chunks = list(pool.map(lambda entry: verified(read(entry["path"]), entry), parts))
    pdf = verified(b"".join(chunks), manifest["pdf"])
    if not pdf.startswith(b"%PDF-"):
        raise ValueError("Invalid PDF signature")
    files = {PDF_PATH: pdf}
    for entry in manifest["textFiles"]:
        files[entry["path"]] = verified(read(entry["path"]), entry)
    return files

def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--check-local":
        root = Path(sys.argv[2]).resolve()
        manifest = json.loads((root / MANIFEST).read_text())
        files = collect(manifest, lambda path: (root / path).read_bytes())
        print(json.dumps({"localVerification": True, "files": list(files), "pdfBytes": len(files[PDF_PATH])}))
        return
    if os.environ.get("GITHUB_REPOSITORY") != REPOSITORY:
        raise ValueError("Unexpected repository")
    source = os.environ["GITHUB_SHA"]
    token = os.environ["GH_TOKEN"]
    def api(path, data=None, method=None, raw=False):
        payload = None if data is None else json.dumps(data).encode()
        headers = {"Authorization": "Bearer " + token,
                   "Accept": "application/vnd.github.raw+json" if raw else "application/vnd.github+json",
                   "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "E3-supplied-textbook-publisher"}
        if payload is not None:
            headers["Content-Type"] = "application/json"
        request = Request("https://api.github.com/repos/" + REPOSITORY + "/" + path,
                          data=payload, headers=headers, method=method)
        try:
            with urlopen(request, timeout=180) as response:
                result = response.read()
        except HTTPError as error:
            raise RuntimeError(f"GitHub {method or 'GET'} failed with HTTP {error.code}") from None
        return result if raw else json.loads(result)
    def read(path):
        return api("contents/" + quote(path, safe="/") + "?ref=" + source, raw=True)
    manifest = json.loads(read(MANIFEST))
    files = collect(manifest, read)
    current = api("git/ref/heads/main")["object"]["sha"]
    if current != manifest["expectedMain"]:
        raise RuntimeError("Main changed since preparation; publication stopped without replacing changes")
    base_tree = api("git/commits/" + current)["tree"]["sha"]
    entries = []
    for path, payload in files.items():
        blob = api("git/blobs", {"encoding": "base64", "content": base64.b64encode(payload).decode()})
        expected = hashlib.sha1(b"blob " + str(len(payload)).encode() + b"\0" + payload).hexdigest()
        if blob["sha"] != expected:
            raise RuntimeError("Stored Git blob differs from reviewed file")
        entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print(f"Verified Git file: {path} ({len(payload)} bytes)", flush=True)
    tree = api("git/trees", {"base_tree": base_tree, "tree": entries})
    commit = api("git/commits", {"message": "Publish supplied textbook and repository-first reading",
                                "tree": tree["sha"], "parents": [current]})
    if api("git/ref/heads/main")["object"]["sha"] != current:
        raise RuntimeError("Main changed during preparation; publication stopped")
    api("git/refs/heads/main", {"sha": commit["sha"], "force": False}, method="PATCH")
    print(json.dumps({"publishedCommit": commit["sha"], "tree": tree["sha"],
                      "sourceCommit": source, "pdfSha256": manifest["pdf"]["sha256"]}), flush=True)

if __name__ == "__main__":
    main()

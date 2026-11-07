#!/usr/bin/env python3
"""Import the exact user-approved Humans Remain start-screen track from Pixabay once.
The sha256 check prevents accidentally shipping a different recording.
"""
import hashlib
import html
import http.cookiejar
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

TRACK_ID = 335499
EXPECTED_SHA256 = "17204071aaf95ac09311ac03482fd30a1614dfe658e864adb6e1ebca15cab583"
OUTPUT = Path("public/audio/start-menu.mp3")
PAGE = "https://pixabay.com/music/solo-piano-piano-mystery-tense-cinematic-drone-loop-335499/"
SEARCH = "https://pixabay.com/music/search/piano-mystery-tense-cinematic-drone-loop/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36", "Referer": "https://pixabay.com/music/", "Accept": "*/*"}
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

def read(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with opener.open(request, timeout=35) as response:
        return response.read()

def locate(item):
    if isinstance(item, dict):
        if str(item.get("id")) == str(TRACK_ID):
            sources = item.get("sources") or {}
            value = sources.get("src") if isinstance(sources, dict) else None
            if value: return value
        for value in item.values():
            result = locate(value)
            if result: return result
    elif isinstance(item, list):
        for value in item:
            result = locate(value)
            if result: return result
    return None

def audio_url(page):
    html_text = read(page).decode("utf-8", "replace")
    # The track's own detail page may embed the source in its initial JSON.
    for key in ("__BOOTSTRAP__",):
        m = re.search(r"window\\." + key + r"\\s*=\\s*({.*?});", html_text, re.S)
        if m:
            try:
                source = locate(json.loads(m.group(1)))
                if source: return urllib.parse.urljoin(page, source)
            except ValueError:
                pass
    m = re.search(r"window\\.__BOOTSTRAP_URL__\\s*=\\s*[\"']([^\"']+)[\"']", html_text)
    if m:
        bootstrap = urllib.parse.urljoin(page, html.unescape(m.group(1)))
        source = locate(json.loads(read(bootstrap)))
        if source: return urllib.parse.urljoin(page, source)
    # Last resort: source URLs already included in markup; verify by SHA below.
    matches = re.findall(r"https?://cdn\\.pixabay\\.com/(?:audio|download/audio)/[^\\s\"'<>\\\\]+?\\.mp3(?:\\?[^\\s\"'<>\\\\]*)?", html_text)
    return html.unescape(matches[0]) if matches else None

if OUTPUT.exists() and hashlib.sha256(OUTPUT.read_bytes()).hexdigest() == EXPECTED_SHA256:
    print("The approved audio is already in the repository.")
    raise SystemExit(0)
for url in (PAGE, SEARCH):
    source = audio_url(url)
    if not source: continue
    parsed = urllib.parse.urlparse(source)
    if parsed.scheme != "https" or parsed.hostname != "cdn.pixabay.com":
        raise RuntimeError("Refusing an untrusted audio source: " + source)
    data = read(source)
    actual = hashlib.sha256(data).hexdigest()
    if actual == EXPECTED_SHA256:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(data)
        print("Imported user-approved Sonican start menu music: " + str(len(data)) + " bytes")
        break
    print("Pixabay supplied a different MP3 encoding, sha256=" + actual)
else:
    raise RuntimeError("Could not retrieve the exact user-supplied soundtrack. Add the original MP3 manually at public/audio/start-menu.mp3.")

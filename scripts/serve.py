#!/usr/bin/env python3
"""Serve the local application without exposing Git or agent configuration."""

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIRECTORIES = {"assets", "models", "vendor"}
PUBLIC_ROOT_EXTENSIONS = {".html", ".css", ".js", ".mjs"}


def is_public(path):
    parts = path.parts
    if any(part.startswith(".") for part in parts):
        return False
    return (
        not parts
        or parts[0] in PUBLIC_DIRECTORIES
        or (len(parts) == 1 and path.suffix in PUBLIC_ROOT_EXTENSIONS)
    )


class GardenRequestHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".bbmodel": "application/json",
    }

    def __init__(self, *args, directory=ROOT, **kwargs):
        self.root = Path(directory).resolve()
        super().__init__(*args, directory=str(self.root), **kwargs)

    def send_head(self):
        parts = unquote(urlsplit(self.path).path).split("/")
        if any(part in {".", ".."} for part in parts):
            self.send_error(404)
            return None
        requested = PurePosixPath(*filter(None, parts))
        resolved = Path(self.translate_path(self.path)).resolve()
        try:
            relative = resolved.relative_to(self.root)
        except ValueError:
            self.send_error(404)
            return None
        if not is_public(requested) or not is_public(relative):
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404, "Directory listing is disabled")
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8098)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.bind, args.port), GardenRequestHandler) as server:
        print(f"Serving {ROOT} on {args.bind}:{args.port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()

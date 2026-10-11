import functools
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from scripts.serve import GardenRequestHandler


class QuietHandler(GardenRequestHandler):
    def log_message(self, format, *args):
        pass


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        preferred_tmp = Path("/tmp/opencode")
        cls.temp = tempfile.TemporaryDirectory(
            dir=preferred_tmp if preferred_tmp.is_dir() else None
        )
        cls.root = Path(cls.temp.name)
        files = {
            "index.html": "<h1>Garden</h1>",
            "garden.js": "export const ready = true;",
            "models/example.bbmodel": "{}",
            "vendor/three.module.js": "export {};",
            ".git/config": "private Git configuration",
            ".opencode/agents/test.md": "private agent instructions",
            "opencode.json": '{"private": true}',
            "README.md": "private documentation",
            "assets/.env": "private credentials",
        }
        for name, content in files.items():
            path = cls.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        (cls.root / "assets/config.json").symlink_to(cls.root / "opencode.json")
        (cls.root / "assets/outside.txt").symlink_to(cls.root.parent / "outside.txt")
        handler = functools.partial(QuietHandler, directory=cls.root)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def test_public_resources(self):
        paths = [
            "/", "/garden.js", "/vendor/three.module.js", "/models/example.bbmodel"
        ]
        for path in paths:
            with self.subTest(path=path), urlopen(self.url + path) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_module_and_model_content_types(self):
        resources = [
            ("/garden.js", "text/javascript"),
            ("/models/example.bbmodel", "application/json"),
        ]
        for path, expected in resources:
            with self.subTest(path=path), urlopen(self.url + path) as response:
                self.assertEqual(response.headers.get_content_type(), expected)

    def test_private_paths_are_unavailable(self):
        paths = [
            "/.git/config", "/.opencode/agents/test.md", "/opencode.json",
            "/README.md", "/assets/.env",
        ]
        for path in paths:
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.url + path)
                self.assertEqual(error.exception.code, 404)

    def test_traversal_and_symlinks_are_unavailable(self):
        paths = [
            "/assets/%2e%2e/opencode.json", "/%2egit/config",
            "/assets/config.json", "/assets/outside.txt",
        ]
        for path in paths:
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.url + path)
                self.assertEqual(error.exception.code, 404)

    def test_directory_listing_is_unavailable(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(self.url + "/models/")
        self.assertEqual(error.exception.code, 404)

    def test_head_and_query_string(self):
        request = Request(self.url + "/garden.js?v=1", method="HEAD")
        with urlopen(request) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read(), b"")


if __name__ == "__main__":
    unittest.main()

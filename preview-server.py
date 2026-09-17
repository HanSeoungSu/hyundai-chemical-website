"""Static preview server that prevents stale HTML, CSS, and JavaScript caches."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    parser = ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--directory", default=".")
    args = parser.parse_args()

    handler = partial(NoCacheRequestHandler, directory=args.directory)
    server = ThreadingHTTPServer(("0.0.0.0", args.port), handler)
    print(f"Serving {args.directory} on 0.0.0.0:{args.port} (cache disabled)", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

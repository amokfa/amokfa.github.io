#!/usr/bin/env python3
import http.server, pathlib, subprocess, sys, threading, webbrowser

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 1750


def _sass_watch():
    subprocess.run([
        'sass', '--watch',
        str(ROOT / 'static/scss/styles.scss'),
        str(ROOT / 'static/css/styles.css'),
        '--no-source-map'
    ])


def main():
    t = threading.Thread(target=_sass_watch, daemon=True)
    t.start()

    webbrowser.open(f'http://localhost:{PORT}')

    handler = http.server.SimpleHTTPRequestHandler
    handler.directory = str(ROOT)
    http.server.ThreadingHTTPServer(('', PORT), handler).serve_forever()


if __name__ == '__main__':
    main()

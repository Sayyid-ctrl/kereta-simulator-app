import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print("="*60)
        print("🚆 ID-RailSim 3D: Simulator Kereta Api Indonesia")
        print(f"📡 Server aktif di: {url}")
        print("⌨️  Tekan Ctrl+C di terminal untuk menghentikan server.")
        print("="*60)
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server dihentikan.")
            httpd.server_close()

if __name__ == '__main__':
    start()

import os
import http.server
import socketserver

PORT = int(os.environ.get("PORT", 8080))

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'public, max-age=300')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CORSHandler) as httpd:
        print(f"Insider Widgets CDN server running on port {PORT}")
        httpd.serve_forever()

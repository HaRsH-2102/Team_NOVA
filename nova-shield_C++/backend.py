from http.server import BaseHTTPRequestHandler, HTTPServer

class MyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"message": "Hello from backend!"}')

    def do_POST(self):
        if 'Content-Length' in self.headers:
            content_length = int(self.headers['Content-Length'])
            self.rfile.read(content_length)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"message": "Login successful!"}')

httpd = HTTPServer(('127.0.0.1', 8080), MyHandler)
print("Backend running on 8080")
httpd.serve_forever()

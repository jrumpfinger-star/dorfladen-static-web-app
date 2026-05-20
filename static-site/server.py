"""Local dev server that mimics Azure Static Web Apps clean URLs.
   /konzept -> konzept.html, /aktuelles -> aktuelles.html, etc."""
import http.server, os

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        # Strip trailing slash
        if path != '/' and path.endswith('/'):
            path = path[:-1]
        # If no extension and not a directory, try .html
        if '.' not in os.path.basename(path) and path != '/':
            rel = path.lstrip('/')
            html_path = os.path.join(os.getcwd(), rel + '.html')
            if os.path.isfile(html_path):
                self.path = '/' + rel + '.html'
        super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(('', 8080), CleanURLHandler)
    print('Serving on http://localhost:8080 (clean URLs enabled)')
    server.serve_forever()

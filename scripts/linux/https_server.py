#!/usr/bin/env python3
"""
Simple HTTPS Server for Mirai HelpDesk Frontend
Used by systemd service for production deployment
"""

import http.server
import ssl
import os

HOST = '192.168.0.187'
PORT = 443

# SSL Certificate paths from environment
SSL_CERT = os.environ.get('SSL_CERT', '/etc/ssl/certs/server.crt')
SSL_KEY = os.environ.get('SSL_KEY', '/etc/ssl/private/server.key')

# Change to frontend directory
FRONTEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_PATH = os.path.join(os.path.dirname(FRONTEND_DIR), 'frontend')
os.chdir(FRONTEND_PATH)

server_address = (HOST, PORT)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(SSL_CERT, SSL_KEY)
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print(f"Starting HTTPS server on https://{HOST}:{PORT}")
httpd.serve_forever()

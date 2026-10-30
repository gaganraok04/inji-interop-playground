import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting MOSIP Inji Interoperability Playground Backend on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)

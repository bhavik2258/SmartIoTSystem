from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def dashboard():
    # Dashboard route.
    return render_template("index.html")

if __name__ == "__main__":
    print("Starting Smart AC System dashboard on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=False)

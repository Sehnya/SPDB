from flask import Flask, render_template
from flask.cli import load_dotenv
from flask_cors import CORS
from twelvedata import TDClient
import os

load_dotenv()
app = Flask(__name__,  template_folder='templates', static_folder="static")
CORS(app, origins=(['*', 'localhost:8080', '127.0.0.1:8080']))
td = TDClient(apikey=os.getenv('API_KEY'))

ts = td.time_series(
    symbol="AAPL",
    interval="1min",
    outputsize=10,
    timezone="America/New_York",
)
ts.as_pandas()
@app.route('/')
def hello_world():  # put application's code here
    return 'Hello World!'


if __name__ == '__main__':
    app.run()

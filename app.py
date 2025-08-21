
from flask import Flask, render_template
from dotenv import load_dotenv
from flask_cors import CORS
from twelvedata import TDClient
import os

load_dotenv()
app = Flask(__name__,  template_folder='templates', static_folder="static")
CORS(app, origins=(['*', 'localhost:8080', '127.0.0.1:8080']))
td = TDClient(apikey=os.getenv('API_KEY'))

ts = td.time_series(
    symbol="AAPL,MSFT,GOOGL,AMZN, NVDA",
    interval="1min",
    outputsize=10,
    timezone="America/New_York",
).as_json()


@app.route('/data' , methods=['GET'])
def data():
    global ts
    return ts

@app.route('/data/<symbol>', methods=['GET'])
def data_by_symbol(symbol):
    global ts
    for i in ts:
        if i['symbol'] == symbol:
            return i

@app.route('/data/<symbol>/<interval>', methods=['GET'])
def data_by_symbol_interval(symbol, interval):
    global ts
    for i in ts:
        if i['symbol'] == symbol and i['interval'] == interval:
            return i
        else:
            return "No data found"
    return None
@app.route('/data/<symbol>/<interval>/<start_date>/<end_date>', methods=['GET'])
def data_by_symbol_interval_start_end(symbol, interval, start_date, end_date):
    global ts
    for i in ts:
        if i['symbol'] == symbol and i['interval'] == interval and start_date <= i['datetime'] <= end_date:
            return i
        else:
            return "No data found"
    return None

@app.route('/data/<symbol>/<interval>/<start_date>/<end_date>/<outputsize>', methods=['GET'])
def data_by_symbol_interval_start_end_outputsize(symbol, interval, start_date, end_date, outputsize):
    global ts
    for i in ts:
        if i['symbol'] == symbol and i['interval'] == interval and start_date <= i['datetime'] <= end_date and i['outputsize'] == outputsize:
            return i
        else:
            return "No data found"
    return None

#enpoints for render in dashboard.html


@app.route('/')
def dashboard():
    # put application's code here

    return render_template('dashboard.html')




if __name__ == '__main__':
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(port=8080, debug=True)

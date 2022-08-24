from flask import Flask, render_template, request
from os.path import exists
from datetime import datetime
# routes are imported at the bottom

app = Flask(__name__, static_url_path='/static')
@app.context_processor
def utility_processor():
    def fileAvail(src:str):
        return exists(src)
    def epoch2time(ts,inWords=False,inShort=False):
        if inWords:
            if inShort:
                # A day of week
                # d date
                # B Month in Words
                # Y year
                return datetime.utcfromtimestamp(ts/1000).strftime('%d %b')
            return datetime.utcfromtimestamp(ts/1000).strftime('%A %d %B %Y %I:%M %p')
        return datetime.utcfromtimestamp(ts/1000).strftime('%d-%m-%Y %H:%M:%S')
    return dict(fileAvail=fileAvail,epoch2time=epoch2time)

from WhatsAppViewer import routes
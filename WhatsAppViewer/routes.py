from WhatsAppViewer import app
from flask import render_template,request
from WhatsAppViewer.db_config import db_query
from WhatsAppViewer._SQL_QUERIES_ import *
import base64


@app.route("/home", methods=['GET'])
@app.route("/index", methods=['GET'])
@app.route('/', methods=['GET'])
def index():
    result = db_query(SQL_CHAT_LIST_DB_QUERY, True)
    return render_template('index.html',result=result)


## Eg: http://localhost:5001/chat/7?limit_from=3&limit=2
@app.route('/chat/<int:chat_id>', methods=['GET'])
def chatMsg(chat_id):
    limit_from = request.args.get("limit_from")
    limit = request.args.get("limit")
    print(limit_from+" "+limit)
    rows = db_query(f'{SQL_MESSAGES_DB_QUERY} WHERE message.chat_row_id={chat_id} ORDER BY message.timestamp DESC LIMIT {limit_from},{limit}', True)
    data = []
    for row in rows:
        row_dict = dict(zip(row.keys(), row))
        if row_dict['thumbnail']:
            row_dict['thumbnail'] = base64.b64encode(row['thumbnail']).decode('ascii') # encode as base64
        if row_dict['media_media_key']:
            row_dict['media_media_key'] = base64.b64encode(row['media_media_key']).decode('ascii')
        if row_dict['media_quoted_media_key']:
            row_dict['media_quoted_media_key'] = base64.b64encode(row['media_quoted_media_key']).decode('ascii')
        data.append(row_dict)
        # row['thumbnail'] = encodebytes(row['thumbnail']).decode('ascii') # encode as base64
    return data

@app.route('/reply/<int:msg_id>', methods=['GET'])
def getReply(msg_id):
    return "Processing..."


@app.route('/media/<int:msg_id>', methods=['GET'])
def getMedia(msg_id):
    return "Processing..."
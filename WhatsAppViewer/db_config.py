import sqlite3

# Create a SQL connection to our SQLite database
dBmsgstoreSrc = "WhatsAppViewer/db/msgstore.db"
dBwaSrc = "WhatsAppViewer/db/wa.db"

def db_query(query:str,needWa:bool = False):
    con = sqlite3.connect(dBmsgstoreSrc)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    if needWa:
        cur.execute(f'ATTACH DATABASE "{dBwaSrc}" as wa;')

    cur.execute(query)
    result =  cur.fetchall()
    con.close()
    return result

# print(db_query("SELECT chat_view._id,wa.wa_contacts.display_name as wa_con_display_name FROM ((chat_view INNER JOIN wa.wa_contacts ON chat_view.raw_string_jid = wa.wa_contacts.jid) INNER JOIN jid ON wa.wa_contacts.jid=jid.raw_string); ",True))
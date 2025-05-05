#!/usr/bin/env python3
import os
import mimetypes
import mysql.connector
from datetime import datetime
from zoneinfo import ZoneInfo  # Für Python 3.9+

# MySQL-Konfiguration – passe hier bitte dein Root-Passwort an!
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Password',
    'database': 'uploads'
}

NAS_BASE_PATH = '/mnt/nas'
ALLOWED_FOLDERS = ['temp', 'txt', 'vids']
LOCAL_TIMEZONE = ZoneInfo("Europe/Berlin")

# Mapping: MIME-Typ → gewünschte Anzeige
mime_mapping = {
    "text/plain": "txt",
    "image/jpeg": "jpeg",
    "image/png": "png",
    "video/mp4": "mp4",
    "audio/mpeg": "mpeg"
}

def scan_and_insert(folder):
    folder_path = os.path.join(NAS_BASE_PATH, folder)
    if not os.path.exists(folder_path):
        print(f"Ordner '{folder_path}' existiert nicht.")
        return

    try:
        conn = mysql.connector.connect(**db_config)
    except mysql.connector.Error as err:
        print(f"Verbindung zu MySQL fehlgeschlagen: {err}")
        return

    cursor = conn.cursor()

    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path):
            # Überspringe, wenn der Dateiname bereits existiert
            cursor.execute("SELECT COUNT(*) FROM info WHERE name = %s", (filename,))
            result = cursor.fetchone()
            if result and result[0] > 0:
                print(f"'{filename}' existiert bereits. Überspringen.")
                continue

            file_size = os.path.getsize(file_path)
            mod_timestamp = os.path.getmtime(file_path)
            modification_date_local = datetime.fromtimestamp(mod_timestamp, tz=LOCAL_TIMEZONE)
            formatted_date = modification_date_local.strftime("%Y-%m-%d %H:%M:%S")
            
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type in mime_mapping:
                simplified_type = mime_mapping[mime_type]
            else:
                if mime_type and "/" in mime_type:
                    simplified_type = mime_type.split("/")[1]
                else:
                    simplified_type = "unknown"
                    
            extra_info = ""

            sql = ("INSERT INTO info (name, file_type, file_size, modification_date, extra_info, folder) "
                   "VALUES (%s, %s, %s, %s, %s, %s)")
            values = (filename, simplified_type, file_size, formatted_date, extra_info, folder)

            try:
                cursor.execute(sql, values)
                conn.commit()
                print(f"'{filename}' aus '{folder}' erfolgreich in DB eingetragen.")
            except Exception as e:
                print(f"Fehler beim Einfügen von '{filename}' in Ordner '{folder}': {e}")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    for folder in ALLOWED_FOLDERS:
        print(f"Scanne Ordner: {folder}")
        scan_and_insert(folder)

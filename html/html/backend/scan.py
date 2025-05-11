#!/usr/bin/env python3
import os
import mimetypes
import mysql.connector
import logging
from datetime import datetime
from zoneinfo import ZoneInfo  # Ab Python 3.9+

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# MySQL-Konfiguration – passe hier bitte dein Root-Passwort an!
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'THG18thg18',
    'database': 'uploads'
}

NAS_BASE_PATH = '/mnt/nas'
LOCAL_TIMEZONE = ZoneInfo("Europe/Berlin")

# Erweiterte MIME-Mapping: MIME-Typ => vereinfachte Endung
mime_mapping = {
    "text/plain": "txt",
    "text/csv": "csv",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "audio/mpeg": "mpeg"
}

def sync_scan():
    try:
        conn = mysql.connector.connect(**db_config)
    except mysql.connector.Error as err:
        logging.error(f"Verbindung zu MySQL fehlgeschlagen: {err}")
        return

    cursor = conn.cursor(dictionary=True)

    # Erfassung der existierenden Ordner im NAS
    try:
        nas_folders = {entry for entry in os.listdir(NAS_BASE_PATH) if os.path.isdir(os.path.join(NAS_BASE_PATH, entry))}
    except Exception as e:
        logging.error(f"Fehler beim Auflisten des NAS-Verzeichnisses: {e}")
        conn.close()
        return

    allowed_folders = list(nas_folders)

    # Alle in der Datenbank vorhandenen Ordner abrufen
    try:
        cursor.execute("SELECT DISTINCT folder FROM info")
        db_folders = {row['folder'] for row in cursor.fetchall()}
    except Exception as e:
        logging.error(f"Fehler bei der Abfrage der vorhandenen Ordner in der DB: {e}")
        conn.close()
        return

    # Ordner, die in der DB stehen, aber nicht im Dateisystem existieren, ermitteln und löschen
    missing_folders = db_folders - nas_folders
    if missing_folders:
        format_strings = ','.join(['%s'] * len(missing_folders))
        delete_query = f"DELETE FROM info WHERE folder IN ({format_strings})"
        try:
            cursor.execute(delete_query, tuple(missing_folders))
            conn.commit()
            logging.info(f"Gelöschte Einträge für nicht vorhandene Ordner: {missing_folders}")
        except Exception as e:
            logging.error(f"Fehler beim Löschen von Einträgen nicht vorhandener Ordner: {e}")

    # 1. Lade alle bestehenden Einträge aus den erlaubten Ordnern
    db_files = {}
    if allowed_folders:
        format_strings = ','.join(['%s'] * len(allowed_folders))
        query = f"SELECT id, name, file_size, modification_date, file_type, folder FROM info WHERE folder IN ({format_strings})"
        try:
            cursor.execute(query, tuple(allowed_folders))
        except Exception as e:
            logging.error(f"Fehler bei der Datenbankabfrage: {e}")
            conn.close()
            return
        for row in cursor.fetchall():
            key = (row['folder'], row['name'])
            db_files[key] = row

    # 2. Dateisystem-Scan: Dateien aus allen erlaubten Ordnern erfassen
    fs_files = {}
    for folder in allowed_folders:
        folder_path = os.path.join(NAS_BASE_PATH, folder)
        if not os.path.exists(folder_path):
            logging.warning(f"Ordner '{folder_path}' existiert nicht.")
            continue

        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                file_size = os.path.getsize(file_path)
                mod_timestamp = os.path.getmtime(file_path)
                mod_date_local = datetime.fromtimestamp(mod_timestamp, tz=LOCAL_TIMEZONE)
                formatted_date = mod_date_local.strftime("%Y-%m-%d %H:%M:%S")
                mime_type, _ = mimetypes.guess_type(file_path)
                if mime_type in mime_mapping:
                    simplified_type = mime_mapping[mime_type]
                else:
                    if mime_type and "/" in mime_type:
                        simplified_type = mime_type.split("/")[1]
                    else:
                        simplified_type = "unknown"

                fs_files[(folder, filename)] = {
                    'file_size': file_size,
                    'modification_date': formatted_date,
                    'file_type': simplified_type
                }

    # 3. Vergleich und Synchronisation

    # 3.1: Aktualisieren oder Einfügen neuer Dateien
    for key, fs_info in fs_files.items():
        if key in db_files:
            db_record = db_files[key]
            if (db_record['file_size'] != fs_info['file_size'] or
                db_record['modification_date'] != fs_info['modification_date'] or
                db_record['file_type'] != fs_info['file_type']):
                update_sql = """
                    UPDATE info
                    SET file_size = %s, modification_date = %s, file_type = %s
                    WHERE id = %s
                """
                update_values = (fs_info['file_size'], fs_info['modification_date'], fs_info['file_type'], db_record['id'])
                try:
                    cursor.execute(update_sql, update_values)
                    logging.info(f"Updated '{key[1]}' in folder '{key[0]}'.")
                except Exception as e:
                    logging.error(f"Fehler beim Aktualisieren von '{key[1]}': {e}")
        else:
            insert_sql = """
                INSERT INTO info (name, file_type, file_size, modification_date, extra_info, folder)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            values = (key[1], fs_info['file_type'], fs_info['file_size'], fs_info['modification_date'], "", key[0])
            try:
                cursor.execute(insert_sql, values)
                logging.info(f"Inserted '{key[1]}' in folder '{key[0]}'.")
            except Exception as e:
                logging.error(f"Fehler beim Einfügen von '{key[1]}': {e}")

    # 3.2: Lösche in der DB Einträge, die im Dateisystem fehlen
    for key, db_record in db_files.items():
        if key not in fs_files:
            delete_sql = "DELETE FROM info WHERE id = %s"
            try:
                cursor.execute(delete_sql, (db_record['id'],))
                logging.info(f"Deleted '{key[1]}' from folder '{key[0]}'.")
            except Exception as e:
                logging.error(f"Fehler beim Löschen von '{key[1]}': {e}")

    conn.commit()
    cursor.close()
    conn.close()

if __name__ == '__main__':
    sync_scan()

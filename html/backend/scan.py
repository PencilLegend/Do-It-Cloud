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
    'password': 'password',
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
    "audio/mpeg": "mpeg",
    "text/x-php": "php",
    "application/x-php": "php",
    "application/x-httpd-php": "php",
    "application/php": "php",
    "text/php": "php"
}

def get_file_type(file_path):
    # Zuerst nach Erweiterung versuchen
    ext = os.path.splitext(file_path)[1].lower().lstrip('.')
    if ext in mime_mapping.values():
        return ext

    # Dann nach MIME-Typ versuchen
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type:
        if mime_type in mime_mapping:
            return mime_mapping[mime_type]
        elif "/" in mime_type:
            return mime_type.split("/")[1]
    
    # Wenn keine Erweiterung und kein MIME-Typ, versuche den Datei-Befehl
    try:
        import magic
        file_type = magic.from_file(file_path, mime=True)
        if file_type in mime_mapping:
            return mime_mapping[file_type]
        elif "/" in file_type:
            return file_type.split("/")[1]
    except ImportError:
        pass

    return "unknown"

def sync_scan():
    try:
        conn = mysql.connector.connect(**db_config)
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
        for root, dirs, files in os.walk(NAS_BASE_PATH):
            # Relative Pfad von NAS_BASE_PATH erhalten
            rel_path = os.path.relpath(root, NAS_BASE_PATH)
            if rel_path == '.':
                rel_path = ''

            for filename in files:
                file_path = os.path.join(root, filename)
                if os.path.isfile(file_path):
                    try:
                        file_size = os.path.getsize(file_path)
                        mod_timestamp = os.path.getmtime(file_path)
                        mod_date_local = datetime.fromtimestamp(mod_timestamp, tz=LOCAL_TIMEZONE)
                        formatted_date = mod_date_local.strftime("%Y-%m-%d %H:%M:%S")
                        
                        # Verbesserte Dateityp-Erkennung verwenden
                        file_type = get_file_type(file_path)

                        fs_files[(rel_path, filename)] = {
                            'file_size': file_size,
                            'modification_date': formatted_date,
                            'file_type': file_type
                        }
                    except (OSError, IOError) as e:
                        logging.error(f"Fehler beim Zugreifen auf die Datei {file_path}: {e}")
                        continue

        # 3. Vergleich und Synchronisation

        # 3.1: Aktualisieren oder Einfügen neuer Dateien
        for key, fs_info in fs_files.items():
            folder_path, filename = key
            if key in db_files:
                db_record = db_files[key]
                if (db_record['file_size'] != fs_info['file_size'] or
                    db_record['modification_date'] != fs_info['modification_date'] or
                    db_record['file_type'] != fs_info['file_type']):
                    cursor.execute("""
                        UPDATE info
                        SET file_size = %s, modification_date = %s, file_type = %s
                        WHERE id = %s
                    """, (fs_info['file_size'], fs_info['modification_date'], 
                         fs_info['file_type'], db_record['id']))
                    logging.info(f"Updated '{filename}' in folder '{folder_path}' (type: {fs_info['file_type']})")
            else:
                cursor.execute("""
                    INSERT INTO info (name, file_type, file_size, modification_date, 
                                    extra_info, folder)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (filename, fs_info['file_type'], fs_info['file_size'],
                     fs_info['modification_date'], "", folder_path))
                logging.info(f"Inserted '{filename}' in folder '{folder_path}'")

        # 3.2: Lösche in der DB Einträge, die im Dateisystem fehlen
        for key, db_record in db_files.items():
            if key not in fs_files:
                cursor.execute("DELETE FROM info WHERE id = %s", (db_record['id'],))
                logging.info(f"Deleted record for '{key[1]}' from folder '{key[0]}'")

        conn.commit()
        cursor.close()
        conn.close()
        logging.info("Scan erfolgreich abgeschlossen")

    except mysql.connector.Error as e:
        logging.error(f"Datenbankfehler: {e}")
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
    except Exception as e:
        logging.error(f"Unerwarteter Fehler während des Scans: {e}")
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    sync_scan()

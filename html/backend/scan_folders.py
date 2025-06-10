#!/usr/bin/env python3
import os
import mysql.connector
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password',
    'database': 'uploads'
}

NAS_BASE_PATH = '/mnt/nas'
LOCAL_TIMEZONE = ZoneInfo("Europe/Berlin")

def sync_folder_scan():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Create folders table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                path VARCHAR(512) NOT NULL,
                size BIGINT NOT NULL DEFAULT 0,
                file_count INT NOT NULL DEFAULT 0,
                modification_date DATETIME,
                parent_folder VARCHAR(255),
                depth INT NOT NULL DEFAULT 0,
                UNIQUE KEY unique_path (path)
            )
        """)
        conn.commit()

        # Scan all folders
        folders_data = []
        for root, dirs, files in os.walk(NAS_BASE_PATH):
            for dir_name in dirs:
                full_path = os.path.join(root, dir_name)
                rel_path = os.path.relpath(full_path, NAS_BASE_PATH)
                parent_folder = os.path.relpath(root, NAS_BASE_PATH) if root != NAS_BASE_PATH else ''
                depth = len(rel_path.split(os.sep))
                
                # Calculate folder size and file count
                total_size = 0
                file_count = 0
                for r, d, f in os.walk(full_path):
                    for file in f:
                        file_path = os.path.join(r, file)
                        try:
                            total_size += os.path.getsize(file_path)
                            file_count += 1
                        except OSError:
                            continue

                mod_timestamp = os.path.getmtime(full_path)
                mod_date_local = datetime.fromtimestamp(mod_timestamp, tz=LOCAL_TIMEZONE)
                formatted_date = mod_date_local.strftime("%Y-%m-%d %H:%M:%S")

                folders_data.append({
                    'name': dir_name,
                    'path': rel_path,
                    'size': total_size,
                    'file_count': file_count,
                    'modification_date': formatted_date,
                    'parent_folder': parent_folder,
                    'depth': depth
                })

        # Update database
        for folder in folders_data:
            cursor.execute("""
                INSERT INTO folders (name, path, size, file_count, modification_date, parent_folder, depth)
                VALUES (%(name)s, %(path)s, %(size)s, %(file_count)s, %(modification_date)s, %(parent_folder)s, %(depth)s)
                ON DUPLICATE KEY UPDATE
                    size = VALUES(size),
                    file_count = VALUES(file_count),
                    modification_date = VALUES(modification_date),
                    parent_folder = VALUES(parent_folder),
                    depth = VALUES(depth)
            """, folder)

        # Remove entries for folders that no longer exist
        existing_paths = [f['path'] for f in folders_data]
        if existing_paths:
            format_strings = ','.join(['%s'] * len(existing_paths))
            cursor.execute(f"DELETE FROM folders WHERE path NOT IN ({format_strings})", existing_paths)

        conn.commit()
        cursor.close()
        conn.close()
        logging.info("Folder scan completed successfully")

    except Exception as e:
        logging.error(f"Error during folder scan: {e}")
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    sync_folder_scan()

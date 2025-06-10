# Do-It-Cloud
a super light weight super minimal selfhosted open source nas web application. store and organize your files with Do-It-Cloud






Note: This whole project is just me having fun with ai and creating something i might use oneday because i like selfmade stuff. Currently this is just some code for a website (u could call it cloud)

Sorry that the guide is partially in german, its just some pasted notes, i will translate it along the way, currently you need some coding knowledge to get this to work in your infrastructure




Guide:


storage folder:      (using a nas is also explained later) 
mkdir var/www/html/Uploads  (if you want to use a different folder you need to change this path in every file that uses it)


Apache user configuration:

sudo chown -R www-data:www-data /var/www/html/uploads   (skip if using a nas)
sudo chmod -R 755 /var/www/html/uploads

using samba nas:
sudo apt install cifs-utils

sudo mkdir -p /mnt/nas_storage
###
sudo mount -t cifs //NAS-IP/shared-folder  /mnt/nas_uploads -o    
username=yourusername,password=yourpassword,uid=www-data,gid=www-data
### nur für einmalige benutzung

für durchgängige benutzung:
nano /etc/fstab 
folgendes eintragen:

//NAS-IP/Freigabe  /mnt/nas_uploads  cifs  username=deinBenutzer,password=deinPasswort,uid=root,gid=www-data,file_mode=0770,dir_mode=0770,_netdev 0 0
Empfehlung: gid=www-data abändern zu einer manuellen Gruppe für nas Access. (_netdev stellt sicher dass der nas im Netzwerk ist bevor versucht wird zu mounten)

sudo apt install php libapache2-mod-php
sudo systemctl restart apache2

in php.ini anpassen (speicherort hängt von php, Linux und Apache Versionen ab):

upload_max_filesize = 512M
post_max_size = 512M

NAS configuration:

apt install samba

Änderung /etc/samga/smb.conf ungefähr so:

[shared]
   path = /mnt/smb
   read only = no
   browsable = yes
   force group = nogroup
   force user = user1
   guest ok = yes
   create mask = 0777
   directory mask = 0777

systemctl Restart smbd





MySQL configuration:
apt install pip
pip install mysql-connector-python
pip install flask pillow


sudo apt-get update
sudo apt-get install php-mysql


sudo apt-get update
sudo apt-get install mysql-server
sudo mysql_secure_installation


mysql -u root -p

creat


CREATE DATABASE IF NOT EXISTS uploads;
USE uploads;
CREATE TABLE IF NOT EXISTS info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  modification_date DATETIME NOT NULL,
  extra_info TEXT,
  folder VARCHAR(50) NOT NULL
);


USE uploads
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














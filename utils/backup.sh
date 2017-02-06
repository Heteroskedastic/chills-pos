#!/bin/bash

NAME="chills_pos"
ROOTDIR=/opt/webapps
PROJECTDIR=$ROOTDIR/$NAME
DJANGODIR=$PROJECTDIR/$NAME
ENVDIR=$PROJECTDIR/env
DJANGO_SETTINGS_MODULE=chills_pos.settings.prod
BACKUP_DIR=$PROJECTDIR/backup/`date +"%Y-%m-%d-%H-%M-%S"`.$RANDOM

echo "+++ Backing up $NAME to $BACKUP_DIR ..."
source $ENVDIR/bin/activate
cd $DJANGODIR/chills_pos

mkdir -p $BACKUP_DIR

python manage.py dbbackup -z -O $BACKUP_DIR/db.zip --settings=$DJANGO_SETTINGS_MODULE --noinput
python manage.py mediabackup -z -O $BACKUP_DIR/media.zip --settings=$DJANGO_SETTINGS_MODULE --noinput

echo
echo "Finished Backup!"

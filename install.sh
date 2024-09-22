#!/usr/bin/env bash
mkdir ~/.local/share/gnome-shell/extensions/twingate-status@eudes.es
cp -R icons/ extension.js metadata.json stylesheet.css LICENSE ~/.local/share/gnome-shell/extensions/twingate-status@eudes.es/
echo 'Run the following inside the new shell if not already enabled'
echo 'gnome-extensions enable twingate-status@eudes.es'
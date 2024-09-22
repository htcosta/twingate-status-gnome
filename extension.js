import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';


export default class IndicatorExampleExtension extends Extension {
    enable() {
        this._indicator = new SocketIconSwitcher();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.stop();
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

const SocketIconSwitcher = GObject.registerClass(
    class SocketIconSwitcher extends PanelMenu.Button {
        constructor() {
            super(0.0, 'Socket Icon Switcher');

            this._socketPath = '/run/twingate/auth.sock';
            this._iconNameOn = 'twingate_on';
            this._iconNameOff = 'twingate_off';
            this._fastPollInterval = 1000;
            this._slowPollInterval = 10000;

            this._connected = false;

            this.icon = new St.Icon({ style_class: this._iconNameOff });
            this.add_child(this.icon);

            this._menuItem = new PopupMenu.PopupMenuItem('Disconnected');
            this.menu.addMenuItem(this._menuItem);

            this._menuConnectionHandle = this._menuItem.connect('activate', () => {
                this._handleMenuItemClick();
            });

            this._addFileWatch(this._slowPollInterval);
        }

        _setIconState() {
            if (this._connected === true) {
                this.icon.style_class = this._iconNameOn;
                this._menuItem.label.text = 'Connected';
            } else {
                this.icon.style_class = this._iconNameOff;
                this._menuItem.label.text = 'Disconnected';
            }
        }

        _handleMenuItemClick() {
            this._removeFileWatch();
            this._addFileWatch(this._fastPollInterval, () => {
                this._removeFileWatch();
                this._addFileWatch(this._slowPollInterval);
            })

            if (this._connected === true) {
                GLib.spawn_command_line_async('systemctl stop twingate');
                GLib.spawn_command_line_async('systemctl stop --user twingate-desktop-notifier');
            } else {
                GLib.spawn_command_line_async('systemctl start twingate');
                GLib.spawn_command_line_async('systemctl start --user twingate-desktop-notifier');
            }
        }

        _addFileWatch(pollInterval, onChange) {
            this._pollerTimeoutHandle = GLib.timeout_add(GLib.PRIORITY_DEFAULT, pollInterval, () => {
                if (GLib.file_test(this._socketPath, GLib.FileTest.EXISTS)) {
                    if(!this._connected) {
                        this._connected = true;
                        this._setIconState();
                        if(onChange) onChange();
                    }
                } else {
                    if(this._connected){
                        this._connected = false;
                        this._setIconState();
                        if(onChange) onChange();
                    }
                }
                return GLib.SOURCE_CONTINUE;
            });
        }

        _removeFileWatch() {
            if (this._pollerTimeoutHandle) {
                GLib.Source.remove(this._pollerTimeoutHandle);
                this._pollerTimeoutHandle = null;
            }
        }

        stop() {
            if (this._menuItem && this._menuConnectionHandle) {
                this._menuItem.disconnect(this._menuConnectionHandle);
            }

            this.icon?.destroy();
            this.icon = null;

            this._menuItem?.destroy();
            this._menuItem = null;

            this._menuConnectionHandle = null;
            this._removeFileWatch();
        }

    }
);

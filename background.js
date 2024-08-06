/*
 * Copyright (C) 2024 Lodestone Services LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// Constant Variables
const __HOSTNAME__ = "https://halopl.us";
const __HEADER_ELEMENT__ = "#header_main_container > header > div";
const __LOGIN__ = `${__HOSTNAME__}/login`;

document.addEventListener("DOMContentLoaded", async () => {
  var _i = setInterval(() => {
    const parentNode = document.querySelector(__HEADER_ELEMENT__);
    if (parentNode == null) return;

    clearInterval(_i);

    var port = chrome.runtime.connect({ name: "auth_session" });

    port.onMessage.addListener(({ auth_session }) => {
      const element = registerHaloButton(
        parentNode,
        `<div class="MessagesButton_headerIconContainer__E34Wc"><button class="MuiButtonBase-root MuiIconButton-root MessagesButton_buttonWithoutCount__AR23S" tabindex="0" type="button" role="link" aria-label="Halo+ Main Button" style="width: 11rem; margin-left: 20px;"><span class="MuiIconButton-label"><p class="font-display-regular text-white text-sm ml-4 font-semibold leading-tight uppercase" style="margin: 0;"><span class="xxs:hidden sm:inline" id="halo_plus_span">${
          !!auth_session ? "Sync to Halo+" : "Login to Halo+"
        }</span></p></span><span class="MuiTouchRipple-root"></span></button></div>`,
      );

      element.addEventListener("click", () => {
        if (!!auth_session) {
          var port2 = chrome.runtime.connect({ name: "send_cookies" });

          port2.onMessage.addListener(({ success }) => {
            alert(
              success
                ? "Synced your cookies to Halo+"
                : "Your cookies have been synced to Halo+ already!\nFrom now on, Halo+ is automatically refreshing your cookies so you don't have to do anything!\n\nTIP: You only need to check back to sync your cookies if the app tells you to!",
            );
          });

          port2.postMessage({});
        } else {
          window.open(__LOGIN__, "_self");
        }
      });
    });

    port.postMessage({});
  }, 500);
});

// https://stackoverflow.com/a/10309703
function registerHaloButton(parent, str) {
  var div = document.createElement("div");
  div.innerHTML = str;
  // Find Messages
  var beforeNode,
    index = 0;
  for (var node of parent.children) {
    if (node.innerText.includes("MESSAGES")) {
      beforeNode = parent.children[(index += 1)];
      break;
    }
    index++;
  }
  while (div.children.length > 0) {
    return parent.insertBefore(div.children[0], beforeNode);
  }
}

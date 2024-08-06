/*
 * Copyright (C) 2024 John Aquino
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
const __DOMAINNAME__ = "https://webapi-elzoglb7jq-uc.a.run.app";
const __HOSTNAME__ = "https://halopl.us";
const __LOCAL_DB__ = chrome.storage.sync;
const __API__ = `${__DOMAINNAME__}/api`;
const __VERSION__ = chrome.runtime.getManifest().version;

const isCookieValid = (obj) => {
  return (
    obj?.hasOwnProperty("TE1TX0FVVEg") || obj?.hasOwnProperty("TE1TX0NPTlRFWFQ")
  );
};

const getCookies = async (url = "https://halo.gcu.edu") => {
  try {
    console.log("Getting cookies");
    const cookies = await chrome.cookies.getAll({ url });
    console.log("Cookies fetched:", cookies);

    // Ensure cookies is an array before calling reduce
    if (Array.isArray(cookies)) {
      const cookieData = cookies.reduce((acc, { name, value }) => {
        acc[name] = value;
        return acc;
      }, {});
      console.log("Reduced cookie data:", cookieData);
      return cookieData;
    } else {
      console.error("Expected an array of cookies, but got:", cookies);
      return {};
    }
  } catch (e) {
    console.error("Error getting cookies:", e);
    return {};
  }
};

const pushCookiesToDatabase = async ({ cookie, auth_session }) => {
  // Send data to API so we can automate checking intervals.
  console.log("auth: " + cookie["TE1TX0FVVEg"]);
  console.log("context: " + cookie["TE1TX0NPTlRFWFQ"]);
  console.log("csrf: " + cookie["__Host-next-auth.csrf-token"]);
  return await fetch(
    `${__API__}/users/${auth_session}/update?auth_token=${cookie["TE1TX0FVVEg"]}&context_token=${cookie["TE1TX0NPTlRFWFQ"]}&csrf_token=${cookie["__Host-next-auth.csrf-token"]}`,
    {
      method: "POST",
    },
  )
    .then(() => true)
    .catch((err) => {
      console.log(err);
      return false;
    });
};

async function syncCookiesToDatabase() {
  try {
    const { TE1TX0FVVEg, TE1TX0NPTlRFWFQ, csrf } = await __LOCAL_DB__.get([
      "TE1TX0FVVEg",
      "TE1TX0NPTlRFWFQ",
      "__Host-next-auth.csrf-token",
    ]);
    console.log("TE1TX0FVVEg: " + TE1TX0FVVEg);
    console.log("TE1TX0NPTlRFWFQ: " + TE1TX0NPTlRFWFQ);
    console.log("csrf: " + csrf);

    const cookies = await getCookies(__HOSTNAME__);
    const auth_session = cookies["auth_session"];

    if (TE1TX0FVVEg && TE1TX0NPTlRFWFQ && csrf) {
      const success = await pushCookiesToDatabase({
        cookie: {
          TE1TX0FVVEg,
          TE1TX0NPTlRFWFQ,
          csrf,
        },
        auth_session,
      });

      console.log(
        success
          ? "[Halo+] Updated cookie to database."
          : "[Halo+] Failed to update cookie to database.",
      );
      return success;
    }

    return false;
  } catch (error) {
    console.error("Error syncing cookies to database:", error);
    return false;
  }
}

(async () => {
  console.log(`[Halo+] ${chrome.runtime.getManifest().name} v${__VERSION__}`);

  chrome.runtime.onConnect.addListener(async (port) => {
    if (port.name === "auth_session") {
      console.log("[Halo+] Received auth_session request");
      const cookies = await getCookies(__HOSTNAME__);
      const auth_session = cookies["auth_session"];
      console.log("auth_session: " + auth_session);

      if (!auth_session) {
        console.log("[Halo+] User doesn't have cookie");
        return port.postMessage({ auth_session: null });
      }
      console.log("[Halo+] User has cookie");

      const isAuthenticated = await fetch(
        `${__API__}/users/${auth_session}/validate`,
        {
          method: "GET",
          headers: {
            accept: "*/*",
            "content-type": "application/json",
          },
        },
      )
        .then((res) => res.status === 200)
        .catch(() => false);

      if (!isAuthenticated) {
        console.log("[Halo+] User is not authorized");
        return port.postMessage({ auth_session: null });
      }

      return port.postMessage({ auth_session });
    } else if (port.name === "send_cookies") {
      const cookies = await getCookies();
      const { TE1TX0FVVEg, TE1TX0NPTlRFWFQ } = cookies;
      const csrf = cookies["__Host-next-auth.csrf-token"];
      console.log("TE1TX0FVVEg: " + TE1TX0FVVEg);
      console.log("TE1TX0NPTlRFWFQ: " + TE1TX0NPTlRFWFQ);
      console.log("csrf: " + csrf);

      const { last_updated } = await __LOCAL_DB__.get("last_updated");
      if (last_updated && Date.now() - last_updated < 3600000) {
        console.log("[Halo+] User is on cooldown!");
        return port.postMessage({ success: false });
      }

      await __LOCAL_DB__.set({ last_updated: Date.now() });

      const { TE1TX0FVVEg: stored_auth_token } =
        await __LOCAL_DB__.get("TE1TX0FVVEg");
      if (stored_auth_token !== TE1TX0FVVEg)
        await __LOCAL_DB__.set({ TE1TX0FVVEg });

      const { TE1TX0NPTlRFWFQ: stored_context_token } =
        await __LOCAL_DB__.get("TE1TX0NPTlRFWFQ");
      if (stored_context_token !== TE1TX0NPTlRFWFQ)
        await __LOCAL_DB__.set({ TE1TX0NPTlRFWFQ });

      const { csrf: stored_csrf_token } = await __LOCAL_DB__.get("csrf");
      if (stored_csrf_token !== csrf) await __LOCAL_DB__.set({ csrf });

      return port.postMessage({ success: await syncCookiesToDatabase() });
    }
  });

  chrome.cookies.onChanged.addListener(async ({ cookie }) => {
    if (!cookie || !Object.keys(cookie).length)
      return console.log(
        "[Halo+] Cookie object was determined to be invalid. Skipping process.",
      );

    if (cookie.domain === "halo.gcu.edu") {
      const stored_cookie = await __LOCAL_DB__.get(cookie.name);
      if (stored_cookie[cookie.name] !== cookie.value) {
        // Check if the value actually updated.
        await __LOCAL_DB__.set({ [cookie.name]: cookie.value });
        await syncCookiesToDatabase();
      }
    }
  });
})();

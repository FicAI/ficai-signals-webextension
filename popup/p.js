"use strict";

const CookieNameAndUrl = {
  name: 'FicAiSession',
  // even when the server has a custom port, this string shouldn't specify it
  url: 'https://localhost/',
};

const loginform = document.getElementById('loginform');
const logoutform = document.getElementById('logoutform');
const list = document.getElementById('list');
const newform = document.getElementById('new');

let tabUrl;

async function loadData() {
  const tabs = await browser.tabs.query({currentWindow: true, active: true});
  const tab = tabs.find(tab => tab.url !== undefined);
  if (!tab) {
    throw 'active tab not found';
  }
  console.debug('working on', tab.url);
  tabUrl = tab.url;

  const url = new URL("http://localhost:8080/v1/signals");
  url.searchParams.append('url', tab.url);

  const response = await fetch(url.href, {credentials: 'include'});
  if (!response.ok) {
    // todo: show this in UI
    throw 'failed to load data';
  }
  return await response.json();
}

async function patch(q) {
  const res = await fetch("http://localhost:8080/v1/signals", {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: tabUrl,
      ...q
    })
  });
  if (!res.ok) {
    console.error(res);
    // todo: show this in UI
    throw 'failed to patch';
  }
}

function renderTag(tag) {
  const container = document.createElement('form');
  container.classList.add('tag');
  container.innerHTML = `<span class="tagName"></span>
<span class="sigForContainer">for <span class="sigFor"></span></span>
<span class="sigAgainstContainer">against <span class="sigAgainst"></span></span>
`;

  for (const e of container.getElementsByClassName('tagName')) {
    e.innerText = tag.tag;
  }
  for (const e of container.getElementsByClassName('sigFor')) {
    e.innerText = tag.signalsFor;
  }
  for (const e of container.getElementsByClassName('sigAgainst')) {
    e.innerText = tag.signalsAgainst;
  }
  container.dataset.signal = '' + tag.signal;

  for (const e of container.getElementsByClassName('sigForContainer')) {
    e.addEventListener('click', () => {
      patch({add: [tag.tag]}).then(reload);
    });
  }
  for (const e of container.getElementsByClassName('sigAgainstContainer')) {
    e.addEventListener('click', () => {
      patch({rm: [tag.tag]}).then(reload);
    });
  }

  return container;
}

function render(data) {
  data.tags
    .map(renderTag)
    .forEach(tag => list.append(tag));
}

function reload() {
  list.innerHTML = '';
  loadData().then(render);
}

function add() {
  patch({add: [newform.tag.value]}).then(reload);
}

function onLoggedIn() {
  document.body.classList.add('loggedin');
  reload();
}

function onLoggedOut() {
  document.body.classList.remove('loggedin');
}

async function logIn() {
  const res = await fetch("http://localhost:8080/v1/sessions", {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: loginform.email.value,
      password: loginform.password.value,
    })
  });
  if (!res.ok) {
    console.error(res);
    // todo: show this in UI
    throw 'failed to logIn';
  }
  onLoggedIn();
}

function logOut() {
  // todo: actually logout from the server to prevent too many dangling sessions
  browser.cookies.remove(CookieNameAndUrl).then(
    onLoggedOut,
    failure => console.error("Failed to remove session cookie", failure)
  );
}

loginform.btn.addEventListener('click', logIn);
logoutform.btn.addEventListener('click', logOut);
newform.btn.addEventListener('click', add);

browser.cookies.get(CookieNameAndUrl).then(
  cookie => {
    if (cookie) {
      onLoggedIn();
    }
  },
  f => console.error("Failed to check cookie", f)
);

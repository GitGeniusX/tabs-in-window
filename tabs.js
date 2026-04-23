const managerUrl = chrome.runtime.getURL("tabs.html");

const elements = {
  searchInput: document.querySelector("#searchInput"),
  pinFilter: document.querySelector("#pinFilter"),
  sortOrder: document.querySelector("#sortOrder"),
  summaryText: document.querySelector("#summaryText"),
  emptyState: document.querySelector("#emptyState"),
  tabGrid: document.querySelector("#tabGrid")
};

let allTabs = [];
let refreshTimer = null;

function normalizeText(value) {
  return (value ?? "").toLowerCase();
}

function getHostname(url) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol === "chrome:" || parsedUrl.protocol === "edge:") {
      return parsedUrl.href;
    }

    if (parsedUrl.protocol === "chrome-extension:") {
      return "Extension page";
    }

    return parsedUrl.hostname.replace(/^www\./, "") || parsedUrl.href;
  } catch {
    return url || "Untitled";
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return "Last accessed recently";
  }

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (elapsedSeconds < 60) {
    return "Active moments ago";
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `Active ${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `Active ${elapsedHours}h ago`;
  }

  const elapsedDays = Math.round(elapsedHours / 24);
  return `Active ${elapsedDays}d ago`;
}

function matchesFilters(tab, searchTerm, pinFilter) {
  if (pinFilter === "pinned" && !tab.pinned) {
    return false;
  }

  if (pinFilter === "unpinned" && tab.pinned) {
    return false;
  }

  if (!searchTerm) {
    return true;
  }

  const haystack = `${normalizeText(tab.title)} ${normalizeText(tab.url)}`;
  return haystack.includes(searchTerm);
}

function sortTabs(tabs, sortOrder) {
  const nextTabs = [...tabs];

  if (sortOrder === "index") {
    return nextTabs.sort((left, right) => left.index - right.index);
  }

  if (sortOrder === "title") {
    return nextTabs.sort((left, right) => {
      const leftTitle = normalizeText(left.title);
      const rightTitle = normalizeText(right.title);

      if (leftTitle === rightTitle) {
        return left.index - right.index;
      }

      return leftTitle.localeCompare(rightTitle);
    });
  }

  return nextTabs.sort((left, right) => {
    const leftLastAccessed = left.lastAccessed ?? 0;
    const rightLastAccessed = right.lastAccessed ?? 0;

    if (leftLastAccessed === rightLastAccessed) {
      return left.index - right.index;
    }

    return rightLastAccessed - leftLastAccessed;
  });
}

function updateSummary(visibleTabs, totalTabs) {
  const pinnedTabs = visibleTabs.filter((tab) => tab.pinned).length;
  const summary =
    visibleTabs.length === totalTabs
      ? `${totalTabs} tabs in this window`
      : `Showing ${visibleTabs.length} of ${totalTabs} tabs`;

  const pinnedSummary =
    pinnedTabs === 0 ? "No pinned tabs in view" : `${pinnedTabs} pinned tab${pinnedTabs === 1 ? "" : "s"}`;

  elements.summaryText.textContent = `${summary} - ${pinnedSummary}`;
}

async function activateTab(tabId, windowId) {
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });
}

async function closeTab(tabId) {
  await chrome.tabs.remove(tabId);
}

function createFavicon(tab) {
  const favicon = document.createElement("span");
  favicon.className = "tab-card__favicon";

  if (tab.favIconUrl) {
    const image = document.createElement("img");
    image.src = tab.favIconUrl;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.addEventListener(
      "error",
      () => {
        favicon.textContent = (tab.title || tab.url || "T").trim().charAt(0) || "T";
      },
      { once: true }
    );
    favicon.append(image);
    return favicon;
  }

  favicon.textContent = (tab.title || tab.url || "T").trim().charAt(0) || "T";
  return favicon;
}

function createTabCard(tab) {
  const card = document.createElement("article");
  card.className = "tab-card";
  card.dataset.active = String(Boolean(tab.active));
  card.tabIndex = 0;

  card.addEventListener("click", () => {
    activateTab(tab.id, tab.windowId).catch(console.error);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    activateTab(tab.id, tab.windowId).catch(console.error);
  });

  const top = document.createElement("div");
  top.className = "tab-card__top";

  const identity = document.createElement("div");
  identity.className = "tab-card__identity";

  const titleWrap = document.createElement("div");
  titleWrap.className = "tab-card__title-wrap";

  const title = document.createElement("h2");
  title.className = "tab-card__title";
  title.textContent = tab.title || "Untitled tab";

  const host = document.createElement("p");
  host.className = "tab-card__host";
  host.textContent = getHostname(tab.url);

  titleWrap.append(title, host);
  identity.append(createFavicon(tab), titleWrap);

  const closeButton = document.createElement("button");
  closeButton.className = "tab-card__close";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeTab(tab.id).catch(console.error);
  });

  top.append(identity, closeButton);

  const meta = document.createElement("div");
  meta.className = "tab-card__meta";

  if (tab.active) {
    meta.append(createPill("Current tab", true));
  }

  if (tab.pinned) {
    meta.append(createPill("Pinned", true));
  }

  meta.append(createPill(formatRelativeTime(tab.lastAccessed), false));

  card.append(top, meta);
  return card;
}

function createPill(label, accent) {
  const pill = document.createElement("span");
  pill.className = accent ? "pill pill--accent" : "pill";
  pill.textContent = label;
  return pill;
}

function render() {
  const searchTerm = normalizeText(elements.searchInput.value.trim());
  const pinFilter = elements.pinFilter.value;
  const sortOrder = elements.sortOrder.value;

  const visibleTabs = sortTabs(
    allTabs.filter((tab) => matchesFilters(tab, searchTerm, pinFilter)),
    sortOrder
  );

  updateSummary(visibleTabs, allTabs.length);
  elements.emptyState.hidden = visibleTabs.length !== 0;
  elements.tabGrid.replaceChildren(...visibleTabs.map(createTabCard));
}

async function loadTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  allTabs = tabs.filter((tab) => !normalizeText(tab.url).startsWith(normalizeText(managerUrl)));
  render();
}

function scheduleRefresh() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    loadTabs().catch(console.error);
  }, 80);
}

elements.searchInput.addEventListener("input", render);
elements.pinFilter.addEventListener("change", render);
elements.sortOrder.addEventListener("change", render);
window.addEventListener("focus", scheduleRefresh);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    scheduleRefresh();
  }
});

chrome.tabs.onActivated.addListener(scheduleRefresh);
chrome.tabs.onAttached.addListener(scheduleRefresh);
chrome.tabs.onCreated.addListener(scheduleRefresh);
chrome.tabs.onDetached.addListener(scheduleRefresh);
chrome.tabs.onMoved.addListener(scheduleRefresh);
chrome.tabs.onRemoved.addListener(scheduleRefresh);
chrome.tabs.onUpdated.addListener(scheduleRefresh);

loadTabs().catch(console.error);

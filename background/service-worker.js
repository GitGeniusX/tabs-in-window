const managerUrl = chrome.runtime.getURL("tabs.html");

chrome.action.onClicked.addListener(async (clickedTab) => {
  try {
    if (typeof clickedTab?.windowId === "number") {
      const existingManagerTabs = await chrome.tabs.query({
        windowId: clickedTab.windowId,
        url: managerUrl
      });

      if (existingManagerTabs.length > 0) {
        const [managerTab] = existingManagerTabs.sort((left, right) => left.index - right.index);

        await chrome.tabs.update(managerTab.id, { active: true });
        await chrome.windows.update(clickedTab.windowId, { focused: true });
        return;
      }

      await chrome.tabs.create({
        windowId: clickedTab.windowId,
        url: managerUrl,
        index: clickedTab.index + 1
      });
      return;
    }

    await chrome.tabs.create({ url: managerUrl });
  } catch (error) {
    console.error("Unable to open tab grid", error);
  }
});

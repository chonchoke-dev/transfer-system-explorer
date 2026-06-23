const state = {
  manifest: null,
  familyData: [],
  groupCache: new Map(),
  groupData: null,
  selectedGroup: "D9",
  familyFilter: "All",
  loadingGroup: null,
  loadToken: 0,
  selectedTransferId: 0,
  interactionMode: "explore",
  typeFilter: "All",
  viewMode: "clean",
  overlayMode: "none",
  overlayStep: null,
  overlayTimer: null,
  focusedClassId: null,
  focusedClassEdgeId: null,
  draftClassEdgeIds: [],
  draftHistory: [],
  lastDraftAction: "Start from the trivial transfer system.",
};

const els = {
  familySelect: document.querySelector("#familySelect"),
  groupSelect: document.querySelector("#groupSelect"),
  interactionMode: document.querySelector("#interactionMode"),
  typeFilter: document.querySelector("#typeFilter"),
  viewMode: document.querySelector("#viewMode"),
  overlayMode: document.querySelector("#overlayMode"),
  sourceLine: document.querySelector("#sourceLine"),
  groupTitle: document.querySelector("#groupTitle"),
  groupMeta: document.querySelector("#groupMeta"),
  draftBar: document.querySelector("#draftBar"),
  latticeSvg: document.querySelector("#latticeSvg"),
  transferTitle: document.querySelector("#transferTitle"),
  transferMeta: document.querySelector("#transferMeta"),
  typePill: document.querySelector("#typePill"),
  summaryStats: document.querySelector("#summaryStats"),
  edgeList: document.querySelector("#edgeList"),
  edgePicker: document.querySelector("#edgePicker"),
  draftSection: document.querySelector("#draftSection"),
  draftDetail: document.querySelector("#draftDetail"),
  overlayDetail: document.querySelector("#overlayDetail"),
  failureDetail: document.querySelector("#failureDetail"),
  compatibilityDetail: document.querySelector("#compatibilityDetail"),
  nodeDetail: document.querySelector("#nodeDetail"),
  familyRows: document.querySelector("#familyRows"),
  tableMeta: document.querySelector("#tableMeta"),
  transferRows: document.querySelector("#transferRows"),
  clearFocus: document.querySelector("#clearFocus"),
  downloadCsv: document.querySelector("#downloadCsv"),
  downloadJson: document.querySelector("#downloadJson"),
};

const typeColor = {
  Bisaturated: "var(--bisat)",
  Saturated: "var(--sat)",
  Cosaturated: "var(--cosat)",
  Normal: "var(--normal)",
};

async function init() {
  state.manifest = await fetchJson("public/data/groups/manifest.json");
  state.familyData = state.manifest.groups;
  if (!state.manifest.groups.some((group) => group.label === state.selectedGroup)) {
    state.selectedGroup = state.manifest.groups[0]?.label ?? state.selectedGroup;
  }
  renderFamilySelect();
  renderGroupSelect();
  renderFamilyTable();
  await loadGroup(state.selectedGroup);
  bindEvents();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json();
}

async function loadGroup(label) {
  const token = ++state.loadToken;
  stopOverlayAnimation();
  const entry = state.manifest.groups.find((group) => group.label === label);
  if (!entry || entry.status === "pending" || !entry.dataPath) return;
  state.selectedGroup = label;
  state.loadingGroup = label;
  renderLoading(entry);
  const data = state.groupCache.get(label) ?? (await fetchJson(`public/${entry.dataPath}`));
  if (token !== state.loadToken) return;
  state.groupCache.set(label, data);
  state.groupData = data;
  state.selectedGroup = label;
  state.selectedTransferId = state.groupData.transfers[0].id;
  state.focusedClassId = null;
  state.focusedClassEdgeId = null;
  state.draftClassEdgeIds = [];
  state.draftHistory = [];
  state.lastDraftAction = "Start from the trivial transfer system.";
  state.overlayStep = null;
  state.loadingGroup = null;
  render();
}

function bindEvents() {
  els.familySelect.addEventListener("change", (event) => {
    state.familyFilter = event.target.value;
    renderGroupSelect();
    renderFamilyTable();
    const visibleGroups = filteredGroupEntries();
    const currentIsVisible = visibleGroups.some((group) => group.label === state.selectedGroup);
    const nextReadyGroup = visibleGroups.find((group) => group.status !== "pending" && group.dataPath);
    if (!currentIsVisible && nextReadyGroup) loadGroup(nextReadyGroup.label);
  });
  els.groupSelect.addEventListener("change", (event) => loadGroup(event.target.value));
  els.interactionMode.addEventListener("change", (event) => {
    state.interactionMode = event.target.value;
    if (state.interactionMode === "draft") {
      state.selectedTransferId = state.groupData.transfers[0].id;
      state.focusedClassId = null;
      state.focusedClassEdgeId = null;
    }
    render();
  });
  els.typeFilter.addEventListener("change", (event) => {
    state.typeFilter = event.target.value;
    const first = preferredTransfer(filteredTransfers());
    if (first) state.selectedTransferId = first.id;
    render();
  });
  els.viewMode.addEventListener("change", (event) => {
    state.viewMode = event.target.value;
    render();
  });
  els.overlayMode.addEventListener("change", (event) => {
    state.overlayMode = event.target.value;
    stopOverlayAnimation();
    state.overlayStep = null;
    render();
  });
  els.clearFocus.addEventListener("click", () => {
    state.focusedClassId = null;
    state.focusedClassEdgeId = null;
    els.edgePicker.value = "";
    render();
  });
  els.edgePicker.addEventListener("change", (event) => {
    state.focusedClassId = null;
    state.focusedClassEdgeId = event.target.value === "" ? null : Number(event.target.value);
    render();
  });
  els.downloadCsv.addEventListener("click", downloadCsv);
  els.downloadJson.addEventListener("click", downloadJson);
}

function renderFamilySelect() {
  const preferredFamilies = ["Dihedral", "Alternating", "Cyclic", "Quaternion", "Symmetric"];
  const manifestFamilies = [...new Set(state.manifest.groups.map((group) => group.family).filter(Boolean))];
  const families = [...new Set(["All", ...manifestFamilies, ...preferredFamilies])];
  els.familySelect.innerHTML = families
    .map((family) => {
      const label = family === "All" ? "All families" : family;
      return `<option value="${family}">${label}</option>`;
    })
    .join("");
  els.familySelect.value = state.familyFilter;
}

function filteredGroupEntries() {
  if (state.familyFilter === "All") return state.manifest.groups;
  return state.manifest.groups.filter((group) => group.family === state.familyFilter);
}

function renderGroupSelect() {
  const groups = filteredGroupEntries();
  if (!groups.length) {
    els.groupSelect.innerHTML = `<option value="" disabled selected>No ${state.familyFilter} groups yet</option>`;
    return;
  }
  els.groupSelect.innerHTML = groups
    .map((group) => {
      const disabled = group.status === "pending" || !group.dataPath ? " disabled" : "";
      const suffix = group.status === "pending" ? " (pending)" : "";
      return `<option value="${group.label}"${disabled}>${group.displayName}${suffix}</option>`;
    })
    .join("");
  if (groups.some((group) => group.label === state.selectedGroup)) {
    els.groupSelect.value = state.selectedGroup;
  }
}

function render() {
  if (!state.groupData) {
    const entry = state.manifest.groups.find((group) => group.label === state.selectedGroup);
    if (entry) renderLoading(entry);
    return;
  }
  const data = state.groupData;
  const selectedTransfer = getSelectedTransfer();
  const subsetNote =
    data.summary.computedSubset && data.summary.computedSubset !== "all"
      ? " · subset: saturated/cosaturated only"
      : "";
  els.groupTitle.textContent = data.group.displayName;
  els.groupMeta.textContent = `SmallGroup(${data.group.smallGroup.join(",")}) · order ${data.group.order}`;
  els.sourceLine.textContent = `${data.provenance.computationSource}; classifications from ${data.provenance.classificationSource}${subsetNote}`;
  renderSummary(data.summary);
  renderEdgePicker();
  renderDraftBar();
  renderLattice(selectedTransfer);
  renderTransferDetail(selectedTransfer);
  renderDraftDetail();
  renderFamilyTable();
  renderTable();
}

function renderLoading(entry) {
  els.groupSelect.value = entry.label;
  els.groupTitle.textContent = entry.displayName;
  els.groupMeta.textContent = `SmallGroup(${entry.smallGroup.join(",")}) · order ${entry.order}`;
  els.sourceLine.textContent = `Loading ${entry.displayName} data...`;
  renderSummary(entry.summary ?? {
    transferSystems: "...",
    saturated: "...",
    cosaturated: "...",
    bisaturated: "...",
    width: "...",
    complexity: "...",
  });
  els.draftBar.hidden = true;
  els.draftBar.innerHTML = "";
  els.latticeSvg.innerHTML = `<text x="50" y="50" text-anchor="middle" dominant-baseline="middle" class="loading-svg-text">Loading ${entry.displayName}...</text>`;
  els.transferTitle.textContent = "Loading";
  els.transferMeta.textContent = "Fetching group package";
  els.typePill.innerHTML = "";
  els.edgePicker.innerHTML = `<option>Loading</option>`;
  els.edgeList.innerHTML = `<div class="muted">Loading transfer systems...</div>`;
  els.draftSection.hidden = true;
  els.draftDetail.innerHTML = "";
  els.overlayDetail.innerHTML = "";
  els.failureDetail.innerHTML = "";
  els.compatibilityDetail.innerHTML = "";
  els.nodeDetail.textContent = "No node selected";
  els.tableMeta.textContent = "Loading";
  els.transferRows.innerHTML = "";
  renderFamilyTable();
}

function getSelectedTransfer() {
  const current = state.groupData.transfers.find((transfer) => transfer.id === state.selectedTransferId);
  if (current && filteredTransfers().some((transfer) => transfer.id === current.id)) return current;
  return preferredTransfer(filteredTransfers()) ?? state.groupData.transfers[0];
}

function filteredTransfers() {
  return state.groupData.transfers.filter((transfer) => {
    if (state.typeFilter === "Bisaturated" && !transfer.isBisaturated) return false;
    if (state.typeFilter === "Saturated" && !transfer.isSaturated) return false;
    if (state.typeFilter === "Cosaturated" && !transfer.isCosaturated) return false;
    if (state.typeFilter === "Normal" && transfer.type !== "Normal") return false;
    if (state.interactionMode !== "draft" && state.focusedClassId !== null) {
      return transfer.classEdges.some(
        (edge) => edge.fromClass === state.focusedClassId || edge.toClass === state.focusedClassId,
      );
    }
    if (state.interactionMode !== "draft" && state.focusedClassEdgeId !== null) {
      return transfer.classEdges.some((edge) => edge.classEdgeId === state.focusedClassEdgeId);
    }
    return true;
  });
}

function preferredTransfer(rows) {
  if (state.typeFilter === "Cosaturated") {
    return rows.find((transfer) => transfer.type === "Cosaturated" && transfer.edgeCount > 0) ?? rows[0];
  }
  if (state.typeFilter === "Saturated") {
    return rows.find((transfer) => transfer.type === "Saturated" && transfer.edgeCount > 0) ?? rows[0];
  }
  if (state.typeFilter === "Bisaturated") {
    return rows.find((transfer) => transfer.isBisaturated && transfer.edgeCount > 0) ?? rows[0];
  }
  return rows[0];
}

function focusedEdgeLabel() {
  if (state.focusedClassEdgeId === null) return null;
  return state.groupData.classEdges.find((edge) => edge.classEdgeId === state.focusedClassEdgeId)?.label ?? null;
}

function focusedEdgeStats() {
  if (state.focusedClassEdgeId === null) return null;
  const edge = state.groupData.classEdges.find((item) => item.classEdgeId === state.focusedClassEdgeId);
  if (!edge) return null;
  const contains = state.groupData.transfers.filter((transfer) =>
    transfer.classEdges.some((item) => item.classEdgeId === edge.classEdgeId),
  );
  return {
    label: edge.label,
    total: state.groupData.transfers.length,
    contains: contains.length,
    saturated: contains.filter((transfer) => transfer.isSaturated).length,
    cosaturated: contains.filter((transfer) => transfer.isCosaturated).length,
    bisaturated: contains.filter((transfer) => transfer.isBisaturated).length,
    hullAdds: state.groupData.transfers.filter((transfer) =>
      transfer.saturatedHull?.addedClassEdges?.some((item) => item.classEdgeId === edge.classEdgeId),
    ).length,
    coreRemoves: state.groupData.transfers.filter((transfer) =>
      transfer.cosaturatedCore?.removedClassEdges?.some((item) => item.classEdgeId === edge.classEdgeId),
    ).length,
  };
}

function renderSummary(summary) {
  const transferLabel =
    summary.computedSubset && summary.computedSubset !== "all" ? "Sat/Cosat Systems" : "Transfers";
  const stats = [
    [transferLabel, summary.transferSystems],
    ["Saturated", summary.saturated],
    ["Cosaturated", summary.cosaturated],
    ["Bisaturated", summary.bisaturated],
    ["Width", summary.width],
    ["Complexity", summary.complexity],
  ];
  els.summaryStats.innerHTML = stats
    .map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
}

function renderEdgePicker() {
  els.edgePicker.innerHTML = [
    `<option value="">No edge focus</option>`,
    ...state.groupData.classEdges.map((edge) => `<option value="${edge.classEdgeId}">${edge.label}</option>`),
  ].join("");
  els.edgePicker.value = state.focusedClassEdgeId === null ? "" : String(state.focusedClassEdgeId);
}

function edgeById(classEdgeId) {
  return state.groupData.classEdges.find((edge) => edge.classEdgeId === classEdgeId);
}

function transferHasClassEdge(transfer, classEdgeId) {
  return transfer.classEdges.some((edge) => edge.classEdgeId === classEdgeId);
}

function pushDraftHistory() {
  state.draftHistory = [
    ...state.draftHistory,
    {
      draftClassEdgeIds: [...state.draftClassEdgeIds],
      selectedTransferId: state.selectedTransferId,
      focusedClassId: state.focusedClassId,
      focusedClassEdgeId: state.focusedClassEdgeId,
      lastDraftAction: state.lastDraftAction,
    },
  ].slice(-30);
}

function undoDraftChange() {
  const previous = state.draftHistory[state.draftHistory.length - 1];
  if (!previous) return;
  state.draftClassEdgeIds = previous.draftClassEdgeIds;
  state.selectedTransferId = previous.selectedTransferId;
  state.focusedClassId = previous.focusedClassId;
  state.focusedClassEdgeId = previous.focusedClassEdgeId;
  state.lastDraftAction = previous.lastDraftAction;
  state.draftHistory = state.draftHistory.slice(0, -1);
}

function toggleDraftEdge(classEdgeId) {
  pushDraftHistory();
  const current = new Set(state.draftClassEdgeIds);
  if (current.has(classEdgeId)) {
    current.delete(classEdgeId);
    state.lastDraftAction = `Removed ${edgeById(classEdgeId)?.label ?? "edge"} from the draft.`;
  } else {
    current.add(classEdgeId);
    state.lastDraftAction = `Chose ${edgeById(classEdgeId)?.label ?? "edge"} directly.`;
  }
  state.draftClassEdgeIds = [...current].sort((a, b) => a - b);
}

function addFocusedEdgeToDraft() {
  if (state.focusedClassEdgeId === null) return;
  const current = new Set(state.draftClassEdgeIds);
  if (current.has(state.focusedClassEdgeId)) return;
  pushDraftHistory();
  current.add(state.focusedClassEdgeId);
  state.lastDraftAction = `Chose ${edgeById(state.focusedClassEdgeId)?.label ?? "focused edge"} directly.`;
  state.draftClassEdgeIds = [...current].sort((a, b) => a - b);
}

function clearDraft() {
  if (state.draftClassEdgeIds.length === 0) return;
  pushDraftHistory();
  state.draftClassEdgeIds = [];
  state.lastDraftAction = "Cleared chosen draft edges.";
}

function resetToTrivialTransfer() {
  const trivialTransfer = state.groupData.transfers[0];
  const alreadyTrivial =
    state.draftClassEdgeIds.length === 0 &&
    state.selectedTransferId === trivialTransfer.id &&
    state.focusedClassId === null &&
    state.focusedClassEdgeId === null;
  if (alreadyTrivial) return;
  pushDraftHistory();
  state.draftClassEdgeIds = [];
  state.selectedTransferId = trivialTransfer.id;
  state.focusedClassId = null;
  state.focusedClassEdgeId = null;
  state.lastDraftAction = "Reset to the trivial transfer system.";
}

function addRequiredEdgesToDraft(info) {
  if (!info.smallest) return;
  const nextIds = info.smallest.classEdges.map((edge) => edge.classEdgeId).sort((a, b) => a - b);
  pushDraftHistory();
  state.draftClassEdgeIds = nextIds;
  state.selectedTransferId = info.smallest.id;
  state.lastDraftAction =
    info.completionEdges.length === 0
      ? `Using matching transfer #${info.smallest.id}.`
      : `Added ${info.completionEdges.length} edge${info.completionEdges.length === 1 ? "" : "s"} required by smallest match #${info.smallest.id}.`;
}

function selectClassEdge(classEdgeId) {
  state.focusedClassEdgeId = classEdgeId;
  state.focusedClassId = null;
  if (state.interactionMode === "draft") toggleDraftEdge(classEdgeId);
}

function draftInfo() {
  const seed = new Set(state.draftClassEdgeIds);
  const matches = state.groupData.transfers.filter((transfer) =>
    [...seed].every((classEdgeId) => transferHasClassEdge(transfer, classEdgeId)),
  );
  const bySize = [...matches].sort(
    (a, b) => a.classEdgeCount - b.classEdgeCount || a.edgeCount - b.edgeCount || a.id - b.id,
  );
  const smallest = bySize[0] ?? null;
  const smallestSat = bySize.find((transfer) => transfer.isSaturated) ?? null;
  const smallestCosat = bySize.find((transfer) => transfer.isCosaturated) ?? null;
  const smallestBisat = bySize.find((transfer) => transfer.isBisaturated) ?? null;
  const completionEdges = smallest
    ? smallest.classEdges.filter((edge) => !seed.has(edge.classEdgeId))
    : [];
  return {
    seed,
    matches,
    smallest,
    smallestSat,
    smallestCosat,
    smallestBisat,
    completionEdges,
  };
}

function renderLattice(transfer) {
  const data = state.groupData;
  const svg = els.latticeSvg;
  svg.innerHTML = "";

  for (const edge of data.coverEdges) {
    const from = data.classNodes[edge.fromClass];
    const to = data.classNodes[edge.toClass];
    const isFocused = data.classEdges.some(
      (classEdge) =>
        classEdge.classEdgeId === state.focusedClassEdgeId &&
        classEdge.fromClass === edge.fromClass &&
        classEdge.toClass === edge.toClass,
    );
    svg.appendChild(pathEl(edgePath(from, to, 0), `cover-edge ${isFocused ? "focused-edge" : ""}`));
  }

  for (const classEdge of data.classEdges) {
    const from = data.classNodes[classEdge.fromClass];
    const to = data.classNodes[classEdge.toClass];
    const isFocused = classEdge.classEdgeId === state.focusedClassEdgeId;
    const hit = pathEl(edgePath(from, to, 0), `edge-hit universal-hit ${isFocused ? "selected-hit" : ""}`);
    hit.appendChild(svgNode("title", {}));
    hit.querySelector("title").textContent = classEdge.label;
    hit.addEventListener("click", () => {
      selectClassEdge(classEdge.classEdgeId);
      render();
    });
    els.latticeSvg.appendChild(hit);
  }

  const focusedClassEdge = data.classEdges.find((edge) => edge.classEdgeId === state.focusedClassEdgeId);
  if (focusedClassEdge) {
    const from = data.classNodes[focusedClassEdge.fromClass];
    const to = data.classNodes[focusedClassEdge.toClass];
    els.latticeSvg.appendChild(pathEl(edgePath(from, to, 0), "selected-focus-edge"));
  }

  for (const transferEdge of diagramTransferEdges(transfer)) {
    const classEdge = data.classEdges.find((edge) => edge.classEdgeId === transferEdge.classEdgeId);
    const from = data.classNodes[classEdge.fromClass];
    const to = data.classNodes[classEdge.toClass];
    const completeness = transferEdge.included / transferEdge.possible;
    const curve = curveOffset(classEdge.fromClass, classEdge.toClass);
    const line = pathEl(edgePath(from, to, curve), `transfer-edge ${completeness < 1 ? "partial" : ""}`);
    line.setAttribute("stroke", typeColor[transfer.type]);
    svg.appendChild(line);

    if (state.viewMode !== "clean") {
      const label = svgNode("text", {
        class: "edge-label",
        x: (from.x + to.x) / 2 + curve * 0.18,
        y: (from.y + to.y) / 2 - 1.8,
      });
      label.textContent =
        state.viewMode === "debug"
          ? `${classEdge.classEdgeId}: ${transferEdge.included}/${transferEdge.possible}`
          : `${classEdge.label} ${transferEdge.included}/${transferEdge.possible}`;
      svg.appendChild(label);
    }
  }

  if (state.interactionMode === "draft") {
    renderDraftEdges();
  }

  renderOverlayEdges(transfer);

  for (const node of data.classNodes) {
    const group = svgNode("g", {
      class: `node ${state.focusedClassId === node.classId ? "focused" : ""}`,
      tabindex: "0",
    });
    group.addEventListener("click", () => {
      state.focusedClassId = node.classId;
      state.focusedClassEdgeId = null;
      render();
    });
    group.appendChild(svgNode("circle", { cx: node.x, cy: node.y, r: 5.3 }));
    const label = svgNode("text", { x: node.x, y: node.y });
    label.textContent = state.viewMode === "debug" ? `${node.classId}:${node.label}` : node.label;
    group.appendChild(label);
    if (node.size > 1) {
      group.appendChild(svgNode("circle", { class: "badge", cx: node.x + 5.4, cy: node.y - 5.1, r: 2.9 }));
      const badgeText = svgNode("text", { class: "badge-text", x: node.x + 5.4, y: node.y - 5.1 });
      badgeText.textContent = `×${node.size}`;
      group.appendChild(badgeText);
    }
    svg.appendChild(group);
  }
}

function diagramTransferEdges(transfer) {
  if (state.viewMode !== "clean") return transfer.classEdges;
  return reduceTransferEdges(transfer.classEdges);
}

function reduceTransferEdges(edges) {
  return edges.filter((edge) => !hasTransferPath(edges, edge.fromClass, edge.toClass, edge.classEdgeId));
}

function hasTransferPath(edges, startClass, targetClass, skippedClassEdgeId) {
  const stack = [startClass];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === targetClass) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of edges) {
      if (edge.classEdgeId === skippedClassEdgeId) continue;
      if (edge.fromClass === current) stack.push(edge.toClass);
    }
  }
  return false;
}

function renderDraftEdges() {
  const info = draftInfo();
  for (const classEdgeId of info.seed) {
    const classEdge = edgeById(classEdgeId);
    if (!classEdge) continue;
    const from = state.groupData.classNodes[classEdge.fromClass];
    const to = state.groupData.classNodes[classEdge.toClass];
    els.latticeSvg.appendChild(pathEl(edgePath(from, to, 0), "draft-seed-edge"));
  }
  for (const edge of info.completionEdges) {
    const classEdge = edgeById(edge.classEdgeId);
    if (!classEdge) continue;
    const from = state.groupData.classNodes[classEdge.fromClass];
    const to = state.groupData.classNodes[classEdge.toClass];
    els.latticeSvg.appendChild(pathEl(edgePath(from, to, 0), "draft-completion-edge"));
  }
}

function renderOverlayEdges(transfer) {
  if (state.overlayMode === "none") return;
  const edges =
    state.overlayMode === "satHull"
      ? (transfer.saturatedHull?.addedClassEdges ?? [])
      : (transfer.cosaturatedCore?.removedClassEdges ?? []);
  const className =
    state.overlayMode === "satHull"
      ? "overlay-edge overlay-sat-hull"
      : "overlay-edge overlay-cosat-core";

  const activeIndex = state.overlayStep === null ? null : state.overlayStep % Math.max(edges.length, 1);
  edges.forEach((overlayEdge, index) => {
    const classEdge = state.groupData.classEdges.find((edge) => edge.classEdgeId === overlayEdge.classEdgeId);
    if (!classEdge) return;
    const from = state.groupData.classNodes[classEdge.fromClass];
    const to = state.groupData.classNodes[classEdge.toClass];
    const activeClass = activeIndex === index ? " overlay-active" : "";
    const line = pathEl(edgePath(from, to, 0), `${className}${activeClass}`);
    els.latticeSvg.appendChild(line);

    if (state.viewMode !== "clean") {
      const label = svgNode("text", {
        class: "overlay-label",
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2 + 2.4,
      });
      const prefix = state.overlayMode === "satHull" ? "+" : "-";
      label.textContent =
        state.viewMode === "debug"
          ? `${prefix}${classEdge.classEdgeId}: ${overlayEdge.included}/${overlayEdge.possible}`
          : `${prefix} ${classEdge.label} ${overlayEdge.included}/${overlayEdge.possible}`;
      els.latticeSvg.appendChild(label);
    }
  });
}

function edgePath(from, to, curve) {
  const start = pointOnCircle(from, to, 5.8);
  const end = pointOnCircle(to, from, 5.8);
  if (curve === 0) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = midX + (-dy / len) * curve;
  const cy = midY + (dx / len) * curve;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

function pointOnCircle(from, to, radius) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: Number((from.x + (dx / len) * radius).toFixed(2)),
    y: Number((from.y + (dy / len) * radius).toFixed(2)),
  };
}

function curveOffset(fromClass, toClass) {
  return 0;
}

function pathEl(d, className) {
  return svgNode("path", { d, class: className });
}

function svgNode(name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function renderTransferDetail(transfer) {
  state.selectedTransferId = transfer.id;
  const displayedEdgeCount = diagramTransferEdges(transfer).length;
  els.transferTitle.textContent = `Transfer #${transfer.id}`;
  els.transferMeta.textContent = `${transfer.edgeCount} full edges · ${transfer.classEdgeCount} class edges · ${displayedEdgeCount} shown in ${state.viewMode === "clean" ? "Hasse" : "Full"} view`;
  els.typePill.innerHTML = renderTypeLabels(transfer);
  els.typePill.className = "type-labels";
  els.edgeList.innerHTML =
    transfer.classEdges.length === 0
      ? `<div class="muted">Empty transfer system</div>`
      : transfer.classEdges
          .map(
            (edge) =>
              `<div class="edge-row"><strong>${edge.label}</strong><span>${edge.included}/${edge.possible}</span></div>`,
          )
          .join("");
  renderOverlayDetail(transfer);
  renderFailureDetail(transfer);
  renderCompatibilityDetail(transfer);

  const focused = state.groupData.classNodes.find((node) => node.classId === state.focusedClassId);
  if (!focused) {
    els.nodeDetail.textContent = "No node selected";
  } else {
    els.nodeDetail.innerHTML = `
      <div><strong>${focused.label}</strong> · class ${focused.classId}</div>
      <div>Conjugacy class size: ${focused.size}</div>
      <div>Full subgroup ids: ${focused.fullSubgroupIds.join(", ")}</div>
    `;
  }
}

function renderFailureDetail(transfer) {
  const satFailures = transfer.saturationFailures ?? [];
  const coreRemoved = transfer.cosaturatedCore?.removedClassEdges ?? [];
  const satAdded = transfer.saturatedHull?.addedClassEdges ?? [];
  const satAddedFull = transfer.saturatedHull?.addedFullEdgeIds ?? [];
  const coreRemovedFull = transfer.cosaturatedCore?.removedFullEdgeIds ?? [];
  const satText = transfer.isSaturated
    ? `<div class="status-line ok">Already saturated. Scott's saturated hull adds no edges.</div>`
    : `<div class="status-line warn">To make this saturated, add ${satAdded.length} class edge${satAdded.length === 1 ? "" : "s"} (${satAddedFull.length} full edge${satAddedFull.length === 1 ? "" : "s"}).</div>`;
  const cosatText = transfer.isCosaturated
    ? `<div class="status-line ok">Already cosaturated. It equals Scott's cosaturated core.</div>`
    : `<div class="status-line warn">To reach the nearest cosaturated subsystem, remove ${coreRemoved.length} class edge${coreRemoved.length === 1 ? "" : "s"} (${coreRemovedFull.length} full edge${coreRemovedFull.length === 1 ? "" : "s"}).</div>`;

  const satRows = satAdded
    .slice(0, 4)
    .map((edge) => {
      const witness = satFailures.find((failure) => failure.missingEdge.label === edge.label);
      const reason = witness
        ? `Needed because ${witness.edgeA.label} and ${witness.edgeB.label} share a source.`
        : "Needed by Scott's saturated hull.";
      return `
        <div class="failure-row">
          <strong>${edge.label}</strong>
          <span>${reason}</span>
        </div>
      `;
    })
    .join("");
  const moreSat = satAdded.length > 4 ? `<div class="muted">+ ${satAdded.length - 4} more hull additions</div>` : "";

  const cosatRows = coreRemoved
    .slice(0, 4)
    .map(
      (edge) => `
        <div class="failure-row">
          <strong>${edge.label}</strong>
          <span>Present here, removed in the cosaturated core.</span>
        </div>
      `,
    )
    .join("");
  const moreCosat = coreRemoved.length > 4 ? `<div class="muted">+ ${coreRemoved.length - 4} more core removals</div>` : "";

  els.failureDetail.innerHTML = `
    ${satText}
    ${satRows ? `<div class="failure-list">${satRows}${moreSat}</div>` : ""}
    ${cosatText}
    ${cosatRows ? `<div class="failure-list">${cosatRows}${moreCosat}</div>` : ""}
  `;
}

function renderCompatibilityDetail(transfer) {
  const maxCompatible = transfer.maxCompatible;
  if (!maxCompatible) {
    els.compatibilityDetail.innerHTML = `
      <div class="status-line muted">Maximal compatible data has not been exported for this group yet.</div>
    `;
    return;
  }

  const removedClassEdges = maxCompatible.removedClassEdges ?? [];
  const generatorEdges = transfer.disklikeGenerators?.classEdges ?? [];
  const retainedFull = maxCompatible.fullEdgeIds?.length ?? 0;
  const removedFull = maxCompatible.removedFullEdgeIds?.length ?? 0;
  const disklikeText = transfer.isDisklike
    ? `<div class="status-line ok">Disklike. This transfer system is generated by top-target transfers.</div>`
    : `<div class="status-line warn">Not disklike. Some transfers are not restrictions of top-target transfers.</div>`;
  const compatibleText =
    removedFull === 0
      ? `<div class="status-line ok">Self-compatible. Here M(O) = O.</div>`
      : `<div class="status-line warn">M(O) keeps ${retainedFull} full edge${retainedFull === 1 ? "" : "s"} and excludes ${removedFull} from the multiplicative side.</div>`;
  const generatorRows = generatorEdges
    .slice(0, 3)
    .map(
      (edge) => `
        <div class="failure-row">
          <strong>${edge.label}</strong>
          <span>Disklike generator candidate with ${edge.included}/${edge.possible} full edge${edge.possible === 1 ? "" : "s"} present.</span>
        </div>
      `,
    )
    .join("");
  const moreGenerators =
    generatorEdges.length > 3 ? `<div class="muted">+ ${generatorEdges.length - 3} more top-target class edge${generatorEdges.length - 3 === 1 ? "" : "s"}</div>` : "";
  const removedRows = removedClassEdges
    .slice(0, 4)
    .map(
      (edge) => `
        <div class="failure-row">
          <strong>${edge.label}</strong>
          <span>Present in O, but not allowed in the maximal compatible multiplicative system M(O).</span>
        </div>
      `,
    )
    .join("");
  const moreRemoved =
    removedClassEdges.length > 4
      ? `<div class="muted">+ ${removedClassEdges.length - 4} more excluded class edge${removedClassEdges.length - 4 === 1 ? "" : "s"}</div>`
      : "";

  els.compatibilityDetail.innerHTML = `
    ${disklikeText}
    ${generatorRows ? `<div class="failure-list">${generatorRows}${moreGenerators}</div>` : ""}
    ${compatibleText}
    ${removedRows ? `<div class="failure-list">${removedRows}${moreRemoved}</div>` : ""}
  `;
}

function renderDraftBar() {
  els.draftBar.hidden = state.interactionMode !== "draft";
  if (state.interactionMode !== "draft") {
    els.draftBar.innerHTML = "";
    return;
  }

  const info = draftInfo();
  const chipText = state.draftClassEdgeIds
    .map((classEdgeId) => edgeById(classEdgeId)?.label)
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
  const extraChips = Math.max(0, state.draftClassEdgeIds.length - 4);
  const smallestText = info.smallest ? `#${info.smallest.id}` : "none";
  const completionLabel =
    info.completionEdges.length === 0
      ? "Use match"
      : `Add ${info.completionEdges.length} required`;
  const matchLabel =
    state.groupData.summary.computedSubset && state.groupData.summary.computedSubset !== "all"
      ? "subset matches"
      : "matches";
  const typeText = info.smallest
    ? [
        info.smallest.isBisaturated ? "bisat" : null,
        info.smallest.isSaturated ? "sat" : null,
        info.smallest.isCosaturated ? "cosat" : null,
      ]
        .filter(Boolean)
        .join(" / ")
    : "";

  els.draftBar.innerHTML = `
    <div class="draft-bar-main">
      <strong>Draft from #0</strong>
      <span>${state.draftClassEdgeIds.length ? `Chosen: ${chipText}` : "Click a line to choose it"}${extraChips ? `, +${extraChips}` : ""}</span>
    </div>
    <div class="draft-bar-stats">
      <span><strong>${info.matches.length}</strong> ${matchLabel}</span>
      <span><strong>${smallestText}</strong> smallest ${typeText ? `· ${typeText}` : ""}</span>
      <span><strong>${info.completionEdges.length}</strong> required by match</span>
    </div>
    <div class="draft-bar-actions">
      <button id="draftBarAddFocus" type="button" ${state.focusedClassEdgeId === null ? "disabled" : ""}>Choose Focus</button>
      <button id="draftBarUndo" type="button" ${state.draftHistory.length === 0 ? "disabled" : ""}>Undo</button>
      <button id="draftBarReset" type="button">Reset to #0</button>
      <button id="draftBarClear" type="button" ${state.draftClassEdgeIds.length === 0 ? "disabled" : ""}>Clear Chosen</button>
      <button id="draftBarApply" type="button" ${info.smallest ? "" : "disabled"}>${completionLabel}</button>
    </div>
  `;

  document.querySelector("#draftBarAddFocus")?.addEventListener("click", () => {
    addFocusedEdgeToDraft();
    render();
  });
  document.querySelector("#draftBarUndo")?.addEventListener("click", () => {
    undoDraftChange();
    render();
  });
  document.querySelector("#draftBarReset")?.addEventListener("click", () => {
    resetToTrivialTransfer();
    render();
  });
  document.querySelector("#draftBarClear")?.addEventListener("click", () => {
    clearDraft();
    render();
  });
  document.querySelector("#draftBarApply")?.addEventListener("click", () => {
    addRequiredEdgesToDraft(info);
    render();
  });
}

function renderDraftDetail() {
  els.interactionMode.value = state.interactionMode;
  els.draftSection.hidden = state.interactionMode !== "draft";
  if (state.interactionMode !== "draft") {
    els.draftDetail.innerHTML = "";
    return;
  }

  const info = draftInfo();
  const seedRows = state.draftClassEdgeIds
    .map((classEdgeId) => {
      const edge = edgeById(classEdgeId);
      return edge
        ? `<button class="draft-chip" type="button" data-draft-edge="${edge.classEdgeId}">${edge.label}</button>`
        : "";
    })
    .join("");
  const completionRows = info.completionEdges
    .slice(0, 5)
    .map((edge) => `<div class="edge-row completion-row"><strong>${edge.label}</strong><span>required by match #${info.smallest.id}</span></div>`)
    .join("");
  const moreCompletion =
    info.completionEdges.length > 5
      ? `<div class="muted">+ ${info.completionEdges.length - 5} more completion edges</div>`
      : "";
  const summary = info.smallest
      ? `<div class="draft-match">
        <div><strong>${info.matches.length}</strong><span>matching transfer systems</span></div>
        <div><strong>#${info.smallest.id}</strong><span>smallest valid completion</span></div>
      </div>
      <div class="type-labels draft-types">${renderTypeLabels(info.smallest)}</div>`
    : `<div class="status-line warn">No existing transfer system contains this draft.</div>`;
  const familyTargets = [
    ["Smallest saturated", info.smallestSat],
    ["Smallest cosaturated", info.smallestCosat],
    ["Smallest bisaturated", info.smallestBisat],
  ]
    .map(
      ([label, transfer]) =>
        `<div class="draft-target"><span>${label}</span><strong>${transfer ? `#${transfer.id}` : "none"}</strong></div>`,
    )
    .join("");

  els.draftDetail.innerHTML = `
    <div class="draft-note">
      <strong>${state.lastDraftAction}</strong>
      <span>Solid draft lines are edges you chose. Dashed teal lines are the extra class edges in the smallest existing transfer system containing your draft.</span>
    </div>
    <div class="draft-seeds">
      ${seedRows || `<div class="muted">No draft edges yet.</div>`}
    </div>
    ${summary}
    <div class="draft-targets">${familyTargets}</div>
    ${
      info.completionEdges.length
        ? `<div class="edge-list compact-list">${completionRows}${moreCompletion}</div>`
        : `<div class="status-line ok">This draft already matches an existing transfer system in the current dataset.</div>`
    }
  `;

  els.draftDetail.querySelectorAll("[data-draft-edge]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleDraftEdge(Number(button.dataset.draftEdge));
      render();
    });
  });
}

function renderOverlayDetail(transfer) {
  const satAdded = transfer.saturatedHull?.addedClassEdges ?? [];
  const cosatRemoved = transfer.cosaturatedCore?.removedClassEdges ?? [];
  const satAddedFull = transfer.saturatedHull?.addedFullEdgeIds ?? [];
  const cosatRemovedFull = transfer.cosaturatedCore?.removedFullEdgeIds ?? [];
  const edgeFocus = focusedEdgeLabel();
  const edgeStats = focusedEdgeStats();

  const modeText =
    state.overlayMode === "satHull"
      ? "Hull additions: edges added by Scott's saturatedHull."
      : state.overlayMode === "cosatCore"
        ? "Core removals: edges in this transfer system that do not remain in Scott's cosaturatedCore."
        : "Overlay is off";

  const activeEdges =
    state.overlayMode === "satHull"
      ? satAdded
      : state.overlayMode === "cosatCore"
        ? cosatRemoved
        : [];
  const hasActiveEdges = activeEdges.length > 0;
  const activeIndex = state.overlayStep === null || !hasActiveEdges ? null : state.overlayStep % activeEdges.length;

  els.overlayDetail.innerHTML = `
    <div class="overlay-summary">
      <div><strong>${satAdded.length}</strong><span>Sat hull class additions</span></div>
      <div><strong>${satAddedFull.length}</strong><span>Sat hull full additions</span></div>
      <div><strong>${cosatRemoved.length}</strong><span>Cosat core class removals</span></div>
      <div><strong>${cosatRemovedFull.length}</strong><span>Cosat core full removals</span></div>
    </div>
    <div class="muted">${modeText}</div>
    ${
      hasActiveEdges
        ? `<div class="animation-controls">
            <button id="overlayPrev" type="button">Prev</button>
            <button id="overlayPlay" type="button">${state.overlayTimer ? "Pause" : "Play"}</button>
            <button id="overlayNext" type="button">Next</button>
            <span>${activeIndex === null ? "All" : `${activeIndex + 1}/${activeEdges.length}`}</span>
          </div>`
        : ""
    }
    ${
      edgeFocus
        ? `<div class="focus-note"><strong>Selected Edge: ${edgeFocus}</strong><span>Transfer table is filtered to systems containing this class edge. Use Clear Focus to return to all systems.</span></div>`
        : ""
    }
    ${
      edgeStats
        ? `<div class="edge-stats">
            <strong>${edgeStats.label}</strong>
            <span>Appears in ${edgeStats.contains}/${edgeStats.total} transfer systems. Among those: ${edgeStats.saturated} saturated, ${edgeStats.cosaturated} cosaturated, ${edgeStats.bisaturated} bisaturated.</span>
            <span>Acts as a saturated-hull correction in ${edgeStats.hullAdds} systems and is removed by the cosaturated core in ${edgeStats.coreRemoves} systems.</span>
          </div>`
        : ""
    }
    ${
      activeEdges.length
        ? `<div class="edge-list compact-list">${activeEdges
            .map(
              (edge) =>
                `<div class="edge-row ${activeIndex !== null && activeEdges[activeIndex]?.classEdgeId === edge.classEdgeId ? "active-row" : ""}"><strong>${edge.label}</strong><span>${edge.included}/${edge.possible}</span></div>`,
            )
            .join("")}</div>`
        : ""
    }
  `;
  bindOverlayControls(activeEdges.length);
}

function bindOverlayControls(count) {
  if (!count) return;
  document.querySelector("#overlayPrev")?.addEventListener("click", () => {
    stopOverlayAnimation();
    state.overlayStep = state.overlayStep === null ? count - 1 : (state.overlayStep - 1 + count) % count;
    render();
  });
  document.querySelector("#overlayNext")?.addEventListener("click", () => {
    stopOverlayAnimation();
    state.overlayStep = state.overlayStep === null ? 0 : (state.overlayStep + 1) % count;
    render();
  });
  document.querySelector("#overlayPlay")?.addEventListener("click", () => {
    if (state.overlayTimer) {
      stopOverlayAnimation();
      render();
      return;
    }
    if (state.overlayStep === null) state.overlayStep = 0;
    state.overlayTimer = window.setInterval(() => {
      state.overlayStep = ((state.overlayStep ?? 0) + 1) % count;
      render();
    }, 850);
    render();
  });
}

function stopOverlayAnimation() {
  if (!state.overlayTimer) return;
  window.clearInterval(state.overlayTimer);
  state.overlayTimer = null;
}

function renderFamilyTable() {
  const groups = filteredGroupEntries();
  if (!groups.length) {
    els.familyRows.innerHTML = `
      <tr class="empty-row">
        <td colspan="10">No ${state.familyFilter} datasets yet. A new group can be added after its GroupNames layout and transfer data are exported.</td>
      </tr>
    `;
    return;
  }
  els.familyRows.innerHTML = groups
    .map((entry) => {
      const summary = entry.summary ?? {};
      const isActive = entry.label === state.selectedGroup;
      const statusText =
        entry.status === "sat-cosat-only" ? " · sat/cosat" : entry.status === "pending" ? " · pending" : "";
      return `
        <tr class="${isActive ? "active-group" : ""}" data-group="${entry.label}" data-status="${entry.status ?? ""}">
          <td>${entry.displayName}<span class="source">${statusText}</span></td>
          <td>${entry.family ?? ""}</td>
          <td>(${entry.smallGroup.join(",")})</td>
          <td>${entry.order}</td>
          <td>${summary.transferSystems ?? ""}</td>
          <td>${summary.saturated ?? ""}</td>
          <td>${summary.cosaturated ?? ""}</td>
          <td>${summary.bisaturated ?? ""}</td>
          <td>${summary.width ?? ""}</td>
          <td>${summary.complexity ?? ""}</td>
        </tr>
      `;
    })
    .join("");
  els.familyRows.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      const group = row.dataset.group;
      if (!group || group === state.selectedGroup || row.dataset.status === "pending") return;
      els.groupSelect.value = group;
      loadGroup(group);
    });
  });
}

function renderTypeLabels(transfer) {
  const labels = [];
  if (transfer.isBisaturated) labels.push("Bisaturated");
  if (transfer.isSaturated) labels.push("Saturated");
  if (transfer.isCosaturated) labels.push("Cosaturated");
  if (!transfer.isSaturated && !transfer.isCosaturated) labels.push("Normal");
  return labels
    .map((label) => `<span class="type-pill type-${label}">${label}</span>`)
    .join("");
}

function renderTable() {
  const rows = filteredTransfers();
  const selected = getSelectedTransfer();
  const edgeFocus = focusedEdgeLabel();
  els.tableMeta.textContent = edgeFocus
    ? `${rows.length} shown of ${state.groupData.transfers.length} · edge focus: ${edgeFocus}`
    : `${rows.length} shown of ${state.groupData.transfers.length}`;
  els.transferRows.innerHTML = rows
    .map(
      (transfer) => `
        <tr class="${transfer.id === selected.id ? "selected" : ""}" data-id="${transfer.id}">
          <td>${transfer.id}</td>
          <td><div class="type-labels">${renderTypeLabels(transfer)}</div></td>
          <td>${transfer.edgeCount}</td>
          <td>${transfer.classEdgeCount}</td>
          <td><span class="source">${transfer.classificationSource}</span></td>
        </tr>
      `,
    )
    .join("");
  els.transferRows.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedTransferId = Number(row.dataset.id);
      render();
    });
  });
}

function downloadJson() {
  const transfer = getSelectedTransfer();
  download(
    `${state.selectedGroup}-transfer-${transfer.id}.json`,
    JSON.stringify(transfer, null, 2),
    "application/json",
  );
}

function downloadCsv() {
  const rows = filteredTransfers();
  const csv = [
    ["id", "type", "edge_count", "class_edge_count", "is_saturated", "is_cosaturated", "is_bisaturated"],
    ...rows.map((transfer) => [
      transfer.id,
      transfer.type,
      transfer.edgeCount,
      transfer.classEdgeCount,
      transfer.isSaturated,
      transfer.isCosaturated,
      transfer.isBisaturated,
    ]),
  ]
    .map((row) => row.join(","))
    .join("\n");
  download(`${state.selectedGroup}-transfers.csv`, csv, "text/csv");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

init().catch((error) => {
  document.body.innerHTML = `<pre>${error.stack}</pre>`;
});

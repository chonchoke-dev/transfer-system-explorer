import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const ninftyDir = "/Users/koki315shibata/Desktop/Transfer System Codex Work/ninfty";
const manifestPath = path.join(repoRoot, "public", "data", "groups", "manifest.json");

const configs = {
  A4: {
    displayName: "A_4",
    family: "Alternating",
    order: 12,
    smallGroup: [12, 3],
    source: "A4_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/A4.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/A4_sgps.tex",
    sourceFiles: ["A4_export.json", "group_data/A4.h", "scripts/group_headers/A4_with_classes.h"],
  },
  D4: {
    n: 4,
    displayName: "D_4",
    family: "Dihedral",
    order: 8,
    smallGroup: [8, 3],
    source: "D4_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D4.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D4_sgps.tex",
    computedSubset: "saturated-cosaturated-union",
  },
  D6: {
    n: 6,
    displayName: "D_6",
    family: "Dihedral",
    order: 12,
    smallGroup: [12, 4],
    source: "D6_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D6.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D6_sgps.tex",
    computedSubset: "saturated-cosaturated-union",
  },
  D8: {
    n: 8,
    displayName: "D_8",
    family: "Dihedral",
    order: 16,
    smallGroup: [16, 7],
    source: "D8_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D8.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D8_sgps.tex",
    computedSubset: "saturated-cosaturated-union",
  },
  D9: {
    n: 9,
    displayName: "D_9",
    family: "Dihedral",
    order: 18,
    smallGroup: [18, 1],
    source: "D9_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D9.html",
  },
  D10: {
    n: 10,
    displayName: "D_10",
    family: "Dihedral",
    order: 20,
    smallGroup: [20, 4],
    source: "D10_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D10.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D10_sgps.tex",
    computedSubset: "saturated-cosaturated-union",
  },
  D12: {
    n: 12,
    displayName: "D_12",
    family: "Dihedral",
    order: 24,
    smallGroup: [24, 6],
    source: "D12_satcosat_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D12.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D12_sgps.tex",
    computedSubset: "saturated-cosaturated-union",
  },
  D14: {
    n: 14,
    displayName: "D_14",
    family: "Dihedral",
    order: 28,
    smallGroup: [28, 3],
    source: "D14_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D14.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D14_sgps.tex",
    computedSubset: "saturated-cosaturated-union",
  },
  D15: {
    n: 15,
    displayName: "D_15",
    family: "Dihedral",
    order: 30,
    smallGroup: [30, 3],
    source: "D15_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D15.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D15_sgps.tex",
  },
  D21: {
    n: 21,
    displayName: "D_21",
    family: "Dihedral",
    order: 42,
    smallGroup: [42, 5],
    source: "D21_export.json",
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/1/D21.html",
    groupNamesTexPath: "/Users/koki315shibata/Desktop/Transfer System Codex Work/groupnames/D21_sgps.tex",
  },
};

function hasPath(edges, start, target, skipKey) {
  const stack = [start];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of edges) {
      const key = `${edge.fromClass}->${edge.toClass}`;
      if (key === skipKey) continue;
      if (edge.fromClass === current) stack.push(edge.toClass);
    }
  }
  return false;
}

function transitiveReduction(edges) {
  return edges.filter((edge) => {
    const key = `${edge.fromClass}->${edge.toClass}`;
    return !hasPath(edges, edge.fromClass, edge.toClass, key);
  });
}

function buildRanks(nodes, coverEdges) {
  const ranks = new Map(nodes.map((node) => [node.classId, 0]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of coverEdges) {
      const next = ranks.get(edge.fromClass) + 1;
      if (next > ranks.get(edge.toClass)) {
        ranks.set(edge.toClass, next);
        changed = true;
      }
    }
  }
  return ranks;
}

function assignPositions(nodes, coverEdges, label) {
  const config = configs[label];
  const texPositions = config?.groupNamesTexPath ? parseGroupNamesTex(config.groupNamesTexPath) : null;
  if (texPositions) {
    applyTexPositions(nodes, texPositions, coverEdges);
    return;
  }

  if (label === "D9") {
    const positions = new Map([
      [0, [50, 88]],
      [1, [24, 62.67]],
      [2, [76, 62.67]],
      [3, [24, 37.33]],
      [4, [76, 37.33]],
      [5, [50, 12]],
    ]);
    for (const node of nodes) {
      const [x, y] = positions.get(node.classId);
      node.rank = buildRanks(nodes, coverEdges).get(node.classId) ?? 0;
      node.x = x;
      node.y = y;
    }
    return;
  }

  const ranks = buildRanks(nodes, coverEdges);
  const byRank = new Map();
  for (const node of nodes) {
    const rank = ranks.get(node.classId) ?? 0;
    if (!byRank.has(rank)) byRank.set(rank, []);
    byRank.get(rank).push(node);
  }
  const maxRank = Math.max(...byRank.keys());
  for (const [rank, rankNodes] of byRank.entries()) {
    rankNodes.sort((a, b) => a.classId - b.classId);
    const y = 90 - (rank / Math.max(maxRank, 1)) * 80;
    rankNodes.forEach((node, index) => {
      const spread = Math.min(24, 72 / Math.max(rankNodes.length - 1, 1));
      const x = 50 + (index - (rankNodes.length - 1) / 2) * spread;
      node.rank = rank;
      node.x = Number(x.toFixed(2));
      node.y = Number(y.toFixed(2));
    });
  }
}

function normalizeLabel(label) {
  const compact = label
    .replace(/_\{([^}]+)\}/g, "_$1")
    .replace(/[{}$\\]/g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, "")
    .replace(/^C1$/, "1")
    .toLowerCase();
  const factors = compact.split("x");
  if (factors.length > 1 && factors.every((factor) => factor === factors[0])) {
    return `${factors[0]}^${factors.length}`;
  }
  return compact;
}

function parseGroupNamesTex(texPath) {
  if (!fs.existsSync(texPath)) return null;
  const content = fs.readFileSync(texPath, "utf8");
  const positions = new Map();
  const nodePattern =
    /\\node(?:\[([^\]]*)\])?\s+at\s+\(([-\d.]+),([-\d.]+)\)\s+\((\d+)\)\s+\{\\gn\{[^}]+\}\{(.+?)\}\};/g;
  for (const match of content.matchAll(nodePattern)) {
    const [, styleRaw = "", xRaw, yRaw, nodeId, labelRaw] = match;
    const key = normalizeLabel(labelRaw);
    if (!positions.has(key)) positions.set(key, []);
    positions.get(key).push({
      x: Number(xRaw),
      y: Number(yRaw),
      texNodeId: nodeId,
      style: styleRaw,
      size: 1,
      rawLabel: labelRaw,
    });
  }
  const cnjPattern = /\\node\[cnj=(\d+)\]\s+\{(\d+)\};/g;
  for (const [, texNodeId, sizeRaw] of content.matchAll(cnjPattern)) {
    for (const options of positions.values()) {
      const position = options.find((item) => item.texNodeId === texNodeId);
      if (position) {
        position.size = Number(sizeRaw);
        break;
      }
    }
  }
  return positions.size ? positions : null;
}

function applyTexPositions(nodes, texPositions, coverEdges) {
  const matched = [];
  const usedByLabel = new Map();
  for (const node of nodes) {
    const key = normalizeLabel(node.label);
    const options = texPositions.get(key);
    const used = usedByLabel.get(key) ?? 0;
    const matchingSize = options?.find((option, index) => index >= used && option.size === node.size);
    const matchingSizeIndex = matchingSize ? options.indexOf(matchingSize) : -1;
    const position = matchingSize ?? options?.[used];
    if (!position) continue;
    if (matchingSizeIndex >= 0 && matchingSizeIndex !== used) {
      [options[used], options[matchingSizeIndex]] = [options[matchingSizeIndex], options[used]];
    }
    usedByLabel.set(key, used + 1);
    matched.push({ node, position });
  }
  if (matched.length !== nodes.length) return;

  const xs = matched.map(({ position }) => position.x);
  const ys = matched.map(({ position }) => position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const ranks = buildRanks(nodes, coverEdges);
  for (const { node, position } of matched) {
    node.rank = ranks.get(node.classId) ?? 0;
    node.x = Number((12 + ((position.x - minX) / Math.max(maxX - minX, 1)) * 76).toFixed(2));
    node.y = Number((90 - ((position.y - minY) / Math.max(maxY - minY, 1)) * 80).toFixed(2));
    node.layoutSource = "GroupNames TeX";
  }
}

function buildClassProjection(source) {
  const classNodes = source.conjugacy_classes.map((classInfo, classId) => ({
    classId,
    label: classInfo.label,
    size: classInfo.size,
    fullSubgroupIds: source.subgroup_conjugates
      .map((classForSubgroup, subgroupId) => ({ classForSubgroup, subgroupId }))
      .filter((entry) => entry.classForSubgroup === classId)
      .map((entry) => entry.subgroupId),
  }));

  const classEdgeMap = new Map();
  source.lattice.forEach((edge, edgeId) => {
    const from = edge.from;
    const to = edge.to;
    const fromClass = source.subgroup_conjugates[from];
    const toClass = source.subgroup_conjugates[to];
    const key = `${fromClass}->${toClass}`;
    if (!classEdgeMap.has(key)) {
      classEdgeMap.set(key, {
        classEdgeId: classEdgeMap.size,
        fromClass,
        toClass,
        fromLabel: classNodes[fromClass].label,
        toLabel: classNodes[toClass].label,
        label: `${classNodes[fromClass].label} -> ${classNodes[toClass].label}`,
        fullEdges: [],
      });
    }
    classEdgeMap.get(key).fullEdges.push({
      edgeId: edge.edgeId ?? edgeId,
      from,
      to,
      fromLabel: classNodes[fromClass].label,
      toLabel: classNodes[toClass].label,
    });
  });

  const classEdges = [...classEdgeMap.values()].map((edge) => ({
    ...edge,
    possible: edge.fullEdges.length,
  }));
  return { classNodes, classEdges, classEdgeMap };
}

function projectEdgeIds(edgeIds, source, classEdgeMap) {
  const byClassEdge = new Map();
  for (const edgeId of edgeIds ?? []) {
    const fullEdge = source.lattice[edgeId];
    const fromClass = source.subgroup_conjugates[fullEdge.from];
    const toClass = source.subgroup_conjugates[fullEdge.to];
    const key = `${fromClass}->${toClass}`;
    if (!byClassEdge.has(key)) {
      const classEdge = classEdgeMap.get(key);
      byClassEdge.set(key, {
        classEdgeId: classEdge.classEdgeId,
        fromClass,
        toClass,
        label: classEdge.label,
        included: 0,
        possible: classEdge.fullEdges.length,
        fullEdgeIds: [],
      });
    }
    const entry = byClassEdge.get(key);
    entry.included += 1;
    entry.fullEdgeIds.push(edgeId);
  }
  return [...byClassEdge.values()].sort((a, b) => a.classEdgeId - b.classEdgeId);
}

function describeFullEdge(edgeId, source, classNodes) {
  const fullEdge = source.lattice[edgeId];
  const fromClass = source.subgroup_conjugates[fullEdge.from];
  const toClass = source.subgroup_conjugates[fullEdge.to];
  return {
    edgeId,
    from: fullEdge.from,
    to: fullEdge.to,
    fromClass,
    toClass,
    label: `${classNodes[fromClass].label} -> ${classNodes[toClass].label}`,
  };
}

function buildGroup(label) {
  const config = configs[label];
  const source = JSON.parse(fs.readFileSync(path.join(ninftyDir, config.source), "utf8"));
  const { classNodes, classEdges, classEdgeMap } = buildClassProjection(source);
  const coverEdges = transitiveReduction(classEdges);
  assignPositions(classNodes, coverEdges, label);

  const sourceTransfers =
    config.computedSubset === "saturated-cosaturated-union"
      ? source.transfers.filter((transfer) => transfer.isSaturated || transfer.isCosaturated)
      : source.transfers;

  const transfers = sourceTransfers.map((transfer) => {
    const classEdgesForTransfer = projectEdgeIds(transfer.edges, source, classEdgeMap);
    const saturatedHullClassEdges = projectEdgeIds(transfer.saturatedHullEdges, source, classEdgeMap);
    const saturatedHullAddedClassEdges = projectEdgeIds(transfer.saturatedHullAddedEdges, source, classEdgeMap);
    const cosaturatedCoreClassEdges = projectEdgeIds(transfer.cosaturatedCoreEdges, source, classEdgeMap);
    const cosaturatedCoreRemovedClassEdges = projectEdgeIds(
      transfer.cosaturatedCoreRemovedEdges,
      source,
      classEdgeMap,
    );
    const maxCompatibleClassEdges = projectEdgeIds(transfer.maxCompatibleEdges, source, classEdgeMap);
    const maxCompatibleRemovedClassEdges = projectEdgeIds(
      transfer.maxCompatibleRemovedEdges,
      source,
      classEdgeMap,
    );
    const disklikeGeneratorClassEdges = projectEdgeIds(transfer.disklikeGeneratorEdges, source, classEdgeMap);

    return {
      id: transfer.id,
      type: transfer.type,
      isSaturated: transfer.isSaturated,
      isCosaturated: transfer.isCosaturated,
      isBisaturated: transfer.isSaturated && transfer.isCosaturated,
      isDisklike: Boolean(transfer.isDisklike),
      classificationSource: "Scott's ninfty.h: isSaturated/isCosaturated",
      edgeCount: transfer.edges.length,
      fullEdgeIds: transfer.edges,
      classEdgeCount: classEdgesForTransfer.length,
      classEdges: classEdgesForTransfer,
      saturationFailures: (transfer.saturationFailures ?? []).map((failure) => ({
        edgeA: describeFullEdge(failure.edgeA, source, classNodes),
        edgeB: describeFullEdge(failure.edgeB, source, classNodes),
        missingEdge: describeFullEdge(failure.missingEdge, source, classNodes),
      })),
      saturatedHull: {
        fullEdgeIds: transfer.saturatedHullEdges ?? transfer.edges,
        addedFullEdgeIds: transfer.saturatedHullAddedEdges ?? [],
        classEdges: saturatedHullClassEdges,
        addedClassEdges: saturatedHullAddedClassEdges,
      },
      cosaturatedCore: {
        fullEdgeIds: transfer.cosaturatedCoreEdges ?? [],
        removedFullEdgeIds: transfer.cosaturatedCoreRemovedEdges ?? [],
        classEdges: cosaturatedCoreClassEdges,
        removedClassEdges: cosaturatedCoreRemovedClassEdges,
      },
      maxCompatible: transfer.maxCompatibleEdges
        ? {
            fullEdgeIds: transfer.maxCompatibleEdges,
            removedFullEdgeIds: transfer.maxCompatibleRemovedEdges ?? [],
            classEdges: maxCompatibleClassEdges,
            removedClassEdges: maxCompatibleRemovedClassEdges,
          }
        : null,
      disklikeGenerators: transfer.disklikeGeneratorEdges
        ? {
            fullEdgeIds: transfer.disklikeGeneratorEdges,
            classEdges: disklikeGeneratorClassEdges,
          }
        : null,
    };
  });

  const summary = {
    group: label,
    transferSystems: sourceTransfers.length,
    computedSubset: source.summary.computedSubset ?? config.computedSubset ?? "all",
    complexity: source.summary.complexity,
    generationStatistics: null,
    saturated: source.classificationCounts.saturated,
    saturatedComplexity: source.summary.saturatedComplexity ?? null,
    cosaturated: source.classificationCounts.cosaturated,
    cosaturatedComplexity: source.summary.cosaturatedComplexity ?? null,
    bisaturated: source.classificationCounts.bisaturated,
    width: source.summary.width,
    runtimeMs: source.summary.runtimeMs,
  };

  const groupData = {
    schemaVersion: 2,
    group: {
      label,
      displayName: config.displayName ?? label,
      family: config.family,
      n: config.n,
      order: config.order,
      smallGroup: config.smallGroup,
      groupNamesUrl: config.groupNamesUrl,
    },
    provenance: {
      computationSource: "Scott Balchin's ninfty code",
      classificationSource: "Scott's ninfty.h",
      sourceFiles: config.sourceFiles ?? [config.source, `group_data/${label}.h`],
      notes:
        config.computedSubset === "saturated-cosaturated-union"
          ? "This even-dihedral package contains only the union of transfer systems verified by Scott's isSaturated and isCosaturated predicates after full enumeration. Browser app displays classifications, saturated hulls, and cosaturated cores emitted by ninfty; it does not redefine them."
          : "Browser app displays classifications, saturated hulls, and cosaturated cores emitted by ninfty; it does not redefine them.",
    },
    summary,
    classNodes,
    classEdges,
    coverEdges,
    fullLattice: source.lattice.map((edge, edgeId) => ({
      edgeId: edge.edgeId ?? edgeId,
      from: edge.from,
      to: edge.to,
      fromClass: source.subgroup_conjugates[edge.from],
      toClass: source.subgroup_conjugates[edge.to],
    })),
    transfers,
  };

  const outDir = path.join(repoRoot, "public", "data", "groups", label);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "group.json"), `${JSON.stringify(groupData, null, 2)}\n`);
  return {
    label,
    displayName: config.displayName ?? label,
    family: config.family,
    order: config.order,
    smallGroup: config.smallGroup,
    dataPath: `data/groups/${label}/group.json`,
    status: config.computedSubset === "saturated-cosaturated-union" ? "sat-cosat-only" : "complete",
    summary,
  };
}

const labels = process.argv.slice(2);
const selected = labels.length ? labels : Object.keys(configs);
const entries = selected.map(buildGroup);

let manifest = { schemaVersion: 1, groups: [] };
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}
const entryMap = new Map(manifest.groups.map((entry) => [entry.label, entry]));
for (const entry of entries) entryMap.set(entry.label, entry);
manifest.groups = [...entryMap.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${entries.map((entry) => entry.label).join(", ")}`);

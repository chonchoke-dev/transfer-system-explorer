import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const ninftyDir = "/Users/koki315shibata/Desktop/Transfer System Codex Work/ninfty";
const sourceJsonPath = path.join(ninftyDir, "D15_export.json");
const outDir = path.join(repoRoot, "public", "data", "groups", "D15");
const manifestPath = path.join(repoRoot, "public", "data", "groups", "manifest.json");

const source = JSON.parse(fs.readFileSync(sourceJsonPath, "utf8"));

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

function assignPositions(nodes, coverEdges) {
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
  const fromClass = source.subgroup_conjugates[edge.from];
  const toClass = source.subgroup_conjugates[edge.to];
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
    edgeId,
    from: edge.from,
    to: edge.to,
    fromLabel: classNodes[fromClass].label,
    toLabel: classNodes[toClass].label,
  });
});

const classEdges = [...classEdgeMap.values()].map((edge) => ({
  ...edge,
  possible: edge.fullEdges.length,
}));
const coverEdges = transitiveReduction(classEdges);
assignPositions(classNodes, coverEdges);

const transfers = source.transfers.map((transfer) => {
  const byClassEdge = new Map();
  for (const edgeId of transfer.edges) {
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

  return {
    id: transfer.id,
    type: transfer.type,
    isSaturated: transfer.isSaturated,
    isCosaturated: transfer.isCosaturated,
    isBisaturated: transfer.isSaturated && transfer.isCosaturated,
    classificationSource: "Scott's ninfty.h: isSaturated/isCosaturated",
    edgeCount: transfer.edges.length,
    fullEdgeIds: transfer.edges,
    classEdgeCount: byClassEdge.size,
    classEdges: [...byClassEdge.values()].sort((a, b) => a.classEdgeId - b.classEdgeId),
  };
});

const summary = {
  group: "D15",
  transferSystems: source.summary.transferSystems,
  complexity: source.summary.complexity,
  generationStatistics: null,
  saturated: source.classificationCounts.saturated,
  saturatedComplexity: null,
  cosaturated: source.classificationCounts.cosaturated,
  cosaturatedComplexity: null,
  bisaturated: source.classificationCounts.bisaturated,
  width: source.summary.width,
  runtimeMs: source.summary.runtimeMs,
};

const groupData = {
  schemaVersion: 1,
  group: {
    label: "D15",
    displayName: "D_15",
    family: "Dihedral",
    n: 15,
    order: 30,
    smallGroup: [30, 3],
    groupNamesUrl: "https://people.maths.bris.ac.uk/~matyd/GroupNames/3/D15.html",
  },
  provenance: {
    computationSource: "Scott Balchin's ninfty code",
    classificationSource: "Scott's ninfty.h",
    sourceFiles: ["D15_export.json", "group_data/D15.h"],
    notes: "Browser app displays classifications emitted by ninfty; it does not redefine saturated, cosaturated, or bisaturated.",
  },
  summary,
  classNodes,
  classEdges,
  coverEdges,
  fullLattice: source.lattice.map((edge) => ({
    edgeId: edge.edgeId,
    from: edge.from,
    to: edge.to,
    fromClass: source.subgroup_conjugates[edge.from],
    toClass: source.subgroup_conjugates[edge.to],
  })),
  transfers,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "group.json"), `${JSON.stringify(groupData, null, 2)}\n`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entry = {
  label: "D15",
  displayName: "D_15",
  family: "Dihedral",
  order: 30,
  smallGroup: [30, 3],
  dataPath: "data/groups/D15/group.json",
  status: "complete",
};
manifest.groups = manifest.groups.filter((group) => group.label !== "D15");
manifest.groups.push(entry);
manifest.groups.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote ${path.join(outDir, "group.json")}`);

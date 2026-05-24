#include <chrono>
#include <iostream>
#include <set>
#include <string>
#include <vector>

#include GROUP_PATH
#include "ninfty.h"

void printEdgeList(const std::vector<unsigned>& edges) {
    for (unsigned j = 0; j < edges.size(); ++j) {
        std::cout << edges[j];
        if (j + 1 < edges.size()) std::cout << ", ";
    }
}

bool sameEdges(const std::vector<unsigned>& lhs, const std::vector<unsigned>& rhs) {
    return std::set<unsigned>(lhs.begin(), lhs.end()) == std::set<unsigned>(rhs.begin(), rhs.end());
}

std::vector<unsigned> disklikeGenerators(const std::vector<unsigned>& transfer) {
    std::vector<unsigned> result;
    const unsigned top = unsigned(subgroup_dictionary.size() - 1);
    for (const auto edge : transfer) {
        if (lattice[edge].second == top) result.push_back(edge);
    }
    return result;
}

bool isDisklikeTransfer(const std::vector<unsigned>& transfer) {
    const auto generators = disklikeGenerators(transfer);
    const auto generated = transferClosure(generators);
    return sameEdges(generated, transfer);
}

std::vector<unsigned> maximalCompatibleEdges(const std::vector<unsigned>& additive_transfer) {
    std::vector<unsigned> result;
    for (const auto edge : additive_transfer) {
        const auto generated_by_edge = transferClosure(std::vector<unsigned>{edge});
        if (isCompatible(generated_by_edge, additive_transfer)) {
            result.push_back(edge);
        }
    }
    return result;
}

int main() {
    const auto start = std::chrono::steady_clock::now();
    auto all = allTransfers();
    const auto end = std::chrono::steady_clock::now();
    const auto runtime_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    unsigned sat_count = 0;
    unsigned cosat_count = 0;
    unsigned bisat_count = 0;

    std::cout << "{\n";
    std::cout << "  \"summary\": {\n";
    std::cout << "    \"group\": \"" << subgroup_dictionary[subgroup_dictionary.size() - 1] << "\",\n";
    std::cout << "    \"transferSystems\": " << all.size() << ",\n";
    std::cout << "    \"complexity\": " << ALL_COMPLEXITY << ",\n";
    std::cout << "    \"width\": " << width() << ",\n";
    std::cout << "    \"runtimeMs\": " << runtime_ms << "\n";
    std::cout << "  },\n";

    std::cout << "  \"subgroup_dictionary\": [\n";
    for (unsigned i = 0; i < subgroup_dictionary.size(); ++i) {
        std::cout << "    {\"id\": " << i << ", \"label\": \"" << subgroup_dictionary[i] << "\"}";
        if (i + 1 < subgroup_dictionary.size()) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "  ],\n";

    std::cout << "  \"lattice\": [\n";
    for (unsigned i = 0; i < lattice.size(); ++i) {
        std::cout << "    {\"edgeId\": " << i << ", \"from\": " << lattice[i].first << ", \"to\": " << lattice[i].second << "}";
        if (i + 1 < lattice.size()) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "  ],\n";

    std::cout << "  \"subgroup_conjugates\": [";
    for (unsigned i = 0; i < subgroup_conjugates.size(); ++i) {
        std::cout << subgroup_conjugates[i];
        if (i + 1 < subgroup_conjugates.size()) std::cout << ", ";
    }
    std::cout << "],\n";

    std::cout << "  \"conjugacy_classes\": [\n";
    for (unsigned i = 0; i < conjugacy_class_info.size(); ++i) {
        std::cout << "    {\"classId\": " << i << ", \"label\": \"" << conjugacy_class_info[i].label << "\", \"size\": " << conjugacy_class_info[i].size << "}";
        if (i + 1 < conjugacy_class_info.size()) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "  ],\n";

    std::cout << "  \"transfers\": [\n";
    for (unsigned i = 0; i < all.size(); ++i) {
        const bool sat = isSaturated(all[i]);
        const bool cosat = isCosaturated(all[i]);
        const auto sat_hull = saturatedHull(all[i]);
        const auto cosat_core = cosaturatedCore(all[i]);
        const auto disklike_generators = disklikeGenerators(all[i]);
        const bool disklike = isDisklikeTransfer(all[i]);
        const auto max_compatible = maximalCompatibleEdges(all[i]);
        const std::set<unsigned> transfer_edges(all[i].begin(), all[i].end());
        const std::set<unsigned> sat_hull_edges(sat_hull.begin(), sat_hull.end());
        const std::set<unsigned> cosat_core_edges(cosat_core.begin(), cosat_core.end());
        const std::set<unsigned> max_compatible_edges(max_compatible.begin(), max_compatible.end());
        if (sat) sat_count++;
        if (cosat) cosat_count++;
        if (sat && cosat) bisat_count++;

        std::string type = "Normal";
        if (sat && cosat) type = "Bisaturated";
        else if (sat) type = "Saturated";
        else if (cosat) type = "Cosaturated";

        std::cout << "    {\"id\": " << i << ", \"type\": \"" << type << "\", \"isSaturated\": " << (sat ? "true" : "false") << ", \"isCosaturated\": " << (cosat ? "true" : "false") << ", \"isDisklike\": " << (disklike ? "true" : "false") << ", \"edges\": [";
        printEdgeList(all[i]);
        std::cout << "], \"saturationFailures\": [";
        unsigned failure_count = 0;
        for (unsigned j = 0; j < all[i].size(); ++j) {
            for (unsigned k = 0; k < all[i].size(); ++k) {
                if (lattice[all[i][j]].first == lattice[all[i][k]].first && lattice[all[i][j]].second != lattice[all[i][k]].second) {
                    std::pair<unsigned,unsigned> to_find{lattice[all[i][j]].second, lattice[all[i][k]].second};
                    auto missing_it = std::find(lattice.begin(), lattice.end(), to_find);
                    if (missing_it != lattice.end()) {
                        unsigned missing_index = unsigned(missing_it - lattice.begin());
                        if (!transfer_edges.contains(missing_index)) {
                            if (failure_count > 0) std::cout << ", ";
                            std::cout << "{\"edgeA\": " << all[i][j] << ", \"edgeB\": " << all[i][k] << ", \"missingEdge\": " << missing_index << "}";
                            failure_count++;
                        }
                    }
                }
            }
        }
        std::cout << "], \"saturatedHullEdges\": [";
        printEdgeList(sat_hull);
        std::cout << "], \"saturatedHullAddedEdges\": [";
        unsigned printed = 0;
        for (const auto edge : sat_hull_edges) {
            if (!transfer_edges.contains(edge)) {
                if (printed > 0) std::cout << ", ";
                std::cout << edge;
                printed++;
            }
        }
        std::cout << "], \"cosaturatedCoreEdges\": [";
        printEdgeList(cosat_core);
        std::cout << "], \"cosaturatedCoreRemovedEdges\": [";
        printed = 0;
        for (const auto edge : transfer_edges) {
            if (!cosat_core_edges.contains(edge)) {
                if (printed > 0) std::cout << ", ";
                std::cout << edge;
                printed++;
            }
        }
        std::cout << "], \"disklikeGeneratorEdges\": [";
        printEdgeList(disklike_generators);
        std::cout << "], \"maxCompatibleEdges\": [";
        printEdgeList(max_compatible);
        std::cout << "], \"maxCompatibleRemovedEdges\": [";
        printed = 0;
        for (const auto edge : transfer_edges) {
            if (!max_compatible_edges.contains(edge)) {
                if (printed > 0) std::cout << ", ";
                std::cout << edge;
                printed++;
            }
        }
        std::cout << "]}";
        if (i + 1 < all.size()) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "  ],\n";
    std::cout << "  \"classificationCounts\": {\"saturated\": " << sat_count << ", \"cosaturated\": " << cosat_count << ", \"bisaturated\": " << bisat_count << "}\n";
    std::cout << "}\n";

    return 0;
}

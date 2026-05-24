#include <algorithm>
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

int main() {
    const auto start = std::chrono::steady_clock::now();
    auto all = allTransfers();
    const auto end = std::chrono::steady_clock::now();
    const auto runtime_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::vector<std::vector<unsigned>> combined;
    for (const auto& transfer : all) {
        if (isSaturated(transfer) || isCosaturated(transfer)) {
            combined.push_back(transfer);
        }
    }
    std::sort(combined.begin(), combined.end(), [](const std::vector<unsigned>& a, const std::vector<unsigned>& b) {
        if (a.size() != b.size()) return a.size() < b.size();
        return a < b;
    });

    unsigned sat_count = 0;
    unsigned cosat_count = 0;
    unsigned bisat_count = 0;

    std::cout << "{\n";
    std::cout << "  \"summary\": {\n";
    std::cout << "    \"group\": \"" << subgroup_dictionary[subgroup_dictionary.size() - 1] << "\",\n";
    std::cout << "    \"transferSystems\": " << combined.size() << ",\n";
    std::cout << "    \"computedSubset\": \"saturated-cosaturated-union\",\n";
    std::cout << "    \"complexity\": " << ALL_COMPLEXITY << ",\n";
    std::cout << "    \"saturatedComplexity\": 0,\n";
    std::cout << "    \"cosaturatedComplexity\": 0,\n";
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
    for (unsigned i = 0; i < combined.size(); ++i) {
        const auto& transfer = combined[i];
        const bool sat = isSaturated(transfer);
        const bool cosat = isCosaturated(transfer);
        const auto sat_hull = saturatedHull(transfer);
        const auto cosat_core = cosaturatedCore(transfer);
        const std::set<unsigned> transfer_edges(transfer.begin(), transfer.end());
        const std::set<unsigned> sat_hull_edges(sat_hull.begin(), sat_hull.end());
        const std::set<unsigned> cosat_core_edges(cosat_core.begin(), cosat_core.end());
        if (sat) sat_count++;
        if (cosat) cosat_count++;
        if (sat && cosat) bisat_count++;

        std::string type = "Normal";
        if (sat && cosat) type = "Bisaturated";
        else if (sat) type = "Saturated";
        else if (cosat) type = "Cosaturated";

        std::cout << "    {\"id\": " << i << ", \"type\": \"" << type << "\", \"isSaturated\": " << (sat ? "true" : "false") << ", \"isCosaturated\": " << (cosat ? "true" : "false") << ", \"edges\": [";
        printEdgeList(transfer);
        std::cout << "], \"saturationFailures\": [";
        unsigned failure_count = 0;
        for (unsigned j = 0; j < transfer.size(); ++j) {
            for (unsigned k = 0; k < transfer.size(); ++k) {
                if (lattice[transfer[j]].first == lattice[transfer[k]].first && lattice[transfer[j]].second != lattice[transfer[k]].second) {
                    std::pair<unsigned,unsigned> to_find{lattice[transfer[j]].second, lattice[transfer[k]].second};
                    auto missing_it = std::find(lattice.begin(), lattice.end(), to_find);
                    if (missing_it != lattice.end()) {
                        unsigned missing_index = unsigned(missing_it - lattice.begin());
                        if (!transfer_edges.contains(missing_index)) {
                            if (failure_count > 0) std::cout << ", ";
                            std::cout << "{\"edgeA\": " << transfer[j] << ", \"edgeB\": " << transfer[k] << ", \"missingEdge\": " << missing_index << "}";
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
        std::cout << "]}";
        if (i + 1 < combined.size()) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "  ],\n";
    std::cout << "  \"classificationCounts\": {\"saturated\": " << sat_count << ", \"cosaturated\": " << cosat_count << ", \"bisaturated\": " << bisat_count << "}\n";
    std::cout << "}\n";

    return 0;
}

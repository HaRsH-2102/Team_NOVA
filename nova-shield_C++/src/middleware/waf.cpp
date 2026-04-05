#include "waf.h"
#include <algorithm>
#include <cctype>

void WAF::init(const Config& config) {
    enabled = config.security.block_sql_injection;
    if (!enabled) return;

    sql_patterns = {"or 1=1", "drop table", "select * from"};
    xss_patterns = {"<script>", "javascript:"};
    path_traversal_patterns = {"../", "/etc/passwd"};
    cmd_patterns = {"; ls", "| cat"};
}

std::string to_lower(const std::string& str) {
    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(),
        [](unsigned char c){ return std::tolower(c); });
    return lower;
}

bool WAF::contains_pattern(const std::string& text, const std::vector<std::string>& patterns) const {
    std::string lower_text = to_lower(text);
    for (const auto& pattern : patterns) {
        if (lower_text.find(pattern) != std::string::npos) {
            return true;
        }
    }
    return false;
}

bool WAF::detect(const HttpRequest& req) const {
    if (!enabled) return false;

    if (contains_pattern(req.path, path_traversal_patterns)) return true;

    // Use pointers to patterns arrays to avoid copies
    const std::vector<std::string>* all_patterns[] = {
        &sql_patterns,
        &xss_patterns,
        &cmd_patterns
    };

    for (const auto* patterns : all_patterns) {
        if (contains_pattern(req.path, *patterns)) return true;
        if (contains_pattern(req.body, *patterns)) return true;
        for (const auto& [k, v] : req.headers) {
            if (contains_pattern(v, *patterns)) return true;
        }
    }

    return false;
}

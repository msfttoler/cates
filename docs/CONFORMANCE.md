# CATES Conformance

CATES defines repository conformance levels:

| Level | Requirement summary |
|-------|---------------------|
| 1 | No critical findings, no hardcoded secrets, score >= 40, at least one config file |
| 2 | Level 1 plus no high findings, score >= 70, always-loaded <= 1,500, prompt protection, no contradictions |
| 3 | Level 2 plus no findings above low, score >= 90, always-loaded <= 800, described MCP servers, prompt purpose headers |

Run:

```bash
cates-analyzer conformance . --require-level 2
```


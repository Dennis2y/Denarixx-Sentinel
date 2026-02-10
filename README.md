# Denarixx Sentinel 🛡️

[![CI](https://github.com/Dennis2y/Denarixx-Sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/Dennis2y/Denarixx-Sentinel/actions/workflows/ci.yml)
![GitHub Action](https://img.shields.io/badge/uses-GitHub%20Actions-blue)

**Denarixx Sentinel** is a GitHub Action that acts like a PR copilot:

- ✅ PR title + description quality checks  
- ✅ PR size summary + “too large PR” warnings  
- ✅ Test heuristics (warn if code changed but no tests changed)  
- ✅ Configurable rules (glob + regex) for JS/TS + Python  
- ✅ Posts a single **updating** PR report comment (no spam)  
- ✅ **Risk Score (0–100)** with clean summary + collapsible details  

---

## Quick Install (Any Repository)

Create this workflow file:

### `.github/workflows/denarixx-sentinel.yml`

```yml
name: Denarixx Sentinel

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  sentinel:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: Dennis2y/Denarixx-Sentinel@v1
        with:
          config: .denarixx-sentinel.yml EOF

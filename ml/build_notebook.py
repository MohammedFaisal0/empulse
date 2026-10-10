"""Turn ml/00_analysis.py (percent format) into ml/notebooks/01_analysis.ipynb (no outputs)."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
src = (HERE / "00_analysis.py").read_text(encoding="utf-8")
cells, cur, kind = [], [], "code"


def flush():
    global cur
    if not "".join(cur).strip():
        cur = []
        return
    if kind == "markdown":
        body = [l[2:] if l.startswith("# ") else l.lstrip("#") for l in cur]
        cells.append({"cell_type": "markdown", "metadata": {}, "source": "".join(body).strip("\n").splitlines(True)})
    else:
        cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
                      "source": "".join(cur).strip("\n").splitlines(True)})
    cur = []


for line in src.splitlines(True):
    if line.startswith("# %%"):
        flush()
        kind = "markdown" if "[markdown]" in line else "code"
    else:
        cur.append(line)
flush()
nb = {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}},
      "nbformat": 4, "nbformat_minor": 5}
out = HERE / "notebooks" / "01_analysis.ipynb"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(nb, indent=1), encoding="utf-8")
print("wrote", out, len(cells), "cells")

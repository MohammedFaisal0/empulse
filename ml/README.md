# ml/: data generation and models

All data here is **synthetic**. Burnout and attrition risk are **decision support, not a diagnosis**.

## What is here
| File | What |
|---|---|
| `empulse_ml.py` | Runtime API for the backend: `load_bundle`, `predict_proba`, `drivers` (explain one person), `simulate` (What-if Simulator, H13) |
| `gen_core.py`, `names.py` | Synthetic-data generator and name pools |
| `00_analysis.py` | Exploratory analysis of the two raw datasets (also as `notebooks/01_analysis.ipynb`) |
| `01_train_models.py` | Trains the burnout and attrition models, writes `models/*.pkl` and `reports/model_report.md` |
| `02_build_dataset.py` | Builds the 1,240-person dataset, scores it, writes `data/generated/*.csv` and `docs/DATA_SCHEMA.md` |
| `models/` | `burnout_model.pkl`, `attrition_model.pkl` (joblib bundles) |
| `reports/` | Accuracy report, data checks, figures |

## Re-run everything (from the project root)
```
pip install -r ml/requirements.txt
python ml/01_train_models.py
python ml/02_build_dataset.py
```
Scripts are seeded, so the results are repeatable. Running `02` always passes its own checks (1,240 people, the 9 people in Yasmin's team match the design, ...) or stops with an error.

## Use in the backend (Django)
```python
import sys; sys.path.append(str(BASE_DIR.parent / "ml"))     # or copy empulse_ml.py into an app
import empulse_ml as E
burnout = E.load_bundle("burnout")                              # load ONCE at startup, never retrain in requests
risk = E.predict_proba(burnout, df)                             # df has the columns of E.BURNOUT_FEATURES
why = E.drivers(burnout, row, top_k=4)                          # "Explain this risk"
sim = E.simulate(df_group, {"workload_change_pct": -10, "overtime_change_pct": -25})   # H13, group of >= 5
```
The pickles only load with the same library versions as `ml/requirements.txt`, so pin them in `backend/requirements.txt`.
`df` for `simulate` is `employees` joined with `employee_current` (needs `monthly_income_sar`, `income_ratio`, `tenure_years`, `job_level`, `years_since_promotion` and the signal columns).

## Model quality (synthetic data, held-out test; see `reports/model_report.md`)
Burnout AUC 0.81, attrition AUC 0.73. The same model family reaches AUC 0.81 (5-fold) on the real IBM HR dataset.
These numbers show the pipeline works; they are not claims about real employees.

## Note on XGBoost / SHAP
The stack mentions XGBoost and SHAP. They could not be installed in the build environment, so the models use scikit-learn `HistGradientBoostingClassifier`, and explanations are **exact Shapley values** computed in `empulse_ml.shapley_values` (same method as SHAP with a single reference row). The API stays the same if XGBoost is swapped in later.

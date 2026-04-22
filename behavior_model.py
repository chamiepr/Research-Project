"""
behavior_model.py  —  extracted from BehaviorCode.ipynb
Run directly: python behavior_model.py
Called by Flask: sets NB_AGE / NB_GENDER env vars before calling run_pipeline()
"""

import ast
import os
import glob
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# ── Config ────────────────────────────────────────────────────────────────────
DATA_FOLDER     = r"C:\Users\M S I\OneDrive\Documents\GitHub\Research-Project\data"
TRAIN_FILE      = os.path.join(DATA_FOLDER, "synthetic_dataset_with_item.csv")
MODEL_FILE      = os.path.join(DATA_FOLDER, "reason_prediction_model.pkl")
CONVERTED_FILE  = os.path.join(DATA_FOLDER, "latest_converted_psychopy.csv")
PREDICTION_FILE = os.path.join(DATA_FOLDER, "latest_reason_percentages.csv")
RESULTS_JSON    = os.path.join(DATA_FOLDER, "latest_results.json")

# ── Helpers ───────────────────────────────────────────────────────────────────
def parse_list_cell(value):
    if pd.isna(value):
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, (int, float)):
        return [value]
    value = str(value).strip()
    if value == "" or value.lower() == "nan":
        return []
    try:
        parsed = ast.literal_eval(value)
        return parsed if isinstance(parsed, list) else [parsed]
    except Exception:
        return [value]

def get_last_numeric(value):
    nums = []
    for v in parse_list_cell(value):
        try:
            nums.append(float(v))
        except Exception:
            pass
    return nums[-1] if nums else np.nan

def get_last_string(value):
    arr = parse_list_cell(value)
    return str(arr[-1]).strip() if arr else None

def standardize_reason_labels(series):
    return series.astype(str).str.strip().str.lower().replace(
        {"price": "Price", "brand": "Brand", "familiarity": "Familiarity"}
    )

def normalize_gender(value):
    m = {"male": "Male", "m": "Male", "female": "Female", "f": "Female"}
    return m.get(str(value).strip().lower(), str(value).strip().title())

def get_latest_psychopy_csv(folder_path):
    skip = {"synthetic", "converted", "prediction", "latest_reason", "real_participant"}
    valid = [
        f for f in glob.glob(os.path.join(folder_path, "*.csv"))
        if not any(kw in os.path.basename(f).lower() for kw in skip)
    ]
    if not valid:
        raise FileNotFoundError("No valid PsychoPy CSV files found in the data folder.")
    return max(valid, key=os.path.getmtime)

# ── Train ─────────────────────────────────────────────────────────────────────
def train_model(train_file, model_file):
    print(">> Loading training data...")
    df = pd.read_csv(train_file)
    df = df.copy()
    df["reason"]      = standardize_reason_labels(df["reason"])
    df["gender"]      = df["gender"].astype(str).str.strip().str.title()
    df["brochure_id"] = df["brochure_id"].astype(str)
    df = df.dropna(subset=["reason"])
    df = df[df["reason"].isin(["Brand", "Price", "Familiarity"])].reset_index(drop=True)

    # Features: no clicked_item (leakage fix), brochure_id as category
    feature_cols         = ["brochure_id", "age", "gender", "reaction_time", "gaze_x", "gaze_y"]
    numeric_features     = ["age", "reaction_time", "gaze_x", "gaze_y"]
    categorical_features = ["gender", "brochure_id"]

    X = df[feature_cols].copy()
    y = df["reason"].copy()

    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler())
    ])
    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot",  OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    preprocessor = ColumnTransformer([
        ("num", numeric_transformer,     numeric_features),
        ("cat", categorical_transformer, categorical_features)
    ])
    model = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=300, max_depth=8,
            min_samples_leaf=2, random_state=42,
            class_weight="balanced"
        ))
    ])

    print(">> Running 5-fold cross-validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="accuracy")
    cv_mean = round(float(cv_scores.mean()), 4)
    cv_std  = round(float(cv_scores.std()), 4)
    print(f"   CV Accuracy: {cv_mean} ± {cv_std}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(">> Training final model...")
    model.fit(X_train, y_train)
    y_pred   = model.predict(X_test)
    test_acc = round(float(accuracy_score(y_test, y_pred)), 4)

    print(f"   Test Accuracy: {test_acc}")
    print(classification_report(y_test, y_pred))

    joblib.dump(model, model_file)
    print(f">> Model saved: {model_file}")
    return model, test_acc, cv_mean, cv_std

# ── Convert PsychoPy CSV ──────────────────────────────────────────────────────
def convert_psychopy_to_tidy(psychopy_file, age_value, gender_value, output_file):
    raw_df = pd.read_csv(psychopy_file)
    if raw_df.empty:
        raise ValueError("PsychoPy CSV is empty.")

    participant_value = "Unknown"
    if "participant" in raw_df.columns:
        val = raw_df["participant"].dropna()
        if not val.empty:
            participant_value = str(val.iloc[0]).strip()

    brochure_blocks = [
        {"brochure_id": "1", "time_col": "mouse_5.time", "x_col": "mouse_5.x", "y_col": "mouse_5.y", "clicked_col": "mouse_5.clicked_name"},
        {"brochure_id": "2", "time_col": "mouse_4.time", "x_col": "mouse_4.x", "y_col": "mouse_4.y", "clicked_col": "mouse_4.clicked_name"},
        {"brochure_id": "3", "time_col": "mouse_3.time", "x_col": "mouse_3.x", "y_col": "mouse_3.y", "clicked_col": "mouse_3.clicked_name"},
        {"brochure_id": "4", "time_col": "mouse.time",   "x_col": "mouse.x",   "y_col": "mouse.y",   "clicked_col": "mouse.clicked_name"},
        {"brochure_id": "5", "time_col": "mouse_2.time", "x_col": "mouse_2.x", "y_col": "mouse_2.y", "clicked_col": "mouse_2.clicked_name"},
    ]

    tidy_rows = []
    for block in brochure_blocks:
        c_col = block["clicked_col"]
        if c_col not in raw_df.columns:
            print(f"   Skipping brochure {block['brochure_id']}: missing column {c_col}")
            continue
        valid_rows = raw_df[raw_df[c_col].notna()]
        if valid_rows.empty:
            print(f"   Skipping brochure {block['brochure_id']}: no clicked item")
            continue
        row = valid_rows.iloc[0]
        tidy_rows.append({
            "participant":   participant_value,
            "brochure_id":   block["brochure_id"],
            "age":           age_value,
            "gender":        gender_value,
            "reaction_time": get_last_numeric(row[block["time_col"]]) if block["time_col"] in raw_df.columns else np.nan,
            "gaze_x":        get_last_numeric(row[block["x_col"]])    if block["x_col"]   in raw_df.columns else np.nan,
            "gaze_y":        get_last_numeric(row[block["y_col"]])    if block["y_col"]   in raw_df.columns else np.nan,
            "clicked_item":  get_last_string(row[c_col]),
        })

    tidy_df = pd.DataFrame(tidy_rows).sort_values("brochure_id").reset_index(drop=True)
    if tidy_df.empty:
        raise ValueError("No valid brochure data extracted from PsychoPy CSV.")
    tidy_df.to_csv(output_file, index=False)
    print(f">> Converted {len(tidy_df)} brochure rows → {output_file}")
    return tidy_df

# ── Predict ───────────────────────────────────────────────────────────────────
def predict_reason_percentages(tidy_df, model_file, prediction_file, results_json_file):
    model = joblib.load(model_file)

    feature_cols = ["brochure_id", "age", "gender", "reaction_time", "gaze_x", "gaze_y"]
    X_new = tidy_df[feature_cols].copy()
    X_new["brochure_id"] = X_new["brochure_id"].astype(str)

    probs       = model.predict_proba(X_new)
    preds       = model.predict(X_new)
    class_names = model.named_steps["classifier"].classes_

    prob_df = pd.DataFrame(probs * 100, columns=[f"{c}_Percentage" for c in class_names]).round(2)
    final_df = tidy_df.copy()
    final_df["Predicted_Reason"] = preds
    for col in prob_df.columns:
        final_df[col] = prob_df[col]

    final_df.to_csv(prediction_file, index=False)

    predictions = []
    for _, row in final_df.iterrows():
        brand_pct = float(row.get("Brand_Percentage",       0))
        fam_pct   = float(row.get("Familiarity_Percentage", 0))
        price_pct = float(row.get("Price_Percentage",       0))
        rt        = row["reaction_time"]
        print(f"   Brochure {row['brochure_id']} → {row['Predicted_Reason']}  "
              f"(Brand {brand_pct:.1f}% | Fam {fam_pct:.1f}% | Price {price_pct:.1f}%)")
        predictions.append({
            "participant":      str(row["participant"]),
            "brochure_id":      str(row["brochure_id"]),
            "clicked_item":     str(row.get("clicked_item", "N/A")),
            "age":              int(row["age"]),
            "gender":           str(row["gender"]),
            "reaction_time":    round(float(rt), 4)    if pd.notna(rt)           else None,
            "gaze_x":           round(float(row["gaze_x"]), 4) if pd.notna(row["gaze_x"]) else None,
            "gaze_y":           round(float(row["gaze_y"]), 4) if pd.notna(row["gaze_y"]) else None,
            "brand_pct":        round(brand_pct, 2),
            "familiarity_pct":  round(fam_pct,   2),
            "price_pct":        round(price_pct,  2),
            "predicted_reason": str(row["Predicted_Reason"]),
        })

    with open(results_json_file, "w") as f:
        json.dump({"predictions": predictions}, f, indent=2)
    print(f">> Results JSON saved: {results_json_file}")
    return final_df, predictions

# ── Entry point ───────────────────────────────────────────────────────────────
def run_pipeline(age: int, gender: str) -> dict:
    """Called by Flask. Returns the results dict."""
    print(f"\n{'='*50}")
    print(f"  PIPELINE START  age={age}  gender={gender}")
    print(f"{'='*50}\n")

    model, test_acc, cv_mean, cv_std = train_model(TRAIN_FILE, MODEL_FILE)

    print("\n>> Finding latest PsychoPy CSV...")
    latest_csv = get_latest_psychopy_csv(DATA_FOLDER)
    print(f"   Found: {latest_csv}")

    print("\n>> Converting PsychoPy data...")
    tidy_df = convert_psychopy_to_tidy(latest_csv, age, gender, CONVERTED_FILE)

    print("\n>> Predicting reason percentages...")
    final_df, predictions = predict_reason_percentages(
        tidy_df, MODEL_FILE, PREDICTION_FILE, RESULTS_JSON
    )

    # Build summary
    n      = len(predictions) or 1
    counts = {"Brand": 0, "Familiarity": 0, "Price": 0}
    tb = tf = tp = 0.0
    rts = []
    for p in predictions:
        r = p["predicted_reason"]
        if r in counts:
            counts[r] += 1
        tb += p["brand_pct"]
        tf += p["familiarity_pct"]
        tp += p["price_pct"]
        if p["reaction_time"] is not None:
            rts.append(p["reaction_time"])

    results = {
        "predictions": predictions,
        "training": {
            "test_accuracy": test_acc,
            "cv_accuracy":   cv_mean,
            "cv_std":        cv_std,
        },
        "summary": {
            "total_decisions":     n,
            "reason_counts":       counts,
            "avg_brand_pct":       round(tb / n, 2),
            "avg_familiarity_pct": round(tf / n, 2),
            "avg_price_pct":       round(tp / n, 2),
            "avg_reaction_time":   round(sum(rts) / len(rts), 4) if rts else None,
        },
    }

    print(f"\n{'='*50}")
    print(f"  PIPELINE COMPLETE  accuracy={test_acc}")
    print(f"{'='*50}\n")
    return results


if __name__ == "__main__":
    # Manual run — ask for input interactively
    while True:
        try:
            age = int(input("Enter participant age: ").strip())
            if age > 0:
                break
        except ValueError:
            pass
        print("Please enter a valid positive age.")
    while True:
        gender = normalize_gender(input("Enter participant gender (Male/Female): ").strip())
        if gender in ["Male", "Female"]:
            break
        print("Please enter Male or Female.")

    run_pipeline(age, gender)

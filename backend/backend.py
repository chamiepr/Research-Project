import pandas as pd
import numpy as np
import ast

# pip install sdv
from sdv.single_table import GaussianCopulaSynthesizer
from sdv.metadata import SingleTableMetadata

# =========================================================
# CONFIG
# =========================================================
input_file = "9c2f300c-b0c4-4afe-a8a7-8b86a6ce632f.csv"
output_file = "synthetic_dataset_with_clicked_item.csv"
n_synthetic_participants = 200   # 200 participants -> 1000 rows
random_seed = 42

np.random.seed(random_seed)

# =========================================================
# HELPER
# =========================================================
def parse_first_value(x):
    if pd.isna(x):
        return np.nan
    try:
        val = ast.literal_eval(str(x))
        if isinstance(val, list):
            return val[0] if len(val) > 0 else np.nan
        return val
    except:
        return x

# =========================================================
# LOAD RAW DATA
# =========================================================
df = pd.read_csv(input_file)

# =========================================================
# BROCHURE MAPPING
# brochure_id -> raw columns
# =========================================================
brochure_blocks = [
    {
        "brochure_id": 1,
        "time_col": "mouse_5.time",
        "x_col": "mouse_5.x",
        "y_col": "mouse_5.y",
        "clicked_col": "mouse_5.clicked_name"
    },
    {
        "brochure_id": 2,
        "time_col": "mouse_4.time",
        "x_col": "mouse_4.x",
        "y_col": "mouse_4.y",
        "clicked_col": "mouse_4.clicked_name"
    },
    {
        "brochure_id": 3,
        "time_col": "mouse_3.time",
        "x_col": "mouse_3.x",
        "y_col": "mouse_3.y",
        "clicked_col": "mouse_3.clicked_name"
    },
    {
        "brochure_id": 4,
        "time_col": "mouse.time",
        "x_col": "mouse.x",
        "y_col": "mouse.y",
        "clicked_col": "mouse.clicked_name"
    },
    {
        "brochure_id": 5,
        "time_col": "mouse_2.time",
        "x_col": "mouse_2.x",
        "y_col": "mouse_2.y",
        "clicked_col": "mouse_2.clicked_name"
    }
]

# =========================================================
# CONVERT RAW DATA TO CLEAN LONG FORMAT
# =========================================================
rows = []

for _, row in df.iterrows():
    participant = row.get("participant", np.nan)
    age = row.get("age", np.nan)
    gender = row.get("Gender", np.nan)
    reason = row.get("Reason", np.nan)

    for block in brochure_blocks:
        reaction_time = parse_first_value(row.get(block["time_col"]))
        gaze_x = parse_first_value(row.get(block["x_col"]))
        gaze_y = parse_first_value(row.get(block["y_col"]))
        clicked_item = parse_first_value(row.get(block["clicked_col"]))

        if pd.notna(reaction_time) and pd.notna(gaze_x) and pd.notna(gaze_y):
            rows.append({
                "participant": str(participant),
                "brochure_id": int(block["brochure_id"]),
                "age": float(age) if pd.notna(age) else np.nan,
                "gender": str(gender) if pd.notna(gender) else "unknown",
                "reason": str(reason) if pd.notna(reason) else "unknown",
                "clicked_item": str(clicked_item) if pd.notna(clicked_item) else "unknown",
                "reaction_time": float(reaction_time),
                "gaze_x": float(gaze_x),
                "gaze_y": float(gaze_y)
            })

clean_df = pd.DataFrame(rows)

# =========================================================
# BASIC CLEANING
# =========================================================
clean_df = clean_df.dropna(subset=["age", "gender", "reaction_time", "gaze_x", "gaze_y"])
clean_df = clean_df[(clean_df["age"] > 0) & (clean_df["reaction_time"] >= 0)].reset_index(drop=True)

# remove empty clicked items
clean_df["clicked_item"] = clean_df["clicked_item"].replace(["nan", "None", ""], "unknown")

print("Clean long-format data:")
print(clean_df.head())
print("Shape:", clean_df.shape)

# =========================================================
# PARTICIPANT-WISE WIDE DATASET
# one row = one participant with all 5 brochures
# =========================================================
participant_level = (
    clean_df.groupby("participant")[["age", "gender"]]
    .first()
    .reset_index()
)

wide_df = participant_level.copy()

for b in [1, 2, 3, 4, 5]:
    temp = clean_df[clean_df["brochure_id"] == b][
        ["participant", "reason", "clicked_item", "reaction_time", "gaze_x", "gaze_y"]
    ].copy()

    temp = temp.rename(columns={
        "reason": f"reason_b{b}",
        "clicked_item": f"clicked_item_b{b}",
        "reaction_time": f"reaction_time_b{b}",
        "gaze_x": f"gaze_x_b{b}",
        "gaze_y": f"gaze_y_b{b}"
    })

    wide_df = wide_df.merge(temp, on="participant", how="left")

# Keep only participants who have all 5 brochures
required_cols = []
for b in [1, 2, 3, 4, 5]:
    required_cols.extend([
        f"reason_b{b}",
        f"clicked_item_b{b}",
        f"reaction_time_b{b}",
        f"gaze_x_b{b}",
        f"gaze_y_b{b}"
    ])

wide_df = wide_df.dropna(subset=required_cols).reset_index(drop=True)

print("\nWide participant-level data:")
print(wide_df.head())
print("Shape:", wide_df.shape)

# =========================================================
# REMOVE ORIGINAL PARTICIPANT ID BEFORE MODELING
# =========================================================
model_df = wide_df.drop(columns=["participant"]).copy()
model_df["age"] = model_df["age"].round().astype(int)

# =========================================================
# METADATA
# =========================================================
metadata = SingleTableMetadata()
metadata.detect_from_dataframe(model_df)

metadata.update_column("age", sdtype="numerical")
metadata.update_column("gender", sdtype="categorical")

for b in [1, 2, 3, 4, 5]:
    metadata.update_column(f"reason_b{b}", sdtype="categorical")
    metadata.update_column(f"clicked_item_b{b}", sdtype="categorical")
    metadata.update_column(f"reaction_time_b{b}", sdtype="numerical")
    metadata.update_column(f"gaze_x_b{b}", sdtype="numerical")
    metadata.update_column(f"gaze_y_b{b}", sdtype="numerical")

# =========================================================
# TRAIN GAUSSIAN COPULA MODEL
# =========================================================
synthesizer = GaussianCopulaSynthesizer(
    metadata=metadata,
    enforce_min_max_values=True,
    enforce_rounding=False
)

synthesizer.fit(model_df)

# =========================================================
# GENERATE SYNTHETIC PARTICIPANTS
# =========================================================
synthetic_wide = synthesizer.sample(num_rows=n_synthetic_participants)
synthetic_wide["age"] = synthetic_wide["age"].round().astype(int)
synthetic_wide.insert(0, "participant", [f"SYN_{i:03d}" for i in range(len(synthetic_wide))])

print("\nSynthetic wide data:")
print(synthetic_wide.head())
print("Shape:", synthetic_wide.shape)

# =========================================================
# CONVERT BACK TO LONG FORMAT
# one participant -> 5 brochure rows
# =========================================================
synthetic_rows = []

for _, row in synthetic_wide.iterrows():
    participant = row["participant"]
    age = row["age"]
    gender = row["gender"]

    for b in [1, 2, 3, 4, 5]:
        synthetic_rows.append({
            "participant": participant,
            "brochure_id": b,
            "age": age,
            "gender": gender,
            "reason": row[f"reason_b{b}"],
            "clicked_item": row[f"clicked_item_b{b}"],
            "reaction_time": round(float(row[f"reaction_time_b{b}"]), 6),
            "gaze_x": round(float(row[f"gaze_x_b{b}"]), 6),
            "gaze_y": round(float(row[f"gaze_y_b{b}"]), 6)
        })

synthetic_long = pd.DataFrame(synthetic_rows)
synthetic_long = synthetic_long.sort_values(["participant", "brochure_id"]).reset_index(drop=True)

# =========================================================
# SAVE
# =========================================================
synthetic_long.to_csv(output_file, index=False)

print("\nFinal synthetic dataset created successfully.")
print("Saved as:", output_file)
print("Shape:", synthetic_long.shape)
print(synthetic_long.head(15))
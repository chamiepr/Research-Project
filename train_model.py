import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

# Load data
print("Loading data...")
df = pd.read_csv('psychopy_synthetic_dataset.csv')

# Preprocess
# Map 'brand' to 'quality' to match user request
df['reason'] = df['reason'].str.lower().replace({'brand': 'quality'})

# Features: Reaction time, Gaze X, Gaze Y
# We use these as they are the behavioral signals
X = df[['reaction_time', 'gaze_x', 'gaze_y']]
y = df['reason']

print(f"Training on {len(df)} samples...")
print("Target classes:", y.unique())

# Encode target
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Train Model
# use_label_encoder=False to avoid warnings, eval_metric to suppress errors
model = XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', n_estimators=100)
model.fit(X, y_encoded)

# Save using joblib for sklearn compatibility
joblib.dump(model, 'decision_model.pkl')
joblib.dump(le, 'label_encoder.pkl')

print("Model saved to 'decision_model.pkl'")
print("Label Encoder saved to 'label_encoder.pkl'")

# Test prediction
sample = X.iloc[[0]]
probs = model.predict_proba(sample)
print("\nSample Prediction:")
print(f"Input: {sample.values}")
for class_idx, prob in enumerate(probs[0]):
    print(f"{le.inverse_transform([class_idx])[0]}: {prob*100:.1f}%")

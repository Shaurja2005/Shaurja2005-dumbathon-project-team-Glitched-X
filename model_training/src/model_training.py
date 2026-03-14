import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error
import xgboost as xgb
import matplotlib.pyplot as plt

# 1. Load the preprocessed, bias-free dataset
# Using a raw string (r'') to prevent the invalid escape sequence warning
df = pd.read_csv(r'dataset\camp_triage_ready_dataset.csv')

# 2. Identify all 'object' (string) columns dynamically
# This prevents case-sensitivity errors and catches everything XGBoost can't read
object_columns = df.select_dtypes(include=['object']).columns.tolist()

# 3. Apply Label Encoding to all identified string columns
label_encoders = {}
for col in object_columns:
    le = LabelEncoder()
    # Force the column to be a string type before encoding for clean conversion
    df[col] = le.fit_transform(df[col].astype(str))
    label_encoders[col] = le

# 4. Separate features (X) from the target (y)
# We drop intermediate math columns so the model learns from raw vitals
X = df.drop(columns=['caloric_need_24hr', 'Base_BMR', 'radiation_stress_multiplier'])
y = df['caloric_need_24hr']

# 5. Train / Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 6. Initialize and Train the XGBoost Regressor
print("Training the XGBoost Camp Triage & Ration Optimizer...")
model = xgb.XGBRegressor(
    objective='reg:squarederror', 
    n_estimators=200, 
    learning_rate=0.05, 
    max_depth=5, 
    random_state=42
)

model.fit(X_train, y_train)

# 7. Evaluate Model Performance
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)

# Using np.sqrt instead of squared=False to support newer scikit-learn versions
rmse = np.sqrt(mean_squared_error(y_test, predictions))
print(f"Model Performance -> MAE: {mae:.2f} kcal | RMSE: {rmse:.2f} kcal")

# 8. Generate the Feature Importance Plot
print("Generating Fairness Audit graph for the judges...")
plt.figure(figsize=(12, 8))
importances = model.feature_importances_
feature_names = X.columns
importance_df = pd.DataFrame({'Feature': feature_names, 'Importance': importances})
importance_df = importance_df.sort_values(by='Importance', ascending=True)

plt.barh(importance_df['Feature'], importance_df['Importance'], color='teal')
plt.title('Camp Triage Model: Feature Importance (Fairness Audit)', fontsize=16)
plt.xlabel('Relative Importance (F-Score)', fontsize=14)
plt.ylabel('Patient Features', fontsize=14)
plt.tight_layout()

# Save the plot
plt.savefig('triage_fairness_audit.png')
print("Graph saved as 'triage_fairness_audit.png'.")

model.save_model("camp_triage_model.json")
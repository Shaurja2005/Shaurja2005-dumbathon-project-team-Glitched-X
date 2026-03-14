import pandas as pd
import numpy as np
import hashlib

# 1. Load your dataset (replace with the full dataset path when you download it)
df = pd.read_csv('E:\dumbathon-project\dataset\synthetic_medical_symptoms_dataset.csv')

# --- SYNTHETIC DATA GENERATION (Since the base dataset lacks demographics) ---
np.random.seed(42) # For reproducible results during judging
names = ['Alice', 'Aaron', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan']
df['Name'] = np.random.choice(names, size=len(df))

df['Age'] = np.random.randint(18, 70, size=len(df))
df['Gender'] = np.random.choice(['M', 'F'], size=len(df))

# Generate realistic height/weight based on gender for the BMR formula
df['Weight_kg'] = np.where(df['Gender'] == 'M', np.random.normal(80, 10, len(df)), np.random.normal(65, 8, len(df)))
df['Height_cm'] = np.where(df['Gender'] == 'M', np.random.normal(175, 8, len(df)), np.random.normal(162, 7, len(df)))

# --- APOCALYPSE FEATURE ENGINEERING ---
# Generate exponential radiation exposure (most people have low exposure, some have critical exposure)
df['radiation_dose_mSv'] = np.random.exponential(scale=50, size=len(df)) 
df['hours_since_exposure'] = np.random.randint(1, 72, size=len(df))

# Calculate 24-hour Caloric Need (Harris-Benedict Formula + Radiation Stress)
def calculate_bmr(row):
    if row['Gender'] == 'M':
        return 88.362 + (13.397 * row['Weight_kg']) + (4.799 * row['Height_cm']) - (5.677 * row['Age'])
    else:
        return 447.593 + (9.247 * row['Weight_kg']) + (3.098 * row['Height_cm']) - (4.330 * row['Age'])

df['Base_BMR'] = df.apply(calculate_bmr, axis=1)

# Radiation stress multiplier: Add +1% caloric need per 10 mSv of radiation exposure
df['radiation_stress_multiplier'] = 1 + (df['radiation_dose_mSv'] / 1000)

# Final Caloric Target Variable (BMR * 1.2 Sedentary Activity Factor * Radiation Stress)
df['caloric_need_24hr'] = df['Base_BMR'] * 1.2 * df['radiation_stress_multiplier'] 


# --- THE HACK: NEUTRALIZING ALPHABETICAL BIAS ---
# We hash the names to destroy the alphabetical order while keeping a unique ID
def hash_name(name):
    return hashlib.sha256(name.encode()).hexdigest()[:8] # Keep first 8 characters of the hash

df['Survivor_ID_Hashed'] = df['Name'].apply(hash_name)

# Drop the problematic 'Name' column completely so the XGBoost model can't learn the alphabet!
df_cleaned = df.drop(columns=['Name'])

# Save the final, ML-ready dataset
output_file = 'camp_triage_ready_dataset.csv'
df_cleaned.to_csv(output_file, index=False)

print("Dataset successfully generated and bias neutralized!")
print(df_cleaned[['Survivor_ID_Hashed', 'radiation_dose_mSv', 'caloric_need_24hr']].head())
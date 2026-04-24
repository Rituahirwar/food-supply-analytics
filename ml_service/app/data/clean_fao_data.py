import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
input_path = os.path.join(BASE_DIR, "data", "food_price_indices_data.csv")
output_path = os.path.join(BASE_DIR, "data", "clean_food_price_indices.csv")


def clean_data():
    print(f"Reading {input_path}...")
    # Skip the first 2 rows (Headers are on row 3 -> index 2)
    df = pd.read_csv(input_path, skiprows=2)
    
    # Keep only named columns, getting rid of all the Unnamed trailing commas
    columns_to_keep = ['Date', 'Food Price Index', 'Meat', 'Dairy', 'Cereals', 'Oils', 'Sugar']
    df.columns = df.columns.str.strip()
    
    # Filter the exact columns
    valid_cols = [c for c in columns_to_keep if c in df.columns]
    df = df[valid_cols]

    # Drop the empty formatting row which ends up right below the header
    df = df.dropna(subset=['Date'])
    
    # Clean the date and ensure numericals are valid
    df['Date'] = df['Date'].astype(str).str.strip()
    
    # If the date is empty or invalid after stripping, drop it
    df = df[df['Date'] != '']
    df = df.dropna(how='all')

    print("Data structure after cleaning:")
    print(df.info())
    print("\nFirst 5 rows:")
    print(df.head())
    
    df.to_csv(output_path, index=False)
    print(f"\nSuccessfully cleaned and saved formatted dataset to: {output_path}")

if __name__ == "__main__":
    clean_data()

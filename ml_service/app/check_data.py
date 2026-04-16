import pandas as pd
import os

df = pd.read_csv('data/clean_food_price_indices.csv')
print(df.columns.tolist())
print(df.head(3))

import pandas as pd
import json

file_path = r'D:\SystemFolders\Desktop\projects\cu-client\reactions_2026-04-18T00-17-17-634Z.xlsx'
df = pd.read_excel(file_path)

reactions = {}
for _, row in df.iterrows():
    # Columns: ID, Reactant1, Reactant2, Formula, Status, ...
    # We use indices to avoid encoding issues with column names
    r1 = str(row.iloc[1]).strip()
    r2 = str(row.iloc[2]).strip()
    formula = str(row.iloc[3]).strip()
    status = str(row.iloc[4]).strip()
    
    if status.lower() == 'approved':
        # Sort reactants to ensure consistency (e.g., H2|O2 and O2|H2 are same)
        pair = "|".join(sorted([r1, r2]))
        reactions[pair] = formula

# Generate TypeScript code
ts_code = "const reactionPairs: Record<string, string> = {\n"
for pair, formula in sorted(reactions.items()):
    ts_code += f"  '{pair}': '{formula}',\n"
ts_code += "};"

with open('extracted_reactions.ts', 'w', encoding='utf-8') as f:
    f.write(ts_code)

print(f"Extracted {len(reactions)} reactions to extracted_reactions.ts")

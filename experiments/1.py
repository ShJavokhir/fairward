"""
Create a complete list of San Francisco Bay Area (9-county) hospitals
and their CMS (Medicare.gov Care Compare) hospital profile pages.

Data source: CMS Provider Data Catalog dataset "Hospital General Information" (xubh-q36u)
Output: bay_area_hospitals_with_cms_pages.csv
"""

from __future__ import annotations

import pandas as pd
import requests

BAY_AREA_COUNTIES = {
    "ALAMEDA",
    "CONTRA COSTA",
    "MARIN",
    "NAPA",
    "SAN FRANCISCO",
    "SAN MATEO",
    "SANTA CLARA",
    "SOLANO",
    "SONOMA",
}

# 1) Get the latest CSV download URL via CMS metastore
METASTORE_URL = (
    "https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/"
    "xubh-q36u?show-reference-ids=false"
)

meta = requests.get(METASTORE_URL, timeout=60)
meta.raise_for_status()
meta_json = meta.json()

# CMS returns the CSV download URL under distribution[0]["data"]
csv_url = meta_json["distribution"][0]["data"]["downloadURL"]

# 2) Load CSV (Facility ID is the CMS Certification Number / CCN; keep as string)
df = pd.read_csv(csv_url, dtype=str)

# Common column names in this dataset (as of recent releases)
# - 'Facility ID' (CCN)
# - 'Facility Name'
# - 'City/Town'
# - 'State'
# - 'County/Parish'
# If your download has slightly different headers, adjust below.
df.columns = [c.strip() for c in df.columns]

# 3) Filter to CA + Bay Area counties
df["State"] = df["State"].str.strip()
df["County/Parish"] = df["County/Parish"].str.strip().str.upper()

bay = df[
    (df["State"] == "CA")
    & (df["County/Parish"].isin(BAY_AREA_COUNTIES))
].copy()

# 4) Build Medicare.gov (CMS) Care Compare hospital page URLs
# Medicare.gov uses 6-digit CCNs; some datasets have leading zeros already, some don’t.
bay["CCN"] = bay["Facility ID"].str.strip().str.zfill(6)

bay["CMS_CareCompare_Page"] = (
    "https://www.medicare.gov/care-compare/details/hospital/"
    + bay["CCN"]
    + "/view-all?state=CA"
)

# 5) Select useful columns and save
out_cols = [
    "Facility Name",
    "CCN",
    "Address",
    "City/Town",
    "State",
    "ZIP Code",
    "County/Parish",
    "Telephone Number",
    "Hospital Type",
    "Hospital Ownership",
    "Emergency Services",
    "CMS_CareCompare_Page",
]
# Keep only columns that exist in your version
out_cols = [c for c in out_cols if c in bay.columns]

bay[out_cols].sort_values(["County/Parish", "Facility Name"]).to_csv(
    "bay_area_hospitals_with_cms_pages.csv", index=False
)

print(f"Saved {len(bay)} hospitals to bay_area_hospitals_with_cms_pages.csv")

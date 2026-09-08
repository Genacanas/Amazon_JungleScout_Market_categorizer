import json
import requests
import sys
from pathlib import Path

# Change this to your deployed backend URL later
API_URL = "http://localhost:8000"

def parse_price(price_str):
    import re
    if not price_str: return 0.0
    s = str(price_str).replace('€', '').replace('EUR', '').replace(' ', '').replace('.', '').replace(',', '.')
    match = re.search(r"[\d\.]+", s)
    return float(match.group()) if match else 0.0

def upload_run(run_folder: Path):
    run_name = run_folder.name
    print(f"Uploading run: {run_name} to {API_URL}")

    # Load JSON files
    try:
        with open(run_folder / "1_search_results.json", "r", encoding="utf-8") as f:
            sr_data = json.load(f)
        with open(run_folder / "2_product_details.json", "r", encoding="utf-8") as f:
            pd_data = json.load(f)
        with open(run_folder / "3_junglescout.json", "r", encoding="utf-8") as f:
            js_data = json.load(f)
        try:
            with open(run_folder / "4_product_reviews.json", "r", encoding="utf-8") as f:
                pr_data = json.load(f)
        except:
            pr_data = {}
            
        try:
            with open(run_folder / "5_normalized_products.json", "r", encoding="utf-8") as f:
                norm_data = json.load(f)
        except:
            norm_data = {}
    except Exception as e:
        print(f"Error loading local files: {e}")
        return

    # Infer keywords from the first search result (or run name)
    keywords = sr_data[0].get("found_for_keywords", []) if sr_data else []

    products_payload = []
    sr_map = {item.get('asin'): item for item in sr_data}

    for asin, pd in pd_data.items():
        sr = sr_map.get(asin, {})
        js = js_data.get(asin, {})
        norm = norm_data.get(asin, {})
        revs = pr_data.get(asin, {})

        # Parse photos
        photos = []
        if pd.get("product_photos"):
            photos.extend(pd["product_photos"])
        if sr.get("product_photo") and sr["product_photo"] not in photos:
            photos.insert(0, sr["product_photo"])

        # Parse brand
        brand = pd.get("product_information", {}).get("Marke") or pd.get("product_details", {}).get("Marke") or pd.get("product_information", {}).get("Brand")

        # Compile product object
        prod = {
            "asin": asin,
            "title": pd.get("product_title") or sr.get("product_title") or "",
            "photos": photos,
            "price": js.get("price") or parse_price(sr.get("product_price")),
            "rating": js.get("rating") or float(sr.get("product_star_rating") or 0.0),
            "num_reviews": js.get("nReviews") or int(sr.get("product_num_ratings") or 0),
            "brand": js.get("brand") or brand,
            "estimated_sales": js.get("estimatedSales") or 0,
            "est_revenue": js.get("estRevenue") or 0.0,
            "ai_normalized_data": norm,
            "raw_reviews": revs if isinstance(revs, list) else [],
            "is_fba": js.get("sellerType") in ["FBA", "AMZ"],
            "found_for_keywords": sr.get("found_for_keywords", [])
        }
        products_payload.append(prod)

    payload = {
        "run_name": run_name,
        "keywords": keywords,
        "products": products_payload
    }

    # Hit the API
    print("Sending payload to backend...")
    resp = requests.post(f"{API_URL}/upload-run", json=payload)
    
    if resp.status_code == 200:
        print(f"Success! Uploaded {len(products_payload)} products.")
    else:
        print(f"Error {resp.status_code}: {resp.text}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python upload_to_cloud.py <path_to_run_folder>")
        sys.exit(1)
    
    run_folder_path = Path(sys.argv[1])
    if not run_folder_path.exists():
        print(f"Folder not found: {run_folder_path}")
        sys.exit(1)
        
    upload_run(run_folder_path)

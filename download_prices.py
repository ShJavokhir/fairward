#!/usr/bin/env python3
"""
Script to download CMS Hospital Price Transparency files from Bay Area hospitals.
Downloads all machine-readable files listed in cost_downloadable_links.csv
"""

import os
import csv
import re
import time
import requests
from pathlib import Path
from urllib.parse import urlparse, unquote
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
CSV_FILE = "cost_downloadable_links.csv"
OUTPUT_DIR = "public_prices"
MAX_WORKERS = 5  # Number of parallel downloads
TIMEOUT = 120  # Seconds
CHUNK_SIZE = 8192  # For streaming large files
RETRY_ATTEMPTS = 3
DELAY_BETWEEN_REQUESTS = 0.5  # Seconds

# Headers to mimic a browser request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


def sanitize_filename(name: str) -> str:
    """Convert hospital name to a safe filename."""
    # Remove or replace problematic characters
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'\s+', '_', name)
    name = re.sub(r'[^\w\-_.]', '', name)
    return name.lower()[:100]  # Limit length


def get_extension_from_url(url: str, file_type: str) -> str:
    """Determine file extension from URL or file_type column."""
    # Check URL path first
    parsed = urlparse(url)
    path = unquote(parsed.path)

    if path.endswith('.csv'):
        return '.csv'
    elif path.endswith('.json'):
        return '.json'
    elif path.endswith('.zip'):
        return '.zip'
    elif path.endswith('.xlsx'):
        return '.xlsx'
    elif path.endswith('.xml'):
        return '.xml'

    # Fall back to file_type column
    file_type_lower = file_type.lower()
    if 'csv' in file_type_lower:
        return '.csv'
    elif 'json' in file_type_lower:
        return '.json'
    elif 'zip' in file_type_lower:
        return '.zip'
    elif 'api' in file_type_lower:
        return '.json'  # API endpoints typically return JSON

    # Default to .json for unknown types
    return '.json'


def get_extension_from_response(response: requests.Response, default_ext: str) -> str:
    """Determine extension from response content-type header."""
    content_type = response.headers.get('Content-Type', '').lower()

    if 'csv' in content_type or 'text/csv' in content_type:
        return '.csv'
    elif 'json' in content_type:
        return '.json'
    elif 'zip' in content_type or 'application/zip' in content_type:
        return '.zip'
    elif 'excel' in content_type or 'spreadsheet' in content_type:
        return '.xlsx'
    elif 'xml' in content_type:
        return '.xml'

    # Check content-disposition header for filename
    content_disp = response.headers.get('Content-Disposition', '')
    if 'filename=' in content_disp:
        match = re.search(r'filename[^;=\n]*=([\'"]?)([^\'"\n]*)\1', content_disp)
        if match:
            filename = match.group(2)
            if '.' in filename:
                return '.' + filename.split('.')[-1].lower()

    return default_ext


def download_file(hospital_name: str, url: str, file_type: str, region: str, output_dir: Path) -> dict:
    """Download a single file and return status."""
    result = {
        "hospital": hospital_name,
        "url": url,
        "success": False,
        "filename": None,
        "error": None,
        "size": 0
    }

    # Create region subdirectory
    region_dir = output_dir / sanitize_filename(region)
    region_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename
    base_name = sanitize_filename(hospital_name)
    expected_ext = get_extension_from_url(url, file_type)

    for attempt in range(RETRY_ATTEMPTS):
        try:
            # Make request with streaming for large files
            response = requests.get(
                url,
                headers=HEADERS,
                timeout=TIMEOUT,
                stream=True,
                allow_redirects=True
            )
            response.raise_for_status()

            # Get actual extension from response
            actual_ext = get_extension_from_response(response, expected_ext)
            filename = f"{base_name}{actual_ext}"
            filepath = region_dir / filename

            # Handle duplicate filenames
            counter = 1
            while filepath.exists():
                filename = f"{base_name}_{counter}{actual_ext}"
                filepath = region_dir / filename
                counter += 1

            # Download file
            total_size = 0
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)

            result["success"] = True
            result["filename"] = str(filepath.relative_to(output_dir.parent))
            result["size"] = total_size

            print(f"  [OK] {hospital_name}: {filename} ({total_size:,} bytes)")
            return result

        except requests.exceptions.Timeout:
            result["error"] = f"Timeout after {TIMEOUT}s (attempt {attempt + 1}/{RETRY_ATTEMPTS})"
            if attempt < RETRY_ATTEMPTS - 1:
                time.sleep(2 ** attempt)  # Exponential backoff

        except requests.exceptions.HTTPError as e:
            result["error"] = f"HTTP {e.response.status_code}: {e.response.reason}"
            break  # Don't retry HTTP errors

        except requests.exceptions.RequestException as e:
            result["error"] = str(e)
            if attempt < RETRY_ATTEMPTS - 1:
                time.sleep(2 ** attempt)

        except Exception as e:
            result["error"] = f"Unexpected error: {str(e)}"
            break

    print(f"  [FAIL] {hospital_name}: {result['error']}")
    return result


def main():
    """Main function to orchestrate downloads."""
    print("=" * 70)
    print("CMS Hospital Price Transparency File Downloader")
    print("=" * 70)

    # Setup paths
    script_dir = Path(__file__).parent
    csv_path = script_dir / CSV_FILE
    output_dir = script_dir / OUTPUT_DIR

    # Check if CSV exists
    if not csv_path.exists():
        print(f"Error: CSV file not found: {csv_path}")
        return 1

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nOutput directory: {output_dir}")

    # Read CSV file
    hospitals = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            hospitals.append(row)

    print(f"Found {len(hospitals)} hospitals to download\n")

    # Track results
    results = []
    successful = 0
    failed = 0
    total_bytes = 0

    # Download files with progress
    print("Starting downloads...\n")

    # Use sequential downloads to be polite to servers
    for i, hospital in enumerate(hospitals, 1):
        print(f"[{i}/{len(hospitals)}] Downloading {hospital['hospital_name']}...")

        result = download_file(
            hospital_name=hospital['hospital_name'],
            url=hospital['mrf_download_url'],
            file_type=hospital['file_type'],
            region=hospital['region'],
            output_dir=output_dir
        )

        results.append(result)

        if result['success']:
            successful += 1
            total_bytes += result['size']
        else:
            failed += 1

        # Small delay between requests to be respectful
        if i < len(hospitals):
            time.sleep(DELAY_BETWEEN_REQUESTS)

    # Print summary
    print("\n" + "=" * 70)
    print("DOWNLOAD SUMMARY")
    print("=" * 70)
    print(f"Total hospitals: {len(hospitals)}")
    print(f"Successful downloads: {successful}")
    print(f"Failed downloads: {failed}")
    print(f"Total data downloaded: {total_bytes / (1024*1024):.2f} MB")

    # List failed downloads
    if failed > 0:
        print("\nFailed downloads:")
        for result in results:
            if not result['success']:
                print(f"  - {result['hospital']}: {result['error']}")

    # Save results log
    log_path = output_dir / "download_log.csv"
    with open(log_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['hospital', 'url', 'success', 'filename', 'size', 'error'])
        writer.writeheader()
        writer.writerows(results)
    print(f"\nDownload log saved to: {log_path}")

    # List downloaded files by region
    print("\nFiles by region:")
    for region_dir in sorted(output_dir.iterdir()):
        if region_dir.is_dir() and region_dir.name != '__pycache__':
            files = list(region_dir.glob('*'))
            if files:
                print(f"\n  {region_dir.name}/")
                for f in sorted(files):
                    size = f.stat().st_size
                    print(f"    - {f.name} ({size:,} bytes)")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(main())

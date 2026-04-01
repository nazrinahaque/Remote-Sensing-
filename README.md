# Remote Sensing — NDVI Analysis with Google Earth Engine
**Author:** Nazrina Haque | PhD Candidate, Oregon State University  
**Tool:** Google Earth Engine (JavaScript API)  

---

## Overview
This repository contains Google Earth Engine (GEE) scripts for analyzing
**vegetation change and recovery** across the Southeastern United States
using Sentinel-2 satellite imagery.

The scripts support my dissertation research on Hurricane Michael's impact
on forestland by providing satellite-derived NDVI disturbance measures at
the parcel level across Georgia, Alabama, South Carolina, and Florida.

---

## Research Purpose
- Detect vegetation damage caused by Hurricane Michael (October 2018)
- Track multi-year NDVI recovery from 2017 to 2024
- Extract parcel-level NDVI difference values for econometric analysis
- Create acre-based spatial buffers around land parcels

---

## Study Area
Georgia, Alabama, South Carolina, and Florida — the four states most
affected by Hurricane Michael's landfall on October 10, 2018.

---

## Repository Structure

| File | Description |
|------|-------------|
| `hurricane_michael_ndvi_change.js` | Basic pre/post NDVI change detection around Michael's landfall |
| `ndvi_hurricane_recovery.js` | Multi-year NDVI recovery analysis 2017 to 2024 |
| `01_michael_ndvi_change_basic.js` | Pre/post NDVI composites and raster export to Drive |
| `02_michael_ndvi_parcel_extraction.js` | Parcel-level NDVI extraction at 10m resolution |
| `03_michael_ndvi_parcel_extraction_30m.js` | Parcel-level NDVI extraction at 30m for faster processing |
| `04_michael_ndvi_acre_buffers.js` | Acre-based circular buffers with NDVI extraction |

---

## Workflow
```
Sentinel-2 imagery
      ↓
Cloud masking (QA60 bits 10 & 11)
      ↓
NDVI calculation (B8 - B4) / (B8 + B4)
      ↓
Pre-event median composite (Sep 1 - Oct 8, 2018)
Post-event median composite (Oct 11 - Nov 30, 2018)
      ↓
NDVI Difference (Post - Pre)
      ↓
Parcel buffer extraction → CSV export
```

---

## Key Parameters
| Parameter | Value |
|-----------|-------|
| Satellite | Copernicus Sentinel-2 SR |
| Cloud filter | Less than 10% cloud cover |
| Pre-event period | September 1 to October 8, 2018 |
| Post-event period | October 11 to November 30, 2018 |
| Resolution | 10m (full) / 30m (fast version) |
| Buffer method | Circular buffer sized by parcel acreage |
| Export format | GeoTIFF (raster) / CSV (parcel values) |

---

## How to Run
1. Open [Google Earth Engine Code Editor](https://code.earthengine.google.com)
2. Copy and paste any script from this repo
3. Click **Run**
4. For exports, click **Tasks** tab and click **Run** next to the export task

---

## Tools
![Google Earth Engine](https://img.shields.io/badge/-Google%20Earth%20Engine-4285F4?style=flat&logo=google&logoColor=white)
![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Sentinel-2](https://img.shields.io/badge/-Sentinel--2-0072C6?style=flat)

---

## Contact
Nazrina Haque | haquen@oregonstate.edu  
Department of Applied Economics, Oregon State University

// ============================================================
// HURRICANE RECOVERY NDVI ANALYSIS
// Author: Nazrina Haque
// Description: Analyzes NDVI change (2017–2024) across parcels
//              in Georgia, Alabama, South Carolina & Florida
//              using Sentinel-2 SR imagery in Google Earth Engine
// ============================================================


// ==========================
// 1. AREA OF INTEREST
// ==========================
var usStates = ee.FeatureCollection('TIGER/2018/States');

var selectedStates = usStates.filter(
  ee.Filter.inList('NAME', ['Georgia', 'Alabama', 'South Carolina', 'Florida'])
);

var aoi = selectedStates.geometry();
Map.centerObject(aoi, 6);


// ==========================
// 2. CLOUD MASK FUNCTION
// ==========================
function maskS2(image) {
  var opaque = image.select('MSK_CLASSI_OPAQUE').eq(0);
  var cirrus = image.select('MSK_CLASSI_CIRRUS').eq(0);
  return image.updateMask(opaque.and(cirrus)).divide(10000);
}


// ==========================
// 3. NDVI FUNCTION
// ==========================
function addNDVI(image) {
  return image.addBands(
    image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  );
}


// ==========================
// 4. ANNUAL NDVI COMPOSITE
// ==========================
function annualNDVI(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end   = ee.Date.fromYMD(year, 12, 31);

  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskS2)
    .map(addNDVI)
    .select('NDVI')
    .median()
    .clip(aoi);
}


// ==========================
// 5. BUILD NDVI YEARS
// ==========================
var ndvi2017 = annualNDVI(2017); // Pre-hurricane baseline
var ndvi2019 = annualNDVI(2019); // Post-damage
var ndvi2024 = annualNDVI(2024); // Recovery / development


// ==========================
// 6. RECOVERY METRICS
// ==========================
var damage       = ndvi2019.subtract(ndvi2017).rename('damage');
var recovery     = ndvi2024.subtract(ndvi2019).rename('recovery');
var fullRecovery = ndvi2024.subtract(ndvi2017).rename('full_recovery');

// Percent recovery = (2024 - 2019) / (2017 - 2019)
var percentRecovery = recovery
  .divide(ndvi2017.subtract(ndvi2019))
  .rename('pct_recovery');


// ==========================
// 7. VISUALIZATION
// ==========================
var ndviVis = {min: 0, max: 1,    palette: ['white', 'green']};
var diffVis = {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']};

Map.addLayer(ndvi2017,     ndviVis, 'NDVI 2017');
Map.addLayer(ndvi2019,     ndviVis, 'NDVI 2019');
Map.addLayer(ndvi2024,     ndviVis, 'NDVI 2024');
Map.addLayer(fullRecovery, diffVis, 'Full Recovery 2024-2017');


// ==========================
// 8. LOAD PARCEL DATA
// ==========================
var parcels = ee.FeatureCollection(
  "projects/ee-nazrinahaque/assets/Cheap_sales"
);

Map.addLayer(parcels, {}, 'Parcel Points');


// ==========================
// 9. BUFFER PARCELS BY ACRES
// ==========================
var buffered = parcels.map(function(f) {
  var acres  = ee.Number(f.get('acres'));
  var radius = acres.multiply(4046.86).divide(Math.PI).sqrt();
  return f.buffer(radius);
});

Map.addLayer(buffered, {}, 'Buffered Parcels');


// ==========================
// 10. STACK METRICS
// ==========================
var metricsImage = damage
  .addBands(recovery)
  .addBands(fullRecovery)
  .addBands(percentRecovery);


// ==========================
// 11. EXTRACT PARCEL VALUES
// ==========================
var parcelMetrics = buffered.map(function(f) {
  var vals = metricsImage.reduceRegion({
    reducer:   ee.Reducer.mean(),
    geometry:  f.geometry(),
    scale:     30,
    maxPixels: 1e9,
    tileScale: 4
  });
  return f.set(vals);
});


// ==========================
// 12. EXPORT CSV
// ==========================
Export.table.toDrive({
  collection:  parcelMetrics,
  description: 'Hurricane_Recovery_Metrics_2017_2019_2024',
  fileFormat:  'CSV'
});
